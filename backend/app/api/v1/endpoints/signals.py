import logging

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from fastapi import Depends
from app.models import Alert
from app.schemas.response import APIResponse
from app.schemas.signal import VerifySignalData, VerifySignalRequest
from app.services.detection import score_signal


router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/verify", response_model=APIResponse[VerifySignalData])
async def verify_signal(
    request: VerifySignalRequest,
    db: AsyncSession = Depends(get_db),
):
    result = score_signal(message=request.message, url=request.url, phone=request.phone)
    normalized_phone = request.phone.strip()
    recurrence_count = int(
        (await db.execute(select(func.count(Alert.id)).where(Alert.phone_number == normalized_phone))).scalar_one() or 0
    )

    if request.create_incident is not None:
        logger.warning(
            "Deprecated field create_incident received on /signals/verify and ignored",
            extra={"channel": request.channel},
        )

    return APIResponse(
        success=True,
        message="Signal analyse avec succes.",
        data=VerifySignalData(
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            explanation=result["explanation"],
            should_report=result["should_report"],
            matched_rules=result["matched_rules"],
            categories_detected=result.get("categories_detected", []),
            recurrence_count=recurrence_count,
        ),
    )
