from pathlib import Path
import io
from datetime import datetime, timezone
from xml.sax.saxutils import escape

import qrcode
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Image as RLImage, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


BRAND_NAVY = colors.HexColor("#071827")
BRAND_INK = colors.HexColor("#102033")
BRAND_MUTED = colors.HexColor("#5B677A")
BRAND_LINE = colors.HexColor("#DDE5EF")
BRAND_SURFACE = colors.HexColor("#F6F8FB")
BRAND_GREEN = colors.HexColor("#047857")
BRAND_GOLD = colors.HexColor("#C48A12")
BRAND_RED = colors.HexColor("#C62828")
BRAND_BLUE = colors.HexColor("#0F5E8C")


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
        return BRAND_RED
    if level == "MEDIUM":
        return BRAND_GOLD
    return BRAND_GREEN


def _risk_label(level: str) -> str:
    labels = {
        "HIGH": "RISQUE ELEVE",
        "MEDIUM": "RISQUE MODERE",
        "LOW": "RISQUE FAIBLE",
    }
    return labels.get(level, level)


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


def _compact_hash(value: object, head: int = 18, tail: int = 10) -> str:
    text = str(value or "").strip()
    if len(text) <= head + tail + 3:
        return text
    return f"{text[:head]}...{text[-tail:]}"


def _build_badge(label: str, background_color, text_color=colors.white) -> Table:
    badge_style = ParagraphStyle(
        "BadgeText",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=10,
        textColor=text_color,
        alignment=1,
    )
    badge = Table([[Paragraph(escape(label), badge_style)]], hAlign="RIGHT")
    badge.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background_color),
                ("BOX", (0, 0), (-1, -1), 0.6, background_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return badge


def _render_section_table(rows: list[list[str]], value_style: ParagraphStyle) -> Table:
    paragraph_rows = [
        [
            Paragraph(f"<b>{escape(label)}</b>", value_style),
            Paragraph(escape(value), value_style),
        ]
        for label, value in rows
    ]

    table = Table(paragraph_rows, colWidths=[5.0 * cm, 10.7 * cm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), BRAND_SURFACE),
                ("LINEBELOW", (0, 0), (-1, -1), 0.35, BRAND_LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _render_panel(title: str, body: list, styles) -> Table:
    panel_rows = [[Paragraph(escape(title), styles["panel_title"])]]
    panel_rows.extend([[item] for item in body])
    panel = Table(panel_rows, colWidths=[15.7 * cm], hAlign="LEFT")
    panel.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, BRAND_LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return panel


def _format_utc_timestamp(value: object) -> str:
    text = str(value).strip() if value is not None else ""
    if not text:
        return "N/A"
    return text if text.endswith("Z") else f"{text}Z"


def _generate_custody_table(
    story: list,
    styles,
    custody_events: list[dict],
) -> None:
    story.append(Paragraph("CHAINE DE CUSTODY", styles["section"]))
    if not custody_events:
        story.append(Paragraph("Evenements non disponibles", styles["body"]))
        return

    header_style = ParagraphStyle(
        "CustodyHeader",
        parent=styles["body"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    cell_style = ParagraphStyle(
        "CustodyCell",
        parent=styles["body"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=BRAND_INK,
    )
    rows = [
        [
            Paragraph("<b>Horodatage UTC</b>", header_style),
            Paragraph("<b>Acteur</b>", header_style),
            Paragraph("<b>Action</b>", header_style),
            Paragraph("<b>Details</b>", header_style),
        ]
    ]
    rows.extend(
        [
            Paragraph(escape(str(event.get("timestamp") or "N/A")), cell_style),
            Paragraph(escape(str(event.get("actor") or "N/A")), cell_style),
            Paragraph(escape(str(event.get("action") or "N/A")), cell_style),
            Paragraph(escape(str(event.get("details") or "N/A")), cell_style),
        ]
        for event in custody_events
    )

    table = Table(rows, colWidths=[3.5 * cm, 2.8 * cm, 3.2 * cm, 6.2 * cm], hAlign="LEFT")
    table_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_NAVY),
        ("GRID", (0, 0), (-1, -1), 0.35, BRAND_LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(1, len(rows)):
        background = "#FFFFFF" if row_index % 2 == 1 else "#F8FAFC"
        table_styles.append(("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor(background)))

    table.setStyle(TableStyle(table_styles))
    story.append(table)
    story.append(Spacer(1, 0.2 * cm))


def _generate_section_6(
    story: list,
    styles,
    matched_rules: list[str],
    report_uuid: str,
    base_url: str = "https://benincybershield.bj",
) -> None:
    from app.services.detection import RECOMMENDATION_MAPPING

    story.append(Paragraph("RECOMMANDATIONS CITOYENNES", styles["section"]))

    rendered_items = 0
    for rule in matched_rules[:5]:
        recommendation = RECOMMENDATION_MAPPING.get(rule)
        if not recommendation:
            continue
        story.append(Paragraph(f"&#8226; {escape(recommendation)}", styles["body"]))
        story.append(Spacer(1, 0.08 * cm))
        rendered_items += 1

    if rendered_items == 0:
        story.append(Paragraph("Aucune recommandation supplementaire disponible.", styles["body"]))

    story.append(Spacer(1, 0.15 * cm))
    story.append(
        Paragraph(
            "Ce rapport a ete genere par BENIN CYBER SHIELD v3.0. Il est transmissible a bjCSIRT, "
            "l'OCRC et la CRIET comme piece d'information complementaire.",
            styles["body"],
        )
    )

    url = f"{base_url}/verify"
    try:
        qr = qrcode.make(url)
        buffer = io.BytesIO()
        qr.save(buffer, format="PNG")
        buffer.seek(0)
        pil_img = PILImage.open(buffer)
        rl_img_buffer = io.BytesIO()
        pil_img.save(rl_img_buffer, format="PNG")
        rl_img_buffer.seek(0)
        qr_image = RLImage(rl_img_buffer, width=80, height=80)
        qr_image.hAlign = "CENTER"
        story.append(Spacer(1, 0.2 * cm))
        story.append(qr_image)
    except Exception:
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph("QR code indisponible pour cette generation.", styles["caption"]))

    story.append(Paragraph("Scanner pour verifier un autre message", styles["caption"]))


def generate_forensic_pdf(
    snapshot_data: dict,
    output_path: str,
    report_hash: str,
    report_uuid: str | None = None,
) -> str:
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="BENIN CYBER SHIELD - Rapport d'investigation numerique",
        author="BENIN CYBER SHIELD",
        pageCompression=0,
    )

    styles = getSampleStyleSheet()
    style_brand = ParagraphStyle(
        "BrandCustom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=21,
        textColor=colors.white,
        alignment=0,
    )
    style_title = ParagraphStyle(
        "TitleCustom",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=BRAND_INK,
        alignment=0,
        spaceAfter=4,
    )
    style_subtitle = ParagraphStyle(
        "SubtitleCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=BRAND_MUTED,
    )
    style_section = ParagraphStyle(
        "SectionCustom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=BRAND_BLUE,
        spaceBefore=12,
        spaceAfter=7,
    )
    style_body = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=BRAND_INK,
    )
    style_panel_title = ParagraphStyle(
        "PanelTitleCustom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=BRAND_NAVY,
    )
    style_caption = ParagraphStyle(
        "CaptionCustom",
        parent=style_subtitle,
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=BRAND_MUTED,
        alignment=1,
    )
    pdf_styles = {
        "section": style_section,
        "body": style_body,
        "caption": style_caption,
        "panel_title": style_panel_title,
    }

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
    matched_rules = [str(rule) for rule in analysis.get("matched_rules") or [] if str(rule).strip()]

    status_value = _status_label(str(alert.get("status_at_snapshot") or ""))

    story = []

    risk_badge = _build_badge(_risk_label(risk_level), risk_color)
    header_table = Table(
        [
            [
                Paragraph("BENIN CYBER SHIELD", style_brand),
                risk_badge,
            ],
            [
                Paragraph("DOSSIER PROBATOIRE NUMERIQUE", style_title),
                Paragraph(f"<b>REF</b><br/>{escape(short_ref)}", style_subtitle),
            ],
            [
                Paragraph("Rapport d'investigation, d'integrite et de transmission", style_subtitle),
                Paragraph(f"<b>GENERE</b><br/>{escape(generated_at or 'N/A')}", style_subtitle),
            ],
        ],
        colWidths=[11.4 * cm, 4.3 * cm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_NAVY),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, BRAND_NAVY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 0.35 * cm))

    # SECTION 1 - Resume executif
    story.append(Paragraph("SYNTHESE EXECUTIVE", style_section))
    section_1_rows: list[list[str]] = []
    _append_summary_row(section_1_rows, "Niveau de risque", _risk_label(risk_level))
    _append_summary_row(section_1_rows, "Numero signale", alert.get("phone_number"))
    if category_names:
        _append_summary_row(section_1_rows, "Type de menace", category_names[0])
    recurrence_count = alert.get("recurrence_count")
    if recurrence_count is not None:
        _append_summary_row(section_1_rows, "Nombre de signalements similaires", recurrence_count)
    _append_summary_row(section_1_rows, "Statut", status_value)

    if section_1_rows:
        section_1_table = _render_section_table(section_1_rows, style_body)
        story.append(_render_panel("Vue probatoire", [section_1_table], pdf_styles))

    # SECTION 2 - Message suspect
    message_text = str(alert.get("reported_message") or "").strip()
    if message_text:
        story.append(Paragraph("MESSAGE SUSPECT", style_section))
        message_box = Table(
            [[Paragraph(escape(message_text).replace("\n", "<br/>"), style_body)]],
            colWidths=[15.7 * cm],
        )
        message_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#FED7AA")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(message_box)

    # SECTION 3 - Analyse technique
    section_3_rows: list[list[str]] = []
    _append_summary_row(section_3_rows, "Score de risque", f"{risk_score}/100")
    if factors:
        _append_summary_row(section_3_rows, "Facteurs detectes", " | ".join(str(item) for item in factors if str(item).strip()))
    _append_summary_row(section_3_rows, "Horodatage analyse", analysis.get("generated_at") or snapshot_data.get("generated_at"))

    if section_3_rows:
        story.append(Paragraph("ANALYSE TECHNIQUE", style_section))
        story.append(_render_panel("Signaux detectes", [_render_section_table(section_3_rows, style_body)], pdf_styles))

    # SECTION 4 - Integrite
    section_4_rows: list[list[str]] = []
    _append_summary_row(section_4_rows, "Empreinte SHA-256", _compact_hash(report_hash, 28, 16))
    _append_summary_row(section_4_rows, "Genere par", f"BENIN CYBER SHIELD v{snapshot_data.get('engine_version') or '1.0'}")

    if section_4_rows:
        story.append(Paragraph("INTEGRITE DU DOSSIER", style_section))
        story.append(_render_panel("Scellement numerique", [_render_section_table(section_4_rows, style_body)], pdf_styles))

    # SECTION 5 - Transmission
    story.append(Paragraph("TRANSMISSION", style_section))
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
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_LINE),
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_SURFACE),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
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

    custody_events: list[dict[str, str]] = []
    if alert.get("created_at"):
        custody_events.append(
            {
                "timestamp": _format_utc_timestamp(alert.get("created_at")),
                "actor": "CITOYEN",
                "action": "SIGNALEMENT INITIAL",
                "details": f"Canal: {alert.get('citizen_channel') or 'N/A'}",
            }
        )
    custody_events.append(
        {
            "timestamp": _format_utc_timestamp(datetime.now(timezone.utc).isoformat()),
            "actor": "SYSTEME",
            "action": "GENERATION RAPPORT",
            "details": f"Rapport {report_uuid or short_ref}",
        }
    )

    _generate_custody_table(story, pdf_styles, custody_events)
    _generate_section_6(story, pdf_styles, matched_rules, report_uuid or short_ref)

    def draw_footer(canvas, _doc) -> None:
        canvas.saveState()
        canvas.setStrokeColor(BRAND_LINE)
        canvas.setLineWidth(0.4)
        canvas.line(1.8 * cm, 1.25 * cm, A4[0] - 1.8 * cm, 1.25 * cm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(BRAND_MUTED)
        canvas.drawString(1.8 * cm, 0.95 * cm, f"Hash dossier: {_compact_hash(report_hash, 18, 8)}")
        canvas.drawCentredString(A4[0] / 2, 0.95 * cm, "BENIN CYBER SHIELD - dossier probatoire")
        canvas.drawRightString(A4[0] - 1.8 * cm, 0.95 * cm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return output_path
