package uz.edith.assistant

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

data class Fact(val id: String, val text: String)
data class Reminder(val id: String, val text: String, val due: Long)
data class ChatLine(val role: String, val text: String)

/** Edith'ning doimiy xotirasi: faktlar, eslatmalar va suhbat tarixi (telefonda, JSON faylda). */
class Memory(private val ctx: Context) {
    val facts = ArrayList<Fact>()
    val reminders = ArrayList<Reminder>()
    val history = ArrayList<ChatLine>()

    private val file: File get() = File(ctx.filesDir, "edith_memory.json")

    init {
        load()
    }

    @Synchronized
    fun load() {
        facts.clear()
        reminders.clear()
        history.clear()
        try {
            if (!file.exists()) return
            val o = JSONObject(file.readText())
            val fa = o.optJSONArray("facts") ?: JSONArray()
            for (i in 0 until fa.length()) {
                val f = fa.getJSONObject(i)
                facts.add(Fact(f.optString("id"), f.optString("text")))
            }
            val ra = o.optJSONArray("reminders") ?: JSONArray()
            for (i in 0 until ra.length()) {
                val r = ra.getJSONObject(i)
                reminders.add(Reminder(r.optString("id"), r.optString("text"), r.optLong("due")))
            }
            val ha = o.optJSONArray("history") ?: JSONArray()
            for (i in 0 until ha.length()) {
                val h = ha.getJSONObject(i)
                history.add(ChatLine(h.optString("role"), h.optString("text")))
            }
        } catch (_: Exception) {
        }
    }

    @Synchronized
    fun save() {
        try {
            val o = JSONObject()
            val fa = JSONArray()
            for (f in facts) fa.put(JSONObject().put("id", f.id).put("text", f.text))
            val ra = JSONArray()
            for (r in reminders) ra.put(JSONObject().put("id", r.id).put("text", r.text).put("due", r.due))
            val ha = JSONArray()
            for (h in history) ha.put(JSONObject().put("role", h.role).put("text", h.text))
            o.put("facts", fa).put("reminders", ra).put("history", ha)
            file.writeText(o.toString())
        } catch (_: Exception) {
        }
    }

    fun newId(): String {
        val chars = "abcdefghjkmnpqrstuvwxyz23456789"
        return (1..4).map { chars.random() }.joinToString("")
    }

    @Synchronized
    fun addHistory(role: String, text: String) {
        history.add(ChatLine(role, text.take(2000)))
        while (history.size > 40) history.removeAt(0)
        save()
    }

    @Synchronized
    fun addFact(text: String): Fact {
        val f = Fact(newId(), text.take(300))
        facts.add(f)
        while (facts.size > 150) facts.removeAt(0)
        save()
        return f
    }

    @Synchronized
    fun removeFact(id: String): Boolean {
        val removed = facts.removeAll { it.id == id }
        save()
        return removed
    }

    @Synchronized
    fun addReminder(r: Reminder) {
        reminders.add(r)
        save()
    }

    @Synchronized
    fun removeReminder(id: String): Boolean {
        val removed = reminders.removeAll { it.id == id }
        save()
        return removed
    }

    @Synchronized
    fun clearAll() {
        facts.clear()
        reminders.clear()
        history.clear()
        save()
    }
}

/** Oʻzbekcha sana va vaqt. */
object Fmt {
    private val months = arrayOf(
        "yanvar", "fevral", "mart", "aprel", "may", "iyun",
        "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"
    )
    private val days = arrayOf("dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba")

    private fun two(n: Int): String = if (n < 10) "0$n" else n.toString()

    fun dateTime(ms: Long): String {
        val z = Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault())
        val d = z.toLocalDate()
        val today = LocalDate.now()
        val hm = two(z.hour) + ":" + two(z.minute)
        return when (d) {
            today -> "bugun $hm"
            today.plusDays(1) -> "ertaga $hm"
            else -> "${d.dayOfMonth}-${months[d.monthValue - 1]} $hm"
        }
    }

    fun now(): String {
        val z = ZonedDateTime.now()
        return "${z.year}-yil ${z.dayOfMonth}-${months[z.monthValue - 1]}, ${days[z.dayOfWeek.value - 1]}, soat ${two(z.hour)}:${two(z.minute)}"
    }

    fun greeting(): String {
        val h = ZonedDateTime.now().hour
        return when (h) {
            in 5..10 -> "Xayrli tong"
            in 11..16 -> "Xayrli kun"
            in 17..22 -> "Xayrli kech"
            else -> "Hali uxlamadingizmi"
        }
    }
}
