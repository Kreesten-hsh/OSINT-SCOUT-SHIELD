import hashlib
import io
import json
import zipfile
from datetime import datetime


async def generate_case_bundle(
    incident_data: dict,
    report_data: dict,
    pdf_bytes: bytes,
) -> bytes:
    uuid_short = str(incident_data.get("id", "unknown"))[:8]

    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()

    snapshot = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source": "BENIN CYBER SHIELD v3.0",
        "incident": incident_data,
        "report": report_data,
    }
    snapshot_bytes = json.dumps(
        snapshot,
        ensure_ascii=False,
        indent=2,
        default=str,
    ).encode("utf-8")
    snapshot_hash = hashlib.sha256(snapshot_bytes).hexdigest()

    manifest_lines = [
        "BENIN CYBER SHIELD - MANIFEST D'INTEGRITE",
        f"Genere le : {datetime.utcnow().isoformat()}Z",
        "Source    : BENIN CYBER SHIELD v3.0",
        "",
        f"rapport_forensique_{uuid_short}.pdf",
        f"  SHA-256 : {pdf_hash}",
        "",
        f"snapshot_{uuid_short}.json",
        f"  SHA-256 : {snapshot_hash}",
        "",
        "Ce manifest certifie l'integrite des fichiers ci-dessus.",
        "Transmissible a bjCSIRT, OCRC, CRIET.",
    ]
    manifest_bytes = "\n".join(manifest_lines).encode("utf-8")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(f"rapport_forensique_{uuid_short}.pdf", pdf_bytes)
        archive.writestr(f"snapshot_{uuid_short}.json", snapshot_bytes)
        archive.writestr("manifest_integrite.txt", manifest_bytes)

    zip_buffer.seek(0)
    return zip_buffer.read()
