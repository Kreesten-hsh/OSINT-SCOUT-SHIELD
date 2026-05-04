import os
import random
import re
import sys
import time
from collections import Counter
from pathlib import Path

import httpx
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

BASE_URL = os.getenv("API_URL", "http://localhost:8000").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL") or os.getenv("AUTH_ADMIN_EMAIL") or ""
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD") or os.getenv("AUTH_ADMIN_PASSWORD") or ""
SME_EMAIL = os.getenv("SME_EMAIL") or os.getenv("AUTH_SME_EMAIL") or ""
SME_PASSWORD = os.getenv("SME_PASSWORD") or os.getenv("AUTH_SME_PASSWORD") or ""

MESSAGES_MTN_FRAUD = [
    "URGENT MTN: Transfert errone de 45.000 FCFA detecte. "
    "Renvoyez le code 7829 au 66441122 sous 30 minutes. "
    "Sinon votre compte sera bloque. Agent MTN Benin.",
    "Alerte MoMo: Votre compte risque d'etre desactive. "
    "Confirmez votre identite en envoyant votre code PIN au 97332211. "
    "Service Client Moov Money.",
    "MTN vous informe: un credit de 75.000 FCFA a ete envoye "
    "par erreur sur votre compte. Pour le retourner appelez "
    "le 66009988 immediatement. Merci.",
]

MESSAGES_FAKE_RECRUITMENT = [
    "Felicitations! Vous etes selectionne pour un poste a Dubai. "
    "Envoyez 75.000 FCFA de frais de visa au 96112233 MoMo. "
    "Repondez au +22966112233 sur WhatsApp.",
    "Recrutement urgent Canada: 10 postes disponibles. "
    "Frais de dossier 50.000 FCFA a envoyer au 97445566. "
    "Agence BONNE CHANCE Emploi. CV requis.",
]

MESSAGES_FAKE_LOTTERY = [
    "Vous avez gagne un Samsung Galaxy S24 dans notre tirage! "
    "Frais de livraison: 25.000 FCFA a envoyer au 66778899 MTN. "
    "Reclamez dans 24h.",
    "LUCKY WINNER: iPhone 15 Pro vous attend. "
    "Envoyez 15.000 FCFA frais de traitement au 96334455. "
    "Offre valable 48h seulement.",
]

MESSAGES_PHISHING = [
    "Votre compte UBA a ete suspendu pour activite suspecte. "
    "Verifiez vos informations sur http://uba-benin-secure.xyz "
    "dans les 2 heures. Service Securite UBA.",
    "BOA Benin: Mise a jour obligatoire de vos identifiants bancaires. "
    "Cliquez sur http://boa-update-benin.tk pour eviter le blocage.",
]

MESSAGES_FAUX_DON = [
    "Programme UNICEF Benin: vous etes selectionne comme beneficiaire "
    "d'une aide de 150.000 FCFA. Frais d'inscription 10.000 FCFA "
    "au 97556677. Fondation Solidarite.",
]

MESSAGES_INNOCENTS = [
    "Bonjour, votre colis est disponible au bureau de poste. "
    "Merci de vous presenter avec une piece d'identite.",
]

INCIDENTS_CONFIG = [
    ("Atlantique", MESSAGES_MTN_FRAUD, 5),
    ("Atlantique", MESSAGES_FAKE_RECRUITMENT, 2),
    ("Atlantique", MESSAGES_PHISHING, 2),
    ("Atlantique", MESSAGES_FAKE_LOTTERY, 2),
    ("Borgou", MESSAGES_MTN_FRAUD, 3),
    ("Borgou", MESSAGES_FAKE_RECRUITMENT, 1),
    ("Oueme", MESSAGES_MTN_FRAUD, 3),
    ("Oueme", MESSAGES_PHISHING, 2),
    ("Zou", MESSAGES_MTN_FRAUD, 2),
    ("Zou", MESSAGES_FAKE_LOTTERY, 1),
    ("Mono", MESSAGES_MTN_FRAUD, 2),
    ("Couffo", MESSAGES_FAUX_DON, 1),
    ("Atacora", MESSAGES_MTN_FRAUD, 1),
    ("Donga", MESSAGES_FAKE_RECRUITMENT, 1),
    ("Collines", MESSAGES_FAUX_DON, 1),
    ("Littoral", MESSAGES_MTN_FRAUD, 1),
]

PHONES_BY_REGION = {
    "Atlantique": ["0169647090", "0662334455", "0961122334"],
    "Borgou": ["0297441122", "0291234567"],
    "Oueme": ["0956778899", "0952233445"],
    "Zou": ["0478996611", "0471234567"],
    "Mono": ["0578001122"],
    "Couffo": ["0678112233"],
    "Atacora": ["0778223344"],
    "Donga": ["0890011223"],
    "Collines": ["0978334455"],
    "Littoral": ["0612233445"],
}

CHANNELS = ["WEB_PORTAL", "MOBILE_APP"]
URL_PATTERN = re.compile(r"https?://[^\s]+", re.IGNORECASE)
PME_DEPARTMENTS = ["Littoral", "Atlantique", "Oueme", "Borgou", "Mono", "Zou"]


def _require_admin_credentials() -> None:
    if ADMIN_EMAIL and ADMIN_PASSWORD:
        return
    print("ERROR: define ADMIN_EMAIL/ADMIN_PASSWORD or AUTH_ADMIN_EMAIL/AUTH_ADMIN_PASSWORD in the environment.")
    sys.exit(1)


def _extract_url(message: str) -> str | None:
    match = URL_PATTERN.search(message)
    return match.group(0) if match else None


def _login_with_credentials(client: httpx.Client, email: str, password: str, *, label: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": email, "password": password},
    )
    if response.status_code != 200:
        print(f"ERROR: {label} login failed ({response.status_code}): {response.text}")
        sys.exit(1)

    token = response.json().get("access_token")
    if not token:
        print("ERROR: access_token missing from login response.")
        sys.exit(1)

    print(f"OK: authenticated as {email}")
    return {"Authorization": f"Bearer {token}"}


def _login(client: httpx.Client) -> dict[str, str]:
    return _login_with_credentials(client, ADMIN_EMAIL, ADMIN_PASSWORD, label="admin")


def _submit_incident(
    client: httpx.Client,
    phone: str,
    message: str,
    channel: str,
    department: str | None = None,
) -> str | None:
    payload = {
        "message": message,
        "phone": phone,
        "channel": channel,
        "url": _extract_url(message),
        "department": department,
    }
    response = client.post("/api/v1/incidents/report", json=payload, timeout=10.0)
    if response.status_code not in (200, 201):
        print(f"  WARN report failed ({response.status_code}): {response.text[:120]}")
        return None

    data = response.json().get("data") or {}
    alert_uuid = data.get("alert_uuid")
    if not alert_uuid:
        print("  WARN report succeeded but alert_uuid missing.")
        return None

    return str(alert_uuid)


def _confirm_incident(
    client: httpx.Client,
    headers: dict[str, str],
    alert_uuid: str,
) -> bool:
    response = client.patch(
        f"/api/v1/incidents/{alert_uuid}/decision",
        json={
            "decision": "CONFIRM",
            "comment": "Validation SOC demo soutenance.",
            "decided_by": ADMIN_EMAIL,
        },
        headers=headers,
        timeout=10.0,
    )
    return response.status_code in (200, 201, 204)


def _dispatch_shield(
    client: httpx.Client,
    headers: dict[str, str],
    alert_uuid: str,
) -> bool:
    response = client.post(
        "/api/v1/shield/actions/dispatch",
        json={
            "incident_id": alert_uuid,
            "action_type": "BLOCK_NUMBER",
            "reason": "Demonstration U7 soutenance.",
            "requested_by": ADMIN_EMAIL,
            "auto_callback": True,
        },
        headers=headers,
        timeout=10.0,
    )
    return response.status_code in (200, 201)


def _build_pme_messages(official_name: str) -> list[str]:
    return [
        f"{official_name} support : remboursement en attente. Envoyez maintenant votre code OTP pour confirmer votre dossier.",
        f"Service client {official_name} : votre paiement est bloque. Cliquez sur http://{official_name.lower().replace(' ', '-')}-support-bj.help pour revalider votre compte.",
        f"{official_name} promo : vous avez gagne un bon d achat. Frais de retrait 15.000 FCFA au 0161122334 avant expiration.",
        f"{official_name} assistance : votre wallet professionnel sera suspendu ce soir. Confirmez votre PIN sur http://{official_name.lower().replace(' ', '-')}-secure-pay.help.",
        f"Bonjour, ici {official_name}. Un remboursement urgent est disponible. Repondez avec votre code de validation pour finaliser.",
        f"{official_name} commercial : dossier client incomplet. Transmettez le code secret recu par SMS pour debloquer l operation.",
    ]


def _seed_demo_pme_profile(client: httpx.Client) -> tuple[dict[str, str], str]:
    if not SME_EMAIL or not SME_PASSWORD:
        print("WARN: SME credentials missing, PME demo data skipped.")
        return {}, "PME Benin"

    headers = _login_with_credentials(client, SME_EMAIL, SME_PASSWORD, label="sme")
    response = client.get("/api/v1/pme/profile", headers=headers, timeout=10.0)
    if response.status_code != 200:
        print(f"WARN: unable to read PME profile ({response.status_code}): {response.text[:160]}")
        return headers, "PME Benin"

    profile = response.json().get("data") or {}
    official_name = str(profile.get("official_name") or "PME Benin").strip() or "PME Benin"
    legit_numbers = list(dict.fromkeys([*(profile.get("legit_numbers") or []), "0161122334", "0199001122"]))
    keywords = list(
        dict.fromkeys(
            [
                *(profile.get("keywords") or []),
                official_name,
                f"support {official_name}",
                f"service client {official_name}",
                "remboursement urgent",
                "paiement bloque",
            ]
        )
    )
    patch_response = client.patch(
        "/api/v1/pme/profile",
        json={
            "official_name": official_name,
            "keywords": keywords,
            "legit_numbers": legit_numbers,
        },
        headers=headers,
        timeout=10.0,
    )
    if patch_response.status_code not in (200, 201):
        print(f"WARN: unable to update PME profile ({patch_response.status_code}): {patch_response.text[:160]}")
    else:
        print(f"OK: PME profile prepared for demo -> {official_name}")
    return headers, official_name


def main() -> None:
    print("BENIN CYBER SHIELD - seed demo")
    print(f"API: {BASE_URL}")
    _require_admin_credentials()

    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        try:
            health = client.get("/health", timeout=5.0)
        except Exception as exc:
            print(f"ERROR: unable to reach API: {exc}")
            sys.exit(1)

        if health.status_code != 200:
            print(f"ERROR: health check failed ({health.status_code}): {health.text}")
            sys.exit(1)

        print("OK: API operational")
        headers = _login(client)

        created_records: list[tuple[str, str]] = []
        created = 0

        for region, messages, count in INCIDENTS_CONFIG:
            phones = PHONES_BY_REGION.get(region, ["0190000000"])
            for _ in range(count):
                message = random.choice(messages)
                phone = random.choice(phones)
                channel = random.choice(CHANNELS)
                alert_uuid = _submit_incident(
                    client,
                    phone=phone,
                    message=message,
                    channel=channel,
                    department=region,
                )
                if alert_uuid:
                    created += 1
                    created_records.append((alert_uuid, region))
                    print(f"  OK [{region}] {phone[:6]}... -> {alert_uuid[:8]}")
                else:
                    print(f"  WARN [{region}] incident not created for {phone[:6]}...")
                time.sleep(0.3)

        print(f"\nOK: {created}/30 incidents created")

        confirmed = 0
        dispatched = 0
        confirm_candidates = created_records[: int(len(created_records) * 0.35)]
        for alert_uuid, _region in confirm_candidates:
            if _confirm_incident(client, headers, alert_uuid):
                confirmed += 1

        dispatch_candidates = confirm_candidates[: max(1, len(confirm_candidates) // 2)] if confirm_candidates else []
        for alert_uuid, _region in dispatch_candidates:
            if _dispatch_shield(client, headers, alert_uuid):
                dispatched += 1

        print(f"OK: {confirmed} incidents confirmed by SOC")
        print(f"OK: {dispatched} incidents dispatched to SHIELD")

        _sme_headers, official_name = _seed_demo_pme_profile(client)
        pme_created = 0
        for index, department in enumerate(PME_DEPARTMENTS):
            message = random.choice(_build_pme_messages(official_name))
            phone = PHONES_BY_REGION.get(department, ["0161122334"])[0]
            channel = CHANNELS[index % len(CHANNELS)]
            alert_uuid = _submit_incident(
                client,
                phone=phone,
                message=message,
                channel=channel,
                department=department,
            )
            if not alert_uuid:
                continue
            pme_created += 1
            created_records.append((alert_uuid, department))
            print(f"  OK [PME {department}] {official_name} -> {alert_uuid[:8]}")
            time.sleep(0.2)

        print(f"OK: {pme_created} incidents d usurpation PME created")

        by_region = Counter(region for _, region in created_records)
        print("\nDistribution by department:")
        for region, count in sorted(by_region.items()):
            print(f"  {region:12} : {count}")

        print("\nSeed complete. Demo dataset ready.")


if __name__ == "__main__":
    main()
