package uz.edith.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Ekranni oʻqish va boshqa ilovalarda bosish/yozish.
 * Faqat foydalanuvchi Sozlamalar → Maxsus imkoniyatlar boʻlimida yoqqanda ishlaydi.
 */
class EdithAccessibility : AccessibilityService() {

    companion object {
        @Volatile
        var instance: EdithAccessibility? = null
            private set
    }

    private val nodes = HashMap<Int, AccessibilityNodeInfo>()

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    /** Ekrandagi elementlarni raqamlab, matn koʻrinishida qaytaradi. */
    fun dump(): String {
        nodes.clear()
        val root = rootInActiveWindow ?: return "Ekranni oʻqib boʻlmadi (oyna topilmadi). Bir soniya kutib, qayta urinib koʻr."
        val sb = StringBuilder()
        sb.append("Ochiq ilova: ").append(root.packageName ?: "nomaʼlum").append('\n')
        var counter = 0

        fun walk(n: AccessibilityNodeInfo?, depth: Int) {
            if (n == null || counter >= 160 || depth > 45) return
            if (!n.isVisibleToUser) return
            val text = n.text?.toString()?.trim().orEmpty()
            val desc = n.contentDescription?.toString()?.trim().orEmpty()
            val hint = n.hintText?.toString()?.trim().orEmpty()
            val interesting = n.isClickable || n.isEditable || n.isScrollable || n.isCheckable ||
                text.isNotEmpty() || desc.isNotEmpty()
            if (interesting) {
                counter++
                nodes[counter] = n
                val kind = when {
                    n.isPassword -> "parol-maydon (TEGMA)"
                    n.isEditable -> "matn-maydon"
                    n.isCheckable -> if (n.isChecked) "belgilangan" else "belgilanmagan"
                    n.isClickable -> "tugma"
                    n.isScrollable -> "aylantiriladigan roʻyxat"
                    else -> "matn"
                }
                val label = listOf(text, desc, hint).filter { it.isNotEmpty() }.distinct().joinToString(" | ").take(90)
                sb.append('[').append(counter).append("] ").append(kind)
                if (label.isNotEmpty()) sb.append(": ").append(label)
                sb.append('\n')
            }
            for (i in 0 until n.childCount) walk(n.getChild(i), depth + 1)
        }

        walk(root, 0)
        if (counter == 0) sb.append("(ekranda element topilmadi)\n")
        return sb.toString()
    }

    fun tap(id: Int): Boolean {
        val n = nodes[id] ?: return false
        var cur: AccessibilityNodeInfo? = n
        var guard = 0
        while (cur != null && guard < 8) {
            if (cur.isClickable) return cur.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            cur = cur.parent
            guard++
        }
        val r = Rect()
        n.getBoundsInScreen(r)
        return gesture(r.exactCenterX(), r.exactCenterY(), r.exactCenterX(), r.exactCenterY(), 60)
    }

    fun type(id: Int, text: String): Boolean {
        val n = nodes[id] ?: return false
        if (n.isPassword) return false
        n.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        n.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        val args = Bundle()
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        return n.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    fun scroll(down: Boolean): Boolean {
        val target = nodes.values.firstOrNull { it.isScrollable }
        val action = if (down) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        if (target != null && target.performAction(action)) return true
        val dm = resources.displayMetrics
        val x = dm.widthPixels / 2f
        val low = dm.heightPixels * 0.72f
        val high = dm.heightPixels * 0.30f
        return if (down) gesture(x, low, x, high, 320) else gesture(x, high, x, low, 320)
    }

    fun global(name: String): Boolean {
        val action = when (name) {
            "home" -> GLOBAL_ACTION_HOME
            "recents" -> GLOBAL_ACTION_RECENTS
            "notifications" -> GLOBAL_ACTION_NOTIFICATIONS
            else -> GLOBAL_ACTION_BACK
        }
        return performGlobalAction(action)
    }

    private fun gesture(x1: Float, y1: Float, x2: Float, y2: Float, duration: Long): Boolean {
        val path = Path()
        path.moveTo(x1, y1)
        if (x1 != x2 || y1 != y2) path.lineTo(x2, y2)
        val g = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, duration))
            .build()
        return dispatchGesture(g, null, null)
    }
}
