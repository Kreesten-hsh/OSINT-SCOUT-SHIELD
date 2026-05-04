package bj.benincybershield.benin_cyber_shield_mobile

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class ShieldHistoryRecord(
    val type: String = "VERIFY",
    val createdAt: String,
    val riskScore: Int,
    val riskLevel: String,
    val maskedPhone: String,
    val primaryCategory: String?,
    val messagePreview: String? = null,
    val messageBody: String? = null,
    val categoriesDetected: List<String> = emptyList(),
    val matchedRules: List<String> = emptyList(),
    val explanation: List<String> = emptyList(),
    val recommendations: List<String> = emptyList(),
    val highlightedSpans: List<ShieldHistoryHighlightedSpan> = emptyList(),
    val fonAlert: String? = null,
    val publicReference: String? = null,
    val status: String? = null,
) {
    fun toJsonObject(): JSONObject {
        return JSONObject().apply {
            put("type", type)
            put("created_at", createdAt)
            put("risk_score", riskScore)
            put("risk_level", riskLevel)
            put("masked_phone", maskedPhone)
            put("primary_category", primaryCategory)
            put("message_preview", messagePreview)
            put("message_body", messageBody)
            put("categories_detected", JSONArray(categoriesDetected))
            put("matched_rules", JSONArray(matchedRules))
            put("explanation", JSONArray(explanation))
            put("recommendations", JSONArray(recommendations))
            put("highlighted_spans", JSONArray(highlightedSpans.map(ShieldHistoryHighlightedSpan::toJsonObject)))
            put("fon_alert", fonAlert)
            put("public_reference", publicReference)
            put("status", status)
        }
    }
}

data class ShieldHistoryHighlightedSpan(
    val start: Int,
    val end: Int,
    val rule: String,
    val label: String,
    val color: String,
) {
    fun toJsonObject(): JSONObject {
        return JSONObject().apply {
            put("start", start)
            put("end", end)
            put("rule", rule)
            put("label", label)
            put("color", color)
        }
    }
}

class ShieldHistoryStore(context: Context) {
    private val prefs = context.getSharedPreferences(ShieldConfigStore.PREF_NAME, Context.MODE_PRIVATE)

    fun listRecords(limit: Int = DEFAULT_LIMIT): List<Map<String, Any?>> {
        val raw = prefs.getString(KEY_HISTORY_JSON, "[]") ?: "[]"
        val source = try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
        val maxIndex = minOf(source.length(), limit)
        return buildList(maxIndex) {
            for (index in 0 until maxIndex) {
                val item = source.optJSONObject(index) ?: continue
                add(item.toMap())
            }
        }
    }

    fun appendRecord(record: ShieldHistoryRecord) {
        val current = listJsonArray()
        val next = JSONArray()
        next.put(record.toJsonObject())
        var written = 1
        for (index in 0 until current.length()) {
            if (written >= MAX_RECORDS) {
                break
            }
            next.put(current.getJSONObject(index))
            written += 1
        }
        prefs.edit().putString(KEY_HISTORY_JSON, next.toString()).apply()
    }

    private fun listJsonArray(): JSONArray {
        val raw = prefs.getString(KEY_HISTORY_JSON, "[]") ?: "[]"
        return try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    private fun JSONObject.toMap(): Map<String, Any?> {
        val result = linkedMapOf<String, Any?>()
        val keys = keys()
        while (keys.hasNext()) {
            val key = keys.next()
            result[key] = when (val value = opt(key)) {
                JSONObject.NULL -> null
                is JSONArray -> value.toList()
                is JSONObject -> value.toMap()
                else -> value
            }
        }
        return result
    }

    private fun JSONArray.toList(): List<Any?> {
        return List(length()) { index ->
            when (val value = opt(index)) {
                JSONObject.NULL -> null
                is JSONArray -> value.toList()
                is JSONObject -> value.toMap()
                else -> value
            }
        }
    }

    companion object {
        private const val KEY_HISTORY_JSON = "native_history_json"
        private const val MAX_RECORDS = 120
        private const val DEFAULT_LIMIT = 60
    }
}
