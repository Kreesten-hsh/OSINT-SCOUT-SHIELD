import asyncio
import json
import os
import sys

# Ajout du dossier parent au path pour les imports si nécessaire
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import redis.asyncio as redis
from runners.engine import OsintScout
from analysis.processor import FraudAnalyzer

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE_TASKS = "osint_to_scan"
QUEUE_RESULTS = "osint_results"

async def process_task(scout, analyzer, task_data):
    target_url = task_data.get("url")
    print(f"\n[Worker] 🛠️  Nouvelle tâche reçue : {target_url}")
    
    # 1. ÉTAPE COLLECTE (Scraper)
    print(f"[Worker] 🕷️  Lancement collecte Playwright...")
    try:
        evidence = await scout.scrape_target(target_url)
    except Exception as e:
        print(f"[Worker] ❌ Erreur critique scraper : {e}")
        return None

    if evidence.get("status") == "ERROR":
        print(f"[Worker] ⚠️  Échec collecte : {evidence.get('error')}")
        return {
            "task_id": task_data.get("id"),
            "status": "FAILED",
            "error": evidence.get("error")
        }

    # 2. ÉTAPE ANALYSE (NLP)
    print(f"[Worker] 🧠  Analyse Sémantique (NLP) en cours...")
    content_text = evidence.get("content_text", "")
    analysis_result = analyzer.analyze_text(content_text)
    
    score = analysis_result["risk_score"]
    is_alert = analysis_result["is_alert"]
    
    print(f"[Worker] 📊  Résultat Analyse : Score {score}/100 | Alerte: {is_alert}")
    if is_alert:
        print(f"[Worker] 🚨  MENACE DÉTECTÉE ! Catégories : {[cat['name'] for cat in analysis_result['categories']]}")

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
    print("[Worker] 🚀 Démarrage du Worker d'Orchestration OSINT...")
    
    # Init Connexions
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
        print(f"[Worker] ✅ Connecté à Redis ({REDIS_URL})")
    except Exception as e:
        print(f"[Worker] ❌ Impossible de se connecter à Redis : {e}")
        return

    # Init Moteurs
    print("[Worker] 🔧 Initialisation Scraper & NLP...")
    scout = OsintScout(headless=True)
    # Le chemin est relatif à la racine /app dans Docker
    analyzer = FraudAnalyzer(rules_path="config/rules.json")
    
    print(f"[Worker] 👂 En attente de tâches sur la file '{QUEUE_TASKS}'...")
    
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
                    print(f"[Worker] 📤 Rapport envoyé vers '{QUEUE_RESULTS}'")
                    
            except json.JSONDecodeError:
                print(f"[Worker] ❌ Erreur décodage JSON : {data_raw}")
            except Exception as e:
                print(f"[Worker] ❌ Erreur Inattendue : {e}")

    except asyncio.CancelledError:
        print("[Worker] Arrêt demandé...")
    finally:
        print("[Worker] Nettoyage ressources...")
        await scout.stop()
        await r.aclose()
        print("[Worker] 👋 Arrêt complet.")

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        pass
