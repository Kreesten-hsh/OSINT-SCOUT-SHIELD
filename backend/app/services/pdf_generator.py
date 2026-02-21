from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _safe_text(value: object) -> str:
    return escape(str(value)) if value is not None else ""


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


def _risk_level_from_score(score: int) -> str:
    if score >= 65:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def _risk_color(level: str):
    if level == "HIGH":
        return colors.HexColor("#DC2626")
    if level == "MEDIUM":
        return colors.HexColor("#D97706")
    return colors.HexColor("#059669")


def _status_label(status: str) -> str:
    mapping = {
        "CONFIRMED": "CONFIRME",
        "IN_REVIEW": "EN COURS",
        "DISMISSED": "REJETE",
        "NEW": "EN COURS",
        "BLOCKED_SIMULATED": "CONFIRME",
    }
    return mapping.get(status, status or "EN COURS")


def _append_summary_row(rows: list[list[str]], label: str, value: object) -> None:
    if value is None:
        return
    text = str(value).strip()
    if not text:
        return
    rows.append([label, text])


def _render_section_table(rows: list[list[str]], value_style: ParagraphStyle) -> Table:
    paragraph_rows = [
        [
            Paragraph(f"<b>{escape(label)}</b>", value_style),
            Paragraph(escape(value), value_style),
        ]
        for label, value in rows
    ]

    table = Table(paragraph_rows, colWidths=[5.4 * cm, 10.3 * cm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
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
        title="BENIN CYBER SHIELD - Rapport d'investigation numerique",
        author="BENIN CYBER SHIELD",
    )

    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        "TitleCustom",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        alignment=0,
    )
    style_subtitle = ParagraphStyle(
        "SubtitleCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )
    style_section = ParagraphStyle(
        "SectionCustom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=6,
    )
    style_body = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
    )

    data = snapshot_data.get("data") or {}
    alert = data.get("alert") or {}
    analysis = data.get("analysis") or {}
    evidences = data.get("evidences") or []

    alert_uuid = str(alert.get("uuid") or "")
    short_ref = alert_uuid[:8] if alert_uuid else report_hash[:8]
    generated_at = str(snapshot_data.get("generated_at") or "")
    risk_score = int(alert.get("risk_score") or analysis.get("risk_score") or 0)
    risk_level = _risk_level_from_score(risk_score)
    risk_color = _risk_color(risk_level)

    categories = analysis.get("categories") or []
    category_names: list[str] = []
    for category in categories:
        if isinstance(category, dict):
            name = str(category.get("name") or category.get("label") or "").strip()
            if name:
                category_names.append(name)
        elif isinstance(category, str):
            cleaned = category.strip()
            if cleaned:
                category_names.append(cleaned)

    factors = analysis.get("factors_detected") or []
    if not factors and analysis.get("matched_rules"):
        factors = [str(rule) for rule in analysis.get("matched_rules") if str(rule).strip()]

    status_value = _status_label(str(alert.get("status_at_snapshot") or ""))

    story = []

    header_table = Table(
        [
            [
                Paragraph("<b>BENIN CYBER SHIELD</b>", style_title),
                "",
            ],
            [Paragraph("Rapport d'investigation numerique", style_subtitle), ""],
            [Paragraph(f"Ref: {escape(short_ref)}", style_subtitle), ""],
            [Paragraph(f"Genere le: {escape(generated_at)}", style_subtitle), ""],
        ],
        colWidths=[11.5 * cm, 4.2 * cm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("SPAN", (0, 0), (1, 0)),
                ("SPAN", (0, 1), (1, 1)),
                ("SPAN", (0, 2), (1, 2)),
                ("SPAN", (0, 3), (1, 3)),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 0.35 * cm))

    # SECTION 1 - Resume executif
    story.append(Paragraph("SECTION 1 - RESUME EXECUTIF", style_section))
    section_1_rows: list[list[str]] = []
    _append_summary_row(section_1_rows, "Niveau de risque", risk_level)
    _append_summary_row(section_1_rows, "Numero signale", alert.get("phone_number"))
    if category_names:
        _append_summary_row(section_1_rows, "Type de menace", category_names[0])
    recurrence_count = alert.get("recurrence_count")
    if recurrence_count is not None:
        _append_summary_row(section_1_rows, "Nombre de signalements similaires", recurrence_count)
    _append_summary_row(section_1_rows, "Statut", status_value)

    if section_1_rows:
        section_1_table = _render_section_table(section_1_rows, style_body)
        story.append(section_1_table)

        # Color emphasis for risk line value
        for index, row in enumerate(section_1_rows):
            if row[0] == "Niveau de risque":
                section_1_table.setStyle(TableStyle([("TEXTCOLOR", (1, index), (1, index), risk_color)]))
                section_1_table.setStyle(TableStyle([("FONTNAME", (1, index), (1, index), "Helvetica-Bold")]))
                break

    # SECTION 2 - Message suspect
    message_text = str(alert.get("reported_message") or "").strip()
    if message_text:
        story.append(Paragraph("SECTION 2 - MESSAGE SUSPECT", style_section))
        story.append(
            Paragraph(
                escape(message_text).replace("\n", "<br/>"),
                style_body,
            )
        )

    # SECTION 3 - Analyse technique
    section_3_rows: list[list[str]] = []
    _append_summary_row(section_3_rows, "Score de risque", f"{risk_score}/100")
    if factors:
        _append_summary_row(section_3_rows, "Facteurs detectes", " | ".join(str(item) for item in factors if str(item).strip()))
    _append_summary_row(section_3_rows, "Horodatage analyse", analysis.get("generated_at") or snapshot_data.get("generated_at"))

    if section_3_rows:
        story.append(Paragraph("SECTION 3 - ANALYSE TECHNIQUE", style_section))
        story.append(_render_section_table(section_3_rows, style_body))

    # SECTION 4 - Integrite
    section_4_rows: list[list[str]] = []
    _append_summary_row(section_4_rows, "Empreinte SHA-256", report_hash)
    _append_summary_row(section_4_rows, "Genere par", f"BENIN CYBER SHIELD v{snapshot_data.get('engine_version') or '1.0'}")

    if section_4_rows:
        story.append(Paragraph("SECTION 4 - INTEGRITE DU DOSSIER", style_section))
        story.append(_render_section_table(section_4_rows, style_body))

    # SECTION 5 - Transmission
    story.append(Paragraph("SECTION 5 - TRANSMISSION", style_section))
    transmission_box = Table(
        [
            [Paragraph("<b>Ce rapport est transmissible a :</b>", style_body)],
            [Paragraph("- bjCSIRT - csirt.gouv.bj", style_body)],
            [Paragraph("- OCRC - Police Republicaine du Benin", style_body)],
            [Paragraph("- Tout tribunal competent", style_body)],
        ],
        colWidths=[15.7 * cm],
    )
    transmission_box.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(transmission_box)

    # Optional annex for screenshots if available.
    image_evidences = [evidence for evidence in evidences if _is_image_evidence(evidence)]
    if image_evidences:
        story.append(Spacer(1, 0.35 * cm))
        story.append(Paragraph("ANNEXE - CAPTURES D'ECRAN", style_section))
        for index, evidence in enumerate(image_evidences, start=1):
            evidence_label = f"Capture {index} | Hash: {str(evidence.get('file_hash') or '')[:24]}..."
            story.append(Paragraph(escape(evidence_label), style_subtitle))
            resolved_path = _resolve_evidence_path(str(evidence.get("file_path") or ""))
            if resolved_path:
                try:
                    story.append(
                        KeepTogether(
                            [
                                Spacer(1, 0.1 * cm),
                                Image(str(resolved_path), width=15.6 * cm, height=9.2 * cm, kind="proportional"),
                                Spacer(1, 0.2 * cm),
                            ]
                        )
                    )
                except Exception:
                    continue

    def draw_footer(canvas, _doc) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawString(1.8 * cm, 1.0 * cm, f"Hash: {report_hash[:20]}...")
        canvas.drawRightString(A4[0] - 1.8 * cm, 1.0 * cm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return output_path
