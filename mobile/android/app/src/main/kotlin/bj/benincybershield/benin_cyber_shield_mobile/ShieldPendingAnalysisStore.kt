package bj.benincybershield.benin_cyber_shield_mobile

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class ShieldPendingAnalysis(
    val id: String,
    val createdAt: String,
    val sender: String,
    val message: String,
    val sourceApp: String,
    val fingerprint: String,
) {
    fun toJsonObject(): JSONObject {
        return JSONObject().apply {
            put("id", id)
            put("created_at", createdAt)
            put("sender", sender)
            put("message", message)
            put("source_app", sourceApp)
            put("fingerprint", fingerprint)
        }
    }

    companion object {
        fun fromJsonObject(source: JSONObject): ShieldPendingAnalysis? {
            val id = source.optString("id")
            val createdAt = source.optString("created_at")
            val sender = source.optString("sender")
            val message = source.optString("message")
            val sourceApp = source.optString("source_app")
            val fingerprint = source.optString("fingerprint")
            if (message.isBlank() || sourceApp.isBlank()) {
                return null
            }
            return ShieldPendingAnalysis(
                id = if (id.isBlank()) UUID.randomUUID().toString() else id,
                createdAt = createdAt,
                sender = sender,
                message = message,
                sourceApp = sourceApp,
                fingerprint = fingerprint,
            )
        }
    }
}

class ShieldPendingAnalysisStore(context: Context) {
    private val prefs = context.getSharedPreferences(ShieldConfigStore.PREF_NAME, Context.MODE_PRIVATE)

    fun count(): Int {
        return listPending().size
    }

    fun listPending(limit: Int = MAX_PENDING): List<ShieldPendingAnalysis> {
        val source = readArray()
        val maxIndex = minOf(source.length(), limit)
        return buildList(maxIndex) {
            for (index in 0 until maxIndex) {
                val item = source.optJSONObject(index) ?: continue
                val parsed = ShieldPendingAnalysis.fromJsonObject(item) ?: continue
                add(parsed)
            }
        }
    }

    fun enqueue(
        sender: String,
        message: String,
        sourceApp: String,
        createdAt: String,
    ) {
        val normalizedSender = sender.trim()
        val normalizedMessage = message.trim()
        if (normalizedMessage.isBlank()) {
            return
        }

        val fingerprint = buildFingerprint(normalizedSender, normalizedMessage, sourceApp)
        val current = listPending()
        if (current.any { it.fingerprint == fingerprint }) {
            return
        }

        val next = JSONArray()
        next.put(
            ShieldPendingAnalysis(
                id = UUID.randomUUID().toString(),
                createdAt = createdAt,
                sender = normalizedSender,
                message = normalizedMessage,
                sourceApp = sourceApp,
                fingerprint = fingerprint,
            ).toJsonObject(),
        )
        var written = 1
        for (item in current) {
            if (written >= MAX_PENDING) {
                break
            }
            next.put(item.toJsonObject())
            written += 1
        }
        prefs.edit().putString(KEY_PENDING_JSON, next.toString()).apply()
    }

    fun removeById(id: String) {
        if (id.isBlank()) {
            return
        }
        val next = JSONArray()
        for (item in listPending()) {
            if (item.id == id) {
                continue
            }
            next.put(item.toJsonObject())
        }
        prefs.edit().putString(KEY_PENDING_JSON, next.toString()).apply()
    }

    private fun readArray(): JSONArray {
        val raw = prefs.getString(KEY_PENDING_JSON, "[]") ?: "[]"
        return try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    private fun buildFingerprint(sender: String, message: String, sourceApp: String): String {
        val compactMessage = message.lowercase().replace(Regex("\\s+"), " ").take(96)
        return "$sourceApp|$sender|$compactMessage"
    }

    companion object {
        private const val KEY_PENDING_JSON = "native_pending_analysis_json"
        private const val MAX_PENDING = 80
    }
}
