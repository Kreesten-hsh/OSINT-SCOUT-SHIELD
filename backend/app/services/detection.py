import re


SUSPICIOUS_LINK_PATTERNS = (
    "bit.ly",
    "tinyurl",
    "t.me/",
    "wa.me/",
)


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def score_signal(message: str, url: str | None = None, phone: str | None = None) -> dict:
    """
    Lightweight rule-based scoring for L3 prototype.
    Returns deterministic score + simple explanations.
    """
    score = 0
    matched_rules: list[str] = []
    explanation: list[str] = []

    text = message.strip().lower()
    normalized_url = (url or "").strip().lower()
    normalized_phone = (phone or "").strip()

    urgency_keywords = ("urgent", "immédiat", "immediat", "dernier rappel", "bloqué", "bloque")
    credential_keywords = ("code", "otp", "pin", "mot de passe", "password", "confirmer")
    money_keywords = ("transfert", "mtn money", "moov money", "frais", "paiement", "transaction")
    impersonation_keywords = ("service client", "agent", "support", "officiel")

    if _contains_any(text, urgency_keywords):
        score += 20
        matched_rules.append("URGENCY_PATTERN")
        explanation.append("Le message utilise un ton d'urgence.")

    if _contains_any(text, credential_keywords):
        score += 30
        matched_rules.append("CREDENTIAL_REQUEST")
        explanation.append("Le message demande un code ou des informations sensibles.")

    if _contains_any(text, money_keywords):
        score += 25
        matched_rules.append("MONEY_REQUEST")
        explanation.append("Le contenu mentionne un contexte financier potentiellement frauduleux.")

    if _contains_any(text, impersonation_keywords):
        score += 15
        matched_rules.append("IMPERSONATION_PATTERN")
        explanation.append("Le message semble se faire passer pour un service officiel.")

    if normalized_url and (
        any(pattern in normalized_url for pattern in SUSPICIOUS_LINK_PATTERNS)
        or normalized_url.startswith("http://")
    ):
        score += 20
        matched_rules.append("SUSPICIOUS_LINK")
        explanation.append("Le lien partage des signes techniques suspects.")

    if normalized_phone:
        benin_phone_pattern = r"^(\+229|00229)?\s?[014569]\d{7}$"
        if not re.match(benin_phone_pattern, normalized_phone):
            score += 10
            matched_rules.append("PHONE_FORMAT_ANOMALY")
            explanation.append("Le format du numero est atypique.")

    score = min(score, 100)

    if score >= 70:
        risk_level = "HIGH"
    elif score >= 35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    should_report = risk_level in ("MEDIUM", "HIGH")

    if not explanation:
        explanation.append("Aucun indicateur critique detecte.")

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "explanation": explanation[:3],
        "matched_rules": matched_rules,
        "should_report": should_report,
    }

