import asyncio
import json

import redis.asyncio as aioredis


async def main() -> None:
    redis_client = aioredis.from_url("redis://localhost:6379", decode_responses=True)

    try:
        await redis_client.delete("osint_to_scan")

        job = {
            "id": "00000000-0000-4000-8000-000000000001",
            "url": "http://localhost:8080/fake-mtn",
            "alert_id": "test-demo-uuid",
            "trigger": "suspicious_url_auto_v3",
            "priority": "HIGH",
            "source_type": "CITIZEN_WEB_PORTAL",
        }
        await redis_client.lpush("osint_to_scan", json.dumps(job))
        print(f"[OK] Job pousse dans osint_to_scan: {job}")

        count = await redis_client.llen("osint_to_scan")
        print(f"[OK] Queue osint_to_scan contient {count} message(s)")

        raw = await redis_client.lindex("osint_to_scan", 0)
        parsed = json.loads(raw)
        assert parsed["url"] == job["url"], "URL incorrecte"
        assert parsed["trigger"] == "suspicious_url_auto_v3", "Trigger incorrect"
        print(f"[OK] Message verifie: {parsed}")
        print("\n[READY] Pipeline forensic pret pour la demo soutenance.")
    finally:
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
