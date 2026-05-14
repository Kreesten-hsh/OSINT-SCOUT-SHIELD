package bj.benincybershield.benin_cyber_shield_mobile

import android.app.Notification
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

class ShieldNotificationListenerService : NotificationListenerService() {
    private lateinit var configStore: ShieldConfigStore
    private lateinit var orchestrator: ShieldNotificationOrchestrator
    private var connectivityManager: ConnectivityManager? = null
    private val networkCallback =
        object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                flushPendingAsync("network")
            }
        }

    override fun onCreate() {
        super.onCreate()
        configStore = ShieldConfigStore(this)
        orchestrator = ShieldNotificationOrchestrator(this)
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            runCatching {
                connectivityManager?.registerDefaultNetworkCallback(networkCallback)
            }
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        flushPendingAsync("listener-connected")
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

        val notification = sbn.notification
        val extras = notification.extras
        val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val message = extractNotificationMessage(notification).trim()
        if (message.isBlank()) {
            return
        }

        val sourceApp = configStore.resolveSourceApp(sbn.packageName)
        val safeSender = if (sender.isBlank()) sourceApp else sender
        orchestrator.handleLiveNotification(
            message = message,
            sender = safeSender,
            sourceApp = sourceApp,
        )
    }

    private fun extractNotificationMessage(notification: Notification): String {
        val extras = notification.extras ?: return notification.tickerText?.toString().orEmpty()
        val candidates = linkedSetOf<String>()

        addCandidate(candidates, extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString())
        addCandidate(candidates, extras.getCharSequence(Notification.EXTRA_TEXT)?.toString())
        addCandidate(candidates, extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString())
        addCandidate(candidates, extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString())

        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (!textLines.isNullOrEmpty()) {
            addCandidate(candidates, textLines.joinToString(separator = "\n") { it.toString() })
        }

        val messages = extractMessagingStyleMessages(extras)
        if (messages.isNotEmpty()) {
            addCandidate(candidates, messages.joinToString(separator = "\n"))
        }

        addCandidate(candidates, notification.tickerText?.toString())

        return candidates
            .filterNot { it.isNotificationSummary() }
            .maxByOrNull { it.length }
            .orEmpty()
    }

    private fun extractMessagingStyleMessages(extras: Bundle): List<String> {
        val parcelables = extras.getParcelableArray(Notification.EXTRA_MESSAGES) ?: return emptyList()
        return parcelables.mapNotNull { parcelable ->
            val bundle = parcelable as? Bundle ?: return@mapNotNull null
            bundle.getCharSequence("text")?.toString()?.trim()?.takeIf { it.isNotBlank() }
        }
    }

    private fun addCandidate(candidates: MutableSet<String>, value: String?) {
        val normalizedValue = value
            ?.replace('\u00a0', ' ')
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: return
        candidates += normalizedValue
    }

    private fun String.isNotificationSummary(): Boolean {
        val normalizedValue = lowercase()
        return normalizedValue.contains("nouveaux messages") ||
            normalizedValue.contains("new messages") ||
            normalizedValue.contains("messages from") ||
            normalizedValue.contains("conversation")
    }

    override fun onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            runCatching {
                connectivityManager?.unregisterNetworkCallback(networkCallback)
            }
        }
        super.onDestroy()
    }

    private fun flushPendingAsync(reason: String) {
        thread(name = "bcs-flush-$reason", isDaemon = true) {
            orchestrator.flushPendingQueue()
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

    companion object {
        private val recentNotificationKeys = ConcurrentHashMap<String, Long>()
        private const val DEDUPE_WINDOW_MS = 8000L
    }
}
