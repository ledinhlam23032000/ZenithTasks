# ============================================================================
# XEM LOI - Zenith Clinic
# One-click read-only diagnostic for the clinic stack.
# No database write, no migration apply, no restart, no reset.
# ============================================================================
$Dir = Join-Path $HOME "ZenithTasks"
$Out = Join-Path ([Environment]::GetFolderPath("Desktop")) "zenith-loi.txt"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Diag = New-Object System.Collections.Generic.List[string]

function EndHere($code) { Write-Host ""; Read-Host "Nhan Enter de dong cua so"; exit $code }
function Write-Utf8($text, [bool]$append = $true) {
  $line = ([string]$text) + [Environment]::NewLine
  if ($append) {
    [System.IO.File]::AppendAllText($Out, $line, $Utf8NoBom)
  } else {
    [System.IO.File]::WriteAllText($Out, $line, $Utf8NoBom)
  }
}
function Add-Diagnostic($level, $message) {
  $line = "[$level] $message"
  $Diag.Add($line)
  Write-Utf8 $line
}
function Invoke-CmdUtf8ToFile($dockerCommand) {
  # Docker Compose emits UTF-8. Redirect inside cmd after switching to code page
  # 65001; do not let Windows PowerShell decode native bytes as ANSI first.
  $quotedOut = '"' + $Out.Replace('"', '""') + '"'
  $cmdLine = "chcp 65001>nul & $dockerCommand >> $quotedOut 2>&1"
  & cmd.exe /d /s /c $cmdLine
  return $LASTEXITCODE
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Khong tim thay Docker Desktop." -ForegroundColor Red
  EndHere 1
}
if (-not (Test-Path $Dir)) {
  Write-Host "Khong tim thay thu muc ung dung: $Dir" -ForegroundColor Red
  EndHere 1
}
Set-Location $Dir

Write-Host "Dang tu kiem tra Zenith Clinic (chi doc, khong sua CSDL)..." -ForegroundColor Cyan
Write-Utf8 "==== NHAT KY CHAN DOAN ZENITH ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')) ====" $false
Write-Utf8 "[INFO] Bao cao duoc ghi UTF-8 khong BOM; mo bang Notepad/VS Code."
Write-Utf8 "[INFO] Day la diagnostic clinic port 3000, khong phai QA port 3300."

Write-Utf8 ""
Write-Utf8 "--- 0) KHOI DONG VA PHAM VI ---"
$composePsExit = Invoke-CmdUtf8ToFile 'docker compose ps'
if ($composePsExit -eq 0) {
  Add-Diagnostic "OK" "Docker Compose da tra ve trang thai stack."
} else {
  Add-Diagnostic "FAIL" "Khong doc duoc docker compose ps; kiem tra Docker Desktop va thu muc repository."
}

Write-Utf8 ""
Write-Utf8 "--- 1) TRANG THAI MIGRATION (CSDL CLINIC) ---"
$migrationExit = Invoke-CmdUtf8ToFile 'docker compose exec -T app npx prisma migrate status'
if ($migrationExit -ne 0) {
  Add-Diagnostic "FAIL" "prisma migrate status exit code: $migrationExit"
}

Write-Utf8 ""
Write-Utf8 "--- 2) LOG UNG DUNG (150 DONG CUOI) ---"
$appLogsExit = Invoke-CmdUtf8ToFile 'docker compose logs --no-color --tail=150 app'
if ($appLogsExit -ne 0) {
  Add-Diagnostic "FAIL" "docker compose logs app exit code: $appLogsExit"
}

$report = [System.IO.File]::ReadAllText($Out, $Utf8NoBom)
Write-Utf8 ""
Write-Utf8 "--- 3) KET LUAN TU DONG ---"
if ($report -match 'Database schema is up to date') {
  Add-Diagnostic "OK" "Prisma bao database schema is up to date."
} elseif ($report -match 'following migration|migration.*pending|P300') {
  Add-Diagnostic "WARN" "Phat hien dau hieu migration pending/Prisma warning; xem phan migration o tren."
} else {
  Add-Diagnostic "WARN" "Chua tim thay dong ket luan migration trong bao cao."
}

if ($report -match 'Ready in|ready in|started server|Local:') {
  Add-Diagnostic "OK" "Log co dau hieu app Next.js da san sang."
} elseif ($report -match 'ECONNREFUSED|EADDRINUSE|Application error|Unhandled|FATAL|panic|failed') {
  Add-Diagnostic "FAIL" "Log co dau hieu app khong san sang hoac co loi runtime."
} else {
  Add-Diagnostic "WARN" "Chua tim thay dau hieu app Ready trong 150 dong log."
}

if ($report -match 'zenith_v2_qa|3300') {
  Add-Diagnostic "FAIL" "Bao cao clinic co dau hieu QA database/port; dung lai va kiem tra compose."
} else {
  Add-Diagnostic "OK" "Khong thay dau hieu QA database/port trong diagnostic clinic."
}

if ($report -match 'localhost:3000') {
  Add-Diagnostic "WARN" "Log cu con dong localhost:3000; day co the la log cua image cu. Sau khi updater build lai, dong startup chuan phai dung 127.0.0.1:3000."
}

$failCount = @($Diag | Where-Object { $_ -like '[FAIL]*' }).Count
$warnCount = @($Diag | Where-Object { $_ -like '[WARN]*' }).Count
Write-Utf8 ""
Write-Utf8 "--- 4) TOM TAT ---"
if ($failCount -eq 0 -and $warnCount -eq 0) {
  Add-Diagnostic "OK" "Khong phat hien loi tu dong trong pham vi diagnostic read-only."
} elseif ($failCount -eq 0) {
  Add-Diagnostic "WARN" "Diagnostic hoan tat voi $warnCount canh bao; app khong bi ket luan hong neu chua co FAIL."
} else {
  Add-Diagnostic "FAIL" "Diagnostic phat hien $failCount loi va $warnCount canh bao; xem dung muc FAIL o tren."
}

Write-Host ""
Write-Host "Da tu kiem tra va luu bao cao UTF-8:" -ForegroundColor Green
Write-Host "   $Out" -ForegroundColor Green
Write-Host "Khong can tu doc log loi ma; neu co FAIL, gui file nay cho ky thuat." -ForegroundColor Yellow
Write-Host "Khong gui .env, API key, JWT hoac password." -ForegroundColor Green
try { Start-Process notepad.exe $Out } catch {}
EndHere ([int]($failCount -gt 0))
