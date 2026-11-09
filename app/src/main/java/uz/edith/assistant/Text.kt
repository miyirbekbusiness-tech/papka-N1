package uz.edith.assistant

import android.speech.tts.TextToSpeech
import java.util.Locale

/** "Ha" / "Yoʻq" javobini tushunish (oʻzbek, rus, ingliz; lotin va kirill). */
object YesNo {
    private fun norm(s: String): String = s.lowercase(Locale.ROOT)
        .replace('ʻ', '\'').replace('‘', '\'').replace('’', '\'').replace('`', '\'').replace('ʼ', '\'')

    private val yes = listOf(
        "ha", "xa", "haa", "hа", "ha ha", "albatta", "mayli", "ok", "okey", "okay", "xo'p", "xop", "hop",
        "bajar", "bajaring", "qil", "qiling", "yubor", "yuboring", "ruxsat", "roziman", "to'g'ri", "tog'ri",
        "ha qil", "da", "yes", "yeah", "sure",
        "ҳа", "ха", "хоп", "майли", "албатта", "да", "давай", "конечно", "ага", "разрешаю"
    ).map { norm(it) }

    private val no = listOf(
        "yo'q", "yoq", "yuq", "yo'q yo'q", "kerakmas", "kerak emas", "kerak mas", "bekor", "bekor qil",
        "to'xta", "toxta", "qilma", "yuborma", "no", "nope", "stop",
        "йўқ", "йук", "йок", "керакмас", "керак эмас", "нет", "не надо", "отмена", "стоп"
    ).map { norm(it) }

    fun parse(text: String): Boolean? {
        val words = norm(text).split(Regex("[^\\p{L}']+")).filter { it.isNotBlank() }
        if (words.isEmpty()) return null
        val joined = " " + words.joinToString(" ") + " "
        if (no.any { joined.contains(" $it ") }) return false
        if (yes.any { joined.contains(" $it ") }) return true
        return null
    }
}

/** Telefonda oʻzbekcha ovoz boʻlmasa, matnni turkcha yoki ruscha ovozga moslash. */
object Speech {
    fun normApos(s: String): String =
        s.replace('ʻ', '\'').replace('‘', '\'').replace('’', '\'').replace('`', '\'').replace('ʼ', '\'')

    private val trPairs = listOf("sh" to "ş", "ch" to "ç", "o'" to "o", "g'" to "ğ")
    private val trSingle = mapOf('j' to "c", 'q' to "k", 'x' to "h")

    private val cyrPairs = listOf(
        "yo" to "ё", "yu" to "ю", "ya" to "я", "ye" to "е", "sh" to "ш", "ch" to "ч", "o'" to "у", "g'" to "г"
    )
    private val cyrSingle = mapOf(
        'a' to "а", 'b' to "б", 'd' to "д", 'e' to "е", 'f' to "ф", 'g' to "г", 'h' to "х", 'i' to "и",
        'j' to "ж", 'k' to "к", 'l' to "л", 'm' to "м", 'n' to "н", 'o' to "о", 'p' to "п", 'q' to "к",
        'r' to "р", 's' to "с", 't' to "т", 'u' to "у", 'v' to "в", 'x' to "х", 'y' to "й", 'z' to "з",
        'c' to "к", 'w' to "в"
    )

    private fun translit(src: String, pairs: List<Pair<String, String>>, single: Map<Char, String>, dropApos: Boolean): String {
        val s = normApos(src)
        val sb = StringBuilder()
        var i = 0
        while (i < s.length) {
            val c = s[i]
            if (i + 1 < s.length) {
                val two = s.substring(i, i + 2).lowercase(Locale.ROOT)
                val pair = pairs.firstOrNull { it.first == two }
                if (pair != null) {
                    sb.append(if (c.isUpperCase()) pair.second.uppercase(Locale.ROOT) else pair.second)
                    i += 2
                    continue
                }
            }
            val m = single[c.lowercaseChar()]
            when {
                m != null -> sb.append(if (c.isUpperCase()) m.uppercase(Locale.ROOT) else m)
                c == '\'' && dropApos -> {}
                else -> sb.append(c)
            }
            i++
        }
        return sb.toString()
    }

    fun toTurkish(s: String): String = translit(s, trPairs, trSingle, true)
    fun toCyrillic(s: String): String = translit(s, cyrPairs, cyrSingle, true)

    fun clean(s: String): String = s
        .replace(Regex("https?://\\S+"), "havola")
        .replace(Regex("[*_#`>|]"), "")
        .replace(Regex("[\\p{So}\\p{Cs}\\x{1F000}-\\x{1FAFF}\\u2600-\\u27BF\\uFE0F\\u200D]"), "")
        .replace(Regex("\\s+"), " ")
        .trim()

    /** Mos ovoz tilini tanlaydi va qisqa kodini qaytaradi: "uz", "tr", "ru" yoki "". */
    fun pickLocale(t: TextToSpeech): String {
        val options = listOf(
            Locale("uz", "UZ") to "uz",
            Locale("uz") to "uz",
            Locale("tr", "TR") to "tr",
            Locale("ru", "RU") to "ru"
        )
        for ((loc, code) in options) {
            val r = try {
                t.isLanguageAvailable(loc)
            } catch (_: Exception) {
                TextToSpeech.LANG_NOT_SUPPORTED
            }
            if (r >= TextToSpeech.LANG_AVAILABLE) {
                try {
                    t.language = loc
                } catch (_: Exception) {
                }
                return code
            }
        }
        return ""
    }

    fun prepare(lang: String, text: String): String {
        val c = clean(text)
        return when (lang) {
            "tr" -> toTurkish(c)
            "ru" -> toCyrillic(c)
            else -> c
        }
    }
}
