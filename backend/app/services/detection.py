import logging
import re
from collections.abc import Callable


logger = logging.getLogger(__name__)


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

RECOMMENDATION_MAPPING = {
    "otp_request": (
        "Ne communiquez JAMAIS un code recu par SMS. "
        "Aucun service officiel ne vous le demandera."
    ),
    "urgency": (
        "L'urgence est la principale arme des arnaqueurs. "
        "Un vrai service vous laisse toujours le temps de verifier."
    ),
    "unexpected_gain": (
        "Aucun gain legitime ne necessite un paiement prealable "
        "ou votre code secret."
    ),
    "operator_impersonation": (
        "MTN et Moov ne vous contacteront jamais par SMS "
        "pour demander un transfert ou votre code PIN."
    ),
    "threat_of_loss": (
        "Les menaces de blocage sont de fausses urgences. "
        "Appelez directement votre operateur pour verifier."
    ),
    "phone_number_in_message": (
        "Ce numero n'appartient pas a votre operateur officiel. "
        "Ne le rappelez pas."
    ),
    "suspicious_url": (
        "Ne cliquez jamais sur un lien recu par SMS. "
        "Tapez toujours l'adresse officielle de votre service."
    ),
}

FON_ALERTS = {
    "HIGH": "⚠️ Wɛ — Nyanya wɛ ɖo ali bo na xò wɛ!",
    "MEDIUM": "⚠️ Ðó wantɔ ɖagbe — Kpɔ nú enɛ jɛ nukɔn",
}

RULE_KEYWORDS = {
    "otp_request": ["otp", "code", "secret", "pin", "mot de passe"],
    "urgency": ["urgent", "immediatement", "maintenant", "vite", "minutes", "heures", "bloque", "suspendu"],
    "unexpected_gain": ["gagne", "felicitations", "cadeau", "gratuit", "recompense"],
    "operator_impersonation": ["mtn", "moov", "agent", "service client", "orange"],
    "threat_of_loss": ["suspendu", "bloque", "desactive", "cloture", "ferme"],
    "suspicious_url": ["http", "www", ".xyz", ".tk", "cliquez", "lien"],
    "phone_number_in_message": ["appel", "rappel", "contactez", "numero"],
}

COLOR_MAP = {
    "otp_request": "red",
    "operator_impersonation": "red",
    "threat_of_loss": "red",
    "suspicious_url": "red",
    "urgency": "orange",
    "phone_number_in_message": "orange",
    "unexpected_gain": "amber",
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


def _find_spans(text: str, matched_rules: list[str]) -> list[dict]:
    try:
        text_lower = text.lower()
        spans: list[dict] = []

        for rule in matched_rules:
            for keyword in RULE_KEYWORDS.get(rule, []):
                start = 0
                while True:
                    pos = text_lower.find(keyword, start)
                    if pos == -1:
                        break
                    spans.append(
                        {
                            "start": pos,
                            "end": pos + len(keyword),
                            "rule": rule,
                            "label": CATEGORY_LABELS.get(rule, rule),
                            "color": COLOR_MAP.get(rule, "orange"),
                        }
                    )
                    start = pos + 1

        spans.sort(key=lambda item: item["start"])
        merged: list[dict] = []
        for span in spans:
            if not merged or span["start"] >= merged[-1]["end"]:
                merged.append(span.copy())
            else:
                merged[-1]["end"] = max(merged[-1]["end"], span["end"])
        return merged
    except Exception as exc:
        logger.warning("Failed to compute highlighted spans: %s", exc)
        return []


def score_signal(message: str, url: str | None = None, phone: str | None = None) -> dict:
    """
    Rule-based scoring tuned for the L3 phishing/mobile-money context.
    """
    raw_text = (message or "").strip()
    text = raw_text.lower()
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
    matched_signal_rules: list[str] = []
    explanation: list[str] = []
    categories_detected: list[str] = []

    for signal_name, checker in signal_checks.items():
        if not checker():
            continue
        score += SIGNAL_WEIGHTS[signal_name]
        matched_rules.append(RULE_MAPPING[signal_name])
        matched_signal_rules.append(signal_name)
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

    recommendations = [
        RECOMMENDATION_MAPPING[rule]
        for rule in matched_signal_rules
        if rule in RECOMMENDATION_MAPPING
    ]

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "explanation": explanation[:5],
        "matched_rules": matched_rules,
        "should_report": should_report,
        "categories_detected": categories_detected,
        "highlighted_spans": _find_spans(raw_text, matched_signal_rules),
        "recommendations": recommendations,
        "citizen_advice": recommendations[:3],
        "fon_alert": FON_ALERTS.get(risk_level),
    }
