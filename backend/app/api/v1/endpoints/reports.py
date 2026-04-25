from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, Response
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_token_payload, require_role, resolve_scope_owner_user_id
from app.database import get_db
from app.models import Alert, Evidence, ForensicBundle, FormalReport, Report
from app.schemas.response import APIResponse
from app.schemas.token import TokenPayload
from app.services.case_bundle import generate_case_bundle
from app.services.hashing import compute_snapshot_hash
from app.services.legacy_memory_bridge import build_legacy_analysis_payload
from app.services.pdf_generator import generate_forensic_pdf
from app.services.phone_privacy import decrypt_phone
from app.services.snapshot import create_alert_snapshot


router = APIRouter()
logger = logging.getLogger(__name__)

ARTIFACT_ROOTS = [Path("/app/evidences_store"), Path("evidences_store")]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _artifact_write_root() -> Path:
    root = Path("evidences_store")
    root.mkdir(parents=True, exist_ok=True)
    return root


def _candidate_artifact_paths(path_value: str, *, legacy_report_file: bool = False) -> list[Path]:
    raw = Path(str(path_value).strip())
    if raw.is_absolute():
        return [raw]

    candidates = [root / raw for root in ARTIFACT_ROOTS]
    if legacy_report_file:
        candidates.extend((root / "reports" / raw) for root in ARTIFACT_ROOTS)
    return candidates


def _resolve_artifact_path(path_value: str | None, *, legacy_report_file: bool = False) -> Path | None:
    if not path_value:
        return None
    for candidate in _candidate_artifact_paths(path_value, legacy_report_file=legacy_report_file):
        if candidate.exists():
            return candidate
    return None


def _write_relative_artifact(relative_path: str, payload: bytes) -> Path:
    target = (_artifact_write_root() / relative_path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    return target


def _delete_relative_artifact(path_value: str | None, *, legacy_report_file: bool = False) -> None:
    target = _resolve_artifact_path(path_value, legacy_report_file=legacy_report_file)
    if target is None:
        return
    try:
        target.unlink()
    except Exception:
        logger.exception("Unable to delete report artifact", extra={"path": str(target)})


def _risk_level_from_score(score: int) -> str:
    if score >= 65:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


async def _load_legacy_alert_with_evidences(db: AsyncSession, alert_uuid: uuid.UUID | None) -> Alert | None:
    if alert_uuid is None:
        return None
    stmt = (
        select(Alert)
        .options(selectinload(Alert.evidences))
        .where(Alert.uuid == alert_uuid)
    )
    return (await db.execute(stmt)).scalars().first()


async def _load_formal_report_by_alert_uuid(db: AsyncSession, alert_uuid: uuid.UUID) -> FormalReport | None:
    stmt = (
        select(FormalReport)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
        )
        .where(FormalReport.legacy_alert_uuid == alert_uuid)
    )
    return (await db.execute(stmt)).scalars().first()


def _serialize_legacy_evidence(evidence: Evidence) -> dict[str, Any]:
    return {
        "id": evidence.id,
        "type": evidence.type,
        "file_path": evidence.file_path,
        "file_hash": evidence.file_hash,
        "status": evidence.status,
        "captured_at": evidence.captured_at.isoformat() if evidence.captured_at else None,
        "metadata": evidence.metadata_json,
        "content_preview": evidence.content_text_preview,
    }


def _serialize_memory_evidence(evidence_item) -> dict[str, Any]:
    return {
        "id": evidence_item.id,
        "type": evidence_item.type,
        "file_path": evidence_item.file_path,
        "file_hash": evidence_item.file_hash,
        "status": "ACTIVE",
        "captured_at": evidence_item.created_at.isoformat() if evidence_item.created_at else None,
        "metadata": evidence_item.metadata_json,
        "content_preview": evidence_item.content_text_preview,
    }


async def _build_formal_report_snapshot(
    db: AsyncSession,
    formal_report: FormalReport,
    legacy_alert: Alert | None,
) -> dict[str, Any]:
    if formal_report.message is None or formal_report.analysis is None or formal_report.suspect_number is None:
        raise HTTPException(status_code=500, detail="Formal report is missing related entities")

    try:
        phone_number = decrypt_phone(formal_report.suspect_number.phone_ciphertext)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to decrypt stored phone number") from exc

    recurrence_count_stmt = select(func.count(FormalReport.id)).where(
        FormalReport.suspect_number_id == formal_report.suspect_number_id
    )
    recurrence_count = int((await db.execute(recurrence_count_stmt)).scalar_one() or 0)

    categories, entities = build_legacy_analysis_payload(formal_report.analysis)

    evidence_data = []
    if legacy_alert and legacy_alert.evidences:
        evidence_data = [_serialize_legacy_evidence(evidence) for evidence in legacy_alert.evidences]
    else:
        evidence_data = [_serialize_memory_evidence(item) for item in formal_report.evidence_items or []]

    alert_uuid = formal_report.legacy_alert_uuid or formal_report.uuid
    alert_core = {
        "uuid": str(alert_uuid),
        "url": formal_report.message.submitted_url or "citizen://text-signal",
        "source_type": f"CITIZEN_{formal_report.message.channel}",
        "phone_number": phone_number,
        "citizen_channel": formal_report.message.channel,
        "reported_message": formal_report.message.content,
        "risk_score": int(formal_report.analysis.risk_score or 0),
        "status_at_snapshot": formal_report.status,
        "created_at": formal_report.created_at.isoformat() if formal_report.created_at else None,
        "updated_at": (
            formal_report.updated_at.isoformat()
            if formal_report.updated_at
            else (legacy_alert.updated_at.isoformat() if legacy_alert and legacy_alert.updated_at else None)
        ),
        "analysis_note": (
            legacy_alert.analysis_note
            if legacy_alert and legacy_alert.analysis_note
            else f"[TRANSITION_REF={formal_report.public_reference}]"
        ),
        "recurrence_count": recurrence_count,
        "public_reference": formal_report.public_reference,
    }

    analysis_data = {
        "risk_score": int(formal_report.analysis.risk_score or 0),
        "categories": categories,
        "entities": entities,
        "factors_detected": formal_report.analysis.explanation or [],
        "matched_rules": formal_report.analysis.matched_rules or [],
        "generated_at": formal_report.analysis.created_at.isoformat() if formal_report.analysis.created_at else _utc_now().isoformat(),
    }

    snapshot = {
        "snapshot_version": "2.0",
        "engine_version": "v2.0.0",
        "generated_at": _utc_now().isoformat(),
        "data": {
            "alert": alert_core,
            "evidences": evidence_data,
            "analysis": analysis_data,
        },
    }
    return jsonable_encoder(snapshot)


async def _create_bundle_for_formal_report(
    db: AsyncSession,
    formal_report: FormalReport,
    legacy_alert: Alert | None,
) -> ForensicBundle:
    snapshot = await _build_formal_report_snapshot(db=db, formal_report=formal_report, legacy_alert=legacy_alert)
    snapshot_hash = compute_snapshot_hash(snapshot)

    bundle_uuid = uuid.uuid4()
    artifact_prefix = f"forensic_bundles/{bundle_uuid}"
    pdf_relative_path = f"{artifact_prefix}/report_{snapshot_hash[:8]}.pdf"
    json_relative_path = f"{artifact_prefix}/snapshot_{snapshot_hash[:8]}.json"
    zip_relative_path = f"{artifact_prefix}/dossier_{snapshot_hash[:8]}.zip"

    pdf_target = _write_relative_artifact(pdf_relative_path, b"")
    try:
        generate_forensic_pdf(
            snapshot,
            str(pdf_target),
            snapshot_hash,
            report_uuid=str(bundle_uuid),
        )
    except Exception as exc:
        logger.exception("PDF generation failed for formal report bundle", extra={"report_uuid": str(formal_report.uuid)})
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {exc}") from exc

    pdf_bytes = pdf_target.read_bytes()
    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
    _write_relative_artifact(json_relative_path, json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8"))

    incident_data = {
        "id": str(formal_report.id),
        "uuid": str(formal_report.legacy_alert_uuid or formal_report.uuid),
        "phone_number": snapshot["data"]["alert"].get("phone_number"),
        "reported_message": snapshot["data"]["alert"].get("reported_message"),
        "url": snapshot["data"]["alert"].get("url"),
        "source_type": snapshot["data"]["alert"].get("source_type"),
        "citizen_channel": snapshot["data"]["alert"].get("citizen_channel"),
        "risk_score": snapshot["data"]["alert"].get("risk_score"),
        "risk_level": _risk_level_from_score(int(snapshot["data"]["alert"].get("risk_score") or 0)),
        "soc_decision": snapshot["data"]["alert"].get("status_at_snapshot"),
        "status": snapshot["data"]["alert"].get("status_at_snapshot"),
        "analysis_note": snapshot["data"]["alert"].get("analysis_note"),
        "created_at": snapshot["data"]["alert"].get("created_at"),
        "updated_at": snapshot["data"]["alert"].get("updated_at"),
        "public_reference": formal_report.public_reference,
    }
    report_data = {
        "id": str(formal_report.id),
        "uuid": str(bundle_uuid),
        "alert_id": str(legacy_alert.id) if legacy_alert else None,
        "report_hash": snapshot_hash,
        "snapshot_hash_sha256": snapshot_hash,
        "snapshot_version": snapshot.get("snapshot_version"),
        "generated_by": "BENIN CYBER SHIELD",
        "pdf_path": pdf_relative_path,
        "created_at": snapshot.get("generated_at"),
        "public_reference": formal_report.public_reference,
    }
    zip_bytes = await generate_case_bundle(incident_data, report_data, pdf_bytes)
    zip_hash = hashlib.sha256(zip_bytes).hexdigest()
    _write_relative_artifact(zip_relative_path, zip_bytes)

    manifest = {
        "snapshot": snapshot,
        "snapshot_hash_sha256": snapshot_hash,
        "pdf_hash_sha256": pdf_hash,
        "zip_hash_sha256": zip_hash,
        "public_reference": formal_report.public_reference,
        "legacy_alert_uuid": str(formal_report.legacy_alert_uuid) if formal_report.legacy_alert_uuid else None,
        "generated_at": snapshot.get("generated_at"),
    }

    bundle = ForensicBundle(
        uuid=bundle_uuid,
        report_id=formal_report.id,
        global_hash=zip_hash,
        manifest_json=manifest,
        zip_path=zip_relative_path,
        pdf_path=pdf_relative_path,
        json_path=json_relative_path,
        status="READY",
    )
    db.add(bundle)

    if legacy_alert and legacy_alert.evidences:
        evidence_ids = [evidence.id for evidence in legacy_alert.evidences if evidence.id is not None]
        if evidence_ids:
            await db.execute(
                update(Evidence)
                .where(Evidence.id.in_(evidence_ids))
                .values(status="SEALED", sealed_at=func.now())
            )

    await db.commit()
    await db.refresh(bundle)
    return bundle


def _serialize_bundle(bundle: ForensicBundle, *, legacy_alert_id: int | None = None) -> dict[str, Any]:
    manifest = bundle.manifest_json or {}
    snapshot = manifest.get("snapshot") or {}
    return {
        "id": bundle.id,
        "uuid": bundle.uuid,
        "alert_id": legacy_alert_id or 0,
        "report_hash": bundle.global_hash,
        "snapshot_hash_sha256": manifest.get("snapshot_hash_sha256"),
        "snapshot_version": snapshot.get("snapshot_version", "2.0"),
        "generated_by": "BENIN CYBER SHIELD",
        "pdf_path": bundle.pdf_path,
        "generated_at": bundle.created_at,
        "snapshot_json": snapshot,
    }


def _bundle_alert_uuid(bundle: ForensicBundle) -> str:
    snapshot = (bundle.manifest_json or {}).get("snapshot") or {}
    return str((((snapshot.get("data") or {}).get("alert") or {}).get("uuid") or ""))


def _serialize_legacy_report(report: Report) -> dict[str, Any]:
    return {
        "id": report.id,
        "uuid": report.uuid,
        "alert_id": report.alert_id,
        "report_hash": report.report_hash,
        "snapshot_hash_sha256": report.snapshot_hash_sha256,
        "snapshot_version": report.snapshot_version,
        "generated_by": report.generated_by,
        "pdf_path": report.pdf_path,
        "generated_at": report.generated_at,
        "snapshot_json": report.snapshot_json,
    }


async def _legacy_alert_id_map(db: AsyncSession, alert_uuids: list[str]) -> dict[str, int]:
    normalized = [uuid.UUID(value) for value in alert_uuids if value]
    if not normalized:
        return {}
    rows = (await db.execute(select(Alert.id, Alert.uuid).where(Alert.uuid.in_(normalized)))).all()
    return {str(alert_uuid): int(alert_id) for alert_id, alert_uuid in rows if alert_uuid is not None}


@router.get("/")
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    scope: str | None = Query(default=None, pattern="^me$"),
    db: AsyncSession = Depends(get_db),
    token_data: TokenPayload = Depends(get_current_token_payload),
):
    scope_owner_user_id = resolve_scope_owner_user_id(token_data, scope)

    bundle_query = (
        select(ForensicBundle)
        .options(selectinload(ForensicBundle.report))
        .order_by(ForensicBundle.created_at.desc())
    )
    if scope_owner_user_id is not None:
        bundle_query = (
            bundle_query
            .join(FormalReport, ForensicBundle.report_id == FormalReport.id)
            .where(FormalReport.reporter_user_id == scope_owner_user_id)
        )
    bundles = (await db.execute(bundle_query)).scalars().all()

    bundle_alert_uuids = []
    for bundle in bundles:
        alert_uuid = _bundle_alert_uuid(bundle)
        if alert_uuid:
            bundle_alert_uuids.append(alert_uuid)
    alert_id_map = await _legacy_alert_id_map(db, bundle_alert_uuids)

    items = [
        _serialize_bundle(
            bundle,
            legacy_alert_id=alert_id_map.get(_bundle_alert_uuid(bundle)),
        )
        for bundle in bundles
    ]
    alert_uuids_present = {
        str((((item.get("snapshot_json") or {}).get("data") or {}).get("alert") or {}).get("uuid") or "")
        for item in items
    }

    legacy_query = select(Report).order_by(Report.generated_at.desc())
    if scope_owner_user_id is not None:
        legacy_query = legacy_query.join(Alert, Report.alert_id == Alert.id).where(Alert.owner_user_id == scope_owner_user_id)
    legacy_reports = (await db.execute(legacy_query)).scalars().all()
    for report in legacy_reports:
        snapshot = report.snapshot_json or {}
        alert_uuid = str((((snapshot.get("data") or {}).get("alert") or {}).get("uuid") or ""))
        if alert_uuid and alert_uuid in alert_uuids_present:
            continue
        items.append(_serialize_legacy_report(report))

    items.sort(key=lambda item: item.get("generated_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return items[skip : skip + limit]


@router.post("/generate/{alert_uuid}", response_model=APIResponse[Any])
async def generate_report(
    alert_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    formal_report = await _load_formal_report_by_alert_uuid(db, alert_uuid)
    if formal_report is not None:
        legacy_alert = await _load_legacy_alert_with_evidences(db, formal_report.legacy_alert_uuid)
        bundle = await _create_bundle_for_formal_report(
            db=db,
            formal_report=formal_report,
            legacy_alert=legacy_alert,
        )
        report_data = {
            "id": bundle.id,
            "uuid": bundle.uuid,
            "report_hash": bundle.global_hash,
            "snapshot_hash_sha256": (bundle.manifest_json or {}).get("snapshot_hash_sha256"),
            "snapshot_version": ((bundle.manifest_json or {}).get("snapshot") or {}).get("snapshot_version", "2.0"),
            "generated_at": bundle.created_at,
            "pdf_path": bundle.pdf_path,
        }
        return APIResponse(
            success=True,
            message="Rapport genere et bundle forensique enregistre avec succes.",
            data=report_data,
        )

    stmt = select(Alert.id).where(Alert.uuid == alert_uuid)
    res = await db.execute(stmt)
    alert_id = res.scalar()
    if not alert_id:
        raise HTTPException(status_code=404, detail="Alert not found")

    snapshot = await create_alert_snapshot(alert_id, db)
    alert_data = (snapshot.get("data") or {}).get("alert") or {}
    phone_number = str(alert_data.get("phone_number") or "").strip()
    recurrence_count = 0
    if phone_number:
        recurrence_stmt = select(func.count(Alert.id)).where(Alert.phone_number == phone_number)
        recurrence_count = int((await db.execute(recurrence_stmt)).scalar_one() or 0)
    alert_data["recurrence_count"] = recurrence_count

    report_hash = compute_snapshot_hash(snapshot)
    filename = f"report_{report_hash[:8]}.pdf"
    output_dir = _artifact_write_root() / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / filename
    report_uuid_value = uuid.uuid4()

    try:
        generate_forensic_pdf(
            snapshot,
            str(pdf_path),
            report_hash,
            report_uuid=str(report_uuid_value),
        )
    except Exception as exc:
        logger.exception("Legacy PDF generation failed", extra={"alert_uuid": str(alert_uuid)})
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {exc}") from exc

    new_report = Report(
        uuid=report_uuid_value,
        alert_id=alert_id,
        snapshot_json=snapshot,
        report_hash=report_hash,
        snapshot_hash_sha256=report_hash,
        snapshot_version=snapshot.get("snapshot_version", "1.0"),
        pdf_path=filename,
    )
    db.add(new_report)
    await db.commit()

    if snapshot.get("data") and snapshot["data"].get("evidences"):
        evidence_ids = [ev["id"] for ev in snapshot["data"]["evidences"]]
        if evidence_ids:
            await db.execute(
                update(Evidence)
                .where(Evidence.id.in_(evidence_ids))
                .values(status="SEALED", sealed_at=func.now())
            )
            await db.commit()

    await db.refresh(new_report)
    report_data = {
        "id": new_report.id,
        "uuid": new_report.uuid,
        "report_hash": new_report.report_hash,
        "snapshot_hash_sha256": new_report.snapshot_hash_sha256,
        "snapshot_version": new_report.snapshot_version,
        "generated_at": new_report.generated_at,
        "pdf_path": new_report.pdf_path,
    }
    return APIResponse(
        success=True,
        message="Rapport legacy genere et preuves scellees avec succes.",
        data=report_data,
    )


@router.get("/{report_uuid}/download/pdf")
async def download_pdf(
    report_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    bundle = (await db.execute(select(ForensicBundle).where(ForensicBundle.uuid == report_uuid))).scalars().first()
    if bundle is not None:
        full_path = _resolve_artifact_path(bundle.pdf_path)
        if not full_path:
            raise HTTPException(status_code=404, detail="PDF file missing on disk")
        return FileResponse(
            str(full_path),
            media_type="application/pdf",
            filename=f"report_{bundle.uuid}.pdf",
        )

    report = (await db.execute(select(Report).where(Report.uuid == report_uuid))).scalars().first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    full_path = _resolve_artifact_path(report.pdf_path, legacy_report_file=True)
    if not full_path:
        raise HTTPException(status_code=404, detail="PDF file missing on disk")

    return FileResponse(
        str(full_path),
        media_type="application/pdf",
        filename=f"report_{report.uuid}.pdf",
    )


@router.get("/{report_uuid}/download/json")
async def download_json(
    report_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    bundle = (await db.execute(select(ForensicBundle).where(ForensicBundle.uuid == report_uuid))).scalars().first()
    if bundle is not None:
        full_path = _resolve_artifact_path(bundle.json_path)
        if full_path is not None:
            return FileResponse(
                str(full_path),
                media_type="application/json",
                filename=f"report_{bundle.uuid}.json",
            )

        payload = jsonable_encoder((bundle.manifest_json or {}).get("snapshot") or {})
        return Response(
            content=json.dumps(payload, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=report_{bundle.uuid}.json"},
        )

    report = (await db.execute(select(Report).where(Report.uuid == report_uuid))).scalars().first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    payload = jsonable_encoder(report.snapshot_json)
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=report_{report.uuid}.json"},
    )


@router.get("/{report_uuid}/download/case-bundle")
async def download_case_bundle(
    report_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_role(["ADMIN"])),
):
    bundle = (
        await db.execute(
            select(ForensicBundle)
            .options(selectinload(ForensicBundle.report))
            .where(ForensicBundle.uuid == report_uuid)
        )
    ).scalars().first()
    if bundle is not None:
        zip_path = _resolve_artifact_path(bundle.zip_path)
        if zip_path is not None:
            return FileResponse(
                str(zip_path),
                media_type="application/zip",
                filename=f"dossier_criet_{bundle.id}.zip",
            )

        pdf_path = _resolve_artifact_path(bundle.pdf_path)
        if pdf_path is None:
            raise HTTPException(status_code=404, detail="PDF file missing on disk")
        pdf_bytes = pdf_path.read_bytes()

        snapshot = (bundle.manifest_json or {}).get("snapshot") or {}
        alert_data = ((snapshot.get("data") or {}).get("alert") or {})
        incident_data = {
            "id": str(bundle.report_id),
            "uuid": alert_data.get("uuid"),
            "phone_number": alert_data.get("phone_number"),
            "reported_message": alert_data.get("reported_message"),
            "url": alert_data.get("url"),
            "source_type": alert_data.get("source_type"),
            "citizen_channel": alert_data.get("citizen_channel"),
            "risk_score": alert_data.get("risk_score"),
            "risk_level": _risk_level_from_score(int(alert_data.get("risk_score") or 0)),
            "soc_decision": alert_data.get("status_at_snapshot"),
            "status": alert_data.get("status_at_snapshot"),
            "analysis_note": alert_data.get("analysis_note"),
            "created_at": alert_data.get("created_at"),
            "updated_at": alert_data.get("updated_at"),
            "public_reference": (bundle.manifest_json or {}).get("public_reference"),
        }
        report_data = {
            "id": str(bundle.id),
            "uuid": str(bundle.uuid),
            "alert_id": None,
            "report_hash": bundle.global_hash,
            "snapshot_hash_sha256": (bundle.manifest_json or {}).get("snapshot_hash_sha256"),
            "snapshot_version": snapshot.get("snapshot_version", "2.0"),
            "generated_by": "BENIN CYBER SHIELD",
            "pdf_path": bundle.pdf_path,
            "created_at": str(bundle.created_at),
            "public_reference": (bundle.manifest_json or {}).get("public_reference"),
        }
        zip_bytes = await generate_case_bundle(incident_data, report_data, pdf_bytes)
        _write_relative_artifact(bundle.zip_path, zip_bytes)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=dossier_criet_{bundle.id}.zip"},
        )

    report = (
        await db.execute(select(Report).options(selectinload(Report.alert)).where(Report.uuid == report_uuid))
    ).scalars().first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    alert = report.alert
    if not alert:
        raise HTTPException(status_code=404, detail="Associated alert not found")

    target_path = _resolve_artifact_path(report.pdf_path, legacy_report_file=True)
    if target_path is None:
        candidate = _candidate_artifact_paths(report.pdf_path, legacy_report_file=True)[0]
        candidate.parent.mkdir(parents=True, exist_ok=True)
        target_path = candidate

    try:
        generate_forensic_pdf(
            report.snapshot_json or {},
            str(target_path),
            str(report.report_hash or ""),
            report_uuid=str(report.uuid),
        )
    except Exception as exc:
        logger.exception("Legacy case bundle PDF generation failed", extra={"report_uuid": str(report_uuid)})
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {exc}") from exc

    pdf_bytes = target_path.read_bytes()
    incident_data = {
        "id": str(alert.id),
        "uuid": str(alert.uuid) if alert.uuid else None,
        "phone_number": alert.phone_number,
        "reported_message": alert.reported_message,
        "url": alert.url,
        "source_type": alert.source_type,
        "citizen_channel": alert.citizen_channel,
        "region": alert.region,
        "risk_score": alert.risk_score,
        "risk_level": _risk_level_from_score(int(alert.risk_score or 0)),
        "soc_decision": alert.status,
        "status": alert.status,
        "analysis_note": alert.analysis_note,
        "created_at": str(alert.created_at),
        "updated_at": str(alert.updated_at),
    }
    report_data = {
        "id": str(report.id),
        "uuid": str(report.uuid) if report.uuid else None,
        "alert_id": str(report.alert_id),
        "report_hash": report.report_hash,
        "snapshot_hash_sha256": report.snapshot_hash_sha256,
        "snapshot_version": report.snapshot_version,
        "generated_by": report.generated_by,
        "pdf_path": report.pdf_path,
        "created_at": str(report.generated_at),
    }
    zip_bytes = await generate_case_bundle(incident_data, report_data, pdf_bytes)
    uuid_short = str(report.id)[:8]
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=dossier_criet_{uuid_short}.zip"},
    )


@router.delete("/{report_uuid}/delete")
async def delete_report(
    report_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_role(["ADMIN"])),
):
    bundle = (await db.execute(select(ForensicBundle).where(ForensicBundle.uuid == report_uuid))).scalars().first()
    if bundle is not None:
        _delete_relative_artifact(bundle.pdf_path)
        _delete_relative_artifact(bundle.json_path)
        _delete_relative_artifact(bundle.zip_path)
        await db.delete(bundle)
        await db.commit()
        return {"deleted": True, "id": str(report_uuid)}

    report = (await db.execute(select(Report).where(Report.uuid == report_uuid))).scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    _delete_relative_artifact(report.pdf_path, legacy_report_file=True)
    await db.delete(report)
    await db.commit()
    return {"deleted": True, "id": str(report_uuid)}
