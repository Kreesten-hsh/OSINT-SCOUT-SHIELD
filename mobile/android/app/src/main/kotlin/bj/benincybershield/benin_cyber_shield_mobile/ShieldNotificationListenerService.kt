package bj.benincybershield.benin_cyber_shield_mobile

import android.app.Notification
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
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
        orchestrator.handleLiveNotification(
            message = message,
            sender = safeSender,
            sourceApp = sourceApp,
        )
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
