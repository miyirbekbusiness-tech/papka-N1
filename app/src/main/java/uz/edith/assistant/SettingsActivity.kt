package uz.edith.assistant

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.RadioButton
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.launch

class SettingsActivity : AppCompatActivity() {

    private lateinit var rbGemini: RadioButton
    private lateinit var rbClaude: RadioButton
    private lateinit var etGeminiKey: EditText
    private lateinit var etGeminiModel: EditText
    private lateinit var etClaudeKey: EditText
    private lateinit var etClaudeModel: EditText
    private lateinit var rbAskAlways: RadioButton
    private lateinit var rbAskImportant: RadioButton
    private lateinit var rbUz: RadioButton
    private lateinit var rbRu: RadioButton
    private lateinit var rbEn: RadioButton
    private lateinit var cbListenOnOpen: CheckBox
    private lateinit var cbAutoListen: CheckBox
    private lateinit var sbRate: SeekBar
    private lateinit var tvVoice: TextView
    private lateinit var tvMemory: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        EdithCore.init(this)
        setContentView(R.layout.activity_settings)
        val p = EdithCore.prefs

        rbGemini = findViewById(R.id.rbGemini)
        rbClaude = findViewById(R.id.rbClaude)
        etGeminiKey = findViewById(R.id.etGeminiKey)
        etGeminiModel = findViewById(R.id.etGeminiModel)
        etClaudeKey = findViewById(R.id.etClaudeKey)
        etClaudeModel = findViewById(R.id.etClaudeModel)
        rbAskAlways = findViewById(R.id.rbAskAlways)
        rbAskImportant = findViewById(R.id.rbAskImportant)
        rbUz = findViewById(R.id.rbUz)
        rbRu = findViewById(R.id.rbRu)
        rbEn = findViewById(R.id.rbEn)
        cbListenOnOpen = findViewById(R.id.cbListenOnOpen)
        cbAutoListen = findViewById(R.id.cbAutoListen)
        sbRate = findViewById(R.id.sbRate)
        tvVoice = findViewById(R.id.tvVoice)
        tvMemory = findViewById(R.id.tvMemory)

        if (p.provider == "claude") rbClaude.isChecked = true else rbGemini.isChecked = true
        etGeminiKey.setText(p.geminiKey)
        etGeminiModel.setText(p.geminiModel)
        etClaudeKey.setText(p.claudeKey)
        etClaudeModel.setText(p.claudeModel)
        if (p.askMode == "important") rbAskImportant.isChecked = true else rbAskAlways.isChecked = true
        when (p.sttLang) {
            "ru-RU" -> rbRu.isChecked = true
            "en-US" -> rbEn.isChecked = true
            else -> rbUz.isChecked = true
        }
        cbListenOnOpen.isChecked = p.listenOnOpen
        cbAutoListen.isChecked = p.autoListen
        sbRate.progress = ((p.ttsRate - 0.5f) * 100f).toInt().coerceIn(0, 150)
        tvVoice.text = EdithCore.voice.ttsInfo
        renderMemory()

        findViewById<Button>(R.id.btnGetGemini).setOnClickListener { open("https://aistudio.google.com/apikey") }
        findViewById<Button>(R.id.btnGetClaude).setOnClickListener { open("https://console.anthropic.com/settings/keys") }
        findViewById<Button>(R.id.btnTtsSettings).setOnClickListener {
            try {
                startActivity(Intent("com.android.settings.TTS_SETTINGS"))
            } catch (_: Exception) {
                Toast.makeText(this, "Ovoz sozlamalari topilmadi", Toast.LENGTH_SHORT).show()
            }
        }
        findViewById<Button>(R.id.btnTestVoice).setOnClickListener {
            p.ttsRate = rate()
            EdithCore.scope.launch {
                EdithCore.voice.speak("Salom, xoʻjayin! Men Edith. Ovozim yoqdimi? Yoqmasa ham, boshqasi yoʻq.")
            }
        }
        findViewById<Button>(R.id.btnClear).setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Xotirani tozalash")
                .setMessage("Suhbat tarixi, eslab qolingan faktlar va eslatmalar oʻchiriladi.")
                .setPositiveButton("Oʻchirish") { _, _ ->
                    for (r in EdithCore.memory.reminders.toList()) Reminders.cancel(this, r.id)
                    EdithCore.memory.clearAll()
                    renderMemory()
                }
                .setNegativeButton("Bekor", null)
                .show()
        }
        findViewById<Button>(R.id.btnSave).setOnClickListener {
            save()
            Toast.makeText(this, "Saqlandi", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun rate(): Float = 0.5f + sbRate.progress / 100f

    private fun open(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
        }
    }

    private fun renderMemory() {
        val m = EdithCore.memory
        val facts = if (m.facts.isEmpty()) "Hali hech narsa eslab qolinmagan."
        else m.facts.joinToString("\n") { "• " + it.text }
        tvMemory.text = facts + "\n\nEslatmalar: ${m.reminders.size} ta · Suhbat: ${m.history.size} ta xabar"
    }

    private fun save() {
        val p = EdithCore.prefs
        p.provider = if (rbClaude.isChecked) "claude" else "gemini"
        p.geminiKey = etGeminiKey.text.toString().trim()
        p.geminiModel = etGeminiModel.text.toString().trim().ifEmpty { Prefs.DEFAULT_GEMINI }
        p.claudeKey = etClaudeKey.text.toString().trim()
        p.claudeModel = etClaudeModel.text.toString().trim().ifEmpty { Prefs.DEFAULT_CLAUDE }
        p.askMode = if (rbAskImportant.isChecked) "important" else "always"
        p.sttLang = when {
            rbRu.isChecked -> "ru-RU"
            rbEn.isChecked -> "en-US"
            else -> "uz-UZ"
        }
        p.listenOnOpen = cbListenOnOpen.isChecked
        p.autoListen = cbAutoListen.isChecked
        p.ttsRate = rate()
    }
}
