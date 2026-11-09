package uz.edith.assistant

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.provider.AlarmClock
import android.provider.ContactsContract
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId

/** Edith'ning "qoʻllari": AI chaqira oladigan barcha amallar. */
class Tools(private val ctx: Context) {

    private val core get() = EdithCore

    // ---------------------------------------------------------------- schema helpers

    private fun obj(vararg props: Pair<String, JSONObject>, required: List<String> = emptyList()): JSONObject {
        val p = JSONObject()
        for ((k, v) in props) p.put(k, v)
        val o = JSONObject().put("type", "object").put("properties", p)
        if (required.isNotEmpty()) o.put("required", JSONArray(required))
        return o
    }

    private fun sProp(desc: String) = JSONObject().put("type", "string").put("description", desc)
    private fun iProp(desc: String) = JSONObject().put("type", "integer").put("description", desc)
    private fun bProp(desc: String) = JSONObject().put("type", "boolean").put("description", desc)
    private fun eProp(desc: String, vararg values: String) =
        JSONObject().put("type", "string").put("description", desc).put("enum", JSONArray(values.toList()))

    val specs: List<ToolSpec> = listOf(
        ToolSpec(
            "request_permission",
            "Foydalanuvchidan ovoz orqali ruxsat soʻraydi (ha/yoʻq). Biror narsani oʻzgartiradigan ishdan oldin butun rejani bitta qisqa savolda soʻra.",
            obj("question" to sProp("Ovoz chiqarib beriladigan qisqa savol, masalan: 'Telegram'ni ochib, Akmalga kechikaman deb yozaymi?'"), required = listOf("question"))
        ),
        ToolSpec(
            "call_phone",
            "Raqamga qoʻngʻiroq qiladi. Oʻzi ovozli tasdiq soʻraydi, shuning uchun bundan oldin request_permission chaqirma.",
            obj(
                "number" to sProp("Telefon raqami, masalan +998901234567"),
                "name" to sProp("Kimga qoʻngʻiroq (ism). Nomaʼlum boʻlsa boʻsh qoldir"),
                "question" to sProp("Tabiiy tasdiqlash savoli, masalan: 'Onangizga qoʻngʻiroq qilaymi?'"),
                required = listOf("number", "question")
            )
        ),
        ToolSpec(
            "send_sms",
            "SMS yuboradi. Oʻzi ovozli tasdiq soʻraydi, shuning uchun bundan oldin request_permission chaqirma.",
            obj(
                "number" to sProp("Telefon raqami"),
                "text" to sProp("SMS matni"),
                "name" to sProp("Kimga (ism)"),
                "question" to sProp("Tasdiqlash savoli, matnni ham qisqa ayt, masalan: 'Akmalga \"kechikaman\" deb SMS yuboraymi?'"),
                required = listOf("number", "text", "question")
            )
        ),
        ToolSpec(
            "find_contact",
            "Telefon kontaktlaridan ism boʻyicha raqam qidiradi.",
            obj("query" to sProp("Ism yoki uning bir qismi, masalan 'Onam', 'Akmal'"), required = listOf("query"))
        ),
        ToolSpec(
            "open_app",
            "Telefondagi ilovani nomi boʻyicha ochadi.",
            obj("app_name" to sProp("Ilovaning telefonda koʻrinadigan nomi: Telegram, YouTube, Camera, Settings, Chrome va h.k."), required = listOf("app_name"))
        ),
        ToolSpec(
            "open_link",
            "Havolani ochadi: YouTube qidiruvi, Google Maps, Google qidiruvi va boshqalar.",
            obj("url" to sProp("https:// bilan boshlanadigan toʻliq havola"), required = listOf("url"))
        ),
        ToolSpec(
            "set_alarm",
            "Soat ilovasida budilnik qoʻyadi (ilova yopiq boʻlsa ham jiringlaydi).",
            obj(
                "hour" to iProp("Soat, 0-23"),
                "minute" to iProp("Daqiqa, 0-59"),
                "label" to sProp("Budilnik nomi"),
                required = listOf("hour", "minute")
            )
        ),
        ToolSpec(
            "set_timer",
            "Soat ilovasida taymer qoʻyadi.",
            obj("seconds" to iProp("Necha soniya"), "label" to sProp("Taymer nomi"), required = listOf("seconds"))
        ),
        ToolSpec(
            "add_reminder",
            "Belgilangan vaqtda bildirishnoma va ovoz bilan eslatadi.",
            obj(
                "text" to sProp("Nimani eslatish"),
                "due" to sProp("ISO 8601 vaqt, zona bilan, masalan 2026-11-09T09:00:00+05:00"),
                required = listOf("text", "due")
            )
        ),
        ToolSpec(
            "delete_reminder",
            "Eslatmani id boʻyicha oʻchiradi.",
            obj("id" to sProp("Eslatma id"), required = listOf("id"))
        ),
        ToolSpec(
            "remember_fact",
            "Foydalanuvchi haqidagi muhim maʼlumotni doimiy xotiraga yozadi.",
            obj("fact" to sProp("Qisqa fakt, masalan: 'Onasining raqami +998901234567'"), required = listOf("fact"))
        ),
        ToolSpec(
            "forget_fact",
            "Xotiradagi faktni id boʻyicha oʻchiradi.",
            obj("id" to sProp("Fakt id"), required = listOf("id"))
        ),
        ToolSpec("device_status", "Batareya, quvvatlanish va vaqtni aytadi.", obj()),
        ToolSpec(
            "flashlight",
            "Chiroqni (fonarik) yoqadi yoki oʻchiradi.",
            obj("on" to bProp("true — yoqish, false — oʻchirish"), required = listOf("on"))
        ),
        ToolSpec(
            "set_volume",
            "Musiqa va video ovoz balandligini foizda oʻrnatadi.",
            obj("percent" to iProp("0 dan 100 gacha"), required = listOf("percent"))
        ),
        ToolSpec(
            "read_screen",
            "Hozir ekranda nima borligini raqamlangan elementlar roʻyxati sifatida qaytaradi.",
            obj("wait_seconds" to iProp("Oʻqishdan oldin necha soniya kutish (ilova yuklanishi uchun), 0-5"))
        ),
        ToolSpec(
            "tap",
            "Ekrandagi elementni raqami boʻyicha bosadi. Raqamni read_screen natijasidan ol.",
            obj("element" to iProp("Element raqami"), required = listOf("element"))
        ),
        ToolSpec(
            "type_text",
            "Matn maydoniga matn yozadi.",
            obj("element" to iProp("Matn maydoni raqami"), "text" to sProp("Yoziladigan matn"), required = listOf("element", "text"))
        ),
        ToolSpec(
            "scroll",
            "Ekranni pastga yoki tepaga aylantiradi.",
            obj("direction" to eProp("Yoʻnalish", "down", "up"), required = listOf("direction"))
        ),
        ToolSpec(
            "press_button",
            "Tizim tugmasini bosadi: orqaga, bosh ekran, oxirgi ilovalar yoki bildirishnomalar.",
            obj("button" to eProp("Tugma", "back", "home", "recents", "notifications"), required = listOf("button"))
        )
    )

    // ---------------------------------------------------------------- run

    suspend fun run(c: ToolCall): String = try {
        exec(c)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        "Xato: " + (e.message ?: e.javaClass.simpleName)
    }

    private suspend fun exec(c: ToolCall): String {
        val a = c.args
        val strict = core.prefs.askMode == "always"
        return when (c.name) {
            "request_permission" -> requestPermission(a.optString("question"))
            "call_phone" -> callPhone(a)
            "send_sms" -> sendSms(a)
            "find_contact" -> findContact(a.optString("query"))
            "open_app" -> gate(strict) ?: openApp(a.optString("app_name"))
            "open_link" -> gate(strict) ?: openLink(a.optString("url"))
            "set_alarm" -> gate(strict) ?: setAlarm(a.optInt("hour", -1), a.optInt("minute", 0), a.optString("label"))
            "set_timer" -> gate(strict) ?: setTimer(a.optInt("seconds", 0), a.optString("label"))
            "add_reminder" -> gate(strict) ?: addReminder(a.optString("text"), a.optString("due"))
            "delete_reminder" -> deleteReminder(a.optString("id"))
            "remember_fact" -> rememberFact(a.optString("fact"))
            "forget_fact" -> forgetFact(a.optString("id"))
            "device_status" -> deviceStatus()
            "flashlight" -> gate(strict) ?: flashlight(a.optBoolean("on", true))
            "set_volume" -> gate(strict) ?: setVolume(a.optInt("percent", 50))
            "read_screen" -> readScreen(a.optInt("wait_seconds", 0))
            "tap" -> gate(true) ?: screenAction { it.tap(a.optInt("element", -1)) }
            "type_text" -> gate(true) ?: screenAction { it.type(a.optInt("element", -1), a.optString("text")) }
            "scroll" -> gate(true) ?: screenAction { it.scroll(a.optString("direction") != "up") }
            "press_button" -> gate(true) ?: screenAction { it.global(a.optString("button")) }
            else -> "Bunday asbob yoʻq: ${c.name}"
        }
    }

    private fun gate(required: Boolean): String? =
        if (required && !core.hasPermission) {
            "RUXSAT YOʻQ. Avval request_permission bilan foydalanuvchidan ovozli ruxsat soʻra (butun rejani bitta savolda ayt)."
        } else null

    private fun granted(perm: String): Boolean =
        ContextCompat.checkSelfPermission(ctx, perm) == PackageManager.PERMISSION_GRANTED

    private fun startAct(intent: Intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val starter: Context = EdithAccessibility.instance ?: ctx
        starter.startActivity(intent)
    }

    // ---------------------------------------------------------------- permission

    private suspend fun requestPermission(question: String): String {
        val ans = core.askYesNo(question.ifBlank { "Davom etaymi?" })
        val front = if (core.broughtToFront) {
            " Diqqat: savol berish uchun Edith oynasi oldinga chiqdi. Boshqa ilovada davom etish uchun uni open_app bilan qayta och."
        } else ""
        core.broughtToFront = false
        return when (ans.decision) {
            true -> {
                core.grantPermission()
                "Foydalanuvchi RUXSAT BERDI.$front"
            }
            false -> "Foydalanuvchi RAD ETDI. Bu ishni qilma."
            null -> "Aniq javob boʻlmadi (\"${ans.raw}\"). Ishni qilma."
        }
    }

    // ---------------------------------------------------------------- phone

    private fun cleanNumber(s: String): String {
        val t = s.trim()
        val digits = t.filter { it.isDigit() }
        return if (t.startsWith("+")) "+$digits" else digits
    }

    private fun pretty(num: String): String {
        val d = num.filter { it.isDigit() }
        return if (d.length == 12 && d.startsWith("998")) {
            "+998 ${d.substring(3, 5)} ${d.substring(5, 8)} ${d.substring(8, 10)} ${d.substring(10, 12)}"
        } else num
    }

    private fun spoken(num: String): String {
        val d = num.filter { it.isDigit() }
        val tail = if (d.length > 9) d.takeLast(9) else d
        return tail.chunked(2).joinToString(" ")
    }

    private suspend fun callPhone(a: JSONObject): String {
        val num = cleanNumber(a.optString("number"))
        if (num.count { it.isDigit() } < 3) return "Raqam notoʻgʻri: ${a.optString("number")}"
        if (!granted(Manifest.permission.CALL_PHONE)) {
            return "Qoʻngʻiroq ruxsati berilmagan. Foydalanuvchiga Edith'dagi 'Ruxsatlar' tugmasini bosishni ayt."
        }
        val name = a.optString("name").trim()
        val q = a.optString("question").ifBlank { "Qoʻngʻiroq qilaymi?" }
        val shown = q + "\n" + (if (name.isNotEmpty()) "$name · " else "") + pretty(num)
        val say = if (name.isEmpty()) "$q Raqam: ${spoken(num)}" else q
        val ans = core.askYesNo(say, shown)
        if (ans.decision != true) return "Foydalanuvchi qoʻngʻiroqqa ruxsat bermadi."
        startAct(Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(num))))
        return "Qoʻngʻiroq boshlandi: ${name.ifEmpty { num }}."
    }

    private suspend fun sendSms(a: JSONObject): String {
        val num = cleanNumber(a.optString("number"))
        val text = a.optString("text").trim()
        if (num.count { it.isDigit() } < 3) return "Raqam notoʻgʻri: ${a.optString("number")}"
        if (text.isEmpty()) return "SMS matni boʻsh."
        if (!granted(Manifest.permission.SEND_SMS)) {
            return "SMS ruxsati berilmagan. Foydalanuvchiga Edith'dagi 'Ruxsatlar' tugmasini bosishni ayt."
        }
        val name = a.optString("name").trim()
        val q = a.optString("question").ifBlank { "SMS yuboraymi?" }
        val shown = q + "\n" + (if (name.isNotEmpty()) "$name · " else "") + pretty(num) + "\n«" + text + "»"
        val ans = core.askYesNo(q, shown)
        if (ans.decision != true) return "Foydalanuvchi SMS yuborishga ruxsat bermadi."
        val sms: SmsManager = if (Build.VERSION.SDK_INT >= 31) {
            ctx.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
        val parts = sms.divideMessage(text)
        if (parts.size > 1) {
            sms.sendMultipartTextMessage(num, null, parts, null, null)
        } else {
            sms.sendTextMessage(num, null, text, null, null)
        }
        return "SMS yuborildi: ${name.ifEmpty { num }}."
    }

    private fun norm(s: String): String = s.lowercase().replace(Regex("[^\\p{L}\\p{Nd}]"), "")

    private fun findContact(q: String): String {
        if (!granted(Manifest.permission.READ_CONTACTS)) {
            return "Kontaktlarni oʻqish ruxsati yoʻq. Foydalanuvchiga 'Ruxsatlar' tugmasini bosishni ayt."
        }
        val target = norm(q)
        if (target.isEmpty()) return "Qidiruv soʻzi boʻsh."
        val all = ArrayList<Pair<String, String>>()
        val cursor = ctx.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER),
            null, null, null
        )
        cursor?.use { cur ->
            while (cur.moveToNext() && all.size < 5000) {
                val n = cur.getString(0)
                val p = cur.getString(1)
                if (n != null && p != null) all.add(n to p)
            }
        }
        val found = LinkedHashSet<String>()
        for ((n, p) in all) {
            val nn = norm(n)
            if (nn.contains(target) || (nn.length >= 3 && target.contains(nn))) found.add("$n: $p")
            if (found.size >= 8) break
        }
        return if (found.isEmpty()) "\"$q\" boʻyicha kontakt topilmadi." else "Topildi:\n" + found.joinToString("\n")
    }

    // ---------------------------------------------------------------- apps & links

    private fun openApp(name: String): String {
        val target = norm(name)
        if (target.isEmpty()) return "Ilova nomi boʻsh."
        val pm = ctx.packageManager
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        @Suppress("DEPRECATION")
        val list = pm.queryIntentActivities(launcher, 0)
        val apps = list.map {
            val label = it.loadLabel(pm).toString()
            Triple(label, it.activityInfo.packageName, norm(label))
        }
        val hit = apps.firstOrNull { it.third == target }
            ?: apps.firstOrNull { it.third.startsWith(target) }
            ?: apps.firstOrNull { it.third.contains(target) }
            ?: apps.firstOrNull { it.second.lowercase().contains(target) }
        if (hit == null) {
            val names = apps.map { it.first }.distinct().sorted().take(60).joinToString(", ")
            return "\"$name\" ilovasi topilmadi. Telefondagi ilovalar: $names"
        }
        val launch = pm.getLaunchIntentForPackage(hit.second) ?: return "${hit.first} ochilmadi."
        startAct(launch)
        return "${hit.first} ochildi. Ekranni koʻrish uchun read_screen(wait_seconds=2) chaqir."
    }

    private fun openLink(url: String): String {
        val u = url.trim()
        if (!u.startsWith("https://") && !u.startsWith("http://")) return "Havola https:// bilan boshlanishi kerak."
        return try {
            startAct(Intent(Intent.ACTION_VIEW, Uri.parse(u)))
            "Havola ochildi."
        } catch (e: ActivityNotFoundException) {
            "Bu havolani ochadigan ilova topilmadi."
        }
    }

    // ---------------------------------------------------------------- clock

    private fun setAlarm(hour: Int, minute: Int, label: String): String {
        if (hour !in 0..23 || minute !in 0..59) return "Vaqt notoʻgʻri."
        val i = Intent(AlarmClock.ACTION_SET_ALARM)
            .putExtra(AlarmClock.EXTRA_HOUR, hour)
            .putExtra(AlarmClock.EXTRA_MINUTES, minute)
            .putExtra(AlarmClock.EXTRA_SKIP_UI, true)
        if (label.isNotBlank()) i.putExtra(AlarmClock.EXTRA_MESSAGE, label)
        return try {
            startAct(i)
            "Budilnik qoʻyildi: " + (if (hour < 10) "0$hour" else "$hour") + ":" + (if (minute < 10) "0$minute" else "$minute")
        } catch (e: ActivityNotFoundException) {
            "Soat ilovasi topilmadi."
        }
    }

    private fun setTimer(seconds: Int, label: String): String {
        if (seconds <= 0) return "Vaqt notoʻgʻri."
        val i = Intent(AlarmClock.ACTION_SET_TIMER)
            .putExtra(AlarmClock.EXTRA_LENGTH, seconds)
            .putExtra(AlarmClock.EXTRA_SKIP_UI, true)
        if (label.isNotBlank()) i.putExtra(AlarmClock.EXTRA_MESSAGE, label)
        return try {
            startAct(i)
            "Taymer qoʻyildi: $seconds soniya."
        } catch (e: ActivityNotFoundException) {
            "Soat ilovasi topilmadi."
        }
    }

    private fun parseTime(s: String): Long? {
        val t = s.trim()
        return try {
            OffsetDateTime.parse(t).toInstant().toEpochMilli()
        } catch (_: Exception) {
            try {
                LocalDateTime.parse(t).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
            } catch (_: Exception) {
                null
            }
        }
    }

    private fun addReminder(text: String, dueStr: String): String {
        if (text.isBlank()) return "Eslatma matni boʻsh."
        val due = parseTime(dueStr) ?: return "Vaqt formati notoʻgʻri: $dueStr. ISO 8601 ishlat."
        if (due < System.currentTimeMillis() - 60_000) return "Bu vaqt oʻtib ketgan."
        val r = Reminder(core.memory.newId(), text.trim(), due)
        core.memory.addReminder(r)
        Reminders.schedule(ctx, r)
        return "Eslatma qoʻyildi (id ${r.id}): ${Fmt.dateTime(due)}."
    }

    private fun deleteReminder(id: String): String {
        Reminders.cancel(ctx, id)
        return if (core.memory.removeReminder(id)) "Eslatma oʻchirildi." else "Bunday eslatma topilmadi."
    }

    // ---------------------------------------------------------------- memory

    private fun rememberFact(fact: String): String {
        if (fact.isBlank()) return "Fakt boʻsh."
        val f = core.memory.addFact(fact.trim())
        return "Eslab qoldim (id ${f.id})."
    }

    private fun forgetFact(id: String): String =
        if (core.memory.removeFact(id)) "Unutdim." else "Bunday fakt topilmadi."

    // ---------------------------------------------------------------- device

    private fun deviceStatus(): String {
        val bm = ctx.getSystemService(BatteryManager::class.java)
        val level = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
        val charging = bm?.isCharging ?: false
        return "Batareya: $level%" + (if (charging) ", quvvatlanmoqda" else "") + ". Hozir: ${Fmt.now()}."
    }

    private fun flashlight(on: Boolean): String {
        val cm = ctx.getSystemService(CameraManager::class.java) ?: return "Kamera xizmati topilmadi."
        val id = cm.cameraIdList.firstOrNull {
            cm.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        } ?: return "Bu telefonda chiroq topilmadi."
        cm.setTorchMode(id, on)
        return if (on) "Chiroq yoqildi." else "Chiroq oʻchirildi."
    }

    private fun setVolume(percent: Int): String {
        val am = ctx.getSystemService(AudioManager::class.java) ?: return "Ovoz xizmati topilmadi."
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val p = percent.coerceIn(0, 100)
        am.setStreamVolume(AudioManager.STREAM_MUSIC, (max * p + 50) / 100, AudioManager.FLAG_SHOW_UI)
        return "Ovoz balandligi $p% qilindi."
    }

    // ---------------------------------------------------------------- screen

    private suspend fun readScreen(wait: Int): String {
        val s = EdithAccessibility.instance ?: return NO_ACCESS
        if (wait > 0) delay(wait.coerceAtMost(5) * 1000L)
        return s.dump()
    }

    private suspend fun screenAction(action: (EdithAccessibility) -> Boolean): String {
        val s = EdithAccessibility.instance ?: return NO_ACCESS
        val ok = action(s)
        delay(1300)
        val head = if (ok) "Bajarildi." else "Bajarilmadi (element topilmadi, bosilmadi yoki bu parol maydoni)."
        return head + "\n\nYangi ekran:\n" + s.dump()
    }

    companion object {
        const val NO_ACCESS =
            "Ekran boshqaruvi (Accessibility) yoqilmagan. Foydalanuvchiga Edith'dagi 'Ekran boshqaruvi' tugmasini bosib, Edith'ni yoqishni ayt."

        fun label(c: ToolCall): String {
            val a = c.args
            return when (c.name) {
                "request_permission" -> "Ruxsat soʻrayapman"
                "call_phone" -> "Qoʻngʻiroq: " + a.optString("name").ifBlank { a.optString("number") }
                "send_sms" -> "SMS: " + a.optString("name").ifBlank { a.optString("number") }
                "find_contact" -> "Kontakt qidiryapman: " + a.optString("query")
                "open_app" -> "Ilova ochyapman: " + a.optString("app_name")
                "open_link" -> "Havola ochyapman"
                "set_alarm" -> "Budilnik qoʻyyapman"
                "set_timer" -> "Taymer qoʻyyapman"
                "add_reminder" -> "Eslatma qoʻyyapman"
                "delete_reminder" -> "Eslatmani oʻchiryapman"
                "remember_fact" -> "Eslab qolyapman"
                "forget_fact" -> "Unutyapman"
                "device_status" -> "Telefon holatini tekshiryapman"
                "flashlight" -> "Chiroq"
                "set_volume" -> "Ovoz balandligi"
                "read_screen" -> "Ekranni oʻqiyapman"
                "tap" -> "Bosyapman: #" + a.optInt("element", -1)
                "type_text" -> "Yozyapman: " + a.optString("text").take(40)
                "scroll" -> "Aylantiryapman"
                "press_button" -> "Tugma: " + a.optString("button")
                else -> c.name
            }
        }
    }
}
