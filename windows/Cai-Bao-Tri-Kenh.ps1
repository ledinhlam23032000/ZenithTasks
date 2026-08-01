[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$PublicAppUrl = $env:PUBLIC_APP_URL,
  [string]$RuntimeSecretFile = (Join-Path (Split-Path -Parent $PSScriptRoot) ".runtime\channel_maintenance_secret"),
  [switch]$RunMaintenance
)

$ErrorActionPreference = "Stop"
$taskName = "ZenithBaoTriKenh"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"

function Read-DotEnvValue([string]$Name) {
  if (-not (Test-Path -LiteralPath $envFile)) { return $null }
  $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } | Select-Object -Last 1
  if (-not $line) { return $null }
  return (($line -split "=", 2)[1].Trim()).Trim('"').Trim("'")
}

if ([string]::IsNullOrWhiteSpace($PublicAppUrl)) { $PublicAppUrl = Read-DotEnvValue "PUBLIC_APP_URL" }

if ([string]::IsNullOrWhiteSpace($PublicAppUrl)) {
  throw "Thieu PUBLIC_APP_URL. Vi du: https://crm.tenmien.vn"
}
$baseUrl = $PublicAppUrl.Trim().TrimEnd("/")
if ($baseUrl -notmatch '^https://' -and $baseUrl -notmatch '^http://(localhost|127\.0\.0\.1)(:\d+)?$') {
  throw "PUBLIC_APP_URL phai dung HTTPS (chi cho phep HTTP voi localhost)."
}
$maintenanceUrl = "$baseUrl/api/internal/channels/maintenance"

function Read-RuntimeSecret {
  if (-not [string]::IsNullOrWhiteSpace($env:CHANNEL_MAINTENANCE_SECRET)) {
    return @{ Value = $env:CHANNEL_MAINTENANCE_SECRET.Trim(); Source = "environment CHANNEL_MAINTENANCE_SECRET" }
  }
  $fromDotEnv = Read-DotEnvValue "CHANNEL_MAINTENANCE_SECRET"
  if (-not [string]::IsNullOrWhiteSpace($fromDotEnv)) { return @{ Value = $fromDotEnv; Source = "$envFile (CHANNEL_MAINTENANCE_SECRET)" } }
  if (Test-Path -LiteralPath $RuntimeSecretFile) {
    $value = (Get-Content -LiteralPath $RuntimeSecretFile -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($value)) { return @{ Value = $value; Source = $RuntimeSecretFile } }
  }
  return $null
}

if ($WhatIfPreference) {
  $source = Read-RuntimeSecret
  if (-not $source) { throw "WhatIf can mot secret trong env hoac runtime file." }
  Write-Output "URL: $maintenanceUrl"
  Write-Output "Chu ky: 12 gio"
  Write-Output "Nguon secret: $($source.Source)"
  Write-Output "Secret chi duoc doc luc chay, khong nam trong Task Scheduler va khong duoc in."
  Write-Output "WHATIF_OK"
  return
}

$secretInfo = Read-RuntimeSecret
if (-not $secretInfo -and -not $RunMaintenance) {
  Push-Location $repoRoot
  try {
    $fromContainer = (& docker compose exec -T app sh -lc 'cat /app/.runtime/channel_maintenance_secret' 2>$null | Out-String).Trim()
    if (-not [string]::IsNullOrWhiteSpace($fromContainer)) { $secretInfo = @{ Value = $fromContainer; Source = "Docker runtime volume" } }
  }
  finally { Pop-Location }
}
if (-not $secretInfo) {
  throw "Khong tim thay CHANNEL_MAINTENANCE_SECRET. Hay khoi dong app mot lan hoac dat bien moi truong nay."
}

if ($RunMaintenance) {
  $headers = @{ Authorization = "Bearer $($secretInfo.Value)" }
  $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $maintenanceUrl -Headers $headers -TimeoutSec 90
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "Bao tri kenh that bai (HTTP $($response.StatusCode))." }
  Write-Output "Bao tri kenh thanh cong luc $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')."
  return
}

$runtimeDir = Split-Path -Parent $RuntimeSecretFile
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
[IO.File]::WriteAllText($RuntimeSecretFile, $secretInfo.Value, [Text.Encoding]::ASCII)

$acl = New-Object Security.AccessControl.FileSecurity
$acl.SetAccessRuleProtection($true, $false)
$current = [Security.Principal.WindowsIdentity]::GetCurrent().Name
foreach ($identity in @($current, "NT AUTHORITY\SYSTEM", "BUILTIN\Administrators")) {
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($identity, "FullControl", "Allow")))
}
Set-Acl -LiteralPath $RuntimeSecretFile -AclObject $acl

$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -RunMaintenance -PublicAppUrl `"$baseUrl`" -RuntimeSecretFile `"$RuntimeSecretFile`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Hours 12)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

if ($PSCmdlet.ShouldProcess($taskName, "Dang ky bao tri kenh moi 12 gio")) {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force -Description "ZenithTasks: gia han token, kiem tra kenh, tai tep va don du lieu moi 12 gio" | Out-Null
}

Write-Output "Da cai tac vu $taskName (12 gio/lan)."
Write-Output "URL: $maintenanceUrl"
Write-Output "Secret duoc giu trong runtime file co ACL rieng; khong nam trong tham so tac vu."
