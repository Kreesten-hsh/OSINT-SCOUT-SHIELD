package bj.benincybershield.benin_cyber_shield_mobile

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

class ShieldNotificationOrchestrator(context: Context) {
    private val configStore = ShieldConfigStore(context)
    private val historyStore = ShieldHistoryStore(context)
    private val pendingStore = ShieldPendingAnalysisStore(context)
    private val analysisClient = ShieldAnalysisClient()
    private val localNotifier = ShieldLocalNotifier(context)

    fun handleLiveNotification(
        message: String,
        sender: String,
        sourceApp: String,
    ): Boolean {
        val config = configStore.readConfig()
        if (!config.hasActiveMonitoring || config.apiBaseUrl.isBlank() || config.deviceInstallId.isBlank()) {
            return false
        }

        thread(name = "bcs-live-notification", isDaemon = true) {
            val outcome = analyzeAndPersist(
                config = config,
                sender = sender,
                message = message,
                sourceApp = sourceApp,
                createdAt = isoTimestamp(),
                enqueueOnFailure = true,
            )
            if (outcome == AnalysisPersistenceOutcome.PROCESSED) {
                flushPendingQueue()
            }
        }
        return true
    }

    fun flushPendingQueue(maxItems: Int = 12): Int {
        val config = configStore.readConfig()
        if (!config.hasActiveMonitoring || config.apiBaseUrl.isBlank() || config.deviceInstallId.isBlank()) {
            return pendingStore.count()
        }
        if (!flushInProgress.compareAndSet(false, true)) {
            return pendingStore.count()
        }

        try {
            val pendingItems = pendingStore.listPending(limit = maxItems)
            for (item in pendingItems) {
                when (
                    analyzeAndPersist(
                    config = config,
                    sender = item.sender,
                    message = item.message,
                    sourceApp = item.sourceApp,
                    createdAt = item.createdAt.ifBlank { isoTimestamp() },
                    enqueueOnFailure = false,
                )
                ) {
                    AnalysisPersistenceOutcome.PROCESSED,
                    AnalysisPersistenceOutcome.DROPPED -> {
                        pendingStore.removeById(item.id)
                    }

                    AnalysisPersistenceOutcome.RETRYABLE_FAILURE -> {
                        break
                    }
                }
            }
            return pendingStore.count()
        } finally {
            flushInProgress.set(false)
        }
    }

    fun pendingCount(): Int {
        return pendingStore.count()
    }

    fun queueForRetry(
        sender: String,
        message: String,
        sourceApp: String,
    ) {
        pendingStore.enqueue(
            sender = sender,
            message = message,
            sourceApp = sourceApp,
            createdAt = isoTimestamp(),
        )
    }

    private fun analyzeAndPersist(
        config: ShieldConfig,
        sender: String,
        message: String,
        sourceApp: String,
        createdAt: String,
        enqueueOnFailure: Boolean,
    ): AnalysisPersistenceOutcome {
        val safeSender = if (sender.isBlank()) sourceApp else sender.trim()
        val attempt = analysisClient.analyzeNotification(
            apiBaseUrl = config.apiBaseUrl,
            deviceInstallId = config.deviceInstallId,
            message = message,
            sender = safeSender,
            sourceApp = sourceApp,
        )
        val analysis = attempt.result
        if (analysis == null) {
            if (enqueueOnFailure && attempt.shouldRetry) {
                pendingStore.enqueue(
                    sender = safeSender,
                    message = message,
                    sourceApp = sourceApp,
                    createdAt = createdAt,
                )
            }
            return if (attempt.shouldRetry) {
                AnalysisPersistenceOutcome.RETRYABLE_FAILURE
            } else {
                AnalysisPersistenceOutcome.DROPPED
            }
        }

        val preview = buildPreview(message, analysis)
        historyStore.appendRecord(
            ShieldHistoryRecord(
                createdAt = createdAt,
                riskScore = analysis.riskScore,
                riskLevel = analysis.riskLevel,
                maskedPhone = maskSender(safeSender),
                primaryCategory = analysis.categories.firstOrNull(),
                messagePreview = preview,
                messageBody = message.trim(),
                categoriesDetected = analysis.categories,
                matchedRules = analysis.matchedRules,
                explanation = analysis.explanation,
                recommendations = analysis.recommendations,
                highlightedSpans = analysis.highlightedSpans.map { span ->
                    ShieldHistoryHighlightedSpan(
                        start = span.start,
                        end = span.end,
                        rule = span.rule,
                        label = span.label,
                        color = span.color,
                    )
                },
                fonAlert = analysis.fonAlert,
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
                primaryCategory = analysis.categories.firstOrNull(),
                recommendation = analysis.recommendations.firstOrNull(),
            )
        }
        return AnalysisPersistenceOutcome.PROCESSED
    }

    private fun buildPreview(message: String, analysis: ShieldAnalysisResult): String {
        val category = analysis.categories.firstOrNull()?.trim().orEmpty()
        val body = message.replace('\n', ' ').trim().take(88)
        return when {
            category.isNotBlank() -> "$category - $body"
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
        private val flushInProgress = AtomicBoolean(false)
    }
}

private enum class AnalysisPersistenceOutcome {
    PROCESSED,
    RETRYABLE_FAILURE,
    DROPPED,
}
