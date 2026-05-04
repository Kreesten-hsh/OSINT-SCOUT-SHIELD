package bj.benincybershield.benin_cyber_shield_mobile

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import kotlin.concurrent.thread

class MainActivity : FlutterActivity() {
    private lateinit var configStore: ShieldConfigStore
    private lateinit var historyStore: ShieldHistoryStore
    private lateinit var orchestrator: ShieldNotificationOrchestrator
    private var pendingNotificationPermissionResult: MethodChannel.Result? = null
    private var pendingOpenSurface: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        configStore = ShieldConfigStore(this)
        historyStore = ShieldHistoryStore(this)
        orchestrator = ShieldNotificationOrchestrator(this)
        cacheOpenSurface(intent)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL_NAME,
        ).setMethodCallHandler(::handleMethodCall)
    }

    private fun handleMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "getShieldStatus" -> {
                val status = configStore.getRuntimeStatus()
                result.success(
                    mapOf(
                        "notification_access_granted" to status.notificationAccessGranted,
                        "battery_optimization_ignored" to status.batteryOptimizationIgnored,
                        "post_notifications_granted" to status.postNotificationsGranted,
                        "service_ready" to status.serviceReady,
                        "pending_queue_count" to orchestrator.pendingCount(),
                    ),
                )
            }

            "getShieldSettings" -> result.success(configStore.toSettingsMap())

            "syncShieldSettings" -> {
                val arguments = call.arguments as? Map<*, *> ?: emptyMap<String, Any?>()
                val updated = configStore.updateFromMap(arguments)
                result.success(configStore.toSettingsMap(updated))
            }

            "fetchLocalHistory" -> {
                val arguments = call.arguments as? Map<*, *>
                val limit = (arguments?.get("limit") as? Number)?.toInt() ?: 60
                result.success(historyStore.listRecords(limit))
            }

            "consumePendingOpenSurface" -> {
                val surface = pendingOpenSurface
                pendingOpenSurface = null
                result.success(surface)
            }

            "flushPendingQueue" -> {
                val arguments = call.arguments as? Map<*, *>
                val limit = (arguments?.get("limit") as? Number)?.toInt() ?: 3
                thread(name = "bcs-flush-pending", isDaemon = true) {
                    val pending = orchestrator.flushPendingQueue(maxItems = limit)
                    runOnUiThread {
                        result.success(pending)
                    }
                }
            }

            "openNotificationAccessSettings" -> {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                result.success(true)
            }

            "requestIgnoreBatteryOptimizations" -> {
                val powerManager = getSystemService(POWER_SERVICE) as? PowerManager
                if (powerManager?.isIgnoringBatteryOptimizations(packageName) == true) {
                    result.success(true)
                    return
                }
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
                result.success(true)
            }

            "requestPostNotificationsPermission" -> requestPostNotificationsPermission(result)

            else -> result.notImplemented()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        cacheOpenSurface(intent)
    }

    private fun cacheOpenSurface(intent: Intent?) {
        val surface = intent?.getStringExtra("bcs_open_surface")?.trim()
        if (surface.isNullOrEmpty()) {
            return
        }
        pendingOpenSurface = surface
    }

    private fun requestPostNotificationsPermission(result: MethodChannel.Result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.success(true)
            return
        }

        val alreadyGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        if (alreadyGranted) {
            result.success(true)
            return
        }

        pendingNotificationPermissionResult = result
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), POST_NOTIFICATION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != POST_NOTIFICATION_REQUEST_CODE) {
            return
        }
        val granted = grantResults.isNotEmpty() &&
            grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED
        pendingNotificationPermissionResult?.success(granted)
        pendingNotificationPermissionResult = null
    }

    companion object {
        private const val CHANNEL_NAME = "bcs/native_shield"
        private const val POST_NOTIFICATION_REQUEST_CODE = 1107
    }
}
