import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.models import BusinessProfile, FormalReport, ForensicBundle, ImpersonationIncident, User
from app.schemas.pme import (
    AdminBusinessDetailData,
    AdminBusinessListData,
    AdminBusinessListItem,
    PmeBundleListData,
    PmeBundleListItem,
    PmeDashboardData,
    PmeIncidentListData,
    PmeIncidentListItem,
    PmeProfileData,
    PmeProfileUpdateRequest,
    PmeRegisterRequest,
    PmeRegistrationData,
    PmeSignalementListData,
    PmeSignalementListItem,
)
from app.services.phone_privacy import decrypt_phone, mask_phone, normalize_phone


PHONE_PATTERN = re.compile(r"^\+?[0-9]{8,15}$")


def _clean_string(value: str | None) -> str | None:
    cleaned = (value or "").strip()
    return cleaned or None


def _clean_unique_strings(values: list[str] | None) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in values or []:
        value = (raw or "").strip()
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(value)
    return cleaned


def _clean_legit_numbers(values: list[str] | None) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in values or []:
        normalized = normalize_phone(raw)
        if not PHONE_PATTERN.match(normalized):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Numero legitime invalide: {raw}",
            )
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(normalized)
    return cleaned


async def _get_profile_with_user_by_user_id(db: AsyncSession, user_id: int) -> tuple[BusinessProfile, User]:
    stmt = (
        select(BusinessProfile, User)
        .join(User, BusinessProfile.user_id == User.id)
        .where(BusinessProfile.user_id == user_id)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Profil PME introuvable.")
    return row[0], row[1]


def _serialize_profile(profile: BusinessProfile, user: User) -> PmeProfileData:
    return PmeProfileData(
        business_uuid=profile.uuid,
        user_email=user.email,
        official_name=profile.official_name,
        keywords=list(profile.keywords_json or []),
        legit_numbers=list(profile.legit_numbers_json or []),
        contact_email=profile.contact_email,
        contact_phone=profile.contact_phone,
        validation_status=profile.validation_status,
        validated_at=profile.validated_at,
        created_at=profile.created_at,
    )


def _masked_phone(report: FormalReport) -> str:
    suspect_number = report.suspect_number
    if suspect_number is None:
        return "-"
    try:
        return mask_phone(decrypt_phone(suspect_number.phone_ciphertext))
    except Exception:
        return "-"


async def register_business(db: AsyncSession, request: PmeRegisterRequest) -> PmeRegistrationData:
    email = request.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Adresse email invalide.")

    existing_user = await db.scalar(select(User).where(User.email == email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un compte existe deja pour cet email.")

    keywords = _clean_unique_strings(request.keywords)
    legit_numbers = _clean_legit_numbers(request.legit_numbers)
    official_name = (request.official_name or "").strip()
    if not official_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nom officiel obligatoire.")

    user = User(
        email=email,
        password_hash=get_password_hash(request.password),
        role="SME",
        status="PENDING_APPROVAL",
    )
    db.add(user)
    await db.flush()

    profile = BusinessProfile(
        user_id=user.id,
        official_name=official_name,
        keywords_json=keywords,
        legit_numbers_json=legit_numbers,
        contact_email=_clean_string(request.contact_email),
        contact_phone=_clean_string(request.contact_phone),
        validation_status="PENDING_APPROVAL",
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return PmeRegistrationData(
        business_uuid=profile.uuid,
        email=user.email,
        official_name=profile.official_name,
        validation_status=profile.validation_status,
        created_at=profile.created_at,
    )


async def get_business_profile(db: AsyncSession, user_id: int) -> PmeProfileData:
    profile, user = await _get_profile_with_user_by_user_id(db, user_id)
    return _serialize_profile(profile, user)


async def update_business_profile(
    db: AsyncSession,
    user_id: int,
    request: PmeProfileUpdateRequest,
) -> PmeProfileData:
    profile, user = await _get_profile_with_user_by_user_id(db, user_id)

    if request.official_name is not None:
        official_name = request.official_name.strip()
        if not official_name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nom officiel invalide.")
        profile.official_name = official_name
    if request.keywords is not None:
        profile.keywords_json = _clean_unique_strings(request.keywords)
    if request.legit_numbers is not None:
        profile.legit_numbers_json = _clean_legit_numbers(request.legit_numbers)
    if request.contact_email is not None:
        profile.contact_email = _clean_string(request.contact_email)
    if request.contact_phone is not None:
        profile.contact_phone = _clean_string(request.contact_phone)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return _serialize_profile(profile, user)


async def list_business_incidents(db: AsyncSession, user_id: int, skip: int, limit: int) -> PmeIncidentListData:
    total_stmt = (
        select(func.count(ImpersonationIncident.id))
        .select_from(ImpersonationIncident)
        .join(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
        .where(BusinessProfile.user_id == user_id)
    )
    total = int((await db.execute(total_stmt)).scalar_one() or 0)

    stmt = (
        select(ImpersonationIncident)
        .join(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
        .where(BusinessProfile.user_id == user_id)
        .options(
            selectinload(ImpersonationIncident.formal_report).selectinload(FormalReport.message),
            selectinload(ImpersonationIncident.formal_report).selectinload(FormalReport.analysis),
            selectinload(ImpersonationIncident.formal_report).selectinload(FormalReport.suspect_number),
            selectinload(ImpersonationIncident.formal_report).selectinload(FormalReport.forensic_bundles),
        )
        .order_by(ImpersonationIncident.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    incidents = (await db.execute(stmt)).scalars().all()

    items = [
        PmeIncidentListItem(
            incident_uuid=incident.uuid,
            report_uuid=incident.formal_report.uuid,
            public_reference=incident.formal_report.public_reference,
            report_status=incident.formal_report.status,
            incident_status=incident.status,
            channel=incident.formal_report.message.channel,
            message_preview=incident.formal_report.message.content[:160],
            risk_score=int(incident.formal_report.analysis.risk_score or 0),
            suspect_phone_masked=_masked_phone(incident.formal_report),
            detection_reason=incident.detection_reason,
            created_at=incident.created_at,
            bundle_ready=bool(incident.formal_report.forensic_bundles),
        )
        for incident in incidents
    ]

    return PmeIncidentListData(items=items, total=total, skip=skip, limit=limit)


async def list_business_signalements(db: AsyncSession, user_id: int, skip: int, limit: int) -> PmeSignalementListData:
    total_stmt = (
        select(func.count(func.distinct(FormalReport.id)))
        .select_from(FormalReport)
        .join(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
        .join(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
        .where(BusinessProfile.user_id == user_id)
    )
    total = int((await db.execute(total_stmt)).scalar_one() or 0)

    stmt = (
        select(FormalReport)
        .join(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
        .join(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
        .where(BusinessProfile.user_id == user_id)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.suspect_number),
            selectinload(FormalReport.evidence_items),
            selectinload(FormalReport.forensic_bundles),
        )
        .order_by(FormalReport.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    reports = (await db.execute(stmt)).scalars().unique().all()

    items = [
        PmeSignalementListItem(
            report_uuid=report.uuid,
            legacy_alert_uuid=report.legacy_alert_uuid,
            public_reference=report.public_reference,
            channel=report.message.channel,
            message_preview=report.message.content[:180],
            risk_score=int(report.analysis.risk_score or 0),
            report_status=report.status,
            suspect_phone_masked=_masked_phone(report),
            created_at=report.created_at,
            attachments_count=len(report.evidence_items or []),
            bundles_count=len(report.forensic_bundles or []),
        )
        for report in reports
    ]

    return PmeSignalementListData(items=items, total=total, skip=skip, limit=limit)


async def list_business_bundles(db: AsyncSession, user_id: int, skip: int, limit: int) -> PmeBundleListData:
    total_stmt = (
        select(func.count(func.distinct(FormalReport.id)))
        .select_from(FormalReport)
        .join(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
        .join(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
        .where(BusinessProfile.user_id == user_id)
    )
    total = int((await db.execute(total_stmt)).scalar_one() or 0)

    stmt = (
        select(FormalReport)
        .join(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
        .join(BusinessProfile, ImpersonationIncident.business_profile_id == BusinessProfile.id)
        .where(BusinessProfile.user_id == user_id)
        .options(
            selectinload(FormalReport.message),
            selectinload(FormalReport.analysis),
            selectinload(FormalReport.forensic_bundles),
        )
        .order_by(FormalReport.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    reports = (await db.execute(stmt)).scalars().unique().all()

    items: list[PmeBundleListItem] = []
    for report in reports:
        latest_bundle = None
        if report.forensic_bundles:
            latest_bundle = sorted(
                report.forensic_bundles,
                key=lambda item: item.created_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )[0]

        items.append(
            PmeBundleListItem(
                bundle_uuid=latest_bundle.uuid if latest_bundle else None,
                report_uuid=report.uuid,
                legacy_alert_uuid=report.legacy_alert_uuid,
                public_reference=report.public_reference,
                risk_score=int(report.analysis.risk_score or 0),
                message_preview=report.message.content[:180],
                created_at=latest_bundle.created_at if latest_bundle else None,
                bundle_status=(latest_bundle.status if latest_bundle else "PENDING"),
                pdf_available=bool(latest_bundle and latest_bundle.pdf_path),
                json_available=bool(latest_bundle and latest_bundle.json_path),
                zip_available=bool(latest_bundle and latest_bundle.zip_path),
            )
        )

    return PmeBundleListData(items=items, total=total, skip=skip, limit=limit)


async def get_business_dashboard(db: AsyncSession, user_id: int) -> PmeDashboardData:
    profile, _user = await _get_profile_with_user_by_user_id(db, user_id)

    total_incidents_stmt = (
        select(func.count(ImpersonationIncident.id))
        .where(ImpersonationIncident.business_profile_id == profile.id)
    )
    new_incidents_stmt = (
        select(func.count(ImpersonationIncident.id))
        .where(
            ImpersonationIncident.business_profile_id == profile.id,
            ImpersonationIncident.status == "NEW",
        )
    )
    linked_reports_stmt = (
        select(func.count(func.distinct(ImpersonationIncident.formal_report_id)))
        .where(ImpersonationIncident.business_profile_id == profile.id)
    )
    bundles_ready_stmt = (
        select(func.count(func.distinct(ForensicBundle.id)))
        .select_from(ForensicBundle)
        .join(FormalReport, ForensicBundle.report_id == FormalReport.id)
        .join(ImpersonationIncident, ImpersonationIncident.formal_report_id == FormalReport.id)
        .where(ImpersonationIncident.business_profile_id == profile.id)
    )
    last_incident_stmt = (
        select(func.max(ImpersonationIncident.created_at))
        .where(ImpersonationIncident.business_profile_id == profile.id)
    )

    recent = await list_business_incidents(db=db, user_id=user_id, skip=0, limit=5)

    return PmeDashboardData(
        official_name=profile.official_name,
        validation_status=profile.validation_status,
        total_incidents=int((await db.execute(total_incidents_stmt)).scalar_one() or 0),
        new_incidents=int((await db.execute(new_incidents_stmt)).scalar_one() or 0),
        linked_reports=int((await db.execute(linked_reports_stmt)).scalar_one() or 0),
        bundles_ready=int((await db.execute(bundles_ready_stmt)).scalar_one() or 0),
        last_incident_at=(await db.execute(last_incident_stmt)).scalar_one_or_none(),
        recent_incidents=recent.items,
    )


async def list_admin_businesses(
    db: AsyncSession,
    status_filter: str | None = None,
    search: str | None = None,
) -> AdminBusinessListData:
    filters = []
    if status_filter:
        filters.append(BusinessProfile.validation_status == status_filter)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                BusinessProfile.official_name.ilike(term),
                User.email.ilike(term),
                BusinessProfile.contact_email.ilike(term),
            )
        )

    stmt = (
        select(BusinessProfile, User)
        .join(User, BusinessProfile.user_id == User.id)
        .where(*filters)
        .order_by(BusinessProfile.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    items = [
        AdminBusinessListItem(
            business_uuid=profile.uuid,
            user_id=user.id,
            email=user.email,
            official_name=profile.official_name,
            validation_status=profile.validation_status,
            contact_email=profile.contact_email,
            contact_phone=profile.contact_phone,
            keywords_count=len(profile.keywords_json or []),
            legit_numbers_count=len(profile.legit_numbers_json or []),
            created_at=profile.created_at,
            validated_at=profile.validated_at,
        )
        for profile, user in rows
    ]

    async def _count_with_status(status_value: str) -> int:
        count_stmt = select(func.count(BusinessProfile.id)).where(BusinessProfile.validation_status == status_value)
        return int((await db.execute(count_stmt)).scalar_one() or 0)

    return AdminBusinessListData(
        items=items,
        total=len(items),
        pending_count=await _count_with_status("PENDING_APPROVAL"),
        active_count=await _count_with_status("ACTIVE"),
        rejected_count=await _count_with_status("REJECTED"),
        disabled_count=await _count_with_status("DISABLED"),
    )


async def get_admin_business_detail(db: AsyncSession, business_uuid: uuid.UUID) -> AdminBusinessDetailData:
    stmt = (
        select(BusinessProfile, User)
        .join(User, BusinessProfile.user_id == User.id)
        .where(BusinessProfile.uuid == business_uuid)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="PME introuvable.")

    profile, user = row[0], row[1]
    dashboard = await get_business_dashboard(db=db, user_id=user.id)
    incidents = await list_business_incidents(db=db, user_id=user.id, skip=0, limit=5)
    reports = await list_business_signalements(db=db, user_id=user.id, skip=0, limit=5)

    return AdminBusinessDetailData(
        business_uuid=profile.uuid,
        email=user.email,
        official_name=profile.official_name,
        validation_status=profile.validation_status,
        contact_email=profile.contact_email,
        contact_phone=profile.contact_phone,
        keywords=list(profile.keywords_json or []),
        legit_numbers=list(profile.legit_numbers_json or []),
        created_at=profile.created_at,
        validated_at=profile.validated_at,
        total_incidents=dashboard.total_incidents,
        linked_reports=dashboard.linked_reports,
        bundles_ready=dashboard.bundles_ready,
        last_incident_at=dashboard.last_incident_at,
        recent_incidents=incidents.items,
        recent_reports=reports.items,
    )


async def update_business_validation_status(
    db: AsyncSession,
    business_uuid: uuid.UUID,
    action: str,
    admin_user_id: int | None,
) -> AdminBusinessListItem:
    stmt = (
        select(BusinessProfile, User)
        .join(User, BusinessProfile.user_id == User.id)
        .where(BusinessProfile.uuid == business_uuid)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="PME introuvable.")

    profile, user = row[0], row[1]
    if action == "approve":
        next_status = "ACTIVE"
        profile.validated_at = datetime.now(timezone.utc)
        profile.validated_by_user_id = admin_user_id if admin_user_id and admin_user_id > 0 else None
    elif action == "reject":
        next_status = "REJECTED"
    elif action == "disable":
        next_status = "DISABLED"
    else:
        raise HTTPException(status_code=400, detail="Action de validation invalide.")

    profile.validation_status = next_status
    user.status = next_status
    user.role = "SME"

    db.add(profile)
    db.add(user)
    await db.commit()
    await db.refresh(profile)

    return AdminBusinessListItem(
        business_uuid=profile.uuid,
        user_id=user.id,
        email=user.email,
        official_name=profile.official_name,
        validation_status=profile.validation_status,
        contact_email=profile.contact_email,
        contact_phone=profile.contact_phone,
        keywords_count=len(profile.keywords_json or []),
        legit_numbers_count=len(profile.legit_numbers_json or []),
        created_at=profile.created_at,
        validated_at=profile.validated_at,
    )
