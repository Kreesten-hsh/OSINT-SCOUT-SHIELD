# Demo Checklist - Sprint 1 (L3)

Date: 2026-02-16  
Objectif: verifier le flux E2E citoyen -> incident -> investigation -> rapport

## 1. Prerequis environnement

- `docker compose up -d --build` lance sans erreur critique
- API accessible: `http://localhost:8000/health`
- Front accessible: `http://localhost:5173`
- Login analyste valide sur `/login`

## 2. Jeu de donnees de demo (minimal)

- Message phishing fort:
  - "URGENT: confirme ton code OTP pour debloquer ton compte MTN Money"
- URL suspecte (optionnelle):
  - `https://example.com/phishing`
- Canal:
  - `WEB_PORTAL` ou `MOBILE_APP`

## 3. Scenario E2E principal

1. Ouvrir `http://localhost:5173/verify`.
2. Saisir message suspect + canal + URL.
3. Cliquer `Verifier`.
4. Confirmer affichage:
   - `risk_score`
   - `risk_level`
   - `explanation`
5. Cliquer `Signaler cet incident`.
6. Confirmer affichage:
   - `alert_uuid`
   - `status=NEW`
   - statut OSINT (`envoye en file` ou `sans URL crawlable`)
7. Se connecter en analyste.
8. Ouvrir `/alerts` et verifier presence de l incident citoyen.
9. Ouvrir detail `/alerts/{uuid}`.
10. Verifier:
    - source citoyenne lisible
    - affichage cible robuste (pas de crash si `citizen://`)
11. Passer en `IN_REVIEW`, ajouter note, confirmer `CONFIRMED`.
12. Generer un rapport PDF depuis la page investigation.
13. Ouvrir `/reports` et verifier le rapport genere.

## 4. Cas de validation rapide

- Verify sans URL:
  - incident cree, `queued_for_osint=false`
- Verify + report avec URL HTTP(S):
  - incident cree, `queued_for_osint=true`
- Payload invalide:
  - API retourne `422` coherent

## 5. Critere "demo ready"

- Flux complet execute en moins de 5 minutes
- Aucune erreur bloquante UI/API
- Rapport PDF genere et telechargeable
- Incident citoyen visible en liste + detail

## 6. Plan B (si scraping externe instable)

- Rejouer le scenario avec message sans URL
- Continuer la demo jusqu au rapport pour prouver:
  - contrat API
  - workflow analyste
  - generation probatoire
