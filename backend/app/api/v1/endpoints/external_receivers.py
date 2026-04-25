import hmac
from typing import Any

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.external_delivery import ExternalDeliveryAckData
from app.schemas.response import APIResponse
from app.services.external_transmissions import build_external_delivery_ack


router = APIRouter()


def _validate_secret(received_secret: str | None) -> None:
    if not received_secret or not hmac.compare_digest(
        received_secret,
        settings.EXTERNAL_TRANSMISSION_SHARED_SECRET,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid transmission secret",
        )


@router.post("/anssi-ocrc/receive", response_model=APIResponse[ExternalDeliveryAckData])
async def receive_anssi_ocrc_payload(
    payload: dict[str, Any],
    x_transmission_secret: str | None = Header(default=None, alias="X-Transmission-Secret"),
) -> APIResponse[ExternalDeliveryAckData]:
    _validate_secret(x_transmission_secret)
    if payload.get("force_failure"):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Simulated ANSSI/OCRC outage")
    data = build_external_delivery_ack("ANSSI_OCRC")
    return APIResponse(success=True, message="Payload ANSSI/OCRC recu.", data=ExternalDeliveryAckData(**data))


@router.post("/operators/receive", response_model=APIResponse[ExternalDeliveryAckData])
async def receive_operator_payload(
    payload: dict[str, Any],
    x_transmission_secret: str | None = Header(default=None, alias="X-Transmission-Secret"),
) -> APIResponse[ExternalDeliveryAckData]:
    _validate_secret(x_transmission_secret)
    if payload.get("force_failure"):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Simulated operator outage")
    data = build_external_delivery_ack("OPERATORS")
    return APIResponse(success=True, message="Payload operateur recu.", data=ExternalDeliveryAckData(**data))
