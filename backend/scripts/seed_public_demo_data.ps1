$ErrorActionPreference = "Stop"

$ApiBaseUrl = if ($env:API_URL) { $env:API_URL.TrimEnd("/") } else { "https://bcs-api-2lit.onrender.com" }
$Endpoint = "$ApiBaseUrl/api/v1/incidents/report"

$Departments = @(
  @{
    Name = "Atlantique"
    Phones = @("0169647090", "0662334455", "0961122334")
    Messages = @(
      "URGENT MTN: Transfert errone de 45.000 FCFA detecte. Renvoyez le code OTP au 0169647090 sous 30 minutes sinon votre compte sera bloque.",
      "Alerte MoMo: votre compte risque d'etre desactive. Confirmez votre identite en envoyant votre code PIN au 0662334455.",
      "Vous avez gagne 250000 FCFA. Cliquez vite sur https://mtn-bonus-client.com et saisissez votre PIN MoMo pour recevoir le retrait.",
      "BOA Benin: mise a jour obligatoire de vos identifiants bancaires sur http://boa-update-benin.tk pour eviter le blocage."
    )
    Count = 10
  },
  @{
    Name = "Littoral"
    Phones = @("0612233445", "0199001122")
    Messages = @(
      "Service client Kreesten Technologies SARL: remboursement urgent disponible. Envoyez votre code secret pour finaliser le dossier.",
      "Kreesten Technologies SARL support: paiement bloque. Cliquez sur http://kreesten-secure-pay.help pour revalider votre compte.",
      "Votre compte UBA a ete suspendu. Verifiez vos informations sur http://uba-benin-secure.xyz dans les 2 heures."
    )
    Count = 8
  },
  @{
    Name = "Oueme"
    Phones = @("0956778899", "0952233445")
    Messages = @(
      "MTN vous informe: un credit de 75.000 FCFA a ete envoye par erreur. Pour le retourner appelez le 0956778899 immediatement.",
      "Votre colis est en attente. Payez 1000 FCFA via https://livraison-benin-info.com avant ce soir.",
      "Bonjour, ici Kreesten Technologies SARL. Un remboursement urgent est disponible. Repondez avec votre code de validation."
    )
    Count = 7
  },
  @{
    Name = "Borgou"
    Phones = @("0297441122", "0291234567")
    Messages = @(
      "Felicitations! Vous etes selectionne pour un poste a Dubai. Envoyez 75.000 FCFA de frais de visa au 0297441122.",
      "Recrutement urgent Canada: frais de dossier 50.000 FCFA a envoyer maintenant. Offre valable 24h.",
      "Votre wallet professionnel sera suspendu ce soir. Confirmez votre PIN sur http://wallet-benin-secure.help."
    )
    Count = 7
  },
  @{
    Name = "Zou"
    Phones = @("0478996611", "0471234567")
    Messages = @(
      "Vous avez gagne un Samsung Galaxy S24. Frais de livraison 25.000 FCFA a envoyer au 0478996611.",
      "Compte Moov Money bloque. Envoyez votre OTP au service verification pour reactiver votre compte.",
      "Programme aide sociale: frais d'inscription 10.000 FCFA au 0471234567 pour recevoir 150.000 FCFA."
    )
    Count = 6
  },
  @{
    Name = "Mono"
    Phones = @("0578001122")
    Messages = @(
      "LUCKY WINNER: iPhone 15 Pro vous attend. Envoyez 15.000 FCFA frais de traitement au 0578001122.",
      "Service client Moov: votre paiement est bloque. Donnez votre code secret pour confirmer l'operation."
    )
    Count = 5
  },
  @{
    Name = "Atacora"
    Phones = @("0778223344")
    Messages = @(
      "Aide ONG Benin: vous etes beneficiaire de 150.000 FCFA. Frais de dossier 10.000 FCFA a envoyer rapidement.",
      "Votre numero sera suspendu dans 10 minutes. Envoyez le code recu par SMS au 0778223344."
    )
    Count = 4
  },
  @{
    Name = "Donga"
    Phones = @("0890011223")
    Messages = @(
      "Recrutement international urgent. Payez les frais de dossier au 0890011223 pour reserver votre place.",
      "Votre compte bancaire necessite une verification immediate sur http://secure-bank-bj.info."
    )
    Count = 3
  }
)

$Channels = @("WEB_PORTAL", "MOBILE_APP")
$Created = 0
$Failed = 0
$Distribution = @{}

Write-Host "BENIN CYBER SHIELD - seed public demo"
Write-Host "API: $ApiBaseUrl"

try {
  $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -TimeoutSec 90
  Write-Host "Health: $($health.status)"
} catch {
  Write-Host "WARN: health check timed out or failed, continuing with report endpoint."
}

foreach ($department in $Departments) {
  for ($index = 0; $index -lt [int]$department.Count; $index++) {
    $message = $department.Messages | Get-Random
    $phone = $department.Phones | Get-Random
    $channel = $Channels | Get-Random
    $urlMatch = [regex]::Match($message, "https?://\S+")
    $url = if ($urlMatch.Success) { $urlMatch.Value } else { $null }

    $payload = @{
      message = $message
      phone = $phone
      channel = $channel
      department = $department.Name
      url = $url
    } | ConvertTo-Json

    try {
      $response = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 60
      $reference = $response.data.public_reference
      if (-not $reference) { $reference = $response.data.alert_uuid }
      $Created += 1
      $Distribution[$department.Name] = 1 + [int]($Distribution[$department.Name])
      Write-Host ("OK {0,-10} {1} -> {2}" -f $department.Name, $phone, $reference)
    } catch {
      $Failed += 1
      Write-Host ("WARN {0,-10} {1} -> {2}" -f $department.Name, $phone, $_.Exception.Message)
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
