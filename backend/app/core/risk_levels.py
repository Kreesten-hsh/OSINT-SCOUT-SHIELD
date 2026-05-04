from typing import Literal


RiskLevel = Literal["FAIBLE", "MOYEN", "FORT"]

_RISK_LEVEL_ALIASES: dict[str, RiskLevel] = {
    "LOW": "FAIBLE",
    "FAIBLE": "FAIBLE",
    "MEDIUM": "MOYEN",
    "MOYEN": "MOYEN",
    "HIGH": "FORT",
    "FORT": "FORT",
}


def normalize_risk_level(value: str | None, default: RiskLevel = "FAIBLE") -> RiskLevel:
    if value is None:
        return default
    normalized = str(value).strip().upper()
    return _RISK_LEVEL_ALIASES.get(normalized, default)


def risk_level_from_score(score: int) -> RiskLevel:
    if score >= 70:
        return "FORT"
    if score >= 40:
        return "MOYEN"
    return "FAIBLE"
