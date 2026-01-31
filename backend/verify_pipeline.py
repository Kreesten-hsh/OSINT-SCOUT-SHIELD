import requests
import time
import json

API_URL = "http://localhost:8000/api/v1"

def test_manual_ingestion():
    """
    Simule l'ingestion manuelle depuis le frontend (Lot 2).
    """
    print(f"[TEST] Testing Manual Ingestion on {API_URL}...")
    
    payload = {
        "url": "https://example.com",
        "priority": "HIGH",
        "notes": "Test End-to-End Validation"
    }
    
    try:
        # 1. Login (nécessaire si auth activée, sinon ingestion peut être publique ou tokenless pour test ? 
        # Le prompt dit 'JWT obligatoire'. Je vais utiliser le endpoint login d'abord.
        
        # Login
        login_data = {"username": "admin@osint.com", "password": "admin"}
        # Utilisation de json= pour le endpoint qui attend un Body JSON
        auth_resp = requests.post(f"{API_URL}/auth/login", json=login_data)
        if auth_resp.status_code != 200:
            print(f"[FAIL] Login failed: {auth_resp.text}")
            return
        
        token = auth_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Ingestion
        resp = requests.post(f"{API_URL}/ingestion/manual", json=payload, headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            alert_id = data.get("id")
            print(f"[SUCCESS] Ingestion OK. Alert ID/Task ID: {alert_id}")
            print(f"[INFO] Waiting for worker processing...")
            
            # Polling pour vérifier le résultat
            for _ in range(10):
                time.sleep(2)
                # On vérifie si une alerte a été créée avec cette URL ? 
                # Ou on vérifie le status. L'ingestion retourne une Alerte "PENDING" normalement.
                check_resp = requests.get(f"{API_URL}/alerts/{alert_id}", headers=headers)
                if check_resp.status_code == 200:
                    alert_data = check_resp.json()
                    status = alert_data.get("status")
                    print(f"   -> Status: {status}")
                    if status != "NEW": # NEW signifie juste créé. Si worker passe, ça peut rester NEW ou passer à INVESTIGATING ?
                        # Si le worker enrichit, il ajoute des preuves.
                        pass
                else:
                    print(f"   -> Alert check failed: {check_resp.status_code}")
                    
        else:
            print(f"[FAIL] Ingestion failed: {resp.status_code} - {resp.text}")

    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    test_manual_ingestion()
