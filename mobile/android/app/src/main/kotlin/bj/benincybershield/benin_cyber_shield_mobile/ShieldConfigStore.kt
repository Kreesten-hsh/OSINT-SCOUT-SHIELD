package bj.benincybershield.benin_cyber_shield_mobile

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat

data class ShieldConfig(
    val monitorSms: Boolean = true,
    val monitorWhatsapp: Boolean = true,
    val monitorMessenger: Boolean = true,
    val alertThreshold: Int = 70,
    val alertMedium: Boolean = true,
    val apiBaseUrl: String = "",
    val citizenPortalUrl: String = "",
    val deviceInstallId: String = "",
) {
    val hasActiveMonitoring: Boolean
        get() = monitorSms || monitorWhatsapp || monitorMessenger
}

data class ShieldRuntimeStatus(
    val notificationAccessGranted: Boolean,
    val batteryOptimizationIgnored: Boolean,
    val postNotificationsGranted: Boolean,
) {
    val serviceReady: Boolean
        get() = notificationAccessGranted && postNotificationsGranted
}

class ShieldConfigStore(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun readConfig(): ShieldConfig {
        return ShieldConfig(
            monitorSms = prefs.getBoolean(KEY_MONITOR_SMS, true),
            monitorWhatsapp = prefs.getBoolean(KEY_MONITOR_WHATSAPP, true),
            monitorMessenger = prefs.getBoolean(KEY_MONITOR_MESSENGER, true),
            alertThreshold = prefs.getInt(KEY_ALERT_THRESHOLD, 70),
            alertMedium = prefs.getBoolean(KEY_ALERT_MEDIUM, true),
            apiBaseUrl = prefs.getString(KEY_API_BASE_URL, "") ?: "",
            citizenPortalUrl = prefs.getString(KEY_CITIZEN_PORTAL_URL, "") ?: "",
            deviceInstallId = prefs.getString(KEY_DEVICE_INSTALL_ID, "") ?: "",
        )
    }

    fun updateFromMap(arguments: Map<*, *>): ShieldConfig {
        prefs.edit()
            .putBoolean(KEY_MONITOR_SMS, arguments[KEY_MONITOR_SMS] as? Boolean ?: true)
            .putBoolean(KEY_MONITOR_WHATSAPP, arguments[KEY_MONITOR_WHATSAPP] as? Boolean ?: true)
            .putBoolean(KEY_MONITOR_MESSENGER, arguments[KEY_MONITOR_MESSENGER] as? Boolean ?: true)
            .putInt(KEY_ALERT_THRESHOLD, (arguments[KEY_ALERT_THRESHOLD] as? Number)?.toInt() ?: 70)
            .putBoolean(KEY_ALERT_MEDIUM, arguments[KEY_ALERT_MEDIUM] as? Boolean ?: true)
            .putString(KEY_API_BASE_URL, arguments[KEY_API_BASE_URL] as? String ?: "")
            .putString(KEY_CITIZEN_PORTAL_URL, arguments[KEY_CITIZEN_PORTAL_URL] as? String ?: "")
            .putString(KEY_DEVICE_INSTALL_ID, arguments[KEY_DEVICE_INSTALL_ID] as? String ?: "")
            .apply()
        return readConfig()
    }

    fun toSettingsMap(config: ShieldConfig = readConfig()): Map<String, Any> {
        return mapOf(
            KEY_MONITOR_SMS to config.monitorSms,
            KEY_MONITOR_WHATSAPP to config.monitorWhatsapp,
            KEY_MONITOR_MESSENGER to config.monitorMessenger,
            KEY_ALERT_THRESHOLD to config.alertThreshold,
            KEY_ALERT_MEDIUM to config.alertMedium,
        )
    }

    fun getRuntimeStatus(): ShieldRuntimeStatus {
        return ShieldRuntimeStatus(
            notificationAccessGranted = isNotificationAccessGranted(),
            batteryOptimizationIgnored = isIgnoringBatteryOptimizations(),
            postNotificationsGranted = arePostNotificationsGranted(),
        )
    }

    fun getMonitoredPackages(config: ShieldConfig = readConfig()): Set<String> {
        val packages = linkedSetOf<String>()
        if (config.monitorSms) {
            packages += smsPackages
        }
        if (config.monitorWhatsapp) {
            packages += whatsappPackages
        }
        if (config.monitorMessenger) {
            packages += messengerPackages
        }
        return packages
    }

    fun resolveSourceApp(packageName: String): String {
        return when (packageName) {
            in whatsappPackages -> "WhatsApp"
            in messengerPackages -> "Messenger"
            in smsPackages -> "SMS"
            else -> packageName.substringAfterLast('.').replaceFirstChar { it.uppercase() }
        }
    }

    fun isNotificationAccessGranted(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners",
        ) ?: return false
        return enabledListeners.contains(context.packageName, ignoreCase = true)
    }

    fun isIgnoringBatteryOptimizations(): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return powerManager?.isIgnoringBatteryOptimizations(context.packageName) == true
    }

    fun arePostNotificationsGranted(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true
        }
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    companion object {
        const val PREF_NAME = "bcs_native_shield"
        const val KEY_MONITOR_SMS = "monitor_sms"
        const val KEY_MONITOR_WHATSAPP = "monitor_whatsapp"
        const val KEY_MONITOR_MESSENGER = "monitor_messenger"
        const val KEY_ALERT_THRESHOLD = "alert_threshold"
        const val KEY_ALERT_MEDIUM = "alert_medium"
        const val KEY_API_BASE_URL = "api_base_url"
        const val KEY_CITIZEN_PORTAL_URL = "citizen_portal_url"
        const val KEY_DEVICE_INSTALL_ID = "device_install_id"

        val smsPackages: Set<String> = setOf(
            "com.google.android.apps.messaging",
            "com.google.android.apps.messaging.home",
            "com.android.messaging",
            "com.android.mms",
            "com.android.mms.service",
            "com.samsung.android.messaging",
            "com.transsion.message",
            "com.miui.mms",
            "com.coloros.mms",
            "com.oplus.mms",
            "com.vivo.messaging",
            "com.huawei.message",
            "com.hihonor.mms",
            "com.sonyericsson.conversations",
            "com.oneplus.mms",
            "com.motorola.messaging",
            "com.android.providers.telephony",
        )

        val whatsappPackages: Set<String> = setOf(
            "com.whatsapp",
            "com.whatsapp.w4b",
        )

        val messengerPackages: Set<String> = setOf(
            "com.facebook.orca",
            "com.facebook.mlite",
        )
    }
}
