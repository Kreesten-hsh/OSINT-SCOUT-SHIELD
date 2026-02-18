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

function Invoke-JsonPost {
    param(
        [string]$Url,
        [hashtable]$Body,
        [hashtable]$Headers = @{}
    )
    return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -Headers $Headers
}

$RootUrl = $ApiBase -replace "/api/v1/?$", ""
$timestamp = [string][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$suffix = $timestamp.Substring([Math]::Max(0, $timestamp.Length - 8))
$phone = "+229$suffix"
$phoneNoUrl = "+228$suffix"
$message = "URGENT confirme ton code OTP pour debloquer ton compte"

Write-Step "Health check API"
$health = Invoke-RestMethod -Method Get -Uri "$RootUrl/health"
$statusValue = [string]$health.status
Assert-Condition (($statusValue -eq "ok" -or $statusValue -eq "healthy")) "Healthcheck echec: statut inattendu '$statusValue'"
if ($null -ne $health.components) {
    Assert-Condition (($health.components.db -eq "ok")) "Healthcheck echec: db non ok"
    Assert-Condition (($health.components.redis -eq "ok")) "Healthcheck echec: redis non ok"
}
Write-Host ("Healthcheck OK | status={0}" -f $statusValue)

Write-Step "Verify signal (analyse seule)"
$verify = Invoke-JsonPost -Url "$ApiBase/signals/verify" -Body @{
    message = $message
    channel = "WEB_PORTAL"
    phone   = $phone
    url     = "https://example.com/phishing"
}
Assert-Condition ($verify.success -eq $true) "Verify a retourne success=false"
Assert-Condition ($null -ne $verify.data.risk_score) "Verify sans risk_score"
Assert-Condition ($verify.data.risk_score -ge 0 -and $verify.data.risk_score -le 100) "risk_score hors borne"
Write-Host ("Verify OK | score={0} | level={1}" -f $verify.data.risk_score, $verify.data.risk_level)

Write-Step "Report incident sans URL (doit rester hors queue OSINT)"
$reportNoUrl = Invoke-JsonPost -Url "$ApiBase/incidents/report" -Body @{
    message = $message
    channel = "WEB_PORTAL"
    phone   = $phoneNoUrl
}
Assert-Condition ($reportNoUrl.success -eq $true) "Report sans URL a retourne success=false"
Assert-Condition ($reportNoUrl.data.queued_for_osint -eq $false) "Report sans URL devrait avoir queued_for_osint=false"
Write-Host ("Report sans URL OK | incident={0}" -f $reportNoUrl.data.alert_uuid)

Write-Step "Report incident avec URL HTTP(S) (doit partir en queue OSINT)"
$reportWithUrl = Invoke-JsonPost -Url "$ApiBase/incidents/report" -Body @{
    message = $message
    channel = "WEB_PORTAL"
    phone   = $phone
    url     = "https://example.com/phishing"
    verification = @{
        risk_score   = [int]$verify.data.risk_score
        risk_level   = [string]$verify.data.risk_level
        should_report = [bool]$verify.data.should_report
        matched_rules = @($verify.data.matched_rules)
    }
}
Assert-Condition ($reportWithUrl.success -eq $true) "Report avec URL a retourne success=false"
Assert-Condition ($reportWithUrl.data.queued_for_osint -eq $true) "Report avec URL devrait avoir queued_for_osint=true"
$incidentId = [string]$reportWithUrl.data.alert_uuid
Write-Host ("Report avec URL OK | incident={0}" -f $incidentId)

if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    Write-Host ""
    Write-Host "Credentials absents: les checks JWT (incidents-signales + reports) sont ignores." -ForegroundColor Yellow
    Write-Host "Definir AUTH_ADMIN_EMAIL et AUTH_ADMIN_PASSWORD pour activer ces checks."
    exit 0
}

Write-Step "Login analyste (JWT)"
$login = Invoke-JsonPost -Url "$ApiBase/auth/login" -Body @{
    username = $Username
    password = $Password
}
Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$login.access_token)) "Login echec: access_token manquant"
$token = [string]$login.access_token
$authHeaders = @{ Authorization = "Bearer $token" }
Write-Host "Login OK"

Write-Step "Lister incidents signales (endpoint protege)"
$citizenList = Invoke-RestMethod -Method Get -Uri "$ApiBase/incidents/citizen?skip=0&limit=5" -Headers $authHeaders
Assert-Condition ($citizenList.success -eq $true) "GET /incidents/citizen a retourne success=false"
Write-Host ("Incidents citoyens accessibles | total={0}" -f $citizenList.data.total)

Write-Step "Generer un rapport sur l'incident cree"
$report = Invoke-RestMethod -Method Post -Uri "$ApiBase/reports/generate/$incidentId" -Headers $authHeaders
Assert-Condition ($report.success -eq $true) "Generation rapport a retourne success=false"
Assert-Condition (-not [string]::IsNullOrWhiteSpace([string]$report.data.uuid)) "Generation rapport sans uuid"
Write-Host ("Rapport genere OK | report_uuid={0}" -f $report.data.uuid)

Write-Host ""
Write-Host "Sprint 1 smoke pack: SUCCESS" -ForegroundColor Green
