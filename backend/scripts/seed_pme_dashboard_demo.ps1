$ErrorActionPreference = "Stop"

$ApiBaseUrl = if ($env:API_URL) { $env:API_URL.TrimEnd("/") } else { "https://bcs-api-2lit.onrender.com" }
$Endpoint = "$ApiBaseUrl/api/v1/incidents/report"

$Reports = @(
  @{
    Department = "Littoral"
    Phone = "0612233445"
    Message = "Service client Kreesten Technologies SARL: remboursement urgent disponible. Envoyez votre code secret pour finaliser le dossier."
    Count = 5
  },
  @{
    Department = "Littoral"
    Phone = "0199001122"
    Message = "Kreesten Technologies SARL support: paiement bloque. Cliquez sur http://kreesten-secure-pay.help pour revalider votre compte."
    Count = 5
  },
  @{
    Department = "Oueme"
    Phone = "0952233445"
    Message = "Bonjour, ici Kreesten Technologies SARL. Un remboursement urgent est disponible. Repondez avec votre code de validation."
    Count = 4
  },
  @{
    Department = "Atlantique"
    Phone = "0161122334"
    Message = "Support Kreesten: votre facture professionnelle est bloquee. Confirmez votre identite sur https://kreesten-client-secure.com avant 18h."
    Count = 4
  },
  @{
    Department = "Zou"
    Phone = "0471234567"
    Message = "Service client Kreesten Technologies SARL: mise a jour obligatoire de votre compte entreprise. Envoyez le code OTP recu par SMS."
    Count = 3
  },
  @{
    Department = "Borgou"
    Phone = "0297441122"
    Message = "Kreesten paiement bloque: frais de regularisation 15000 FCFA demandes pour liberer votre dossier fournisseur."
    Count = 3
  },
  @{
    Department = "Mono"
    Phone = "0578001122"
    Message = "Kreesten Technologies SARL vous rembourse 85000 FCFA. Cliquez sur http://kreesten-remboursement.help et saisissez votre PIN."
    Count = 3
  },
  @{
    Department = "Atacora"
    Phone = "0778223344"
    Message = "Alerte support Kreesten: votre acces client expire ce soir. Confirmez votre code secret pour conserver le service."
    Count = 3
  }
)

$Created = 0
$Failed = 0
$Distribution = @{}

Write-Host "BENIN CYBER SHIELD - seed PME dashboard demo"
Write-Host "API: $ApiBaseUrl"
Write-Host "Target profile keywords: Kreesten Technologies SARL / support Kreesten / paiement bloque / remboursement urgent"

try {
  $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -TimeoutSec 90
  Write-Host "Health: $($health.status)"
} catch {
  Write-Host "WARN: health check timed out or failed, continuing with report endpoint."
}

foreach ($report in $Reports) {
  for ($index = 0; $index -lt [int]$report.Count; $index++) {
    $urlMatch = [regex]::Match($report.Message, "https?://\S+")
    $url = if ($urlMatch.Success) { $urlMatch.Value } else { $null }
    $payload = @{
      message = $report.Message
      phone = $report.Phone
      channel = "WEB_PORTAL"
      department = $report.Department
      url = $url
    } | ConvertTo-Json

    try {
      $response = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 60
      $reference = $response.data.public_reference
      if (-not $reference) { $reference = $response.data.alert_uuid }
      $Created += 1
      $Distribution[$report.Department] = 1 + [int]($Distribution[$report.Department])
      Write-Host ("OK {0,-10} {1} -> {2}" -f $report.Department, $report.Phone, $reference)
    } catch {
      $Failed += 1
      Write-Host ("WARN {0,-10} {1} -> {2}" -f $report.Department, $report.Phone, $_.Exception.Message)
    }

    Start-Sleep -Milliseconds 350
  }
}

Write-Host ""
Write-Host "Created: $Created"
Write-Host "Failed : $Failed"
Write-Host "Distribution:"
foreach ($key in ($Distribution.Keys | Sort-Object)) {
  Write-Host ("  {0,-10}: {1}" -f $key, $Distribution[$key])
}
