import re
from collections.abc import Callable


SIGNAL_WEIGHTS = {
    "otp_request": 25,
    "urgency": 20,
    "unexpected_gain": 15,
    "operator_impersonation": 20,
    "threat_of_loss": 10,
    "phone_number_in_message": 10,
    "suspicious_url": 15,
}

CATEGORY_LABELS = {
    "otp_request": "Demande de code confidentiel",
    "urgency": "Pression temporelle",
    "unexpected_gain": "Gain inattendu",
    "operator_impersonation": "Usurpation d'operateur",
    "threat_of_loss": "Menace de perte",
}

RULE_MAPPING = {
    "otp_request": "OTP_REQUEST",
    "urgency": "URGENCY_PATTERN",
    "unexpected_gain": "UNEXPECTED_GAIN",
    "operator_impersonation": "OPERATOR_IMPERSONATION",
    "threat_of_loss": "THREAT_OF_LOSS",
    "phone_number_in_message": "PHONE_IN_MESSAGE",
    "suspicious_url": "SUSPICIOUS_LINK",
}

EXPLANATION_MAPPING = {
    "otp_request": "Le message demande un code OTP, PIN ou un secret de securite.",
    "urgency": "Le message impose une action urgente dans un delai court.",
    "unexpected_gain": "Le message annonce un gain inattendu pour inciter a agir vite.",
    "operator_impersonation": "Le message se presente comme un service officiel (MTN/Moov/agent).",
    "threat_of_loss": "Le message menace une perte ou un blocage si vous ne reagissez pas.",
    "phone_number_in_message": "Le message contient un numero de telephone de contact potentiellement frauduleux.",
    "suspicious_url": "Le lien fourni est non officiel ou techniquement suspect.",
}

SUSPICIOUS_LINK_PATTERNS = (
    "bit.ly",
    "tinyurl",
    "t.me/",
    "wa.me/",
    "goo.gl",
    "rb.gy",
    "cutt.ly",
)

PHONE_IN_TEXT_PATTERN = re.compile(r"(?:(?:\+229|00229)\s*)?\d(?:[\s.-]?\d){7,11}")


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def _match_otp_request(text: str) -> bool:
    keywords = (
        "otp",
        "code otp",
        "code secret",
        "pin",
        "mot de passe",
        "password",
        "code de verification",
    )
    return _contains_any(text, keywords)


def _match_urgency(text: str) -> bool:
    keywords = (
        "urgent",
        "immediatement",
        "immediat",
        "dans les",
        "dans le",
        "delai",
        "dernier rappel",
        "sans attendre",
        "maintenant",
        "expire bientot",
    )
    if _contains_any(text, keywords):
        return True
    return re.search(r"\b\d+\s*(minute|minutes|heure|heures|jour|jours)\b", text) is not None


def _match_unexpected_gain(text: str) -> bool:
    keywords = (
        "felicitations",
        "gagne",
        "gagnant",
        "selectionne",
        "recevoir",
        "gain",
        "prime",
        "bonus",
        "lot",
    )
    return _contains_any(text, keywords)


def _match_operator_impersonation(text: str) -> bool:
    keywords = (
        "mtn",
        "moov",
        "service client",
        "agent",
        "support",
        "officiel",
        "mobile money",
    )
    return _contains_any(text, keywords)


def _match_threat_of_loss(text: str) -> bool:
    keywords = (
        "annule",
        "annulee",
        "bloque",
        "bloquee",
        "expire",
        "expirer",
        "perdu",
        "suspendu",
        "desactive",
    )
    return _contains_any(text, keywords)


def _match_phone_number_in_message(text: str) -> bool:
    return PHONE_IN_TEXT_PATTERN.search(text) is not None


def _match_suspicious_url(normalized_url: str) -> bool:
    if not normalized_url:
        return False
    if normalized_url.startswith("http://"):
        return True
    return any(pattern in normalized_url for pattern in SUSPICIOUS_LINK_PATTERNS)


def score_signal(message: str, url: str | None = None, phone: str | None = None) -> dict:
    """
    Rule-based scoring tuned for the L3 phishing/mobile-money context.
    """
    text = (message or "").strip().lower()
    normalized_url = (url or "").strip().lower()
    _normalized_phone = (phone or "").strip()

    signal_checks: dict[str, Callable[[], bool]] = {
        "otp_request": lambda: _match_otp_request(text),
        "urgency": lambda: _match_urgency(text),
        "unexpected_gain": lambda: _match_unexpected_gain(text),
        "operator_impersonation": lambda: _match_operator_impersonation(text),
        "threat_of_loss": lambda: _match_threat_of_loss(text),
        "phone_number_in_message": lambda: _match_phone_number_in_message(text),
        "suspicious_url": lambda: _match_suspicious_url(normalized_url),
    }

    score = 0
    matched_rules: list[str] = []
    explanation: list[str] = []
    categories_detected: list[str] = []

    for signal_name, checker in signal_checks.items():
        if not checker():
            continue
        score += SIGNAL_WEIGHTS[signal_name]
        matched_rules.append(RULE_MAPPING[signal_name])
        explanation.append(EXPLANATION_MAPPING[signal_name])
        if signal_name in CATEGORY_LABELS:
            categories_detected.append(CATEGORY_LABELS[signal_name])

    score = min(score, 100)

    if score >= 65:
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
        "explanation": explanation[:5],
        "matched_rules": matched_rules,
        "should_report": should_report,
        "categories_detected": categories_detected,
    }
