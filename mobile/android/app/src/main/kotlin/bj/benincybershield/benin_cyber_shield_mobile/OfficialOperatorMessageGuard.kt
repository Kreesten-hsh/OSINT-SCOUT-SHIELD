package bj.benincybershield.benin_cyber_shield_mobile

object OfficialOperatorMessageGuard {
    private val officialSenderKeywords = listOf(
        "mtn",
        "momo",
        "mtnmomo",
        "mtnmoney",
        "moov",
        "moovmoney",
        "mobilemoney",
        "orabank",
        "mfsorabank",
        "semoa",
    )

    private val receiptKeywords = listOf(
        "depot recu",
        "vous avez recu",
        "transfert",
        "solde",
        "frais",
        "ref",
        "id",
    )

    private val criticalTerms = listOf(
        "otp",
        "code secret",
        "pin",
        "mot de passe",
        "password",
        "cliquez",
        "http://",
        "https://",
        "wa.me",
        "bit.ly",
        "bloque",
        "suspendu",
        "urgent",
    )

    private val criticalRules = setOf(
        "OTP_REQUEST",
        "SUSPICIOUS_LINK",
        "THREAT_OF_LOSS",
        "URGENCY_PATTERN",
    )

    fun shouldSuppressOfficialReceiptNotification(
        sender: String,
        message: String,
        analysis: ShieldAnalysisResult,
    ): Boolean {
        if (!isOfficialSender(sender)) {
            return false
        }
        if (!isReceiptLike(message)) {
            return false
        }
        if (hasCriticalFraudTerm(message) || analysis.matchedRules.any { it.uppercase() in criticalRules }) {
            return false
        }
        return analysis.riskScore < 90
    }

    fun isFakeReceiptFromPersonalSender(sender: String, message: String): Boolean {
        if (!isPersonalSender(sender)) {
            return false
        }
        if (!isReceiptLike(message)) {
            return false
        }
        val normalizedMessage = normalize(message)
        return normalizedMessage.contains("depot recu") ||
            normalizedMessage.contains("vous avez recu") ||
            normalizedMessage.contains("mtn") ||
            normalizedMessage.contains("momo") ||
            normalizedMessage.contains("moov") ||
            normalizedMessage.contains("mobile money") ||
            normalizedMessage.contains("orabank")
    }

    private fun isOfficialSender(sender: String): Boolean {
        val compactSender = normalize(sender).filter { it.isLetterOrDigit() }
        if (compactSender.isBlank()) {
            return false
        }
        if (compactSender.all { it.isDigit() }) {
            return compactSender.length <= 6
        }
        return officialSenderKeywords.any { compactSender.contains(it) }
    }

    private fun isPersonalSender(sender: String): Boolean {
        val digits = sender.filter { it.isDigit() }
        return digits.length in 8..13
    }

    private fun isReceiptLike(message: String): Boolean {
        val normalizedMessage = normalize(message)
        val hits = receiptKeywords.count { normalizedMessage.contains(it) }
        val hasAmount = Regex("""\b\d{3,}(?:[.\s]?\d{3})?\s*[^\w]{0,3}(?:f|fcfa|cfa)\b""").containsMatchIn(normalizedMessage)
        val hasReference = Regex("""\b(?:ref|id)\s*:?\s*[a-z0-9-]{4,}\b""").containsMatchIn(normalizedMessage)
        val hasDate = Regex(
            """\b(?:20\d{2}[-/]\d{2}[-/]\d{2}|\d{2}/\d{2}/20\d{2})""",
        ).containsMatchIn(normalizedMessage)
        return hits >= 2 && hasAmount && (hasReference || hasDate || normalizedMessage.contains("solde"))
    }

    private fun hasCriticalFraudTerm(message: String): Boolean {
        val normalizedMessage = normalize(message)
        return criticalTerms.any { normalizedMessage.contains(it) }
    }

    private fun normalize(value: String): String {
        return value
            .lowercase()
            .replace('ç', 'c')
            .replace('é', 'e')
            .replace('è', 'e')
            .replace('ê', 'e')
            .replace('à', 'a')
            .replace('â', 'a')
            .replace('ï', 'i')
            .replace('î', 'i')
            .replace('ô', 'o')
            .replace('ù', 'u')
            .replace('û', 'u')
    }
}
