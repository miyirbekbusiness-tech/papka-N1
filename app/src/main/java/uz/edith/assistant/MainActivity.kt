package uz.edith.assistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity(), UiListener {

    private lateinit var chat: LinearLayout
    private lateinit var scroll: ScrollView
    private lateinit var orb: OrbView
    private lateinit var status: TextView
    private lateinit var partial: TextView
    private lateinit var input: EditText
    private lateinit var mic: ImageButton
    private lateinit var confirmBar: View
    private lateinit var confirmText: TextView
    private lateinit var setupCard: View
    private lateinit var setupText: TextView
    private lateinit var btnPerms: Button
    private lateinit var btnAccess: Button
    private lateinit var btnKey: Button

    private var foreground = false
    private var autoListenPending = true

    private val permLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refreshSetup() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        EdithCore.init(this)
        setContentView(R.layout.activity_main)

        chat = findViewById(R.id.chat)
        scroll = findViewById(R.id.scroll)
        orb = findViewById(R.id.orb)
        status = findViewById(R.id.status)
        partial = findViewById(R.id.partial)
        input = findViewById(R.id.input)
        mic = findViewById(R.id.btnMic)
        confirmBar = findViewById(R.id.confirmBar)
        confirmText = findViewById(R.id.confirmText)
        setupCard = findViewById(R.id.setupCard)
        setupText = findViewById(R.id.setupText)
        btnPerms = findViewById(R.id.btnPerms)
        btnAccess = findViewById(R.id.btnAccess)
        btnKey = findViewById(R.id.btnKey)

        findViewById<View>(R.id.btnSettings).setOnClickListener { openSettings() }
        findViewById<View>(R.id.btnSend).setOnClickListener { sendTyped() }
        findViewById<View>(R.id.btnYes).setOnClickListener { EdithCore.answerButton(true) }
        findViewById<View>(R.id.btnNo).setOnClickListener { EdithCore.answerButton(false) }
        btnPerms.setOnClickListener { requestPerms() }
        btnAccess.setOnClickListener { showAccessibilityHelp() }
        btnKey.setOnClickListener { openSettings() }
        orb.setOnClickListener { onMic() }
        mic.setOnClickListener { onMic() }
        input.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendTyped()
                true
            } else false
        }

        EdithCore.voice.onRms = { db -> orb.level = ((db + 2f) / 12f).coerceIn(0f, 1f) }

        renderHistory()
        if (!EdithCore.prefs.greeted) {
            EdithCore.prefs.greeted = true
            val hello = "Salom, xoʻjayin! Men Edith. Menga ruxsatlar, ekran boshqaruvi va API kalit bersangiz, telefoningizdagi ishlarni sizning ruxsatingiz bilan oʻzim bajaraman. Choy damlashni hali oʻrganmadim, lekin ustida ishlayapman."
            addBubble("edith", hello)
            autoListenPending = false
            EdithCore.scope.launch { EdithCore.voice.speak(hello) }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.action == Intent.ACTION_ASSIST || intent.action == Intent.ACTION_MAIN) autoListenPending = true
    }

    override fun onResume() {
        super.onResume()
        foreground = true
        EdithCore.ui = this
        if (!EdithCore.busy) EdithCore.memory.load()
        onState(EdithCore.state)
        refreshSetup()
        if (autoListenPending) {
            autoListenPending = false
            if (EdithCore.prefs.listenOnOpen && EdithCore.hasKey() && micGranted() && !EdithCore.busy) {
                mic.postDelayed({ if (foreground && !EdithCore.busy) EdithCore.startListening() }, 700)
            }
        }
    }

    override fun onPause() {
        super.onPause()
        foreground = false
    }

    override fun onDestroy() {
        if (EdithCore.ui === this) EdithCore.ui = null
        super.onDestroy()
    }

    // ---------------------------------------------------------------- actions

    private fun onMic() {
        if (!micGranted()) {
            requestPerms()
            return
        }
        EdithCore.onMicPressed()
    }

    private fun sendTyped() {
        val text = input.text.toString().trim()
        if (text.isEmpty()) return
        if (EdithCore.busy) {
            Toast.makeText(this, "Edith hozir band. Toʻxtatish uchun mikrofon tugmasini bosing.", Toast.LENGTH_SHORT).show()
            return
        }
        input.setText("")
        val imm = getSystemService(InputMethodManager::class.java)
        imm?.hideSoftInputFromWindow(input.windowToken, 0)
        EdithCore.submitText(text)
    }

    private fun openSettings() {
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    private fun micGranted(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    private fun missingPerms(): List<String> {
        val list = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CALL_PHONE,
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_CONTACTS
        )
        if (Build.VERSION.SDK_INT >= 33) list.add(Manifest.permission.POST_NOTIFICATIONS)
        return list.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
    }

    private fun requestPerms() {
        val missing = missingPerms()
        if (missing.isEmpty()) {
            refreshSetup()
            return
        }
        permLauncher.launch(missing.toTypedArray())
    }

    private fun refreshSetup() {
        val perms = missingPerms()
        val access = EdithAccessibility.instance != null
        val key = EdithCore.hasKey()
        val items = mutableListOf<String>()
        if (perms.isNotEmpty()) items.add("ruxsatlar (mikrofon, qoʻngʻiroq, SMS, kontaktlar)")
        if (!access) items.add("ekran boshqaruvi")
        if (!key) items.add("API kalit")
        setupCard.visibility = if (items.isEmpty()) View.GONE else View.VISIBLE
        setupText.text = "Edith toʻliq ishlashi uchun kerak: " + items.joinToString(", ") + "."
        btnPerms.visibility = if (perms.isEmpty()) View.GONE else View.VISIBLE
        btnAccess.visibility = if (access) View.GONE else View.VISIBLE
        btnKey.visibility = if (key) View.GONE else View.VISIBLE
    }

    private fun showAccessibilityHelp() {
        AlertDialog.Builder(this)
            .setTitle("Ekran boshqaruvini yoqish")
            .setMessage(
                "Ochilgan oynada \"Oʻrnatilgan ilovalar\" (Installed apps / Downloaded apps) boʻlimidan \"Edith ekran boshqaruvi\"ni topib yoqing.\n\n" +
                    "Agar \"Cheklangan sozlama\" (Restricted setting) deb chiqsa: \"Ilova sozlamalari\" tugmasini bosing, yuqori oʻng burchakdagi ⋮ belgisidan " +
                    "\"Cheklangan sozlamalarga ruxsat berish\"ni tanlang va qaytadan urinib koʻring.\n\n" +
                    "Bu Edith'ga ekranni oʻqish va siz uchun bosish imkonini beradi. Har bir ishdan oldin u sizdan ovozli ruxsat soʻraydi."
            )
            .setPositiveButton("Sozlamalarni ochish") { _, _ ->
                try {
                    startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                } catch (_: Exception) {
                }
            }
            .setNeutralButton("Ilova sozlamalari") { _, _ ->
                try {
                    startActivity(
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
                    )
                } catch (_: Exception) {
                }
            }
            .setNegativeButton("Keyinroq", null)
            .show()
    }

    // ---------------------------------------------------------------- chat rendering

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun renderHistory() {
        chat.removeAllViews()
        val h = EdithCore.memory.history
        if (h.isEmpty()) {
            addBubble(
                "edith",
                "${Fmt.greeting()}, xoʻjayin! Mikrofonni bosing va buyuring: qoʻngʻiroq, SMS, budilnik, eslatma yoki Telegram'da xabar. Har bir ishdan oldin sizdan ruxsat soʻrayman."
            )
        } else {
            for (line in h.takeLast(20)) addBubble(if (line.role == "user") "user" else "edith", line.text)
        }
    }

    private fun addBubble(role: String, text: String) {
        val tv = TextView(this)
        val lp = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        tv.maxWidth = (resources.displayMetrics.widthPixels * 0.84f).toInt()
        tv.setLineSpacing(0f, 1.15f)
        tv.setTextIsSelectable(role != "step")
        when (role) {
            "user" -> {
                tv.text = text
                tv.textSize = 15.5f
                tv.setTextColor(ContextCompat.getColor(this, R.color.text))
                tv.setBackgroundResource(R.drawable.bg_bubble_user)
                tv.setPadding(dp(14), dp(10), dp(14), dp(10))
                lp.gravity = Gravity.END
                lp.topMargin = dp(12)
            }
            "step" -> {
                tv.text = "› $text"
                tv.textSize = 12.5f
                tv.typeface = Typeface.MONOSPACE
                tv.setTextColor(ContextCompat.getColor(this, R.color.muted))
                tv.setPadding(dp(4), dp(1), dp(4), dp(1))
                lp.gravity = Gravity.START
                lp.topMargin = dp(4)
            }
            "error" -> {
                tv.text = text
                tv.textSize = 13.5f
                tv.setTextColor(ContextCompat.getColor(this, R.color.danger))
                tv.setBackgroundResource(R.drawable.bg_bubble_error)
                tv.setPadding(dp(12), dp(8), dp(12), dp(8))
                lp.gravity = Gravity.START
                lp.topMargin = dp(8)
            }
            else -> {
                tv.text = text
                tv.textSize = 15.5f
                tv.setTextColor(ContextCompat.getColor(this, R.color.text))
                tv.setBackgroundResource(R.drawable.bg_bubble_edith)
                tv.setPadding(dp(14), dp(10), dp(14), dp(10))
                lp.gravity = Gravity.START
                lp.topMargin = dp(12)
            }
        }
        chat.addView(tv, lp)
        while (chat.childCount > 150) chat.removeViewAt(0)
        scroll.post { scroll.smoothScrollTo(0, chat.height) }
    }

    // ---------------------------------------------------------------- UiListener

    override fun onMessage(role: String, text: String) {
        addBubble(role, text)
    }

    override fun onState(state: EState) {
        orb.mode = state
        status.text = when (state) {
            EState.IDLE -> "TAYYOR"
            EState.LISTENING -> "ESHITYAPMAN"
            EState.THINKING -> "OʻYLAYAPMAN"
            EState.SPEAKING -> "GAPIRYAPMAN"
            EState.CONFIRM -> "RUXSATINGIZNI KUTYAPMAN"
        }
        status.setTextColor(
            ContextCompat.getColor(
                this,
                when (state) {
                    EState.LISTENING, EState.CONFIRM -> R.color.warm
                    EState.IDLE -> R.color.muted
                    else -> R.color.accent
                }
            )
        )
        mic.setImageResource(if (state == EState.IDLE) R.drawable.ic_mic else R.drawable.ic_stop)
        if (state != EState.LISTENING && state != EState.CONFIRM) orb.level = 0f
    }

    override fun onPartial(text: String) {
        partial.text = text
    }

    override fun onConfirmRequest(question: String?) {
        if (question == null) {
            confirmBar.visibility = View.GONE
        } else {
            confirmText.text = question
            confirmBar.visibility = View.VISIBLE
        }
    }

    override fun isInForeground(): Boolean = foreground
}
