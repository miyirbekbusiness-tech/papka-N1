package uz.edith.assistant

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.atomic.AtomicBoolean

object Reminders {
    const val CHANNEL = "edith_reminders"

    fun ensureChannel(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL) == null) {
            val ch = NotificationChannel(CHANNEL, "Eslatmalar", NotificationManager.IMPORTANCE_HIGH)
            ch.description = "Edith eslatmalari"
            ch.enableVibration(true)
            nm.createNotificationChannel(ch)
        }
    }

    private fun pending(ctx: Context, id: String, text: String): PendingIntent {
        val i = Intent(ctx, ReminderReceiver::class.java).putExtra("id", id).putExtra("text", text)
        return PendingIntent.getBroadcast(
            ctx, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun schedule(ctx: Context, r: Reminder) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        val pi = pending(ctx, r.id, r.text)
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, r.due, pi)
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, r.due, pi)
            }
        } catch (_: SecurityException) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, r.due, pi)
        }
    }

    fun cancel(ctx: Context, id: String) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        am.cancel(pending(ctx, id, ""))
    }

    fun notify(ctx: Context, id: String, text: String) {
        ensureChannel(ctx)
        val open = PendingIntent.getActivity(
            ctx, 7, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_edith)
            .setContentTitle("Edith eslatadi")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        val allowed = Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        if (allowed) {
            try {
                NotificationManagerCompat.from(ctx).notify(id.hashCode(), n)
            } catch (_: SecurityException) {
            }
        }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val app = context.applicationContext
        val id = intent.getStringExtra("id") ?: ""
        val text = intent.getStringExtra("text") ?: "Eslatma"
        Reminders.notify(app, id, text)
        try {
            Memory(app).removeReminder(id)
        } catch (_: Exception) {
        }

        // Eslatmani ovoz chiqarib ham aytamiz
        val pending = goAsync()
        val done = AtomicBoolean(false)
        val handler = Handler(Looper.getMainLooper())
        var tts: TextToSpeech? = null
        val finish: () -> Unit = {
            if (done.compareAndSet(false, true)) {
                try {
                    tts?.shutdown()
                } catch (_: Exception) {
                }
                pending.finish()
            }
        }
        tts = TextToSpeech(app) { status ->
            val t = tts
            if (status == TextToSpeech.SUCCESS && t != null) {
                val lang = Speech.pickLocale(t)
                t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        handler.post { finish() }
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        handler.post { finish() }
                    }
                })
                t.speak(Speech.prepare(lang, "Xoʻjayin, eslatma: $text"), TextToSpeech.QUEUE_FLUSH, null, "edith_reminder")
            } else {
                finish()
            }
        }
        handler.postDelayed({ finish() }, 9500)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val app = context.applicationContext
        val now = System.currentTimeMillis()
        val m = Memory(app)
        for (r in m.reminders) {
            if (r.due > now) Reminders.schedule(app, r)
        }
    }
}
