import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.schemas.response import APIResponse
from app.schemas.shield import OperatorActionStatusData, OperatorActionStatusRequest
from app.services.shield import operator_callback_action_status


router = APIRouter()


@router.post("/callbacks/action-status", response_model=APIResponse[OperatorActionStatusData])
async def operator_action_status_callback(
    request: OperatorActionStatusRequest,
    db: AsyncSession = Depends(get_db),
    x_operator_secret: str | None = Header(default=None, alias="X-Operator-Secret"),
):
    if not x_operator_secret or not hmac.compare_digest(
        x_operator_secret,
        settings.SHIELD_OPERATOR_SHARED_SECRET,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operator callback secret",
        )

    callback_result = await operator_callback_action_status(request=request, db=db)
    return APIResponse(
        success=True,
        message="Callback operateur traite avec succes.",
        data=callback_result,
    )
