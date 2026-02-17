import asyncio
from datetime import datetime, timezone
import hashlib
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright


class OsintScout:
    """Async scraping engine used by the OSINT worker."""

    def __init__(
        self,
        headless: bool = True,
        evidence_root: str = "/app/evidences_store/screenshots",
        navigation_timeout_ms: int = 30_000,
    ):
        self.headless = headless
        self.evidence_root = Path(evidence_root)
        self.navigation_timeout_ms = navigation_timeout_ms
        self.browser = None
        self.playwright = None

    async def start(self) -> None:
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )

    async def stop(self) -> None:
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    @staticmethod
    async def hash_content(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def _utc_now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _persist_screenshot(self, screenshot_bytes: bytes, proof_hash: str) -> str:
        """Persist screenshot in shared evidence storage and return relative path."""
        self.evidence_root.mkdir(parents=True, exist_ok=True)
        filename = f"evidence_{proof_hash[:16]}.png"
        output_path = self.evidence_root / filename
        output_path.write_bytes(screenshot_bytes)
        # Backend expects path relative to /app/evidences_store.
        return f"screenshots/{filename}"

    @staticmethod
    def _classify_error(exc: Exception) -> str:
        error_msg = str(exc).lower()
        if "timeout" in error_msg:
            return "SCRAPE_TIMEOUT"
        if "net::" in error_msg or "navigation" in error_msg:
            return "SCRAPE_NAVIGATION_ERROR"
        return "SCRAPE_RUNTIME_ERROR"

    async def scrape_target(self, url: str) -> dict[str, Any]:
        if not self.browser:
            await self.start()

        context = await self.browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()

        try:
            print(f"[>] Processing target: {url}", flush=True)
            await page.goto(url, wait_until="networkidle", timeout=self.navigation_timeout_ms)
            raw_text = await page.inner_text("body")

            timestamp = self._utc_now_iso()
            screenshot_bytes = await page.screenshot(full_page=True)
            proof_hash = await self.hash_content(screenshot_bytes)
            proof_file_path = self._persist_screenshot(screenshot_bytes, proof_hash)

            return {
                "status": "CAPTURED",
                "url": url,
                "timestamp_utc": timestamp,
                "content_text": raw_text[:5000],
                "proof_sha256": proof_hash,
                "proof_file_path": proof_file_path,
                "metadata": {
                    "title": await page.title(),
                    "status": "CAPTURED",
                },
            }
        except Exception as exc:
            return {
                "status": "ERROR",
                "url": url,
                "timestamp_utc": self._utc_now_iso(),
                "error": str(exc),
                "error_code": self._classify_error(exc),
            }
        finally:
            await context.close()


async def main() -> None:
    scout = OsintScout(headless=True)
    try:
        result = await scout.scrape_target("https://example.com")
        print(f"Scrape completed: status={result.get('status')}", flush=True)
        print(f"Evidence hash: {result.get('proof_sha256')}", flush=True)
        print(f"Metadata: {result.get('metadata')}", flush=True)
    finally:
        await scout.stop()


if __name__ == "__main__":
    asyncio.run(main())
