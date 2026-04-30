from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import CitizenMessage, FormalReport
from app.schemas.mobile import MobileBootstrapData, MobileHistoryData, MobileHistoryItem
from app.services.benin_geography import BENIN_DEPARTMENTS
from app.services.phone_privacy import decrypt_phone, mask_phone


def get_mobile_bootstrap_payload() -> MobileBootstrapData:
    return MobileBootstrapData(
        departments=BENIN_DEPARTMENTS,
        minimum_supported_version="1.0.0",
    )


async def fetch_mobile_history(
    *,
    db: AsyncSession,
    device_install_id: str,
    limit: int = 50,
) -> MobileHistoryData:
    stmt = (
        select(CitizenMessage)
        .options(
            selectinload(CitizenMessage.analysis),
            selectinload(CitizenMessage.reports).selectinload(FormalReport.suspect_number),
        )
        .where(CitizenMessage.device_install_id == device_install_id)
        .order_by(CitizenMessage.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    items = [
        MobileHistoryItem(
            type="REPORT" if message.history_entry_type == "REPORT" else "VERIFY",
            created_at=message.created_at,
            risk_score=int(message.analysis.risk_score if message.analysis else 0),
            risk_level=str(message.analysis.risk_level if message.analysis else "LOW"),
            primary_category=message.analysis.primary_category if message.analysis else None,
            masked_phone=_history_masked_phone(message),
            public_reference=message.reports[0].public_reference if message.reports else None,
            status=message.reports[0].status if message.reports else "VERIFIED",
        )
        for message in messages
    ]
    return MobileHistoryData(items=items)


def _history_masked_phone(message: CitizenMessage) -> str:
    if message.submitted_phone_masked:
        return message.submitted_phone_masked
    if message.reports:
        suspect_number = message.reports[0].suspect_number
        if suspect_number and suspect_number.phone_ciphertext:
            try:
                return mask_phone(decrypt_phone(suspect_number.phone_ciphertext))
            except Exception:
                return "-"
    return "-"
