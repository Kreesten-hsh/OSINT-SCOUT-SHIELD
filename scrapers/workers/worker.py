import sys

# Force immediate flush in Docker logs.
sys.stdout.reconfigure(line_buffering=True)

import asyncio
from datetime import datetime, timezone
import json
import os
from urllib.parse import urlparse
import uuid

# Allow imports when launched as python workers/worker.py.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("[Worker] STARTING...", flush=True)

try:
    print("[Worker] Importing Redis...", flush=True)
    import redis.asyncio as redis

    print("[Worker] Importing Scraper Engine...", flush=True)
    from runners.engine import OsintScout

    print("[Worker] Importing Fraud Analyzer...", flush=True)
    from analysis.processor import FraudAnalyzer

    print("[Worker] Imports OK.", flush=True)
except Exception as exc:
    print(f"[Worker] Import error: {exc}", flush=True)
    sys.exit(1)


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE_TASKS = "osint_to_scan"
QUEUE_RESULTS = "osint_results"
SCRAPE_TIMEOUT_SECONDS = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "45"))
RECONNECT_DELAY_SECONDS = float(os.getenv("WORKER_RECONNECT_DELAY_SECONDS", "2"))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_valid_http_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def validate_task_payload(task_data: dict) -> tuple[bool, str, str]:
    if not isinstance(task_data, dict):
        return False, "Payload must be an object", "INVALID_PAYLOAD"

    task_id = task_data.get("id")
    if not task_id:
        return False, "Missing id", "MISSING_TASK_ID"

    try:
        uuid.UUID(str(task_id))
    except ValueError:
        return False, "id must be a valid UUID", "INVALID_TASK_ID"

    raw_url = str(task_data.get("url", "")).strip()
    if not raw_url:
        return False, "Missing url", "MISSING_URL"

    if not is_valid_http_url(raw_url):
        return False, "url must be a valid http(s) URL", "INVALID_URL"

    return True, "", ""


def build_failed_report(
    task_data: dict,
    error: str,
    error_code: str,
    evidence: dict | None = None,
) -> dict:
    report = {
        "task_id": str(task_data.get("id", "")),
        "url": str(task_data.get("url", "")),
        "source_type": str(task_data.get("source_type", "AUTOMATIC_SCRAPING")),
        "timestamp": utc_now_iso(),
        "status": "FAILED",
        "risk_score": 0,
        "is_alert": False,
        "error": error,
        "error_code": error_code,
        "details": {
            "analysis": {},
            "evidence_metadata": {},
        },
    }

    if evidence:
        report["timestamp"] = evidence.get("timestamp_utc") or report["timestamp"]
        report["evidence_hash"] = evidence.get("proof_sha256")
        report["evidence_file_path"] = evidence.get("proof_file_path")
        report["details"]["evidence_metadata"] = evidence.get("metadata", {})

    return report


async def process_task(scout: OsintScout, analyzer: FraudAnalyzer, task_data: dict) -> dict:
    is_valid, error_msg, error_code = validate_task_payload(task_data)
    if not is_valid:
        print(f"[Worker] Invalid task payload: {error_msg}", flush=True)
        return build_failed_report(task_data, error_msg, error_code)

    target_url = str(task_data.get("url", "")).strip()
    print(f"[Worker] Processing task: {target_url}", flush=True)

    try:
        evidence = await asyncio.wait_for(
            scout.scrape_target(target_url),
            timeout=SCRAPE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        print(f"[Worker] Scrape timeout for: {target_url}", flush=True)
        return build_failed_report(
            task_data,
            f"Scrape timed out after {SCRAPE_TIMEOUT_SECONDS}s",
            "SCRAPE_TIMEOUT",
        )
    except Exception as exc:
        print(f"[Worker] Scraper runtime failure: {exc}", flush=True)
        return build_failed_report(task_data, str(exc), "SCRAPER_EXCEPTION")

    if evidence.get("status") == "ERROR":
        return build_failed_report(
            task_data,
            str(evidence.get("error", "Unknown scrape failure")),
            str(evidence.get("error_code", "SCRAPE_ERROR")),
            evidence=evidence,
        )

    content_text = str(evidence.get("content_text", ""))
    try:
        analysis_result = analyzer.analyze_text(content_text)
    except Exception as exc:
        print(f"[Worker] Analyzer failure: {exc}", flush=True)
        return build_failed_report(
            task_data,
            f"Analysis failed: {exc}",
            "ANALYSIS_EXCEPTION",
            evidence=evidence,
        )

    score = int(analysis_result.get("risk_score", 0))
    is_alert = bool(analysis_result.get("is_alert", False))

    print(f"[Worker] Analysis result: score={score}/100 alert={is_alert}", flush=True)

    return {
        "task_id": str(task_data.get("id")),
        "url": target_url,
        "source_type": str(task_data.get("source_type", "AUTOMATIC_SCRAPING")),
        "timestamp": evidence.get("timestamp_utc"),
        "status": "COMPLETED",
        "evidence_hash": evidence.get("proof_sha256"),
        "evidence_file_path": evidence.get("proof_file_path"),
        "risk_score": max(0, min(score, 100)),
        "is_alert": is_alert,
        "details": {
            "evidence_metadata": evidence.get("metadata", {}),
            "analysis": analysis_result,
        },
    }


async def run_worker() -> None:
    print("[Worker] Starting OSINT orchestration worker...", flush=True)

    redis_client = None
    scout = OsintScout(headless=True)

    print("[Worker] Initializing analyzer...", flush=True)
    try:
        analyzer = FraudAnalyzer(rules_path="config/rules.json")
    except Exception as exc:
        print(f"[Worker] Analyzer init failure: {exc}", flush=True)
        return

    print(f"[Worker] Waiting for tasks on '{QUEUE_TASKS}'...", flush=True)

    try:
        while True:
            try:
                if redis_client is None:
                    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
                    await redis_client.ping()
                    print(f"[Worker] Connected to Redis ({REDIS_URL})", flush=True)

                item = await redis_client.blpop(QUEUE_TASKS, timeout=1)
                if not item:
                    continue

                _, data_raw = item
                try:
                    task_data = json.loads(data_raw)
                except json.JSONDecodeError:
                    print(f"[Worker] Invalid JSON payload dropped: {data_raw}", flush=True)
                    continue

                report = await process_task(scout, analyzer, task_data)

                if report.get("task_id"):
                    await redis_client.rpush(QUEUE_RESULTS, json.dumps(report))
                    print(
                        f"[Worker] Report queued: status={report.get('status')} task_id={report.get('task_id')}",
                        flush=True,
                    )
                else:
                    print("[Worker] Report dropped: missing task_id", flush=True)

            except asyncio.CancelledError:
                raise
            except Exception as exc:
                print(f"[Worker] Loop error (will reconnect): {exc}", flush=True)
                if redis_client is not None:
                    try:
                        await redis_client.aclose()
                    except Exception:
                        pass
                    redis_client = None
                await asyncio.sleep(RECONNECT_DELAY_SECONDS)

    except asyncio.CancelledError:
        print("[Worker] Shutdown requested...", flush=True)
    finally:
        print("[Worker] Cleaning up resources...", flush=True)
        try:
            await scout.stop()
        except Exception as exc:
            print(f"[Worker] Error while stopping scout: {exc}", flush=True)

        if redis_client is not None:
            try:
                await redis_client.aclose()
            except Exception:
                pass

        print("[Worker] Worker stopped.", flush=True)


if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        pass
