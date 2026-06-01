import json
import logging
import re
import unicodedata
from collections.abc import Callable
from functools import lru_cache
from pathlib import Path

from app.core.risk_levels import risk_level_from_score

logger = logging.getLogger(__name__)


SIGNAL_WEIGHTS = {
    "otp_request": 25,
    "urgency": 20,
    "unexpected_gain": 15,
    "operator_impersonation": 20,
    "threat_of_loss": 10,
    "phone_number_in_message": 10,
    "suspicious_url": 15,
    "fcfa_amount_in_message": 20,
    "whatsapp_number": 15,
    "fake_operator_receipt": 70,
}

CATEGORY_LABELS = {
    "otp_request": "Demande de code confidentiel",
    "urgency": "Pression temporelle",
    "unexpected_gain": "Gain inattendu",
    "operator_impersonation": "Usurpation d'operateur",
    "threat_of_loss": "Menace de perte",
    "phone_number_in_message": "Numero de telephone dans le message",
    "MM_FRAUD": "Arnaque Mobile Money",
    "CRYPTO_PONZI": "Investissement fictif",
    "FAKE_RECRUITMENT": "Arnaque a l'emploi",
    "FAKE_LOTTERY": "Fausse loterie",
    "SEXTORTION": "Sextorsion",
    "PHISHING_BANCAIRE": "Phishing bancaire",
    "FAUX_DON_ONG": "Faux don / ONG",
    "fcfa_amount_in_message": "Montant FCFA suspect",
    "whatsapp_number": "Redirection WhatsApp",
    "fake_operator_receipt": "Faux recu Mobile Money",
}

RULE_MAPPING = {
    "otp_request": "OTP_REQUEST",
    "urgency": "URGENCY_PATTERN",
    "unexpected_gain": "UNEXPECTED_GAIN",
    "operator_impersonation": "OPERATOR_IMPERSONATION",
    "threat_of_loss": "THREAT_OF_LOSS",
    "phone_number_in_message": "PHONE_IN_MESSAGE",
    "suspicious_url": "SUSPICIOUS_LINK",
    "MM_FRAUD": "MM_FRAUD",
    "CRYPTO_PONZI": "CRYPTO_PONZI",
    "FAKE_RECRUITMENT": "FAKE_RECRUITMENT",
    "FAKE_LOTTERY": "FAKE_LOTTERY",
    "SEXTORTION": "SEXTORTION",
    "PHISHING_BANCAIRE": "PHISHING_BANCAIRE",
    "FAUX_DON_ONG": "FAUX_DON_ONG",
    "fcfa_amount_in_message": "fcfa_amount_in_message",
    "whatsapp_number": "whatsapp_number",
    "fake_operator_receipt": "FAKE_OPERATOR_RECEIPT",
}

EXPLANATION_MAPPING = {
    "otp_request": "Le message demande un code OTP, PIN ou un secret de securite.",
    "urgency": "Le message impose une action urgente dans un delai court.",
    "unexpected_gain": "Le message annonce un gain inattendu pour inciter a agir vite.",
    "operator_impersonation": "Le message se presente comme un service officiel (MTN/Moov/agent).",
    "threat_of_loss": "Le message menace une perte ou un blocage si vous ne reagissez pas.",
    "phone_number_in_message": "Le message contient un numero de telephone de contact potentiellement frauduleux.",
    "suspicious_url": "Le lien fourni est non officiel ou techniquement suspect.",
    "fake_operator_receipt": (
        "Le message imite un recu de depot Mobile Money, mais il semble provenir "
        "d'un numero personnel et non d'un expediteur officiel."
    ),
    "MM_FRAUD": "Ce message reprend des formulations classiques d'arnaque Mobile Money observees au Benin.",
    "CRYPTO_PONZI": "Ce message promet des rendements irrealistes lies a un investissement fictif ou pyramidal.",
    "FAKE_RECRUITMENT": (
        "Ce message propose un emploi fictif a l'etranger "
        "avec des frais a payer a l'avance."
    ),
    "FAKE_LOTTERY": (
        "Ce message pretend que vous avez gagne un prix - "
        "une technique classique pour vous faire payer des frais."
    ),
    "SEXTORTION": (
        "Ce message contient des elements d'extorsion lies "
        "a du contenu personnel potentiellement compromettant."
    ),
    "PHISHING_BANCAIRE": (
        "Ce message usurpe l'identite d'une banque pour "
        "voler vos identifiants."
    ),
    "FAUX_DON_ONG": (
        "Ce message utilise le nom d'une ONG fictive ou reelle "
        "pour collecter des donnees ou de l'argent."
    ),
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
    "fake_operator_receipt": (
        "Ne remettez pas l'article sur la base de ce SMS. "
        "Verifiez le solde dans l'application officielle ou composez le code USSD de l'operateur."
    ),
    "FAKE_RECRUITMENT": (
        "Aucun employeur serieux ne demande des frais a l'avance. "
        "Verifiez l'entreprise sur LinkedIn ou en appelant directement."
    ),
    "FAKE_LOTTERY": (
        "Aucun gain legitime ne necessite un paiement prealable. "
        "Ne payez jamais pour recevoir un cadeau."
    ),
    "SEXTORTION": (
        "Ne payez pas et ne repondez pas. Signalez a la Police "
        "Republicaine ou appelez le 167."
    ),
    "PHISHING_BANCAIRE": (
        "Ne cliquez jamais sur un lien bancaire recu par SMS. "
        "Appelez directement votre banque au numero officiel."
    ),
    "FAUX_DON_ONG": (
        "Verifiez l'existence de l'ONG sur son site officiel "
        "avant de fournir toute information personnelle."
    ),
}

FON_ALERT_BASE = {
    "FORT": (
        "Wɛ, nù sia do vivɛ. Mà klike o, mà na PIN, OTP alo kɔ́dɛ ɖe ame aɖe o.",
        "We, nou sia do vive. Ma klike o. Ma na PIN, OTP alo code de ame ade o.",
    ),
    "MOYEN": (
        "Kpɔ nù sia gbe. Mà yì nukɔn o. Ɖo kan sɔgbe na ɔfisieli gbɔ.",
        "Kpo nou sia gbe. Ma yi nukon o. Do kan sogbe na officiel gbo.",
    ),
}

FON_ALERT_BY_RULE = {
    "fake_operator_receipt": (
        "Mà na nù alo mɔ̌nɛ o. Kpɔ solde to appli alo kɔ́dɛ USSD ɔfisieli me.",
        "Ma na nou alo money o. Kpo solde to appli alo code USSD officiel me.",
    ),
    "otp_request": (
        "Mà na PIN, OTP alo kɔ́dɛ ɖe ame aɖe o. Kɔ́dɛ lɛ nyi asì gɔna tɔn.",
        "Ma na PIN, OTP alo code de ame ade o. Code le nyi assi gona ton.",
    ),
    "suspicious_url": (
        "Mà klike link sia o. Kpɔ adreesi ɔfisieli gbɔn bɔ yì nukɔn.",
        "Ma klike link sia o. Kpo adresse officiel gbon bo yi nukon.",
    ),
    "unexpected_gain": (
        "Ame aɖe lɛ wɛ be a nyi akwɛ alo cadeau. Mà yì nukɔn o, kpɔ nù gbɔn.",
        "Ame ade le we be a nyi akwe alo cadeau. Ma yi nukon o, kpo nou gbon.",
    ),
    "urgency": (
        "Nù sia do vivɛ bo na wɛ nukunmɛ. Nɔ́ kpɔ e gbɔn; mà yì nukɔn o.",
        "Nou sia do vive bo na we noukonme. No kpo e gbon. Ma yi nukon o.",
    ),
    "threat_of_loss": (
        "A lɛ wɛ be nù aɖe na bu. Mà sɛ́ avivɔ o; kpɔ nù gbɔn.",
        "A le we be nou ade na bou. Ma se avivo o. Kpo nou gbon.",
    ),
    "operator_impersonation": (
        "Mɛ sia lɛ e ɖokpo operateur ɔfisieli. Kpɔ nù to MTN, Moov alo banque ɔfisieli me.",
        "Me sia le e dokpo operateur officiel. Kpo nou to MTN, Moov alo banque officiel me.",
    ),
    "MM_FRAUD": (
        "Mà da mɔ̌nɛ o, mà na PIN o. Kpɔ transaction to appli ɔfisieli me.",
        "Ma da money o, ma na PIN o. Kpo transaction to appli officiel me.",
    ),
}


def _build_fon_alert(risk_level: str, matched_signal_rules: list[str]) -> tuple[str | None, str | None]:
    if risk_level not in FON_ALERT_BASE:
        return None, None

    for rule in (
        "fake_operator_receipt",
        "otp_request",
        "suspicious_url",
        "unexpected_gain",
        "urgency",
        "threat_of_loss",
        "operator_impersonation",
        "MM_FRAUD",
    ):
        if rule in matched_signal_rules:
            return FON_ALERT_BY_RULE[rule]

    return FON_ALERT_BASE[risk_level]

RULE_KEYWORDS = {
    "otp_request": ["otp", "code", "secret", "pin", "mot de passe"],
    "urgency": ["urgent", "immediatement", "maintenant", "vite", "minutes", "heures", "bloque", "suspendu"],
    "unexpected_gain": ["gagne", "felicitations", "cadeau", "gratuit", "recompense"],
    "operator_impersonation": ["mtn", "moov", "agent", "service client", "orange"],
    "threat_of_loss": ["suspendu", "bloque", "desactive", "cloture", "ferme"],
    "suspicious_url": ["http", "www", ".xyz", ".tk", "cliquez", "lien"],
    "phone_number_in_message": ["appel", "rappel", "contactez", "numero"],
    "MM_FRAUD": ["transfert errone", "code de validation", "mtn money", "moov money", "frais de retrait"],
    "fake_operator_receipt": ["depot recu", "vous avez recu", "solde", "ref", "id"],
    "CRYPTO_PONZI": ["gains rapides", "investir", "usdt", "kpayo", "liberte financiere"],
    "FAKE_RECRUITMENT": [
        "emploi",
        "recrutement",
        "poste",
        "dubaï",
        "dubai",
        "canada",
        "europe",
        "visa",
        "frais de dossier",
        "frais de visa",
        "selectionne",
        "sélectionné",
        "embauche",
        "embauché",
        "cv",
        "candidature",
        "agence",
    ],
    "FAKE_LOTTERY": [
        "gagne",
        "gagné",
        "loterie",
        "tirage",
        "samsung",
        "iphone",
        "voiture",
        "moto",
        "cadeau",
        "livraison",
        "frais de livraison",
        "recompense",
        "récompense",
        "felicitations",
        "félicitations",
        "lucky",
        "prize",
    ],
    "SEXTORTION": [
        "photos",
        "videos",
        "vidéos",
        "intime",
        "publier",
        "diffuser",
        "honte",
        "famille",
        "chantage",
        "nude",
        "enregistrement",
        "compromettant",
    ],
    "PHISHING_BANCAIRE": [
        "uba",
        "boa",
        "ecobank",
        "sgbenin",
        "sgbénin",
        "banque",
        "compte bancaire",
        "verification bancaire",
        "vérification bancaire",
        "mise a jour bancaire",
        "mise à jour bancaire",
        "informations bancaires",
        "identifiants",
        "reinitialisation",
        "réinitialisation",
    ],
    "FAUX_DON_ONG": [
        "ong",
        "association",
        "don",
        "aide humanitaire",
        "subvention",
        "beneficiaire",
        "bénéficiaire",
        "programme",
        "fondation",
        "unicef",
        "croix rouge",
        "inscription",
        "formulaire",
    ],
    "fcfa_amount_in_message": ["fcfa", "cfa", "francs"],
    "whatsapp_number": ["whatsapp", "wa.me"],
}

COLOR_MAP = {
    "otp_request": "red",
    "operator_impersonation": "red",
    "threat_of_loss": "red",
    "suspicious_url": "red",
    "urgency": "orange",
    "phone_number_in_message": "orange",
    "unexpected_gain": "amber",
    "MM_FRAUD": "red",
    "fake_operator_receipt": "red",
    "CRYPTO_PONZI": "amber",
    "FAKE_RECRUITMENT": "orange",
    "FAKE_LOTTERY": "amber",
    "SEXTORTION": "red",
    "PHISHING_BANCAIRE": "red",
    "FAUX_DON_ONG": "orange",
    "fcfa_amount_in_message": "amber",
    "whatsapp_number": "orange",
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
PERSONAL_SENDER_PATTERN = re.compile(r"^\+?(?:229)?0?\d{8,10}$")
RECEIPT_DATE_PATTERN = re.compile(
    r"\b(?:20\d{2}[-/]\d{2}[-/]\d{2}|\d{2}/\d{2}/20\d{2})"
    r"(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b"
)
RECEIPT_ID_PATTERN = re.compile(r"\b(?:ref(?:erence)?|id)\s*:?\s*[a-z0-9-]{4,}\b", re.IGNORECASE)

OFFICIAL_SENDER_KEYWORDS = (
    "mtn",
    "momo",
    "moov",
    "moov money",
    "mtn momo",
    "mtn money",
    "mobile money",
    "orabank",
    "mfs orabank",
    "semoa",
)

RECEIPT_KEYWORDS = (
    "depot recu",
    "vous avez recu",
    "transfert",
    "solde",
    "frais",
    "ref",
    "id",
)

OFFICIAL_RECEIPT_BRANDS = (
    "mtn",
    "momo",
    "moov",
    "orabank",
    "mfs",
    "semoa",
    "mobile money",
)

CRITICAL_FRAUD_TERMS = (
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


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return normalized.encode("ascii", "ignore").decode("ascii").lower()


def _contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    normalized_text = _normalize_text(text)
    return any(_normalize_text(keyword) in normalized_text for keyword in keywords)


@lru_cache(maxsize=1)
def _load_rule_categories() -> tuple[dict, ...]:
    candidates = (
        Path(__file__).resolve().parents[1] / "config" / "rules.json",
        Path(__file__).resolve().parents[2] / "config" / "rules.json",
        Path(__file__).resolve().parents[3] / "config" / "rules.json",
        Path(__file__).resolve().parents[3] / "scrapers" / "config" / "rules.json",
    )

    for path in candidates:
        if not path.exists():
            continue
        try:
            with path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            categories = payload.get("categories", [])
            return tuple(category for category in categories if isinstance(category, dict))
        except Exception as exc:
            logger.warning("Failed to load rules from %s: %s", path, exc)
            return tuple()
    logger.warning("No rules.json file found for detection engine")
    return tuple()


def _detect_rule_categories(text: str) -> list[dict]:
    normalized_text = _normalize_text(text)
    detected: list[dict] = []

    for category in _load_rule_categories():
        category_id = str(category.get("id") or "").strip()
        if not category_id:
            continue

        category_score = 0
        matches: list[str] = []

        for keyword_obj in category.get("keywords", []):
            term = str(keyword_obj.get("term") or "").strip()
            if not term:
                continue
            if _normalize_text(term) in normalized_text:
                try:
                    category_score += int(keyword_obj.get("weight", 0))
                except Exception:
                    category_score += 0
                matches.append(term)

        for pattern in category.get("patterns", []):
            if not pattern:
                continue
            try:
                if re.search(str(pattern), text, re.IGNORECASE):
                    category_score += 40
                    matches.append(f"REGEX:{pattern}")
            except re.error as exc:
                logger.warning("Invalid regex in rules.json for %s: %s", category_id, exc)

        if category_score > 0:
            detected.append(
                {
                    "id": category_id,
                    "score": min(category_score, 100),
                    "matches": matches,
                }
            )

    return detected


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
    return re.search(r"\b\d+\s*(minute|minutes|heure|heures|jour|jours)\b", _normalize_text(text)) is not None


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


def _compact_sender(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", _normalize_text(value or ""))


def _is_personal_sender(sender: str | None) -> bool:
    compact = re.sub(r"[\s().-]", "", sender or "")
    return PERSONAL_SENDER_PATTERN.match(compact) is not None


def _is_official_sender(sender: str | None) -> bool:
    compact = _compact_sender(sender)
    if not compact:
        return False
    if compact.isdigit():
        return len(compact) <= 6
    return any(_compact_sender(keyword) in compact for keyword in OFFICIAL_SENDER_KEYWORDS)


def _is_receipt_like_message(text: str) -> bool:
    normalized = _normalize_text(text)
    hits = sum(1 for keyword in RECEIPT_KEYWORDS if _normalize_text(keyword) in normalized)
    amount_pattern = r"\b\d{3,}(?:[.\s]?\d{3})?\s*[^\w]{0,3}(?:f|fcfa|cfa)\b"
    has_amount = bool(re.search(amount_pattern, normalized, re.IGNORECASE))
    has_reference = RECEIPT_ID_PATTERN.search(normalized) is not None
    has_date = RECEIPT_DATE_PATTERN.search(normalized) is not None
    return hits >= 2 and has_amount and (has_reference or has_date or "solde" in normalized)


def _mentions_receipt_brand(text: str) -> bool:
    normalized = _normalize_text(text)
    return any(_normalize_text(keyword) in normalized for keyword in OFFICIAL_RECEIPT_BRANDS)


def _has_critical_fraud_terms(text: str, normalized_url: str) -> bool:
    normalized = _normalize_text(text)
    if normalized_url:
        return True
    return any(_normalize_text(term) in normalized for term in CRITICAL_FRAUD_TERMS)


def _is_safe_official_receipt(text: str, sender: str | None, normalized_url: str) -> bool:
    return (
        _is_official_sender(sender)
        and _is_receipt_like_message(text)
        and not _has_critical_fraud_terms(text, normalized_url)
    )


def _match_fake_operator_receipt(text: str, sender: str | None, normalized_url: str) -> bool:
    if not _is_personal_sender(sender):
        return False
    if not _is_receipt_like_message(text):
        return False
    if _has_critical_fraud_terms(text, normalized_url):
        return True
    normalized = _normalize_text(text)
    return (
        _mentions_receipt_brand(text)
        or "depot recu" in normalized
        or "vous avez recu" in normalized
    )


def _match_suspicious_url(normalized_url: str, text: str = "") -> bool:
    normalized_text = _normalize_text(text)
    if normalized_url.startswith("http://") or "http://" in normalized_text:
        return True
    if normalized_url or normalized_text:
        combined = f"{normalized_url} {normalized_text}"
        return any(pattern in combined for pattern in SUSPICIOUS_LINK_PATTERNS)
    return False


def _match_fcfa_amount(text: str) -> bool:
    """Detecte un montant en francs CFA dans le message."""
    pattern = r"\d{1,5}(?:[.\s]?\d{3})?\s*[^\w]{0,3}(?:F\s*CFA|FCFA|francs?|CFA|F)"
    return bool(re.search(pattern, text, re.IGNORECASE))


def _match_whatsapp(text: str) -> bool:
    """Detecte une redirection vers WhatsApp."""
    return bool(re.search(r"wa\.me|whatsapp", text, re.IGNORECASE))


def _find_spans(text: str, matched_rules: list[str]) -> list[dict]:
    try:
        text_lower = text.lower()
        spans: list[dict] = []

        for rule in matched_rules:
            for keyword in RULE_KEYWORDS.get(rule, []):
                start = 0
                while True:
                    pos = text_lower.find(keyword.lower(), start)
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


def score_signal(
    message: str,
    url: str | None = None,
    phone: str | None = None,
    sender: str | None = None,
) -> dict:
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
        "suspicious_url": lambda: _match_suspicious_url(normalized_url, raw_text),
        "fcfa_amount_in_message": lambda: _match_fcfa_amount(raw_text),
        "whatsapp_number": lambda: _match_whatsapp(raw_text),
        "fake_operator_receipt": lambda: _match_fake_operator_receipt(raw_text, sender, normalized_url),
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
        mapped_rule = RULE_MAPPING[signal_name]
        if mapped_rule not in matched_rules:
            matched_rules.append(mapped_rule)
        if signal_name not in matched_signal_rules:
            matched_signal_rules.append(signal_name)
        explanation_text = EXPLANATION_MAPPING.get(signal_name)
        if explanation_text and explanation_text not in explanation:
            explanation.append(explanation_text)
        if signal_name in CATEGORY_LABELS:
            categories_detected.append(CATEGORY_LABELS[signal_name])

    for category_match in _detect_rule_categories(raw_text):
        category_id = str(category_match.get("id") or "").strip()
        if not category_id:
            continue

        try:
            score += int(category_match.get("score", 0))
        except Exception:
            score += 0

        mapped_rule = RULE_MAPPING.get(category_id, category_id)
        if mapped_rule not in matched_rules:
            matched_rules.append(mapped_rule)
        if category_id not in matched_signal_rules:
            matched_signal_rules.append(category_id)
        if category_id not in categories_detected:
            categories_detected.append(category_id)

        explanation_text = EXPLANATION_MAPPING.get(category_id)
        if explanation_text and explanation_text not in explanation:
            explanation.append(explanation_text)

    if _is_safe_official_receipt(raw_text, sender, normalized_url):
        score = min(score, 20)
        suppress_rules = {
            "OPERATOR_IMPERSONATION",
            "PHONE_IN_MESSAGE",
            "fcfa_amount_in_message",
            "MM_FRAUD",
        }
        suppress_categories = {
            CATEGORY_LABELS[key]
            for key in (
                "operator_impersonation",
                "phone_number_in_message",
                "fcfa_amount_in_message",
                "MM_FRAUD",
            )
            if key in CATEGORY_LABELS
        } | {"MM_FRAUD"}
        matched_rules = [rule for rule in matched_rules if rule not in suppress_rules]
        suppressed_signal_rules = {
            "operator_impersonation",
            "phone_number_in_message",
            "fcfa_amount_in_message",
            "MM_FRAUD",
        }
        matched_signal_rules = [
            rule
            for rule in matched_signal_rules
            if RULE_MAPPING.get(rule, rule) not in suppress_rules
            and rule not in suppressed_signal_rules
        ]
        categories_detected = [
            category
            for category in categories_detected
            if category not in suppress_categories
        ]
        explanation = [
            "Le message ressemble a un recu transactionnel emis par un expediteur officiel."
        ]

    score = min(score, 100)

    risk_level = risk_level_from_score(score)
    should_report = risk_level in ("MOYEN", "FORT")

    if not explanation:
        explanation.append("Aucun indicateur critique detecte.")

    recommendations = [
        RECOMMENDATION_MAPPING[rule]
        for rule in matched_signal_rules
        if rule in RECOMMENDATION_MAPPING
    ]
    fon_alert, fon_alert_speech = _build_fon_alert(risk_level, matched_signal_rules)

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
        "fon_alert": fon_alert,
        "fon_alert_speech": fon_alert_speech,
    }
