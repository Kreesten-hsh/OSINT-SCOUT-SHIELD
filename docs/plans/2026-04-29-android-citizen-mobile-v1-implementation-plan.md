# Android Citizen Mobile V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Flutter Android citizen app that mirrors the validated Stitch flow and extends the FastAPI backend to support mobile verification history without accounts.

**Architecture:** Keep the mobile app as a thin client over the existing BENIN CYBER SHIELD API, with all scoring and reporting logic remaining server-side. Extend the memory domain so mobile verifications persist as first-class records linked to a `device_install_id`, then expose a dedicated mobile bootstrap/history API for the Flutter client.

**Tech Stack:** Flutter, Riverpod, GoRouter, Dio, Freezed, Json Serializable, FastAPI, SQLAlchemy, Alembic, Pytest

---

### Task 1: Extend the memory domain for mobile-owned verification history

**Files:**
- Create: `backend/alembic/versions/2026_04_29_add_mobile_history_to_messages.py`
- Modify: `backend/app/models/memory_domain.py`
- Modify: `backend/app/schemas/signal.py`
- Test: `backend/tests/test_mobile_history_contracts.py`

- [ ] **Step 1: Write the failing test**

```python
from app.models import CitizenMessage


def test_mobile_verify_payload_requires_reusable_history_fields(client):
    response = client.post(
        "/api/v1/analysis/verify",
        json={
            "message": "Agent MTN renvoyez le code 4455",
            "phone": "0169647090",
            "channel": "MOBILE_APP",
            "department": "Atlantique",
            "device_install_id": "dev-test-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert "verification_message_uuid" in payload
    assert "verification_analysis_uuid" in payload
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py -k reusable_history_fields`

Expected: FAIL because `device_install_id` and verification identifiers do not yet exist in the schema/response.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/models/memory_domain.py
class CitizenMessage(Base):
    __tablename__ = "messages"

    # ...
    device_install_id = Column(String(128), nullable=True, index=True)
    history_entry_type = Column(String(16), nullable=False, default="VERIFY", index=True)


# backend/app/schemas/signal.py
class VerifySignalRequest(BaseModel):
    # ...
    device_install_id: str | None = Field(default=None, max_length=128)


class VerifySignalData(BaseModel):
    # ...
    verification_message_uuid: UUID4 | None = None
    verification_analysis_uuid: UUID4 | None = None
```

- [ ] **Step 4: Add the Alembic migration**

```python
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column("messages", sa.Column("device_install_id", sa.String(length=128), nullable=True))
    op.add_column(
        "messages",
        sa.Column("history_entry_type", sa.String(length=16), nullable=False, server_default="VERIFY"),
    )
    op.create_index("ix_messages_device_install_id", "messages", ["device_install_id"], unique=False)
    op.create_index("ix_messages_history_entry_type", "messages", ["history_entry_type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_messages_history_entry_type", table_name="messages")
    op.drop_index("ix_messages_device_install_id", table_name="messages")
    op.drop_column("messages", "history_entry_type")
    op.drop_column("messages", "device_install_id")
```

- [ ] **Step 5: Run the test and migration checks**

Run: `docker.exe compose exec -T api alembic upgrade head`

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py -k reusable_history_fields`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/2026_04_29_add_mobile_history_to_messages.py backend/app/models/memory_domain.py backend/app/schemas/signal.py backend/tests/test_mobile_history_contracts.py
git commit -m "feat: add mobile verification history fields"
```

### Task 2: Persist mobile verifications and reuse them during reporting

**Files:**
- Modify: `backend/app/services/citizen_flow.py`
- Modify: `backend/app/schemas/signal.py`
- Modify: `backend/app/api/v1/endpoints/signalements.py`
- Test: `backend/tests/test_mobile_history_contracts.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_mobile_verify_persists_message_and_analysis(db_session):
    payload = VerifySignalRequest(
        message="Agent Moov transfert erroné renvoyez le code",
        phone="0169647090",
        channel="MOBILE_APP",
        department="Littoral",
        device_install_id="device-001",
    )

    result = asyncio.run(verify_citizen_signal(payload, db_session))

    assert result.verification_message_uuid is not None
    assert result.verification_analysis_uuid is not None


def test_mobile_report_reuses_existing_verification(client):
    verify_response = client.post(
        "/api/v1/analysis/verify",
        json={
            "message": "Code secret MTN urgence",
            "phone": "0169647090",
            "channel": "MOBILE_APP",
            "device_install_id": "device-002",
        },
    )

    verify_payload = verify_response.json()["data"]
    report_response = client.post(
        "/api/v1/signalements/",
        json={
            "message": "Code secret MTN urgence",
            "phone": "0169647090",
            "channel": "MOBILE_APP",
            "device_install_id": "device-002",
            "verification_message_uuid": verify_payload["verification_message_uuid"],
            "verification_analysis_uuid": verify_payload["verification_analysis_uuid"],
        },
    )

    assert report_response.status_code == 200
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py -k "persists_message_and_analysis or reuses_existing_verification"`

Expected: FAIL because mobile verification persistence and reuse are not implemented.

- [ ] **Step 3: Update service logic**

```python
async def verify_citizen_signal(request: VerifySignalRequest, db: AsyncSession) -> VerifySignalData:
    # ...
    verification_message_uuid: UUID | None = None
    verification_analysis_uuid: UUID | None = None

    if request.channel == "MOBILE_APP" and request.device_install_id:
        message = CitizenMessage(
            content=request.message.strip(),
            channel=request.channel,
            department=resolved_department,
            department_source=department_source,
            submitted_url=(request.url or "").strip() or None,
            device_install_id=request.device_install_id,
            history_entry_type="VERIFY",
        )
        db.add(message)
        await db.flush()

        analysis = MessageAnalysis(
            message_id=message.id,
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            primary_category=_primary_category(result.get("categories_detected", [])),
            matched_rules=result.get("matched_rules", []),
            categories_detected=result.get("categories_detected", []),
            explanation=result.get("explanation", []),
            recommendations=result.get("recommendations", []),
            highlighted_spans=result.get("highlighted_spans", []),
            fon_alert=result.get("fon_alert"),
        )
        db.add(analysis)
        await db.commit()
        verification_message_uuid = message.uuid
        verification_analysis_uuid = analysis.uuid
```

- [ ] **Step 4: Update report request handling**

```python
class IncidentReportRequest(BaseModel):
    # ...
    device_install_id: str | None = Field(default=None, max_length=128)
    verification_message_uuid: UUID4 | None = None
    verification_analysis_uuid: UUID4 | None = None
```

```python
async def create_citizen_report(...):
    existing_message = await _load_mobile_message_if_owned(
        db=db,
        message_uuid=request.verification_message_uuid,
        analysis_uuid=request.verification_analysis_uuid,
        device_install_id=request.device_install_id,
    )
    if existing_message:
        message = existing_message
        analysis = message.analysis
        message.history_entry_type = "REPORT"
    else:
        # existing report creation flow
```

- [ ] **Step 5: Run the tests**

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py -k "persists_message_and_analysis or reuses_existing_verification"`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/citizen_flow.py backend/app/schemas/signal.py backend/app/api/v1/endpoints/signalements.py backend/tests/test_mobile_history_contracts.py
git commit -m "feat: persist and reuse mobile verifications"
```

### Task 3: Add mobile bootstrap and history endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/mobile.py`
- Create: `backend/app/schemas/mobile.py`
- Create: `backend/app/services/mobile_history.py`
- Modify: `backend/app/api/v1/api.py`
- Test: `backend/tests/test_mobile_history_contracts.py`

- [ ] **Step 1: Write the failing contract tests**

```python
def test_mobile_bootstrap_returns_departments(client):
    response = client.get("/api/v1/mobile/bootstrap")
    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["departments"]
    assert "Atlantique" in payload["departments"]


def test_mobile_history_returns_verify_and_report_entries(client):
    response = client.get("/api/v1/mobile/history", params={"device_install_id": "device-002"})
    assert response.status_code == 200
    payload = response.json()["data"]
    assert isinstance(payload["items"], list)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py -k "bootstrap or mobile_history"`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Add response schemas**

```python
class MobileBootstrapData(BaseModel):
    departments: list[str]
    minimum_supported_version: str


class MobileHistoryItem(BaseModel):
    type: Literal["VERIFY", "REPORT"]
    created_at: datetime
    risk_score: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    primary_category: str | None = None
    masked_phone: str
    public_reference: str | None = None
    status: str | None = None


class MobileHistoryData(BaseModel):
    items: list[MobileHistoryItem]
```

- [ ] **Step 4: Implement the service and routes**

```python
@router.get("/bootstrap", response_model=APIResponse[MobileBootstrapData])
async def get_mobile_bootstrap():
    return APIResponse(
        success=True,
        message="Bootstrap mobile charge.",
        data=MobileBootstrapData(
            departments=BENIN_DEPARTMENTS,
            minimum_supported_version="1.0.0",
        ),
    )


@router.get("/history", response_model=APIResponse[MobileHistoryData])
async def get_mobile_history(device_install_id: str, db: AsyncSession = Depends(get_db)):
    data = await fetch_mobile_history(device_install_id=device_install_id, db=db)
    return APIResponse(success=True, message="Historique mobile charge.", data=data)
```

- [ ] **Step 5: Run the tests**

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py -k "bootstrap or mobile_history"`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/mobile.py backend/app/schemas/mobile.py backend/app/services/mobile_history.py backend/app/api/v1/api.py backend/tests/test_mobile_history_contracts.py
git commit -m "feat: add mobile bootstrap and history endpoints"
```

### Task 4: Scaffold the Flutter Android app shell

**Files:**
- Create: `mobile/pubspec.yaml`
- Create: `mobile/lib/main.dart`
- Create: `mobile/lib/app/app.dart`
- Create: `mobile/lib/app/router.dart`
- Create: `mobile/lib/core/theme/app_theme.dart`
- Create: `mobile/analysis_options.yaml`
- Create: `mobile/test/smoke_test.dart`

- [ ] **Step 1: Write the failing smoke test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';

void main() {
  testWidgets('boots app shell', (tester) async {
    await tester.pumpWidget(const BeninCyberShieldApp());
    expect(find.text('BENIN CYBER SHIELD'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test mobile/test/smoke_test.dart`

Expected: FAIL because the Flutter app does not exist yet.

- [ ] **Step 3: Create the project shell**

```yaml
# mobile/pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.1
  go_router: ^14.8.1
  dio: ^5.8.0+1
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0
  flutter_secure_storage: ^9.2.2
  shared_preferences: ^2.5.3
  image_picker: ^1.1.2
  share_plus: ^10.1.4
  intl: ^0.20.2
```

```dart
void main() {
  runApp(const ProviderScope(child: BeninCyberShieldApp()));
}
```

- [ ] **Step 4: Run the smoke test**

Run: `flutter test mobile/test/smoke_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/pubspec.yaml mobile/lib/main.dart mobile/lib/app/app.dart mobile/lib/app/router.dart mobile/lib/core/theme/app_theme.dart mobile/analysis_options.yaml mobile/test/smoke_test.dart
git commit -m "feat: scaffold flutter android citizen app"
```

### Task 5: Implement Stitch-aligned shell, splash, onboarding, and tab navigation

**Files:**
- Create: `mobile/lib/presentation/splash/splash_page.dart`
- Create: `mobile/lib/presentation/onboarding/onboarding_page.dart`
- Create: `mobile/lib/presentation/navigation/root_shell.dart`
- Create: `mobile/lib/presentation/shared/hero_panel.dart`
- Modify: `mobile/lib/app/router.dart`
- Test: `mobile/test/navigation_test.dart`

- [ ] **Step 1: Write the failing widget tests**

```dart
testWidgets('shows onboarding on first launch', (tester) async {
  await tester.pumpWidget(const BeninCyberShieldApp());
  await tester.pumpAndSettle();
  expect(find.text('Verifier un message suspect'), findsOneWidget);
});

testWidgets('shows bottom navigation tabs', (tester) async {
  await tester.pumpWidget(const BeninCyberShieldApp());
  await tester.pumpAndSettle();
  expect(find.text('Verifier'), findsOneWidget);
  expect(find.text('Historique'), findsOneWidget);
  expect(find.text('A propos'), findsOneWidget);
  expect(find.text('Parametres'), findsOneWidget);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `flutter test mobile/test/navigation_test.dart`

Expected: FAIL because the pages and router paths do not exist.

- [ ] **Step 3: Implement the shell**

```dart
final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => const SplashPage()),
    GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingPage()),
    StatefulShellRoute.indexedStack(
      builder: (_, __, navigationShell) => RootShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [GoRoute(path: '/verify', builder: (_, __) => const VerifyPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/history', builder: (_, __) => const HistoryPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/about', builder: (_, __) => const AboutPage())]),
        StatefulShellBranch(routes: [GoRoute(path: '/settings', builder: (_, __) => const SettingsPage())]),
      ],
    ),
  ],
);
```

- [ ] **Step 4: Run the tests**

Run: `flutter test mobile/test/navigation_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/presentation/splash/splash_page.dart mobile/lib/presentation/onboarding/onboarding_page.dart mobile/lib/presentation/navigation/root_shell.dart mobile/lib/presentation/shared/hero_panel.dart mobile/lib/app/router.dart mobile/test/navigation_test.dart
git commit -m "feat: add stitch-aligned mobile shell and onboarding"
```

### Task 6: Implement verify flow, loading state, and result screens

**Files:**
- Create: `mobile/lib/data/api/mobile_api_client.dart`
- Create: `mobile/lib/application/verify/verify_controller.dart`
- Create: `mobile/lib/presentation/verify/verify_page.dart`
- Create: `mobile/lib/presentation/verify/loading_page.dart`
- Create: `mobile/lib/presentation/verify/result_page.dart`
- Test: `mobile/test/verify_flow_test.dart`

- [ ] **Step 1: Write the failing tests**

```dart
testWidgets('submits verify form and renders result', (tester) async {
  await tester.pumpWidget(const BeninCyberShieldApp());
  await tester.pumpAndSettle();

  await tester.enterText(find.byKey(const Key('message-input')), 'Agent MTN renvoyez le code');
  await tester.enterText(find.byKey(const Key('phone-input')), '0169647090');
  await tester.tap(find.text('Verifier'));
  await tester.pump();

  expect(find.text('Analyse en cours...'), findsOneWidget);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test mobile/test/verify_flow_test.dart`

Expected: FAIL because the verify feature and keys are not implemented.

- [ ] **Step 3: Implement DTO/client/controller**

```dart
final response = await _dio.post<Map<String, dynamic>>(
  '/api/v1/analysis/verify',
  data: {
    'message': request.message,
    'phone': request.phone,
    'channel': 'MOBILE_APP',
    'department': request.department,
    'url': request.url,
    'device_install_id': request.deviceInstallId,
  },
);
```

```dart
class VerifyController extends StateNotifier<AsyncValue<VerifyResult?>> {
  Future<void> submit(VerifyFormValue formValue) async {
    state = const AsyncLoading();
    final result = await _repository.verify(formValue);
    state = AsyncData(result);
  }
}
```

- [ ] **Step 4: Run the test**

Run: `flutter test mobile/test/verify_flow_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/data/api/mobile_api_client.dart mobile/lib/application/verify/verify_controller.dart mobile/lib/presentation/verify/verify_page.dart mobile/lib/presentation/verify/loading_page.dart mobile/lib/presentation/verify/result_page.dart mobile/test/verify_flow_test.dart
git commit -m "feat: add mobile verify flow"
```

### Task 7: Implement reporting with media, confirmation, and WhatsApp sharing

**Files:**
- Create: `mobile/lib/application/report/report_controller.dart`
- Create: `mobile/lib/presentation/report/report_page.dart`
- Create: `mobile/lib/presentation/report/report_confirmation_page.dart`
- Modify: `mobile/lib/data/api/mobile_api_client.dart`
- Test: `mobile/test/report_flow_test.dart`

- [ ] **Step 1: Write the failing tests**

```dart
testWidgets('submits formal report and shows public reference', (tester) async {
  await tester.pumpWidget(const BeninCyberShieldApp());
  // seed verify state through a fake repository
  await tester.tap(find.text('Signaler'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Envoyer le signalement'));
  await tester.pumpAndSettle();
  expect(find.textContaining('BCS-'), findsOneWidget);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test mobile/test/report_flow_test.dart`

Expected: FAIL because the reporting UI and API flow do not exist.

- [ ] **Step 3: Implement multipart upload and share flow**

```dart
final formData = FormData.fromMap({
  'message': request.message,
  'phone': request.phone,
  'channel': 'MOBILE_APP',
  'department': request.department,
  'url': request.url,
  'device_install_id': request.deviceInstallId,
  'verification_message_uuid': request.verificationMessageUuid,
  'verification_analysis_uuid': request.verificationAnalysisUuid,
  'verification': jsonEncode(request.verification.toJson()),
  'screenshots': files,
});
```

```dart
await Share.share(
  'Alerte BENIN CYBER SHIELD\\n${result.maskedPhone}\\nReference ${report.publicReference}',
);
```

- [ ] **Step 4: Run the test**

Run: `flutter test mobile/test/report_flow_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/application/report/report_controller.dart mobile/lib/presentation/report/report_page.dart mobile/lib/presentation/report/report_confirmation_page.dart mobile/lib/data/api/mobile_api_client.dart mobile/test/report_flow_test.dart
git commit -m "feat: add mobile reporting and sharing"
```

### Task 8: Implement mobile history, about, and settings

**Files:**
- Create: `mobile/lib/application/history/history_controller.dart`
- Create: `mobile/lib/presentation/history/history_page.dart`
- Create: `mobile/lib/presentation/about/about_page.dart`
- Create: `mobile/lib/presentation/settings/settings_page.dart`
- Create: `mobile/lib/core/storage/install_store.dart`
- Test: `mobile/test/history_page_test.dart`

- [ ] **Step 1: Write the failing tests**

```dart
testWidgets('renders history items returned by backend', (tester) async {
  await tester.pumpWidget(const BeninCyberShieldApp());
  await tester.tap(find.text('Historique'));
  await tester.pumpAndSettle();
  expect(find.text('Signalement'), findsWidgets);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test mobile/test/history_page_test.dart`

Expected: FAIL because history/about/settings are not implemented.

- [ ] **Step 3: Implement install store and history fetch**

```dart
class InstallStore {
  Future<String> getOrCreateDeviceInstallId() async {
    final existing = await _secureStorage.read(key: 'device_install_id');
    if (existing != null && existing.isNotEmpty) return existing;
    final created = const Uuid().v4();
    await _secureStorage.write(key: 'device_install_id', value: created);
    return created;
  }
}
```

```dart
final response = await _dio.get<Map<String, dynamic>>(
  '/api/v1/mobile/history',
  queryParameters: {'device_install_id': deviceInstallId},
);
```

- [ ] **Step 4: Run the test**

Run: `flutter test mobile/test/history_page_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/application/history/history_controller.dart mobile/lib/presentation/history/history_page.dart mobile/lib/presentation/about/about_page.dart mobile/lib/presentation/settings/settings_page.dart mobile/lib/core/storage/install_store.dart mobile/test/history_page_test.dart
git commit -m "feat: add mobile history about and settings"
```

### Task 9: Polish Android delivery, docs, and regression checks

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-29-android-citizen-mobile-v1-design.md`
- Modify: `backend/tests/test_mobile_history_contracts.py`
- Modify: `mobile/README.md`

- [ ] **Step 1: Add the final regression tests**

```python
def test_mobile_history_masks_phone_numbers(client):
    response = client.get("/api/v1/mobile/history", params={"device_install_id": "device-002"})
    assert response.status_code == 200
    for item in response.json()["data"]["items"]:
        assert item["masked_phone"].startswith("01")
        assert len(item["masked_phone"]) < 10
```

```dart
testWidgets('settings screen exposes device identifier copy action', (tester) async {
  await tester.pumpWidget(const BeninCyberShieldApp());
  await tester.tap(find.text('Parametres'));
  await tester.pumpAndSettle();
  expect(find.text('Copier l identifiant de l appareil'), findsOneWidget);
});
```

- [ ] **Step 2: Run the full targeted test suite**

Run: `docker.exe compose exec -T -w /app -e PYTHONPATH=/app api pytest -q tests/test_mobile_history_contracts.py tests/test_signals_and_incidents.py`

Run: `flutter test mobile/test`

Expected: PASS on both

- [ ] **Step 3: Document the mobile module**

```md
## Mobile citizen app

Location: `mobile/`

Primary flows:
- verification
- formal reporting
- WhatsApp sharing
- backend history without account through `device_install_id`
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/plans/2026-04-29-android-citizen-mobile-v1-design.md backend/tests/test_mobile_history_contracts.py mobile/README.md mobile/test
git commit -m "docs: finalize android citizen v1 delivery notes"
```

## Self-review

- Spec coverage: the plan covers the validated Stitch-aligned UI, backend history without account, verify/report/share flows, and secondary pages `Historique`, `À propos`, `Paramètres`.
- Placeholder scan: no `TODO`, no implicit “handle later” steps, and each task includes concrete file paths, commands, and code snippets.
- Type consistency: the same `device_install_id`, `verification_message_uuid`, and `verification_analysis_uuid` identifiers are used consistently across backend and Flutter tasks.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-04-29-android-citizen-mobile-v1-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
