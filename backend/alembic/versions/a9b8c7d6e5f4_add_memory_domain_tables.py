"""Add memory domain tables

Revision ID: a9b8c7d6e5f4
Revises: f6a7b8c9d0e1
Create Date: 2026-04-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a9b8c7d6e5f4"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="WEB_PORTAL"),
        sa.Column("submitted_url", sa.String(), nullable=True),
        sa.Column("ip_hash_submitter", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_messages_id"), "messages", ["id"], unique=False)
    op.create_index(op.f("ix_messages_uuid"), "messages", ["uuid"], unique=False)
    op.create_index(op.f("ix_messages_channel"), "messages", ["channel"], unique=False)
    op.create_index(op.f("ix_messages_created_at"), "messages", ["created_at"], unique=False)

    op.create_table(
        "analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(length=16), nullable=False),
        sa.Column("primary_category", sa.String(length=128), nullable=True),
        sa.Column("matched_rules", sa.JSON(), nullable=False),
        sa.Column("categories_detected", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.JSON(), nullable=False),
        sa.Column("recommendations", sa.JSON(), nullable=False),
        sa.Column("highlighted_spans", sa.JSON(), nullable=False),
        sa.Column("fon_alert", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_analyses_id"), "analyses", ["id"], unique=False)
    op.create_index(op.f("ix_analyses_uuid"), "analyses", ["uuid"], unique=False)
    op.create_index(op.f("ix_analyses_message_id"), "analyses", ["message_id"], unique=False)
    op.create_index(op.f("ix_analyses_risk_score"), "analyses", ["risk_score"], unique=False)
    op.create_index(op.f("ix_analyses_risk_level"), "analyses", ["risk_level"], unique=False)

    op.create_table(
        "suspect_numbers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phone_hash", sa.String(length=64), nullable=False),
        sa.Column("phone_ciphertext", sa.Text(), nullable=False),
        sa.Column("report_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_seen", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone_hash"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_suspect_numbers_id"), "suspect_numbers", ["id"], unique=False)
    op.create_index(op.f("ix_suspect_numbers_uuid"), "suspect_numbers", ["uuid"], unique=False)
    op.create_index(op.f("ix_suspect_numbers_phone_hash"), "suspect_numbers", ["phone_hash"], unique=False)

    op.create_table(
        "business_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("official_name", sa.String(length=255), nullable=False),
        sa.Column("keywords_json", sa.JSON(), nullable=False),
        sa.Column("legit_numbers_json", sa.JSON(), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_phone", sa.String(length=64), nullable=True),
        sa.Column("validation_status", sa.String(length=24), nullable=False, server_default="PENDING_APPROVAL"),
        sa.Column("validated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_business_profiles_user_id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_business_profiles_id"), "business_profiles", ["id"], unique=False)
    op.create_index(op.f("ix_business_profiles_uuid"), "business_profiles", ["uuid"], unique=False)
    op.create_index(op.f("ix_business_profiles_user_id"), "business_profiles", ["user_id"], unique=False)
    op.create_index(op.f("ix_business_profiles_official_name"), "business_profiles", ["official_name"], unique=False)
    op.create_index(op.f("ix_business_profiles_validation_status"), "business_profiles", ["validation_status"], unique=False)

    op.create_table(
        "formal_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("public_reference", sa.String(length=32), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("analysis_id", sa.Integer(), nullable=False),
        sa.Column("suspect_number_id", sa.Integer(), nullable=False),
        sa.Column("reporter_user_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="NEW"),
        sa.Column("custody_hash", sa.String(length=64), nullable=False),
        sa.Column("legacy_alert_uuid", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"]),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"]),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["suspect_number_id"], ["suspect_numbers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_reference"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_formal_reports_id"), "formal_reports", ["id"], unique=False)
    op.create_index(op.f("ix_formal_reports_uuid"), "formal_reports", ["uuid"], unique=False)
    op.create_index(op.f("ix_formal_reports_public_reference"), "formal_reports", ["public_reference"], unique=False)
    op.create_index(op.f("ix_formal_reports_message_id"), "formal_reports", ["message_id"], unique=False)
    op.create_index(op.f("ix_formal_reports_analysis_id"), "formal_reports", ["analysis_id"], unique=False)
    op.create_index(op.f("ix_formal_reports_suspect_number_id"), "formal_reports", ["suspect_number_id"], unique=False)
    op.create_index(op.f("ix_formal_reports_reporter_user_id"), "formal_reports", ["reporter_user_id"], unique=False)
    op.create_index(op.f("ix_formal_reports_status"), "formal_reports", ["status"], unique=False)
    op.create_index(op.f("ix_formal_reports_custody_hash"), "formal_reports", ["custody_hash"], unique=False)
    op.create_index(op.f("ix_formal_reports_legacy_alert_uuid"), "formal_reports", ["legacy_alert_uuid"], unique=False)
    op.create_index(op.f("ix_formal_reports_created_at"), "formal_reports", ["created_at"], unique=False)

    op.create_table(
        "evidence_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False, server_default="SCREENSHOT"),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False),
        sa.Column("content_text_preview", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["formal_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
        sa.UniqueConstraint("file_hash"),
    )
    op.create_index(op.f("ix_evidence_items_id"), "evidence_items", ["id"], unique=False)
    op.create_index(op.f("ix_evidence_items_uuid"), "evidence_items", ["uuid"], unique=False)
    op.create_index(op.f("ix_evidence_items_report_id"), "evidence_items", ["report_id"], unique=False)
    op.create_index(op.f("ix_evidence_items_type"), "evidence_items", ["type"], unique=False)
    op.create_index(op.f("ix_evidence_items_file_hash"), "evidence_items", ["file_hash"], unique=False)
    op.create_index(op.f("ix_evidence_items_created_at"), "evidence_items", ["created_at"], unique=False)

    op.create_table(
        "impersonation_incidents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_profile_id", sa.Integer(), nullable=False),
        sa.Column("formal_report_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="NEW"),
        sa.Column("detection_reason", sa.Text(), nullable=True),
        sa.Column("custody_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["business_profile_id"], ["business_profiles.id"]),
        sa.ForeignKeyConstraint(["formal_report_id"], ["formal_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_impersonation_incidents_id"), "impersonation_incidents", ["id"], unique=False)
    op.create_index(op.f("ix_impersonation_incidents_uuid"), "impersonation_incidents", ["uuid"], unique=False)
    op.create_index(op.f("ix_impersonation_incidents_business_profile_id"), "impersonation_incidents", ["business_profile_id"], unique=False)
    op.create_index(op.f("ix_impersonation_incidents_formal_report_id"), "impersonation_incidents", ["formal_report_id"], unique=False)
    op.create_index(op.f("ix_impersonation_incidents_status"), "impersonation_incidents", ["status"], unique=False)
    op.create_index(op.f("ix_impersonation_incidents_custody_hash"), "impersonation_incidents", ["custody_hash"], unique=False)
    op.create_index(op.f("ix_impersonation_incidents_created_at"), "impersonation_incidents", ["created_at"], unique=False)

    op.create_table(
        "forensic_bundles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("global_hash", sa.String(length=64), nullable=False),
        sa.Column("manifest_json", sa.JSON(), nullable=False),
        sa.Column("zip_path", sa.String(), nullable=True),
        sa.Column("pdf_path", sa.String(), nullable=True),
        sa.Column("json_path", sa.String(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("transmitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["formal_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_forensic_bundles_id"), "forensic_bundles", ["id"], unique=False)
    op.create_index(op.f("ix_forensic_bundles_uuid"), "forensic_bundles", ["uuid"], unique=False)
    op.create_index(op.f("ix_forensic_bundles_report_id"), "forensic_bundles", ["report_id"], unique=False)
    op.create_index(op.f("ix_forensic_bundles_global_hash"), "forensic_bundles", ["global_hash"], unique=False)
    op.create_index(op.f("ix_forensic_bundles_status"), "forensic_bundles", ["status"], unique=False)

    op.create_table(
        "external_transmissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bundle_id", sa.Integer(), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("target_endpoint", sa.String(), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="PENDING"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ack_reference", sa.String(length=128), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["bundle_id"], ["forensic_bundles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_external_transmissions_id"), "external_transmissions", ["id"], unique=False)
    op.create_index(op.f("ix_external_transmissions_uuid"), "external_transmissions", ["uuid"], unique=False)
    op.create_index(op.f("ix_external_transmissions_bundle_id"), "external_transmissions", ["bundle_id"], unique=False)
    op.create_index(op.f("ix_external_transmissions_target_type"), "external_transmissions", ["target_type"], unique=False)
    op.create_index(op.f("ix_external_transmissions_status"), "external_transmissions", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_external_transmissions_status"), table_name="external_transmissions")
    op.drop_index(op.f("ix_external_transmissions_target_type"), table_name="external_transmissions")
    op.drop_index(op.f("ix_external_transmissions_bundle_id"), table_name="external_transmissions")
    op.drop_index(op.f("ix_external_transmissions_uuid"), table_name="external_transmissions")
    op.drop_index(op.f("ix_external_transmissions_id"), table_name="external_transmissions")
    op.drop_table("external_transmissions")

    op.drop_index(op.f("ix_forensic_bundles_status"), table_name="forensic_bundles")
    op.drop_index(op.f("ix_forensic_bundles_global_hash"), table_name="forensic_bundles")
    op.drop_index(op.f("ix_forensic_bundles_report_id"), table_name="forensic_bundles")
    op.drop_index(op.f("ix_forensic_bundles_uuid"), table_name="forensic_bundles")
    op.drop_index(op.f("ix_forensic_bundles_id"), table_name="forensic_bundles")
    op.drop_table("forensic_bundles")

    op.drop_index(op.f("ix_impersonation_incidents_created_at"), table_name="impersonation_incidents")
    op.drop_index(op.f("ix_impersonation_incidents_custody_hash"), table_name="impersonation_incidents")
    op.drop_index(op.f("ix_impersonation_incidents_status"), table_name="impersonation_incidents")
    op.drop_index(op.f("ix_impersonation_incidents_formal_report_id"), table_name="impersonation_incidents")
    op.drop_index(op.f("ix_impersonation_incidents_business_profile_id"), table_name="impersonation_incidents")
    op.drop_index(op.f("ix_impersonation_incidents_uuid"), table_name="impersonation_incidents")
    op.drop_index(op.f("ix_impersonation_incidents_id"), table_name="impersonation_incidents")
    op.drop_table("impersonation_incidents")

    op.drop_index(op.f("ix_evidence_items_created_at"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_file_hash"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_type"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_report_id"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_uuid"), table_name="evidence_items")
    op.drop_index(op.f("ix_evidence_items_id"), table_name="evidence_items")
    op.drop_table("evidence_items")

    op.drop_index(op.f("ix_formal_reports_created_at"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_legacy_alert_uuid"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_custody_hash"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_status"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_reporter_user_id"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_suspect_number_id"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_analysis_id"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_message_id"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_public_reference"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_uuid"), table_name="formal_reports")
    op.drop_index(op.f("ix_formal_reports_id"), table_name="formal_reports")
    op.drop_table("formal_reports")

    op.drop_index(op.f("ix_business_profiles_validation_status"), table_name="business_profiles")
    op.drop_index(op.f("ix_business_profiles_official_name"), table_name="business_profiles")
    op.drop_index(op.f("ix_business_profiles_user_id"), table_name="business_profiles")
    op.drop_index(op.f("ix_business_profiles_uuid"), table_name="business_profiles")
    op.drop_index(op.f("ix_business_profiles_id"), table_name="business_profiles")
    op.drop_table("business_profiles")

    op.drop_index(op.f("ix_suspect_numbers_phone_hash"), table_name="suspect_numbers")
    op.drop_index(op.f("ix_suspect_numbers_uuid"), table_name="suspect_numbers")
    op.drop_index(op.f("ix_suspect_numbers_id"), table_name="suspect_numbers")
    op.drop_table("suspect_numbers")

    op.drop_index(op.f("ix_analyses_risk_level"), table_name="analyses")
    op.drop_index(op.f("ix_analyses_risk_score"), table_name="analyses")
    op.drop_index(op.f("ix_analyses_message_id"), table_name="analyses")
    op.drop_index(op.f("ix_analyses_uuid"), table_name="analyses")
    op.drop_index(op.f("ix_analyses_id"), table_name="analyses")
    op.drop_table("analyses")

    op.drop_index(op.f("ix_messages_created_at"), table_name="messages")
    op.drop_index(op.f("ix_messages_channel"), table_name="messages")
    op.drop_index(op.f("ix_messages_uuid"), table_name="messages")
    op.drop_index(op.f("ix_messages_id"), table_name="messages")
    op.drop_table("messages")
