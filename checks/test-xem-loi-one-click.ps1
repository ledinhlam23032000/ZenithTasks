$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ps = Get-Content (Join-Path $root 'windows\Xem-Loi.ps1') -Raw -Encoding UTF8
$bat = Get-Content (Join-Path $root 'windows\Xem-Loi.bat') -Raw -Encoding UTF8
$requiredPs = @(
  'UTF8Encoding($false)',
  'chcp 65001',
  'docker compose ps',
  'docker compose exec -T app npx prisma migrate status',
  'docker compose logs --no-color --tail=150 app',
  'Database schema is up to date',
  'OK',
  'WARN',
  'FAIL',
  'zenith_v2_qa',
  'clinic port 3000'
)
foreach ($needle in $requiredPs) {
  if (-not $ps.Contains($needle)) { throw "Xem-Loi.ps1 missing guard: $needle" }
}
if ($ps -match 'Out-File') { throw 'Xem-Loi.ps1 must not use Out-File for native Docker output' }
if ($bat -match 'Start-Process|HKU\\S-1-5-19|RunAs') { throw 'Xem-Loi.bat must remain a read-only non-UAC wrapper' }
$temp = Join-Path $env:TEMP ('zenith-utf8-' + [guid]::NewGuid().ToString('N') + '.txt')
$utf8 = New-Object System.Text.UTF8Encoding($false)
try {
  [System.IO.File]::WriteAllText($temp, "Tiếng Việt đã sẵn sàng 🚀", $utf8)
  $roundTrip = [System.IO.File]::ReadAllText($temp, $utf8)
  if ($roundTrip -ne "Tiếng Việt đã sẵn sàng 🚀") { throw 'UTF-8 round trip failed' }
  if ($roundTrip.Contains('ΓÅ') -or $roundTrip.Contains('ß╗') -or $roundTrip.Contains('≡ƒ')) { throw 'mojibake detected' }
  Write-Output 'XEM_LOI_ONE_CLICK_REGRESSION_PASS'
} finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
