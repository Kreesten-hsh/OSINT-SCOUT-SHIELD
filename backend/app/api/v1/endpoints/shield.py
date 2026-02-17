from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_subject
from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.shield import ShieldDispatchData, ShieldDispatchRequest
from app.services.shield import dispatch_shield_action


router = APIRouter()


@router.post("/actions/dispatch", response_model=APIResponse[ShieldDispatchData])
async def dispatch_action(
    request: ShieldDispatchRequest,
    db: AsyncSession = Depends(get_db),
    _subject: str = Depends(get_current_subject),
):
    dispatch_result = await dispatch_shield_action(request=request, db=db)
    return APIResponse(
        success=True,
        message="Action SHIELD envoyee a l operateur simule.",
        data=dispatch_result,
    )
