from pydantic import BaseModel


class ExternalDeliveryAckData(BaseModel):
    target_type: str
    received: bool
    ack_reference: str
