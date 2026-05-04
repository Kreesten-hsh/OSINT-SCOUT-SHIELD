package bj.benincybershield.benin_cyber_shield_mobile

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.abs

data class ShieldAnalysisResult(
    val riskScore: Int,
    val riskLevel: String,
    val categories: List<String>,
    val matchedRules: List<String>,
    val explanation: List<String>,
    val recommendations: List<String>,
    val highlightedSpans: List<ShieldHighlightedSpan>,
    val fonAlert: String?,
)

data class ShieldHighlightedSpan(
    val start: Int,
    val end: Int,
    val rule: String,
    val label: String,
    val color: String,
)

data class ShieldAnalysisAttempt(
    val result: ShieldAnalysisResult? = null,
    val shouldRetry: Boolean = false,
)

class ShieldAnalysisClient {
    fun analyzeNotification(
        apiBaseUrl: String,
        deviceInstallId: String,
        message: String,
        sender: String,
        sourceApp: String,
    ): ShieldAnalysisAttempt {
        val normalizedMessage = message.trim()
        if (apiBaseUrl.isBlank() || deviceInstallId.isBlank() || normalizedMessage.length < 5) {
            return ShieldAnalysisAttempt()
        }
        val phonePayload = resolvePhonePayload(sender = sender, sourceApp = sourceApp)

        val endpoint = "${apiBaseUrl.trimEnd('/')}/analysis/verify"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 1500
            readTimeout = 3500
            doInput = true
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        }

        return try {
            val payload = JSONObject().apply {
                put("message", normalizedMessage)
                put("phone", phonePayload)
                put("channel", "MOBILE_APP")
                put("department", JSONObject.NULL)
                put("url", JSONObject.NULL)
                put("device_install_id", deviceInstallId)
                put("source_app", sourceApp)
            }
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
            }

            val responseCode = connection.responseCode
            val reader = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader(Charsets.UTF_8)
            } else {
                connection.errorStream?.bufferedReader(Charsets.UTF_8)
            } ?: return ShieldAnalysisAttempt(shouldRetry = responseCode >= 500)

            val responseBody = reader.use(BufferedReader::readText)
            if (responseCode !in 200..299 || responseBody.isBlank()) {
                return ShieldAnalysisAttempt(shouldRetry = responseCode >= 500)
            }

            val root = JSONObject(responseBody)
            val data = root.optJSONObject("data")
                ?: return ShieldAnalysisAttempt(shouldRetry = false)
            ShieldAnalysisAttempt(
                result = ShieldAnalysisResult(
                    riskScore = data.optInt("risk_score", 0),
                    riskLevel = data.optString("risk_level", "FAIBLE"),
                    categories = jsonArrayToStrings(data.optJSONArray("categories_detected")),
                    matchedRules = jsonArrayToStrings(data.optJSONArray("matched_rules")),
                    explanation = jsonArrayToStrings(data.optJSONArray("explanation")),
                    recommendations = jsonArrayToStrings(data.optJSONArray("recommendations")),
                    highlightedSpans = jsonArrayToHighlightedSpans(data.optJSONArray("highlighted_spans")),
                    fonAlert = data.optString("fon_alert").ifBlank { null },
                ),
            )
        } catch (_: Exception) {
            ShieldAnalysisAttempt(shouldRetry = true)
        } finally {
            connection.disconnect()
        }
    }

    private fun resolvePhonePayload(sender: String, sourceApp: String): String {
        val digits = sender.filter(Char::isDigit)
        if (digits.length in 8..15) {
            return digits
        }
        val stableSeed = abs("$sourceApp|$sender".hashCode()).toLong()
        return (10_000_000L + (stableSeed % 90_000_000L)).toString()
    }

    private fun jsonArrayToStrings(array: JSONArray?): List<String> {
        if (array == null) {
            return emptyList()
        }
        return buildList(array.length()) {
            for (index in 0 until array.length()) {
                val value = array.optString(index)
                if (value.isNotBlank()) {
                    add(value)
                }
            }
        }
    }

    private fun jsonArrayToHighlightedSpans(array: JSONArray?): List<ShieldHighlightedSpan> {
        if (array == null) {
            return emptyList()
        }
        return buildList(array.length()) {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(
                    ShieldHighlightedSpan(
                        start = item.optInt("start", 0),
                        end = item.optInt("end", 0),
                        rule = item.optString("rule"),
                        label = item.optString("label"),
                        color = item.optString("color", "orange"),
                    ),
                )
            }
        }
    }
}
