from pydantic import BaseModel, UUID4


class AlertDeletionData(BaseModel):
    alert_uuid: UUID4
    deleted_reports_count: int
    deleted_evidences_count: int
    deleted_analysis_results_count: int
    deleted_files_count: int
    missing_files_count: int
    deleted_shield_actions_count: int

