import asyncio
import os
import json
import redis.asyncio as redis
import sys

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE_TASKS = "osint_to_scan"

async def trigger_scan():
    # Connexion Redis
    print(f"🔌 Connexion à Redis ({REDIS_URL})...")
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
    except Exception as e:
        print(f"❌ Erreur connexion: {e}")
        return

    # Tâche de test (Arnaque connue ou site de test)
    # On utilise example.com pour le test technique, 
    # mais on peut mettre une vraie URL si vous voulez tester le "Stealth".
    task = {
        "id": "test_manual_001",
        "url": "https://example.com", 
        "priority": "high"
    }
    
    # Injection
    await r.rpush(QUEUE_TASKS, json.dumps(task))
    print(f"✅ Tâche injectée dans '{QUEUE_TASKS}' :")
    print(json.dumps(task, indent=2))
    print("\n👉 Vérifiez les logs du worker : docker-compose logs -f scraper")

    await r.aclose()

if __name__ == "__main__":
    asyncio.run(trigger_scan())
