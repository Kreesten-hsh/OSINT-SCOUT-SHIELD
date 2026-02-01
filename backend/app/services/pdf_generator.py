from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from datetime import datetime
import os

def generate_forensic_pdf(snapshot_data: dict, output_path: str, report_hash: str) -> str:
    """
    Génère un PDF déterministe basé sur le snapshot JSON.
    Retourne le chemin du fichier généré.
    """
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    style_title = ParagraphStyle(
        'ForensicTitle',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=1, # Center
        spaceAfter=20
    )
    style_subtitle = ParagraphStyle(
        'ForensicSub',
        parent=styles['Normal'],
        fontSize=10,
        alignment=1,
        textColor=colors.gray
    )
    style_section = ParagraphStyle(
        'ForensicSection',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=10,
        borderPadding=5,
        borderColor=colors.black,
        borderWidth=1,
        borderBottom=True,
        borderLeft=False, borderRight=False, borderTop=False
    )
    
    # Data extraction
    data = snapshot_data["data"]
    alert = data["alert"]
    analysis = data["analysis"]
    evidences = data.get("evidences", [])
    
    meta_generated_at = snapshot_data["generated_at"]
    
    # --- HEADER ---
    story.append(Paragraph("OSINT-SCOUT & SHIELD", style_title))
    story.append(Paragraph("RAPPORT D'INVESTIGATION NUMÉRIQUE", style_subtitle))
    story.append(Spacer(1, 1*cm))
    
    # --- INFO BLOCK ---
    info_data = [
        ["RÉFÉRENCE DOSSIER", alert["uuid"]],
        ["DATE GÉNÉRATION", meta_generated_at],
        ["VERSION MOTEUR", snapshot_data["engine_version"]],
        ["EMPREINTE RAPPORT (SHA256)", report_hash[:16] + "..."] 
    ]
    t = Table(info_data, colWidths=[6*cm, 10*cm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 1*cm))
    
    # --- 1. SYNTHÈSE ---
    story.append(Paragraph("1. SYNTHÈSE ADMINISTRATIVE", style_section))
    synth_data = [
        ["URL Cible", alert["url"]],
        ["Type Source", alert["source_type"]],
        ["Statut", alert["status_at_snapshot"]],
        ["Score Risque", f"{alert['risk_score']}/100"]
    ]
    t_synth = Table(synth_data, colWidths=[5*cm, 11*cm])
    t_synth.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
    ]))
    story.append(t_synth)
    
    # --- 2. ANALYSE ---
    story.append(Paragraph("2. ANALYSE TECHNIQUE", style_section))
    if analysis:
        # Categories
        cats = ", ".join([c["name"] for c in analysis.get("categories", [])]) or "Aucune"
        story.append(Paragraph(f"<b>Catégories Détectées :</b> {cats}", styles["Normal"]))
        story.append(Spacer(1, 0.5*cm))
        # Entities
        ents = ", ".join([e["text"] for e in analysis.get("entities", [])]) or "Aucune"
        story.append(Paragraph(f"<b>Entités Identifiées :</b> {ents}", styles["Normal"]))
    else:
        story.append(Paragraph("Aucune donnée d'analyse disponible.", styles["Normal"]))

    # --- 3. PREUVES ---
    story.append(Paragraph("3. PREUVES NUMÉRIQUES", style_section))
    if evidences:
        for i, ev in enumerate(evidences, 1):
            story.append(Paragraph(f"<b>Preuve #{i} [{ev['type']} - {ev['status']}]</b>", styles["Heading3"]))
            story.append(Paragraph(f"<b>Fichier :</b> {ev['file_path']}", styles["Normal"]))
            story.append(Paragraph(f"<b>Hash Preuve (SHA256) :</b> {ev['file_hash']}", styles["Normal"]))
            story.append(Paragraph(f"<b>Date Capture :</b> {ev['captured_at']}", styles["Normal"]))
            story.append(Spacer(1, 0.5*cm))
            
            # Content Preview if no file/text
            if ev.get('content_preview'):
                story.append(Paragraph(f"<b>Aperçu Texte :</b> {ev['content_preview'][:500]}...", styles["Normal"]))
                story.append(Spacer(1, 0.5*cm))

            # Image
            if ev['type'] == 'SCREENSHOT':
                # On suppose que l'image est accessible localement via un volume monté
                # evidence['file_path'] est relatif ou absolu dans le store
                # Dans Docker, c'est mappé dans /app/evidences_store/
                # CAS: file_path est souvent le hash ou "hash.png"
                
                # Check if file_path is already absolute or relative to store
                if ev['file_path'].startswith("/"):
                    local_img_path = ev['file_path']
                else:
                    local_img_path = os.path.join("/app/evidences_store", ev['file_path'])

                if os.path.exists(local_img_path):
                    try:
                        img = Image(local_img_path, width=15*cm, height=10*cm, kind='proportional')
                        story.append(img)
                    except Exception:
                        story.append(Paragraph("[Erreur chargement image]", styles["Normal"]))
                else:
                     story.append(Paragraph(f"[Image non trouvée sur le disque: {local_img_path}]", styles["Normal"]))
            
            story.append(Spacer(1, 1*cm)) # Separator between evidences
            
    else:
        story.append(Paragraph("Aucune preuve jointe.", styles["Normal"]))

    # --- FOOTER ---
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("FIN DU DOCUMENT - GÉNÉRATION AUTOMATIQUE", style_subtitle))
    story.append(Paragraph(f"HASH COMPLET : {report_hash}", style_subtitle))
    
    doc.build(story)
    return output_path
