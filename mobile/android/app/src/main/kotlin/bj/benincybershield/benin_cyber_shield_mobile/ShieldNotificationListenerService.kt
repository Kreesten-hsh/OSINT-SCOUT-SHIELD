package bj.benincybershield.benin_cyber_shield_mobile

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

class ShieldNotificationListenerService : NotificationListenerService() {
    private lateinit var configStore: ShieldConfigStore
    private lateinit var historyStore: ShieldHistoryStore
    private lateinit var analysisClient: ShieldAnalysisClient
    private lateinit var localNotifier: ShieldLocalNotifier

    override fun onCreate() {
        super.onCreate()
        configStore = ShieldConfigStore(this)
        historyStore = ShieldHistoryStore(this)
        analysisClient = ShieldAnalysisClient()
        localNotifier = ShieldLocalNotifier(this)
    }

    override fun onNotificationPosted(statusBarNotification: StatusBarNotification?) {
        val sbn = statusBarNotification ?: return
        val config = configStore.readConfig()
        if (!config.hasActiveMonitoring || config.apiBaseUrl.isBlank() || config.deviceInstallId.isBlank()) {
            return
        }

        if (sbn.packageName == packageName) {
            return
        }

        val monitoredPackages = configStore.getMonitoredPackages(config)
        if (sbn.packageName !in monitoredPackages) {
            return
        }

        val dedupeKey = "${sbn.key}:${sbn.postTime}"
        if (isDuplicate(dedupeKey)) {
            return
        }

        val extras = sbn.notification.extras
        val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val message = (
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        )?.trim().orEmpty()
        if (message.isBlank()) {
            return
        }

        val sourceApp = configStore.resolveSourceApp(sbn.packageName)
        val safeSender = if (sender.isBlank()) sourceApp else sender

        thread(name = "bcs-analyze-notification", isDaemon = true) {
            val analysis = analysisClient.analyzeNotification(
                apiBaseUrl = config.apiBaseUrl,
                deviceInstallId = config.deviceInstallId,
                message = message,
                sender = safeSender,
                sourceApp = sourceApp,
            ) ?: return@thread

            val preview = buildPreview(message, analysis)
            historyStore.appendRecord(
                ShieldHistoryRecord(
                    createdAt = isoTimestamp(),
                    riskScore = analysis.riskScore,
                    riskLevel = analysis.riskLevel,
                    maskedPhone = maskSender(safeSender),
                    primaryCategory = preview,
                    status = sourceApp,
                ),
            )

            if (shouldNotify(config, analysis)) {
                localNotifier.showThreatAlert(
                    sourceApp = sourceApp,
                    sender = maskSender(safeSender),
                    preview = preview,
                    riskScore = analysis.riskScore,
                    riskLevel = analysis.riskLevel,
                )
            }
        }
    }

    private fun buildPreview(message: String, analysis: ShieldAnalysisResult): String {
        val category = analysis.categories.firstOrNull()?.trim().orEmpty()
        val body = message.replace('\n', ' ').trim().take(88)
        return when {
            category.isNotBlank() -> "$category · $body"
            else -> body
        }
    }

    private fun shouldNotify(config: ShieldConfig, analysis: ShieldAnalysisResult): Boolean {
        if (analysis.riskScore < config.alertThreshold) {
            return false
        }
        return when (analysis.riskLevel.uppercase()) {
            "HIGH" -> true
            "MEDIUM" -> config.alertMedium
            else -> false
        }
    }

    private fun isDuplicate(key: String): Boolean {
        val now = System.currentTimeMillis()
        val previous = recentNotificationKeys.put(key, now)
        val iterator = recentNotificationKeys.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            if (now - entry.value > DEDUPE_WINDOW_MS) {
                iterator.remove()
            }
        }
        return previous != null && now - previous < DEDUPE_WINDOW_MS
    }

    private fun isoTimestamp(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        return formatter.format(Date())
    }

    private fun maskSender(sender: String): String {
        val digits = sender.filter(Char::isDigit)
        return if (digits.length >= 6) {
            val prefix = digits.take(3)
            val suffix = digits.takeLast(2)
            "$prefix ${"*".repeat((digits.length - 5).coerceAtLeast(2))} $suffix"
        } else {
            sender.take(28)
        }
    }

    companion object {
        private val recentNotificationKeys = ConcurrentHashMap<String, Long>()
        private const val DEDUPE_WINDOW_MS = 8000L
    }
}
