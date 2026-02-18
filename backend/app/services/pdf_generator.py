from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _safe_text(value: object) -> str:
    if value is None:
        return "-"
    return escape(str(value))


def _join_multiline(value: object) -> str:
    if value is None:
        return "-"
    return "<br/>".join(escape(str(value)).splitlines())


def _extract_category_names(categories: list[dict] | None) -> str:
    if not categories:
        return "Aucune categorie detectee"
    values = [str(item.get("name") or item.get("label") or "").strip() for item in categories]
    compact = [item for item in values if item]
    return ", ".join(compact) if compact else "Aucune categorie detectee"


def _extract_entity_labels(entities: list[dict] | None) -> str:
    if not entities:
        return "Aucune entite detectee"
    values = [str(item.get("text") or item.get("value") or "").strip() for item in entities]
    compact = [item for item in values if item]
    return ", ".join(compact) if compact else "Aucune entite detectee"


def _resolve_evidence_path(file_path: str) -> Path | None:
    raw = Path(str(file_path).strip())
    candidates: list[Path] = []

    if raw.is_absolute():
        candidates.append(raw)
    else:
        candidates.append(Path("/app/evidences_store") / raw)
        candidates.append(Path("evidences_store") / raw)

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _is_image_evidence(evidence: dict) -> bool:
    file_path = str(evidence.get("file_path") or "").lower()
    evidence_type = str(evidence.get("type") or "").upper()
    metadata = evidence.get("metadata") or {}
    content_type = str(metadata.get("content_type") or "").lower()

    if content_type.startswith("image/"):
        return True
    if evidence_type in {"SCREENSHOT", "CITIZEN_SCREENSHOT"}:
        return True
    return file_path.endswith((".png", ".jpg", ".jpeg", ".webp"))


def _build_section_table(rows: list[list[str]], col_widths: list[float]) -> Table:
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def generate_forensic_pdf(snapshot_data: dict, output_path: str, report_hash: str) -> str:
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="Benin Cyber Shield - Rapport d'investigation",
        author="BENIN CYBER SHIELD",
    )

    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        "TitleCustom",
        parent=styles["Title"],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0F172A"),
        alignment=1,
        spaceAfter=6,
    )
    style_subtitle = ParagraphStyle(
        "SubtitleCustom",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#475569"),
        alignment=1,
    )
    style_section = ParagraphStyle(
        "SectionCustom",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=8,
    )
    style_body = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
    )

    data = snapshot_data.get("data") or {}
    alert = data.get("alert") or {}
    analysis = data.get("analysis") or {}
    evidences = data.get("evidences") or []

    generated_at = snapshot_data.get("generated_at") or "-"
    engine_version = snapshot_data.get("engine_version") or "-"
    snapshot_version = snapshot_data.get("snapshot_version") or "-"

    story = []

    story.append(Paragraph("BENIN CYBER SHIELD", style_title))
    story.append(Paragraph("Rapport d'investigation numerique et chaine probatoire", style_subtitle))
    story.append(Paragraph(f"Reference dossier: <b>{_safe_text(alert.get('uuid'))}</b>", style_subtitle))
    story.append(Spacer(1, 0.6 * cm))

    summary_rows = [
        ["Date generation", _safe_text(generated_at)],
        ["Version moteur", _safe_text(engine_version)],
        ["Version snapshot", _safe_text(snapshot_version)],
        ["Empreinte rapport (SHA-256)", _safe_text(report_hash)],
    ]
    story.append(_build_section_table(summary_rows, [5.2 * cm, 10.4 * cm]))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("1. Synthese dossier", style_section))
    dossier_rows = [
        ["Incident UUID", _safe_text(alert.get("uuid"))],
        ["Source", _safe_text(alert.get("source_type"))],
        ["Statut snapshot", _safe_text(alert.get("status_at_snapshot"))],
        ["Score risque", f"{int(alert.get('risk_score') or 0)}/100"],
        ["Canal citoyen", _safe_text(alert.get("citizen_channel"))],
        ["Numero signale", _safe_text(alert.get("phone_number"))],
        ["Cible (URL/Signal)", _safe_text(alert.get("url"))],
    ]
    story.append(_build_section_table(dossier_rows, [5.2 * cm, 10.4 * cm]))

    story.append(Paragraph("2. Signalement citoyen", style_section))
    story.append(
        Paragraph(
            f"<b>Message transmis:</b><br/>{_join_multiline(alert.get('reported_message'))}",
            style_body,
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        Paragraph(
            f"<b>Note analyste:</b><br/>{_join_multiline(alert.get('analysis_note'))}",
            style_body,
        )
    )

    story.append(Paragraph("3. Analyse IA et correlation", style_section))
    categories_label = _extract_category_names(analysis.get("categories"))
    entities_label = _extract_entity_labels(analysis.get("entities"))
    analysis_generated = analysis.get("generated_at") or "-"
    analysis_rows = [
        ["Categories detectees", _safe_text(categories_label)],
        ["Entites detectees", _safe_text(entities_label)],
        ["Horodatage analyse", _safe_text(analysis_generated)],
    ]
    story.append(_build_section_table(analysis_rows, [5.2 * cm, 10.4 * cm]))

    story.append(Paragraph("4. Registre des preuves", style_section))
    if evidences:
        evidence_rows = [["#", "Type", "Statut", "Hash (SHA-256)", "Capture", "Chemin"]]
        for idx, evidence in enumerate(evidences, start=1):
            evidence_rows.append(
                [
                    str(idx),
                    _safe_text(evidence.get("type")),
                    _safe_text(evidence.get("status")),
                    _safe_text(evidence.get("file_hash"))[:28] + "...",
                    _safe_text(evidence.get("captured_at")),
                    _safe_text(evidence.get("file_path")),
                ]
            )

        evidence_table = Table(
            evidence_rows,
            colWidths=[0.9 * cm, 2.6 * cm, 2.2 * cm, 4.1 * cm, 2.6 * cm, 3.2 * cm],
            repeatRows=1,
        )
        evidence_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 8),
                    ("FONTSIZE", (0, 1), (-1, -1), 7.5),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(evidence_table)
    else:
        story.append(Paragraph("Aucune preuve associee a ce dossier.", style_body))

    image_evidences = [evidence for evidence in evidences if _is_image_evidence(evidence)]
    if image_evidences:
        story.append(PageBreak())
        story.append(Paragraph("Annexe - Captures d'ecran", style_section))
        story.append(Spacer(1, 0.2 * cm))

        for idx, evidence in enumerate(image_evidences, start=1):
            label = (
                f"Capture {idx} | Type: {_safe_text(evidence.get('type'))} | "
                f"Hash: {_safe_text(evidence.get('file_hash'))[:20]}..."
            )
            story.append(Paragraph(label, style_body))
            story.append(Spacer(1, 0.15 * cm))

            file_path = evidence.get("file_path")
            resolved_path = _resolve_evidence_path(str(file_path)) if file_path else None
            if resolved_path and resolved_path.exists():
                try:
                    story.append(Image(str(resolved_path), width=16 * cm, height=9.5 * cm, kind="proportional"))
                except Exception:
                    story.append(Paragraph("Image non lisible dans cette preuve.", style_body))
            else:
                story.append(Paragraph("Image introuvable sur le disque au moment de la generation.", style_body))

            story.append(Spacer(1, 0.35 * cm))

    def draw_footer(canvas, _doc) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawString(1.8 * cm, 1.2 * cm, f"Hash rapport: {report_hash[:24]}...")
        canvas.drawRightString(A4[0] - 1.8 * cm, 1.2 * cm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return output_path
