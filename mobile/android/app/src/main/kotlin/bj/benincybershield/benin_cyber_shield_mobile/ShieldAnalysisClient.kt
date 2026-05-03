package bj.benincybershield.benin_cyber_shield_mobile

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class ShieldAnalysisResult(
    val riskScore: Int,
    val riskLevel: String,
    val categories: List<String>,
    val matchedRules: List<String>,
)

class ShieldAnalysisClient {
    fun analyzeNotification(
        apiBaseUrl: String,
        deviceInstallId: String,
        message: String,
        sender: String,
        sourceApp: String,
    ): ShieldAnalysisResult? {
        if (apiBaseUrl.isBlank() || deviceInstallId.isBlank() || message.isBlank()) {
            return null
        }

        val endpoint = "${apiBaseUrl.trimEnd('/')}/analysis/verify"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 5000
            readTimeout = 8000
            doInput = true
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        }

        return try {
            val payload = JSONObject().apply {
                put("message", message)
                put("phone", sender)
                put("channel", "ANDROID_NOTIFICATION_LISTENER")
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
            } ?: return null

            val responseBody = reader.use(BufferedReader::readText)
            if (responseCode !in 200..299 || responseBody.isBlank()) {
                return null
            }

            val root = JSONObject(responseBody)
            val data = root.optJSONObject("data") ?: return null
            ShieldAnalysisResult(
                riskScore = data.optInt("risk_score", 0),
                riskLevel = data.optString("risk_level", "LOW"),
                categories = jsonArrayToStrings(data.optJSONArray("categories_detected")),
                matchedRules = jsonArrayToStrings(data.optJSONArray("matched_rules")),
            )
        } catch (_: Exception) {
            null
        } finally {
            connection.disconnect()
        }
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
}
