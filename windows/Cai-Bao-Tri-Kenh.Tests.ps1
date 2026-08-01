$ErrorActionPreference = "Stop"

$script = Join-Path $PSScriptRoot "Cai-Bao-Tri-Kenh.ps1"
$runtime = Join-Path ([IO.Path]::GetTempPath()) ("zenith-maintenance-" + [guid]::NewGuid() + ".secret")
$secret = "TEST_SECRET_MUST_NEVER_APPEAR_IN_OUTPUT_123456789"

try {
  Set-Content -LiteralPath $runtime -Value $secret -Encoding ascii -NoNewline
  $lines = @(& $script -PublicAppUrl "https://crm.example.vn/" -RuntimeSecretFile $runtime -WhatIf 6>&1 | ForEach-Object { $_.ToString() })
  $output = $lines -join "`n"

  if ($output -notmatch [regex]::Escape("https://crm.example.vn/api/internal/channels/maintenance")) { throw "Maintenance URL is missing or incorrect." }
  if ($output -notmatch "12 gio") { throw "The 12-hour interval is missing." }
  if ($output -notmatch [regex]::Escape($runtime)) { throw "Runtime secret source is not reported." }
  if ($output.Contains($secret)) { throw "Secret leaked in WhatIf output." }
  if ($output -notmatch "WHATIF_OK") { throw "WhatIf completion marker is missing." }

  Write-Output "PASS: maintenance task uses the exact URL, 12-hour interval and never prints its secret"
}
finally {
  if (Test-Path -LiteralPath $runtime) { Remove-Item -LiteralPath $runtime -Force }
}
