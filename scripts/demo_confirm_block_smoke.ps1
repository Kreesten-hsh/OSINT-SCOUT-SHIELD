param(
    [string]$ApiBase = "http://localhost:8000/api/v1",
    [string]$Username = $env:AUTH_ADMIN_EMAIL,
    [string]$Password = $env:AUTH_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Condition {
    param(
        [bool]$Condition,
        [string]$Message
    )
    if (-not $Condition) {
        throw $Message
    }
}

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Body,
        [hashtable]$Headers = @{}
    )
    return Invoke-RestMethod -Method $Method -Uri $Url -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10) -Headers $Headers
}

if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    throw "Username/Password obligatoires pour ce smoke test (JWT requis)."
}

$RootUrl = $ApiBase -replace "/api/v1/?$", ""
$timestamp = [string][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$suffix = $timestamp.Substring([Math]::Max(0, $timestamp.Length - 8))
$phone = "+229$suffix"
$message = "ALERTE FRAUDE: transfert immediat requis, confirme ton OTP"

Write-Step "Health check API"
$health = Invoke-RestMethod -Method Get -Uri "$RootUrl/health"
$statusValue = [string]$health.status
Assert-Condition (($statusValue -eq "ok" -or $statusValue -eq "healthy")) "Healthcheck echec: statut inattendu '$statusValue'"
Write-Host ("Healthcheck OK | status={0}" -f $statusValue)

Write-Step "Login analyste"
$login = Invoke-Json -Method Post -Url "$ApiBase/auth/login" -Body @{
    username = $Username
    password = $Password
}
Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$login.access_token)) "Login echec: token manquant"
$authHeaders = @{ Authorization = "Bearer $($login.access_token)" }
Write-Host "Login OK"

Write-Step "Creer un incident citoyen NEW"
$report = Invoke-Json -Method Post -Url "$ApiBase/incidents/report" -Body @{
    message = $message
    channel = "WEB_PORTAL"
    phone   = $phone
    url     = "https://example.com/phishing"
}
Assert-Condition ($report.success -eq $true) "Creation incident echec"
$incidentId = [string]$report.data.alert_uuid
Write-Host ("Incident cree | id={0}" -f $incidentId)

Write-Step "Decision SOC CONFIRM"
$decision = Invoke-Json -Method Patch -Url "$ApiBase/incidents/$incidentId/decision" -Headers $authHeaders -Body @{
    decision = "CONFIRM"
    comment  = "Smoke workflow auto confirm+block"
}
Assert-Condition ($decision.success -eq $true) "Decision SOC echec"
Assert-Condition ($decision.data.alert_status -eq "CONFIRMED") "Alert status attendu CONFIRMED apres decision"
Write-Host ("Decision OK | status={0}" -f $decision.data.alert_status)

Write-Step "Dispatch SHIELD BLOCK_NUMBER (auto callback)"
$dispatch = Invoke-Json -Method Post -Url "$ApiBase/shield/actions/dispatch" -Headers $authHeaders -Body @{
    incident_id   = $incidentId
    action_type   = "BLOCK_NUMBER"
    reason        = "Smoke workflow auto confirm+block"
    auto_callback = $true
}
Assert-Condition ($dispatch.success -eq $true) "Dispatch SHIELD echec"
Assert-Condition ($dispatch.data.operator_status -eq "EXECUTED") "Operator status attendu EXECUTED"
Write-Host ("Dispatch OK | dispatch={0}" -f $dispatch.data.dispatch_id)

Write-Step "Verifier detail incident (status bloque simule)"
$detail = Invoke-RestMethod -Method Get -Uri "$ApiBase/incidents/citizen/$incidentId" -Headers $authHeaders
Assert-Condition ($detail.success -eq $true) "Lecture detail incident echec"
Assert-Condition ($detail.data.status -eq "BLOCKED_SIMULATED") "Statut incident attendu BLOCKED_SIMULATED"
Write-Host ("Detail OK | status={0}" -f $detail.data.status)

Write-Step "Verifier timeline SHIELD"
$timeline = Invoke-RestMethod -Method Get -Uri "$ApiBase/shield/incidents/$incidentId/actions" -Headers $authHeaders
Assert-Condition ($timeline.success -eq $true) "Lecture timeline SHIELD echec"
Assert-Condition ($timeline.data.total_actions -ge 1) "Timeline SHIELD vide"
Write-Host ("Timeline OK | total_actions={0}" -f $timeline.data.total_actions)

Write-Step "Generer rapport final"
$forensicReport = Invoke-RestMethod -Method Post -Uri "$ApiBase/reports/generate/$incidentId" -Headers $authHeaders
Assert-Condition ($forensicReport.success -eq $true) "Generation rapport echec"
Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$forensicReport.data.uuid)) "Report uuid manquant"
Write-Host ("Rapport OK | report_uuid={0}" -f $forensicReport.data.uuid)

Write-Host ""
Write-Host "Workflow smoke confirm+block: SUCCESS" -ForegroundColor Green
