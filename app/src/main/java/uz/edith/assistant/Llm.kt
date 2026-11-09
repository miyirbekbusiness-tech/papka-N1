package uz.edith.assistant

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class ToolSpec(val name: String, val description: String, val params: JSONObject)

/** rawId — provayder bergan id (Gemini'da boʻlmasligi mumkin). */
data class ToolCall(val id: String, val name: String, val args: JSONObject, val rawId: String?)

data class LlmReply(val text: String, val calls: List<ToolCall>)

interface LlmClient {
    fun start(system: String, history: List<ChatLine>, userText: String)
    suspend fun next(): LlmReply
    fun addToolResults(results: List<Pair<ToolCall, String>>)
}

class HttpException(val code: Int, val body: String) : Exception("HTTP $code") {
    fun details(): String = "Server javobi $code: " + body.take(400)

    fun spoken(): String = when {
        code == 400 && body.contains("API key", ignoreCase = true) ->
            "API kalit notoʻgʻri ekan, xoʻjayin. Sozlamalarda tekshirib koʻring."
        code == 401 || code == 403 ->
            "API kalit ishlamayapti yoki ruxsat yoʻq. Sozlamalarni tekshiring, xoʻjayin."
        code == 404 ->
            "Bunday model topilmadi. Sozlamalarda model nomini tekshiring."
        code == 429 ->
            "Limit tugadi yoki juda tez soʻrayapmiz. Biroz kutib, qayta urinib koʻring."
        code >= 500 ->
            "Server hozir band. Bir ozdan keyin qayta urinib koʻring."
        else -> "Server xato qaytardi ($code). Yana bir bor urinib koʻring."
    }
}

object Http {
    fun post(url: String, body: String, headers: Map<String, String>): String {
        val c = URL(url).openConnection() as HttpURLConnection
        try {
            c.requestMethod = "POST"
            c.connectTimeout = 20_000
            c.readTimeout = 120_000
            c.doOutput = true
            c.setRequestProperty("content-type", "application/json; charset=utf-8")
            for ((k, v) in headers) c.setRequestProperty(k, v)
            c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = c.responseCode
            val stream = if (code in 200..299) c.inputStream else c.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) throw HttpException(code, text)
            return text
        } finally {
            c.disconnect()
        }
    }
}

/** Suhbat tarixini navbatma-navbat (user/assistant) qilib birlashtiradi. Birinchi va oxirgisi — user. */
fun mergeTurns(history: List<ChatLine>, userText: String): List<Pair<String, String>> {
    val out = ArrayList<Pair<String, String>>()
    for (l in history + ChatLine("user", userText)) {
        val role = if (l.role == "user") "user" else "assistant"
        if (out.isNotEmpty() && out[out.size - 1].first == role) {
            out[out.size - 1] = role to (out[out.size - 1].second + "\n" + l.text)
        } else {
            out.add(role to l.text)
        }
    }
    if (out.isEmpty() || out[0].first != "user") out.add(0, "user" to "(oldingi suhbat davomi)")
    return out
}

private fun hasProps(schema: JSONObject): Boolean =
    (schema.optJSONObject("properties")?.length() ?: 0) > 0

// ---------------------------------------------------------------- Claude

class ClaudeClient(
    private val key: String,
    private val model: String,
    private val tools: List<ToolSpec>
) : LlmClient {
    private var system = ""
    private val messages = JSONArray()

    override fun start(system: String, history: List<ChatLine>, userText: String) {
        this.system = system
        for ((role, text) in mergeTurns(history, userText)) {
            messages.put(JSONObject().put("role", role).put("content", text))
        }
    }

    override suspend fun next(): LlmReply = withContext(Dispatchers.IO) {
        val toolArr = JSONArray()
        for (t in tools) {
            toolArr.put(
                JSONObject().put("name", t.name).put("description", t.description).put("input_schema", t.params)
            )
        }
        val body = JSONObject()
            .put("model", model)
            .put("max_tokens", 1024)
            .put("system", system)
            .put("tools", toolArr)
            .put("messages", messages)
        val resp = Http.post(
            "https://api.anthropic.com/v1/messages",
            body.toString(),
            mapOf("x-api-key" to key, "anthropic-version" to "2023-06-01")
        )
        val o = JSONObject(resp)
        val content = o.optJSONArray("content") ?: JSONArray()
        messages.put(JSONObject().put("role", "assistant").put("content", content))
        val sb = StringBuilder()
        val calls = ArrayList<ToolCall>()
        for (i in 0 until content.length()) {
            val b = content.getJSONObject(i)
            when (b.optString("type")) {
                "text" -> sb.append(b.optString("text"))
                "tool_use" -> {
                    val id = b.optString("id")
                    calls.add(ToolCall(id, b.optString("name"), b.optJSONObject("input") ?: JSONObject(), id))
                }
            }
        }
        LlmReply(sb.toString(), calls)
    }

    override fun addToolResults(results: List<Pair<ToolCall, String>>) {
        val arr = JSONArray()
        for ((call, result) in results) {
            arr.put(
                JSONObject().put("type", "tool_result").put("tool_use_id", call.id).put("content", result)
            )
        }
        messages.put(JSONObject().put("role", "user").put("content", arr))
    }
}

// ---------------------------------------------------------------- Gemini

class GeminiClient(
    private val key: String,
    model: String,
    private val tools: List<ToolSpec>
) : LlmClient {
    private var system = ""
    private val contents = JSONArray()
    private var activeModel = model
    private val fallbacks = ArrayList(listOf("gemini-3.5-flash", "gemini-2.5-flash").filter { it != model })

    override fun start(system: String, history: List<ChatLine>, userText: String) {
        this.system = system
        for ((role, text) in mergeTurns(history, userText)) {
            val r = if (role == "user") "user" else "model"
            contents.put(
                JSONObject().put("role", r).put("parts", JSONArray().put(JSONObject().put("text", text)))
            )
        }
    }

    private fun declarations(): JSONArray {
        val arr = JSONArray()
        for (t in tools) {
            val d = JSONObject().put("name", t.name).put("description", t.description)
            if (hasProps(t.params)) d.put("parameters", t.params)
            arr.put(d)
        }
        return arr
    }

    private fun call(modelName: String): LlmReply {
        val body = JSONObject()
            .put("systemInstruction", JSONObject().put("parts", JSONArray().put(JSONObject().put("text", system))))
            .put("contents", contents)
            .put("tools", JSONArray().put(JSONObject().put("functionDeclarations", declarations())))
            .put("generationConfig", JSONObject().put("temperature", 0.8).put("maxOutputTokens", 8192))
        val resp = Http.post(
            "https://generativelanguage.googleapis.com/v1beta/models/$modelName:generateContent",
            body.toString(),
            mapOf("x-goog-api-key" to key)
        )
        val o = JSONObject(resp)
        val cands = o.optJSONArray("candidates")
        if (cands == null || cands.length() == 0) {
            val blocked = o.optJSONObject("promptFeedback")?.optString("blockReason").orEmpty()
            return LlmReply(
                if (blocked.isNotEmpty()) "Bu savolga javob bera olmayman, xoʻjayin." else "Javob boʻsh keldi. Qayta aytib koʻring.",
                emptyList()
            )
        }
        val content = cands.getJSONObject(0).optJSONObject("content")
        val parts = content?.optJSONArray("parts")
        if (content == null || parts == null || parts.length() == 0) {
            return LlmReply("Javob boʻsh keldi. Qayta aytib koʻring.", emptyList())
        }
        if (!content.has("role")) content.put("role", "model")
        contents.put(content)
        val sb = StringBuilder()
        val calls = ArrayList<ToolCall>()
        for (i in 0 until parts.length()) {
            val p = parts.getJSONObject(i)
            if (p.optBoolean("thought", false)) continue
            if (p.has("text")) sb.append(p.optString("text"))
            val fc = p.optJSONObject("functionCall")
            if (fc != null) {
                val raw = fc.optString("id").ifBlank { null }
                calls.add(
                    ToolCall(raw ?: ("c" + System.nanoTime()), fc.optString("name"), fc.optJSONObject("args") ?: JSONObject(), raw)
                )
            }
        }
        return LlmReply(sb.toString(), calls)
    }

    override suspend fun next(): LlmReply = withContext(Dispatchers.IO) {
        var result: LlmReply? = null
        while (result == null) {
            try {
                result = call(activeModel)
            } catch (e: HttpException) {
                if (e.code == 404 && fallbacks.isNotEmpty()) {
                    activeModel = fallbacks.removeAt(0)
                } else {
                    throw e
                }
            }
        }
        result!!
    }

    override fun addToolResults(results: List<Pair<ToolCall, String>>) {
        val parts = JSONArray()
        for ((call, result) in results) {
            val fr = JSONObject().put("name", call.name).put("response", JSONObject().put("result", result))
            if (call.rawId != null) fr.put("id", call.rawId)
            parts.put(JSONObject().put("functionResponse", fr))
        }
        contents.put(JSONObject().put("role", "user").put("parts", parts))
    }
}
