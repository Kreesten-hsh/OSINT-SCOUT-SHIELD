import sys
# Force flush
sys.stdout.reconfigure(line_buffering=True)

import asyncio
import json
import os

# Ajout du dossier parent au path pour les imports si nécessaire
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
except Exception as e:
    print(f"[Worker] ❌ Import Error: {e}", flush=True)
    sys.exit(1)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE_TASKS = "osint_to_scan"
QUEUE_RESULTS = "osint_results"

async def process_task(scout, analyzer, task_data):
    target_url = task_data.get("url")
    print(f"\n[Worker] 🛠️  Nouvelle tâche reçue : {target_url}", flush=True)
    
    # 1. ÉTAPE COLLECTE (Scraper)
    print(f"[Worker] 🕷️  Lancement collecte Playwright...", flush=True)
    try:
        evidence = await scout.scrape_target(target_url)
    except Exception as e:
        print(f"[Worker] ❌ Erreur critique scraper : {e}", flush=True)
        return None

    if evidence.get("status") == "ERROR":
        print(f"[Worker] ⚠️  Échec collecte : {evidence.get('error')}", flush=True)
        return {
            "task_id": task_data.get("id"),
            "status": "FAILED",
            "error": evidence.get("error")
        }

    # 2. ÉTAPE ANALYSE (AUTOMATISÉE)
    print(f"[Worker] 🧠  Analyse Automatisée (Règles) en cours...", flush=True)
    content_text = evidence.get("content_text", "")
    analysis_result = analyzer.analyze_text(content_text)
    
    score = analysis_result["risk_score"]
    is_alert = analysis_result["is_alert"]
    
    print(f"[Worker] 📊  Résultat Analyse : Score {score}/100 | Alerte: {is_alert}", flush=True)
    if is_alert:
        print(f"[Worker] 🚨  MENACE DÉTECTÉE ! Catégories : {[cat['name'] for cat in analysis_result['categories']]}", flush=True)

    # 3. AGGRÉGATION & RAPPORT
    final_report = {
        "task_id": task_data.get("id"),
        "url": target_url,
        "timestamp": evidence["timestamp_utc"],
        "evidence_hash": evidence["proof_sha256"],
        "risk_score": score,
        "is_alert": is_alert,
        "details": {
            "evidence_metadata": evidence["metadata"],
            "analysis": analysis_result
        }
    }
    
    return final_report

async def run_worker():
    print("[Worker] 🚀 Démarrage du Worker d'Orchestration OSINT...", flush=True)
    
    # Init Connexions
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
        print(f"[Worker] ✅ Connecté à Redis ({REDIS_URL})", flush=True)
    except Exception as e:
        print(f"[Worker] ❌ Impossible de se connecter à Redis : {e}", flush=True)
        return

    # Init Moteurs
    print("[Worker] 🔧 Initialisation Scraper & NLP...", flush=True)
    scout = OsintScout(headless=True)
    # Le chemin est relatif à la racine /app dans Docker
    try:
        analyzer = FraudAnalyzer(rules_path="config/rules.json")
    except Exception as e:
        print(f"[Worker] ❌ Erreur Init Analyzer : {e}", flush=True)
        return
    
    print(f"[Worker] 👂 En attente de tâches sur la file '{QUEUE_TASKS}'...", flush=True)
    
    try:
        while True:
            # Récupération bloquante (timeout 1s pour permettre le CTRL+C)
            item = await r.blpop(QUEUE_TASKS, timeout=1)
            
            if not item:
                continue
                
            # blpop retourne (nom_queue, valeur)
            _, data_raw = item
            
            try:
                task_data = json.loads(data_raw)
                report = await process_task(scout, analyzer, task_data)
                
                if report:
                    # Envoi du résultat dans la file correspondante
                    # Dans un système réel, l'API consommerait cette file
                    await r.rpush(QUEUE_RESULTS, json.dumps(report))
                    print(f"[Worker] 📤 Rapport envoyé vers '{QUEUE_RESULTS}'", flush=True)
                    
            except json.JSONDecodeError:
                print(f"[Worker] ❌ Erreur décodage JSON : {data_raw}", flush=True)
            except Exception as e:
                print(f"[Worker] ❌ Erreur Inattendue : {e}", flush=True)

    except asyncio.CancelledError:
        print("[Worker] Arrêt demandé...", flush=True)
    finally:
        print("[Worker] Nettoyage ressources...", flush=True)
        await scout.stop()
        await r.aclose()
        print("[Worker] 👋 Arrêt complet.", flush=True)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        pass
