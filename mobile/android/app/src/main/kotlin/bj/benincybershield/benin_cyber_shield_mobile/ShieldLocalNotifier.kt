package bj.benincybershield.benin_cyber_shield_mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlin.math.abs

class ShieldLocalNotifier(private val context: Context) {
    fun showThreatAlert(
        sourceApp: String,
        sender: String,
        preview: String,
        riskScore: Int,
        riskLevel: String,
    ) {
        ensureChannel()
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Alerte BCS · $sourceApp")
            .setContentText("Score $riskScore - ${buildSummary(sender, preview)}")
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "$riskLevel · ${buildSummary(sender, preview)}",
                ),
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(
                abs("$sourceApp-$sender-${System.currentTimeMillis()}".hashCode()),
                notification,
            )
        } catch (_: SecurityException) {
            return
        }
    }

    private fun buildSummary(sender: String, preview: String): String {
        return listOf(sender, preview)
            .filter { it.isNotBlank() }
            .joinToString(" · ")
            .take(120)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existing = manager.getNotificationChannel(CHANNEL_ID)
        if (existing != null) {
            return
        }
        val channel = NotificationChannel(
            CHANNEL_ID,
            "BCS Threat Alerts",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Alertes locales de messages suspects detectes par BENIN CYBER SHIELD."
        }
        manager.createNotificationChannel(channel)
    }

    companion object {
        private const val CHANNEL_ID = "bcs_mobile_threat_alerts"
    }
}
