package bj.benincybershield.benin_cyber_shield_mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
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
        primaryCategory: String?,
        recommendation: String?,
    ) {
        ensureChannel()
        val launchIntent =
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("bcs_open_surface", "history")
            }
        val contentIntent =
            launchIntent?.let { intent ->
                PendingIntent.getActivity(
                    context,
                    abs("history-$sourceApp-$sender".hashCode()),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            }
        val categoryLine = primaryCategory?.takeIf { it.isNotBlank() }
        val recommendationLine = recommendation?.takeIf { it.isNotBlank() }?.take(110)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("BCS · $sourceApp")
            .setSubText("Score $riskScore/100 · $riskLevel")
            .setContentText(
                listOfNotNull(categoryLine, buildSummary(sender, preview))
                    .joinToString(" · ")
                    .take(160),
            )
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    listOfNotNull(
                        categoryLine?.let { "Categorie : $it" },
                        "Message : ${buildSummary(sender, preview)}",
                        recommendationLine?.let { "Conseil : $it" },
                    ).joinToString("\n"),
                ),
            )
            .setColorized(true)
            .setColor(0xFF2FE38A.toInt())
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
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
            .joinToString(" - ")
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
