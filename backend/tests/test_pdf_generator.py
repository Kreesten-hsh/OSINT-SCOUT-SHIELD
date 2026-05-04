from pathlib import Path

from app.services.pdf_generator import generate_forensic_pdf


def test_generate_forensic_pdf_renders_premium_probative_sections(tmp_path: Path) -> None:
    output_path = tmp_path / "dossier_probatoire.pdf"
    report_hash = "a" * 64

    generated_path = generate_forensic_pdf(
        {
            "snapshot_version": "1.0",
            "engine_version": "3.0",
            "generated_at": "2026-05-04T10:30:00",
            "data": {
                "alert": {
                    "uuid": "b84c753d-5ddf-4fef-88bd-99e6f8f915d7",
                    "phone_number": "+22990000001",
                    "reported_message": "Urgent, envoyez votre code OTP maintenant.",
                    "citizen_channel": "WEB_PORTAL",
                    "created_at": "2026-05-04T10:20:00",
                    "risk_score": 88,
                    "status_at_snapshot": "CONFIRMED",
                    "recurrence_count": 3,
                },
                "analysis": {
                    "matched_rules": ["otp_request", "urgency"],
                    "factors_detected": ["Demande OTP", "Urgence artificielle"],
                    "risk_score": 88,
                    "generated_at": "2026-05-04T10:25:00",
                    "categories": [{"name": "Hameconnage mobile"}],
                },
                "evidences": [],
            },
        },
        str(output_path),
        report_hash,
        "report-uuid",
    )

    assert generated_path == str(output_path)
    assert output_path.exists()
    assert output_path.stat().st_size > 4_000

    pdf_content = output_path.read_bytes().decode("latin-1", errors="ignore")

    assert "BENIN CYBER SHIELD" in pdf_content
    assert "DOSSIER PROBATOIRE" in pdf_content
    assert "NUMERIQUE" in pdf_content
    assert "SYNTHESE EXECUTIVE" in pdf_content
    assert "MESSAGE SUSPECT" in pdf_content
    assert "INTEGRITE DU DOSSIER" in pdf_content
    assert "CHAINE DE CUSTODY" in pdf_content
