package uz.edith.assistant

import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

enum class EState { IDLE, LISTENING, THINKING, SPEAKING, CONFIRM }

data class Answer(val decision: Boolean?, val raw: String)

interface UiListener {
    fun onMessage(role: String, text: String)
    fun onState(state: EState)
    fun onPartial(text: String)
    fun onConfirmRequest(question: String?)
    fun isInForeground(): Boolean
}

/** Edith'ning yuragi: tinglaydi, AI bilan oʻylaydi, ruxsat soʻraydi, bajaradi va gapiradi. */
object EdithCore {
    lateinit var app: Context
        private set
    lateinit var prefs: Prefs
        private set
    lateinit var memory: Memory
        private set
    lateinit var voice: Voice
        private set
    lateinit var tools: Tools
        private set

    private var ready = false
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    var ui: UiListener? = null
    var state = EState.IDLE
        private set
    var busy = false
        private set
    var broughtToFront = false

    private var job: Job? = null
    private var pendingAnswer: CompletableDeferred<Answer>? = null
    private var permissionUntil = 0L
    private var listenAgain = false

    fun init(ctx: Context) {
        if (ready) return
        app = ctx.applicationContext
        prefs = Prefs(app)
        memory = Memory(app)
        voice = Voice(app, prefs)
        voice.init()
        voice.onPartial = { ui?.onPartial(it) }
        tools = Tools(app)
        ready = true
    }

    val hasPermission: Boolean get() = System.currentTimeMillis() < permissionUntil

    fun grantPermission() {
        permissionUntil = System.currentTimeMillis() + 120_000
    }

    fun hasKey(): Boolean =
        if (prefs.provider == "claude") prefs.claudeKey.isNotBlank() else prefs.geminiKey.isNotBlank()

    private fun setState(s: EState) {
        state = s
        ui?.onState(s)
    }

    private fun show(role: String, text: String) {
        ui?.onMessage(role, text)
    }

    // ---------------------------------------------------------------- entry points

    fun onMicPressed() {
        if (busy) cancel() else startListening()
    }

    fun cancel() {
        job?.cancel()
        voice.stopAll()
    }

    fun startListening() = launchTurn {
        setState(EState.LISTENING)
        val heard = voice.listen()
        ui?.onPartial("")
        if (heard.isNullOrBlank()) {
            voice.lastErrorText()?.let { show("error", it) }
        } else {
            handle(heard.trim())
        }
    }

    fun submitText(text: String) = launchTurn { handle(text.trim()) }

    fun answerButton(yes: Boolean) {
        val d = pendingAnswer ?: return
        show("user", if (yes) "Ha" else "Yoʻq")
        voice.stopAll()
        d.complete(Answer(yes, if (yes) "ha" else "yoʻq"))
    }

    private fun launchTurn(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        listenAgain = false
        job = scope.launch {
            try {
                block()
            } catch (e: CancellationException) {
                // foydalanuvchi toʻxtatdi
            } catch (e: Exception) {
                show("error", "Kutilmagan xato: ${e.message ?: e.javaClass.simpleName}")
            } finally {
                busy = false
                pendingAnswer = null
                ui?.onConfirmRequest(null)
                ui?.onPartial("")
                setState(EState.IDLE)
                if (listenAgain && ui?.isInForeground() == true) {
                    listenAgain = false
                    scope.launch {
                        delay(350)
                        startListening()
                    }
                }
            }
        }
    }

    // ---------------------------------------------------------------- thinking loop

    private suspend fun handle(text: String) {
        if (text.isEmpty()) return
        show("user", text)
        memory.addHistory("user", text)
        setState(EState.THINKING)

        val client = makeClient()
        if (client == null) {
            reply("Avval sozlamalarda API kalitni kiriting, xoʻjayin. Miyasiz men shunchaki chiroyli aylanib turgan sharman.", false)
            return
        }
        client.start(systemPrompt(), memory.history.dropLast(1).takeLast(16), text)

        var finalText = ""
        var failed = false
        try {
            var steps = 0
            while (true) {
                if (steps++ >= 30) {
                    finalText = "Bu ish juda choʻzilib ketdi, shu yerda toʻxtadim, xoʻjayin."
                    break
                }
                val r = client.next()
                if (r.calls.isEmpty()) {
                    finalText = r.text.trim()
                    break
                }
                if (r.text.isNotBlank()) show("step", r.text.trim())
                val results = ArrayList<Pair<ToolCall, String>>()
                for (c in r.calls) {
                    show("step", Tools.label(c))
                    setState(EState.THINKING)
                    results.add(c to tools.run(c))
                }
                setState(EState.THINKING)
                client.addToolResults(results)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpException) {
            failed = true
            show("error", e.details())
            finalText = e.spoken()
        } catch (e: java.io.IOException) {
            failed = true
            finalText = "Internet bilan aloqa yoʻq shekilli, xoʻjayin. Tekshirib, qayta urinib koʻring."
        } catch (e: Exception) {
            failed = true
            show("error", e.toString())
            finalText = "Nimadir buzildi. Yana bir bor aytib koʻring."
        }
        if (finalText.isBlank()) finalText = "Bajarildi."
        reply(finalText, !failed)
        if (!failed && prefs.autoListen && finalText.trimEnd().endsWith("?")) listenAgain = true
    }

    private suspend fun reply(text: String, remember: Boolean) {
        show("edith", text)
        if (remember) memory.addHistory("edith", text)
        setState(EState.SPEAKING)
        voice.speak(text)
    }

    private fun makeClient(): LlmClient? {
        val specs = tools.specs
        return if (prefs.provider == "claude") {
            val key = prefs.claudeKey.trim()
            if (key.isEmpty()) null else ClaudeClient(key, prefs.claudeModel.trim().ifEmpty { Prefs.DEFAULT_CLAUDE }, specs)
        } else {
            val key = prefs.geminiKey.trim()
            if (key.isEmpty()) null else GeminiClient(key, prefs.geminiModel.trim().ifEmpty { Prefs.DEFAULT_GEMINI }, specs)
        }
    }

    // ---------------------------------------------------------------- voice permission

    suspend fun askYesNo(spoken: String, shown: String = spoken): Answer {
        ensureForeground()
        show("edith", shown)
        setState(EState.SPEAKING)
        voice.speak(spoken)
        val d = CompletableDeferred<Answer>()
        pendingAnswer = d
        ui?.onConfirmRequest(shown)
        setState(EState.CONFIRM)
        val ans = coroutineScope {
            val listener = launch {
                for (attempt in 0..1) {
                    if (d.isCompleted) break
                    val heard = voice.listen()
                    ui?.onPartial("")
                    if (d.isCompleted) break
                    if (!heard.isNullOrBlank()) {
                        show("user", heard)
                        val dec = YesNo.parse(heard)
                        if (dec != null || attempt == 1) {
                            d.complete(Answer(dec, heard))
                            break
                        }
                        voice.speak("Ha yoki yoʻq deb ayting, xoʻjayin.")
                    } else if (attempt == 0) {
                        voice.speak("Eshitmay qoldim. Ha yoki yoʻq?")
                    }
                }
            }
            val result = withTimeoutOrNull(45_000) { d.await() } ?: Answer(null, "")
            listener.cancel()
            result
        }
        voice.stopListening()
        pendingAnswer = null
        ui?.onConfirmRequest(null)
        setState(EState.THINKING)
        return ans
    }

    private suspend fun ensureForeground() {
        if (ui?.isInForeground() == true) return
        broughtToFront = true
        val starter: Context = EdithAccessibility.instance ?: app
        try {
            starter.startActivity(
                Intent(starter, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            )
        } catch (_: Exception) {
        }
        withTimeoutOrNull(4000) {
            while (ui?.isInForeground() != true) delay(100)
        }
        delay(300)
    }

    // ---------------------------------------------------------------- system prompt

    private fun systemPrompt(): String {
        val now = System.currentTimeMillis()
        val facts = if (memory.facts.isEmpty()) "(hali hech narsa yoʻq)"
        else memory.facts.joinToString("\n") { "- [${it.id}] ${it.text}" }
        val rems = memory.reminders.filter { it.due > now }.sortedBy { it.due }
        val remText = if (rems.isEmpty()) "(yoʻq)"
        else rems.joinToString("\n") { "- [${it.id}] ${Fmt.dateTime(it.due)}: ${it.text}" }
        val iso = ZonedDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        val access = if (EdithAccessibility.instance != null) "yoqilgan"
        else "YOQILMAGAN (boshqa ilovalarda ishlash uchun foydalanuvchi Edith'dagi 'Ekran boshqaruvi' tugmasini bosib, uni yoqishi kerak)"
        val rule1 = if (prefs.askMode == "always") {
            "1. Biror narsani oʻzgartiradigan HAR QANDAY ishdan oldin (ilova yoki havola ochish, ekranda bosish yoki yozish, budilnik, taymer, eslatma, chiroq, ovoz balandligi) request_permission bilan ovozli ruxsat soʻra. Butun rejani BITTA qisqa savolda ayt, masalan: \"Telegram'ni ochib, Akmalga kechikaman deb yozib yuboraymi?\" Ruxsat berilsa, shu vazifani oxirigacha qayta soʻramasdan bajar."
        } else {
            "1. Boshqa ilovalarning ekranida bosish, yozish yoki aylantirishdan oldin request_permission bilan ovozli ruxsat soʻra (butun rejani bitta savolda). Ilova ochish, budilnik, taymer, eslatma kabi oddiy ishlarni soʻramasdan bajaraver."
        }
        val lines = listOf(
            "Sen Edith'san: xoʻjayiningning (foydalanuvchining) Android telefonidagi shaxsiy sunʼiy intellekt yordamchisi. U bilan ovoz orqali gaplashasan va uning oʻrniga telefonda ishlarni bajarasan.",
            "",
            "TIL: Doim oʻzbek tilida, lotin yozuvida gapir (oʻ, gʻ, sh, ch toʻgʻri yozilsin). Foydalanuvchi boshqa tilda gapirsa ham, u soʻramaguncha oʻzbekcha javob ber.",
            "",
            "XARAKTER: Hazilkash, quvnoq, biroz shoʻx, lekin aqlli va ishonchli. Foydalanuvchini hazil aralash \"xoʻjayin\" deb chaqir. Hazilni tabiiy joyda va qisqa qil: oʻzbekona iboralar, yengil kinoya, kundalik hayotdan kulgili misollar. Har gapga hazil tiqishtirma. Foydalanuvchi xafa, charchagan yoki jiddiy boʻlsa, hazilni qoʻyib samimiy gapir. Hech qachon haqorat qilma.",
            "",
            "USLUB: Javobing ovoz chiqarib oʻqiladi. Qisqa gapir: odatda 1-2 gap. Roʻyxat, jadval, markdown va emoji ishlatma.",
            "",
            "ISH TARTIBI (juda muhim):",
            rule1,
            "2. Qoʻngʻiroq (call_phone) va SMS (send_sms) oʻzi tasdiq soʻraydi: ular uchun request_permission chaqirma, lekin question maydoniga tabiiy savol yoz.",
            "3. Foydalanuvchi rad etsa, toʻxta va buni yengil hazil bilan qabul qil.",
            "4. Raqam kerak boʻlsa, avval xotiradan, keyin find_contact bilan kontaktlardan qidir. Topilmasa yoki bir nechta chiqsa, kimligini soʻra.",
            "5. Boshqa ilovada ishlash tartibi: open_app, keyin read_screen(wait_seconds=2), keyin kerakli element raqami bilan tap yoki type_text, natijani har safar tekshir. Ekranni koʻrmasdan taxmin qilma. Xabar yuborishdan oldin matn toʻgʻri yozilganini tekshir.",
            "6. Hech qachon parol, karta raqami yoki SMS kod kiritma, toʻlovni tasdiqlama va hech narsani oʻchirib yuborma. Bunday joyga kelsang, toʻxta va foydalanuvchiga oʻzi qilishini ayt.",
            "7. Bajarmagan ishingni \"qildim\" dema. Natijani qisqa ayt.",
            "8. Foydalanuvchi oʻzi haqida muhim narsa aytsa (ismi, yaqinlari, ularning raqami, tugʻilgan kunlar, odatlari) yoki \"eslab qol\" desa, remember_fact bilan saqla.",
            "9. Yangilik, ob-havo, valyuta kursi kabi jonli maʼlumotni bilmaysan: buni hazil bilan tan ol va open_link bilan qidiruvni ochishni taklif qil.",
            "10. Eslatma vaqtini toʻliq ISO 8601 formatda, vaqt zonasi bilan ber. \"Ertaga ertalab\" kabi noaniq boʻlsa, oqilona vaqt tanla va javobda ayt.",
            "",
            "HOZIR: ${Fmt.now()} (ISO: $iso)",
            "TELEFON: ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE}",
            "EKRAN BOSHQARUVI: $access",
            "",
            "FOYDALANUVCHI HAQIDA ESLAB QOLINGANLAR:",
            facts,
            "",
            "FAOL ESLATMALAR:",
            remText
        )
        return lines.joinToString("\n")
    }
}
