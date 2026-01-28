import asyncio
from datetime import datetime
import hashlib
from typing import Dict, Optional
import os
from playwright.async_api import async_playwright, Page

class OsintScout:
    """
    Moteur de collecte asynchrone pour OSINT-SCOUT.
    Gère la navigation, l'extraction de DOM et la sécurisation de la preuve.
    """

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser = None
        self.playwright = None

    async def start(self):
        """Initialise le moteur Chromium."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=['--disable-blink-features=AutomationControlled'] # Stealth basic
        )

    async def stop(self):
        """Libère les ressources."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def hash_content(self, content: bytes) -> str:
        """Génère une empreinte SHA-256 pour l'intégrité."""
        return hashlib.sha256(content).hexdigest()

    async def scrape_target(self, url: str) -> Dict:
        """
        Exécute la séquence de collecte sur une cible.
        1. Navigation
        2. Extraction Texte
        3. Capture Preuve (Screenshot)
        4. Hachage
        """
        if not self.browser:
            await self.start()

        # Création contexte isolé (Emulation Mobile possible ici)
        context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            # 1. Navigation sécurisée
            print(f"[>] Traitement : {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # 2. Extraction Contenu Brut (pour NLP)
            raw_text = await page.inner_text("body")
            
            # 3. Preuve Forensique
            timestamp = datetime.utcnow().isoformat()
            screenshot_bytes = await page.screenshot(full_page=True)
            proof_hash = await self.hash_content(screenshot_bytes)
            
            # 4. Construction de l'objet de preuve
            evidence_data = {
                "url": url,
                "timestamp_utc": timestamp,
                "content_text": raw_text[:5000], # Limite pour analyse initiale
                "proof_sha256": proof_hash,
                "metadata": {
                    "title": await page.title(),
                    "status": "CAPTURED"
                }
            }
            
            # Sauvegarde locale temporaire (Simule stockage S3/MinIO)
            # Création du dossier preuves si inexistant
            os.makedirs("preuves_temp", exist_ok=True)
            filename = f"preuves_temp/evidence_{proof_hash[:8]}.png"
            with open(filename, "wb") as f:
                f.write(screenshot_bytes)
                
            return evidence_data

        except Exception as e:
            return {
                "url": url,
                "status": "ERROR",
                "error": str(e)
            }
        finally:
            await context.close()

# Point d'entrée pour test unitaire
async def main():
    scout = OsintScout(headless=True)
    try:
        # Test sur une URL sûre pour valider le fonctionnement
        result = await scout.scrape_target("https://example.com") 
        print(f"Extraction terminée. Hash Preuve: {result.get('proof_sha256')}")
        print(f"Métadonnées: {result.get('metadata')}")
    finally:
        await scout.stop()

if __name__ == "__main__":
    asyncio.run(main())
