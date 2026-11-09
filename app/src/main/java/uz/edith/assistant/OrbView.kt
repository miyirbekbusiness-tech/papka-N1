package uz.edith.assistant

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/** Edith'ning "yuzi": holatga qarab nafas oladigan, tinglaydigan va gapiradigan halqa. */
class OrbView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    var mode: EState = EState.IDLE
        set(value) {
            field = value
            invalidate()
        }

    /** Mikrofon balandligi, 0..1 */
    var level = 0f

    private val accent = 0xFF55D6E6.toInt()
    private val warm = 0xFFFFB257.toInt()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private val oval = RectF()
    private val t0 = System.nanoTime()
    private var amp = 0.06f
    private var smooth = 0f
    private var glow: RadialGradient? = null
    private var glowColor = 0
    private val density = resources.displayMetrics.density

    private fun alpha(c: Int, a: Int): Int = (c and 0x00FFFFFF) or (a shl 24)

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        glow = null
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val t = (System.nanoTime() - t0) / 1_000_000_000f
        val cx = w / 2f
        val cy = h / 2f
        val r = min(w, h) * 0.27f
        val listening = mode == EState.LISTENING || mode == EState.CONFIRM
        val color = if (listening) warm else accent

        smooth += (level - smooth) * 0.2f
        val target = when (mode) {
            EState.IDLE -> 0.05f + 0.02f * sin(t * 1.3f)
            EState.LISTENING, EState.CONFIRM -> 0.08f + smooth * 0.35f
            EState.THINKING -> 0.07f
            EState.SPEAKING -> 0.10f + 0.12f * abs(sin(t * 7f)) * abs(sin(t * 3.1f + 1f))
        }
        amp += (target - amp) * 0.15f

        // nur
        if (glow == null || glowColor != color) {
            glowColor = color
            glow = RadialGradient(
                cx, cy, r * 2.1f,
                intArrayOf(alpha(color, 100), alpha(color, 28), alpha(color, 0)),
                floatArrayOf(0f, 0.45f, 1f),
                Shader.TileMode.CLAMP
            )
        }
        paint.style = Paint.Style.FILL
        paint.shader = glow
        canvas.drawCircle(cx, cy, r * 2.1f, paint)
        paint.shader = null

        // yadro
        paint.color = alpha(color, 50)
        canvas.drawCircle(cx, cy, r * 0.62f, paint)
        paint.color = alpha(color, 220)
        canvas.drawCircle(cx, cy, r * 0.16f + amp * r * 0.6f, paint)

        // toʻlqinli halqa
        path.reset()
        val n = 120
        val twoPi = (2.0 * PI).toFloat()
        for (i in 0..n) {
            val a = i.toFloat() / n * twoPi
            val wobble = sin(a * 3f + t * 2.1f) * 0.5f + sin(a * 5f - t * 1.7f) * 0.3f + sin(a * 9f + t * 3.3f) * 0.2f
            val rr = r * (1f + amp * wobble)
            val x = cx + cos(a) * rr
            val y = cy + sin(a) * rr
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        path.close()
        paint.style = Paint.Style.STROKE
        paint.strokeCap = Paint.Cap.ROUND
        paint.strokeWidth = 2.2f * density
        paint.color = color
        canvas.drawPath(path, paint)

        // shkala
        val rot = t * (if (mode == EState.THINKING) 90f else 10f)
        canvas.save()
        canvas.rotate(rot, cx, cy)
        paint.strokeWidth = 1.4f * density
        paint.color = alpha(color, 130)
        val rt = r * 1.34f
        for (i in 0 until 60) {
            val a = i * 6f * (PI.toFloat() / 180f)
            val len = (if (i % 5 == 0) 7f else 3f) * density
            canvas.drawLine(cx + cos(a) * rt, cy + sin(a) * rt, cx + cos(a) * (rt + len), cy + sin(a) * (rt + len), paint)
        }
        canvas.restore()

        // oʻylash yoylari
        if (mode == EState.THINKING) {
            paint.strokeWidth = 3f * density
            paint.color = color
            val ra = r * 1.16f
            oval.set(cx - ra, cy - ra, cx + ra, cy + ra)
            val s = (t * 240f) % 360f
            canvas.drawArc(oval, s, 70f, false, paint)
            canvas.drawArc(oval, s + 180f, 70f, false, paint)
        }

        postInvalidateOnAnimation()
    }
}
