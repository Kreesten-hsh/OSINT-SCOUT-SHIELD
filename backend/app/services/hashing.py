import hashlib
import json

def compute_snapshot_hash(snapshot_dict: dict) -> str:
    """
    Calcule le hash SHA-256 canonique d'un snapshot.
    Garantit l'idempotence et la vérifiabilité.
    """
    # 1. Canonicalisation : Clés triées, séparateurs compacts (pas d'espace)
    # ensure_ascii=True pour éviter tout souci d'encodage hétérogène
    canonical_json = json.dumps(
        snapshot_dict, 
        sort_keys=True, 
        separators=(',', ':'), 
        ensure_ascii=True
    )
    
    # 2. Hashing
    return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()
