from typing import Literal
from pydantic import BaseModel, Field, UUID4


DecisionAction = Literal["CONFIRM", "REJECT", "ESCALATE"]
DecisionStatus = Literal["PENDING", "VALIDATED", "REJECTED", "ESCALATED", "EXECUTED"]
PlaybookActionType = Literal[
    "BLOCK_NUMBER",
    "SUSPEND_WALLET",
    "ENFORCE_MFA",
    "BLACKLIST_ADD",
    "USER_NOTIFY",
]
OperatorExecutionStatus = Literal["RECEIVED", "EXECUTED", "FAILED"]


class IncidentDecisionRequest(BaseModel):
    decision: DecisionAction
    comment: str | None = Field(default=None, max_length=1000)
    decided_by: str | None = Field(default=None, max_length=128)


class IncidentDecisionData(BaseModel):
    incident_id: UUID4
    alert_status: str
    decision_status: DecisionStatus
    comment: str | None = None


class ShieldDispatchRequest(BaseModel):
    incident_id: UUID4
    action_type: PlaybookActionType
    reason: str | None = Field(default=None, max_length=1000)
    requested_by: str | None = Field(default=None, max_length=128)
    auto_callback: bool = True


class ShieldDispatchData(BaseModel):
    dispatch_id: UUID4
    incident_id: UUID4
    action_type: PlaybookActionType
    decision_status: DecisionStatus
    operator_status: Literal["SENT", "RECEIVED", "EXECUTED", "FAILED"]
    callback_required: bool


class OperatorActionStatusRequest(BaseModel):
    dispatch_id: UUID4
    incident_id: UUID4
    operator_status: OperatorExecutionStatus
    execution_note: str | None = Field(default=None, max_length=1000)
    external_ref: str | None = Field(default=None, max_length=128)


class OperatorActionStatusData(BaseModel):
    dispatch_id: UUID4
    incident_id: UUID4
    action_type: PlaybookActionType | None = None
    decision_status: DecisionStatus
    alert_status: str
    operator_status: OperatorExecutionStatus
    updated_at: str
