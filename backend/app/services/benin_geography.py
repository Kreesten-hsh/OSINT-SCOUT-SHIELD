from __future__ import annotations

import re
import unicodedata


BENIN_DEPARTMENTS: list[str] = [
    "Alibori",
    "Atacora",
    "Atlantique",
    "Borgou",
    "Collines",
    "Couffo",
    "Donga",
    "Littoral",
    "Mono",
    "Oueme",
    "Plateau",
    "Zou",
]

BENIN_DEPARTMENT_COORDS: dict[str, tuple[float, float]] = {
    "Alibori": (11.33, 2.78),
    "Atacora": (10.63, 1.65),
    "Atlantique": (6.3676, 2.4252),
    "Borgou": (10.23, 2.77),
    "Collines": (8.39, 2.27),
    "Couffo": (7.0, 1.75),
    "Donga": (9.74, 1.67),
    "Littoral": (6.3654, 2.4183),
    "Mono": (6.9, 1.66),
    "Oueme": (6.49, 2.63),
    "Plateau": (7.21, 2.98),
    "Zou": (7.17, 2.09),
}

PHONE_PREFIX_DEPARTMENT: dict[str, str] = {
    "01": "Atlantique",
    "02": "Borgou",
    "03": "Oueme",
    "04": "Zou",
    "05": "Mono",
    "06": "Couffo",
    "07": "Atacora",
    "08": "Donga",
    "09": "Collines",
    "10": "Plateau",
    "11": "Alibori",
    "12": "Littoral",
    "61": "Atlantique",
    "62": "Atlantique",
    "66": "Atlantique",
    "67": "Littoral",
    "95": "Oueme",
    "96": "Atlantique",
    "97": "Borgou",
}


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_department_name(value: str | None) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None

    normalized = _strip_accents(raw).lower().replace("-", " ").replace("_", " ")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if normalized == "unknown":
        return "UNKNOWN"

    aliases = {
        "alibori": "Alibori",
        "atacora": "Atacora",
        "atlantique": "Atlantique",
        "borgou": "Borgou",
        "collines": "Collines",
        "couffo": "Couffo",
        "donga": "Donga",
        "littoral": "Littoral",
        "mono": "Mono",
        "oueme": "Oueme",
        "ouemee": "Oueme",
        "plateau": "Plateau",
        "zou": "Zou",
    }
    return aliases.get(normalized)


def derive_department_from_phone(phone: str | None) -> str | None:
    normalized = re.sub(r"[\s-]", "", (phone or "").strip())
    normalized = normalized.removeprefix("+229")
    with_zero = normalized
    if normalized.startswith("0"):
        normalized = normalized[1:]
    if len(normalized) < 2 and len(with_zero) < 2:
        return None

    primary_prefix = normalized[:2] if len(normalized) >= 2 else None
    fallback_prefix = with_zero[:2] if len(with_zero) >= 2 else None
    if primary_prefix and primary_prefix in PHONE_PREFIX_DEPARTMENT:
        return PHONE_PREFIX_DEPARTMENT[primary_prefix]
    if fallback_prefix and fallback_prefix in PHONE_PREFIX_DEPARTMENT:
        return PHONE_PREFIX_DEPARTMENT[fallback_prefix]
    return None


def resolve_department(explicit_department: str | None, phone: str | None) -> tuple[str | None, str]:
    normalized_explicit = normalize_department_name(explicit_department)
    if normalized_explicit:
        return normalized_explicit, "USER_SELECTED"

    derived = derive_department_from_phone(phone)
    if derived:
        return derived, "PHONE_DERIVED"

    return None, "UNKNOWN"
