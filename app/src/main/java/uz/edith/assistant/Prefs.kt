package uz.edith.assistant

import android.content.Context

class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("edith", Context.MODE_PRIVATE)

    private fun str(key: String, def: String): String = sp.getString(key, def) ?: def
    private fun putStr(key: String, value: String) {
        sp.edit().putString(key, value).apply()
    }

    private fun bool(key: String, def: Boolean): Boolean = sp.getBoolean(key, def)
    private fun putBool(key: String, value: Boolean) {
        sp.edit().putBoolean(key, value).apply()
    }

    /** "gemini" yoki "claude" */
    var provider: String
        get() = str("provider", "gemini")
        set(v) = putStr("provider", v)

    var geminiKey: String
        get() = str("gemini_key", "")
        set(v) = putStr("gemini_key", v)

    var geminiModel: String
        get() = str("gemini_model", DEFAULT_GEMINI)
        set(v) = putStr("gemini_model", v)

    var claudeKey: String
        get() = str("claude_key", "")
        set(v) = putStr("claude_key", v)

    var claudeModel: String
        get() = str("claude_model", DEFAULT_CLAUDE)
        set(v) = putStr("claude_model", v)

    /** Ovozni tanish tili: uz-UZ, ru-RU, en-US */
    var sttLang: String
        get() = str("stt_lang", "uz-UZ")
        set(v) = putStr("stt_lang", v)

    /** "always" — har bir ishdan oldin, "important" — faqat muhimlarida */
    var askMode: String
        get() = str("ask_mode", "always")
        set(v) = putStr("ask_mode", v)

    var autoListen: Boolean
        get() = bool("auto_listen", true)
        set(v) = putBool("auto_listen", v)

    var listenOnOpen: Boolean
        get() = bool("listen_on_open", true)
        set(v) = putBool("listen_on_open", v)

    var greeted: Boolean
        get() = bool("greeted", false)
        set(v) = putBool("greeted", v)

    var ttsRate: Float
        get() = sp.getFloat("tts_rate", 1.0f)
        set(v) {
            sp.edit().putFloat("tts_rate", v).apply()
        }

    companion object {
        const val DEFAULT_GEMINI = "gemini-flash-latest"
        const val DEFAULT_CLAUDE = "claude-haiku-5-5"
    }
}
