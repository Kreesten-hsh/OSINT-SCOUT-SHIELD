from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.signal import VerifySignalData, VerifySignalRequest
from app.services.citizen_flow import verify_citizen_signal


router = APIRouter()


@router.post("/verify", response_model=APIResponse[VerifySignalData])
async def public_verify_signal(
    request: VerifySignalRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await verify_citizen_signal(request=request, db=db)
    return APIResponse(
        success=True,
        message="Message analyse avec succes.",
        data=result,
    )
