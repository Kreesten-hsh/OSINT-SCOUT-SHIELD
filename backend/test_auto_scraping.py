import requests
import time
import uuid

API_URL = "http://localhost:8000/api/v1"

def test_auto_scraping():
    """
    Validation du Lot 4 : Scraping Automatique.
    """
    print("[TEST] Starting Auto-Scraping Validation...")
    
    # Login
    login_data = {"username": "admin@osint.com", "password": "admin"}
    auth_resp = requests.post(f"{API_URL}/auth/login", json=login_data)
    if auth_resp.status_code != 200:
        print("[FAIL] Login failed")
        return
    token = auth_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Créer une Source Automatique
    source_payload = {
        "name": "Validation Auto Source",
        "url": "https://example.com",
        "source_type": "WEB",
        "frequency_minutes": 1,
        "is_active": True
    }
    
    print("[INFO] Creating Monitoring Source...")
    resp = requests.post(f"{API_URL}/scraping/sources", json=source_payload, headers=headers)
    if resp.status_code != 200:
        print(f"[FAIL] Create Source failed: {resp.text}")
        return
        
    source_id = resp.json()["id"]
    print(f"[SUCCESS] Source Created (ID: {source_id}). Waiting for Scheduler...")
    
    # 2. Attendre que le scheduler déclenche le run (max 70s)
    # Le scheduler tourne toutes les 60s.
    max_wait = 70
    start_time = time.time()
    
    run_found = False
    run_uuid = None
    
    while time.time() - start_time < max_wait:
        # Check Runs
        runs_resp = requests.get(f"{API_URL}/scraping/runs", headers=headers)
        if runs_resp.status_code == 200:
            runs = runs_resp.json()
            # On prend le dernier run (trié par API desc)
            if runs:
                run = runs[0]
                print(f"[INFO] Latest Run: UUID: {run['uuid']} Status: {run['status']}")
                run_uuid = run['uuid']
                run_found = True
                if run["status"] in ["COMPLETED", "FAILED"]:
                    print(f"[SUCCESS] Run Finished with status: {run['status']}")
                    if run["status"] == "COMPLETED":
                         print("[SUCCESS] Validation Automatique COMPLETE.")
                    return
                # Si PENDING ou RUNNING, on continue de poller
        
        if run_found:
             time.sleep(2) # Polling rapide une fois démarré
        else:
            time.sleep(5) # Polling lent en attendant le start
            print(".", end="", flush=True)
            
    if not run_found:
        print("\n[FAIL] Timeout waiting for Scheduler to start run.")
    else:
        print("\n[FAIL] Timeout waiting for Run to complete.")

if __name__ == "__main__":
    test_auto_scraping()
