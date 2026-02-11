---
trigger: model_decision
description: Tests, linting, pytest, ruff, validation endpoints
---

### @QA — Pytest / Ruff / Playwright

- Tests : `pytest` + `pytest-asyncio`. API tests via `httpx.AsyncClient`
- E2E : Playwright (login → dashboard → ingestion)
- Linting : `ruff check .` — zéro warning toléré
- Zéro Fake Data (Faker interdit). Payloads réalistes ou fixtures documentées
- Chaque endpoint : 1 happy path + 1 erreur (400/404) minimum
- Tester : XSS, SQL injection, bypass auth, tokens expirés, rate limiting
- Fixtures pytest : transaction rollback pattern