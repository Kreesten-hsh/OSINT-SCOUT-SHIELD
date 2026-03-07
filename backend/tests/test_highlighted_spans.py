from app.services.detection import _find_spans, score_signal


def test_spans_found_for_otp() -> None:
    text = "Votre code OTP doit etre envoye"
    spans = _find_spans(text, ["otp_request"])
    assert any(span["rule"] == "otp_request" for span in spans)


def test_spans_empty_clean_message() -> None:
    text = "Bonjour, comment allez-vous ?"
    spans = _find_spans(text, ["otp_request", "urgency", "suspicious_url"])
    assert spans == []


def test_no_overlapping_spans() -> None:
    text = "Envoyez votre code otp maintenant"
    spans = _find_spans(text, ["otp_request", "urgency"])
    for idx in range(len(spans) - 1):
        assert spans[idx]["end"] <= spans[idx + 1]["start"]


def test_span_positions_correct() -> None:
    text = "Envoyez votre code maintenant"
    spans = _find_spans(text, ["otp_request"])
    code_spans = [span for span in spans if text[span["start"]:span["end"]].lower() == "code"]
    assert len(code_spans) >= 1


def test_recommendations_populated() -> None:
    result = score_signal(
        message="Urgent MTN: envoyez votre code OTP maintenant",
        url=None,
        phone="0169647090",
    )
    assert result["risk_level"] in ("HIGH", "MEDIUM")
    assert len(result["recommendations"]) > 0


def test_fon_alert_high() -> None:
    result = score_signal(
        message="Urgent MTN: envoyez votre code OTP maintenant",
        url=None,
        phone="0169647090",
    )
    assert result["risk_level"] == "HIGH"
    assert result["fon_alert"] is not None
    assert "Wɛ" in result["fon_alert"]


def test_fon_alert_low() -> None:
    result = score_signal(
        message="Bonjour, bienvenue sur notre service d'information",
        url=None,
        phone="0169647090",
    )
    assert result["risk_level"] == "LOW"
    assert result["fon_alert"] is None
