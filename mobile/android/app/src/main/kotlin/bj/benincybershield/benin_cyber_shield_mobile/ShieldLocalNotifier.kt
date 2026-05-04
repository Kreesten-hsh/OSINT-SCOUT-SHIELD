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
        val summaryLine = buildSummary(sender, preview)
        val compactPreview = buildCompactPreview(summaryLine, categoryLine)
        val bigText =
            listOfNotNull(
                categoryLine,
                summaryLine.take(180).takeIf { it.isNotBlank() },
                recommendation?.takeIf { it.isNotBlank() }?.let { "Touchez pour voir l'analyse complete." },
            ).joinToString("\n")

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(buildTitle(sourceApp, riskLevel))
            .setSubText("BCS $riskScore/100")
            .setContentText(compactPreview)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setColor(resolveAccentColor(riskLevel))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOnlyAlertOnce(true)
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
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun buildCompactPreview(summary: String, category: String?): String {
        val compactSummary = summary.take(96)
        val compactCategory = category?.takeIf { it.isNotBlank() }?.take(44)
        return listOfNotNull(compactCategory, compactSummary)
            .joinToString(" - ")
            .take(132)
    }

    private fun buildTitle(sourceApp: String, riskLevel: String): String {
        val sourceLabel = sourceApp.ifBlank { "message" }
        return when (riskLevel.uppercase()) {
            "HIGH", "FORT" -> "Alerte forte sur $sourceLabel"
            "MEDIUM", "MOYEN" -> "A verifier sur $sourceLabel"
            else -> "Message suspect sur $sourceLabel"
        }
    }

    private fun resolveAccentColor(riskLevel: String): Int {
        return when (riskLevel.uppercase()) {
            "HIGH", "FORT" -> 0xFFE85D75.toInt()
            "MEDIUM", "MOYEN" -> 0xFFFFB84D.toInt()
            else -> 0xFF2FE38A.toInt()
        }
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
            "Alertes BCS",
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
