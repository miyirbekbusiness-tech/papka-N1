package uz.edith.assistant

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Eshitish (SpeechRecognizer) va gapirish (TextToSpeech). Barcha metodlar asosiy oqimda chaqiriladi. */
class Voice(private val ctx: Context, private val prefs: Prefs) {
    private val main = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var ttsLang = ""
    private var recognizer: SpeechRecognizer? = null
    private var listenCont: CancellableContinuation<String?>? = null
    private var lastError = 0

    var onRms: ((Float) -> Unit)? = null
    var onPartial: ((String) -> Unit)? = null

    val ttsInfo: String
        get() = when {
            !ttsReady -> "Ovoz dvigateli hali tayyor emas."
            ttsLang == "uz" -> "Ovoz: oʻzbekcha."
            ttsLang == "tr" -> "Ovoz: turkcha (telefonda oʻzbekcha ovoz yoʻq, matnni turkcha talaffuzga moslab oʻqiyman)."
            ttsLang == "ru" -> "Ovoz: ruscha (matnni kirillga oʻgirib oʻqiyman)."
            else -> "Ovoz: telefonning standart tili."
        }

    fun init() {
        if (tts != null) return
        tts = TextToSpeech(ctx) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true
                tts?.let { ttsLang = Speech.pickLocale(it) }
            }
        }
    }

    suspend fun speak(text: String) {
        val t = tts ?: return
        if (!ttsReady || text.isBlank()) return
        val prepared = Speech.prepare(ttsLang, text)
        if (prepared.isBlank()) return
        val id = "u" + System.nanoTime()
        suspendCancellableCoroutine<Unit> { cont ->
            t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}

                override fun onDone(utteranceId: String?) {
                    if (utteranceId == id && cont.isActive) cont.resume(Unit)
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    if (utteranceId == id && cont.isActive) cont.resume(Unit)
                }

                override fun onStop(utteranceId: String?, interrupted: Boolean) {
                    if (utteranceId == id && cont.isActive) cont.resume(Unit)
                }
            })
            t.setSpeechRate(prefs.ttsRate)
            val r = t.speak(prepared, TextToSpeech.QUEUE_FLUSH, null, id)
            if (r != TextToSpeech.SUCCESS && cont.isActive) cont.resume(Unit)
            cont.invokeOnCancellation { main.post { try { t.stop() } catch (_: Exception) {} } }
        }
    }

    suspend fun listen(): String? = suspendCancellableCoroutine { cont ->
        lastError = 0
        if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
            lastError = -1
            cont.resume(null)
            return@suspendCancellableCoroutine
        }
        try {
            recognizer?.destroy()
        } catch (_: Exception) {
        }
        val rec = SpeechRecognizer.createSpeechRecognizer(ctx)
        recognizer = rec
        listenCont = cont

        fun finish(value: String?) {
            if (listenCont === cont) listenCont = null
            if (cont.isActive) cont.resume(value)
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, prefs.sttLang)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, prefs.sttLang)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.packageName)
        }
        rec.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {
                onRms?.invoke(rmsdB)
            }

            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onError(error: Int) {
                lastError = error
                finish(null)
            }

            override fun onResults(results: Bundle?) {
                val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                finish(text)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (!text.isNullOrBlank()) onPartial?.invoke(text)
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        try {
            rec.startListening(intent)
        } catch (e: Exception) {
            lastError = -2
            finish(null)
        }
        cont.invokeOnCancellation {
            main.post {
                try {
                    rec.cancel()
                } catch (_: Exception) {
                }
            }
        }
    }

    fun stopListening() {
        val c = listenCont
        listenCont = null
        try {
            recognizer?.cancel()
        } catch (_: Exception) {
        }
        if (c != null && c.isActive) c.resume(null)
    }

    fun stopSpeaking() {
        try {
            tts?.stop()
        } catch (_: Exception) {
        }
    }

    fun stopAll() {
        stopListening()
        stopSpeaking()
    }

    fun lastErrorText(): String? = when (lastError) {
        0, SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT, SpeechRecognizer.ERROR_CLIENT -> null
        -1 -> "Telefonda ovozni tanish xizmati topilmadi. Google ilovasini oʻrnating yoki yangilang."
        -2 -> "Mikrofonni ishga tushirib boʻlmadi. Yana bir bor bosib koʻring."
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Mikrofon ruxsati yoʻq. 'Ruxsatlar' tugmasini bosing."
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Ovozni tanish uchun internet kerak."
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Mikrofon band. Bir soniyadan keyin qayta bosing."
        12, 13 -> "Bu til ovozni tanishda ishlamayapti. Sozlamalarda boshqa tilni tanlang yoki Google ilovasini yangilang."
        else -> "Ovozni tanishda xato ($lastError). Yana bir bor urinib koʻring."
    }
}
