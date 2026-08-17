# ============================================================================
#  Bat tinh nang AI soan tin cham soc khach.
#  TRUNG LAP NHA CUNG CAP: chon 1 hang (DeepSeek / Qwen / Gemini / OpenAI / Claude
#  / tu host), nhap API key, script tu dien AI_BASE_URL + AI_MODEL vao .env roi
#  khoi dong lai ung dung. Khong lam mat cac cai dat khac trong .env.
# ============================================================================
$ErrorActionPreference = 'Stop'
$RepoDir = (Resolve-Path "$PSScriptRoot\..").Path
$envFile = Join-Path $RepoDir '.env'
$Compose = Join-Path $RepoDir 'docker-compose.yml'

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   BAT AI - Chon nha cung cap (khong thien vi)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ' AI chi dung de SOAN san tin nhan (tieng Viet, ngan) cho nhan vien'
Write-Host ' xem/sua roi moi gui. App CHI gui ten khach + ten dich vu gan nhat,'
Write-Host ' KHONG gui so dien thoai / du lieu nhay cam.'
Write-Host ''
Write-Host ' Chon nha cung cap (re -> dat, tham khao gia tu kiem chung):' -ForegroundColor Yellow
Write-Host '   1) DeepSeek   (TQ, rat re)    - lay key: https://platform.deepseek.com'
Write-Host '   2) Qwen       (TQ, rat re)    - lay key: https://dashscope.console.aliyun.com'
Write-Host '   3) Gemini     (Google, re)    - lay key: https://aistudio.google.com/apikey'
Write-Host '   4) OpenAI     (gpt-4o-mini)   - lay key: https://platform.openai.com/api-keys'
Write-Host '   5) Claude     (Anthropic)     - lay key: https://console.anthropic.com'
Write-Host '   6) Tu host / Khac (Ollama, vLLM, OpenRouter...) - tu nhap base + model'
Write-Host ''
Write-Host ' * App y te: DeepSeek/Qwen xu ly o TQ. Muon du lieu khong ra ngoai ->'
Write-Host '   chon (6) tu host model trong mang noi bo.' -ForegroundColor DarkYellow
Write-Host ''
$choice = (Read-Host 'Nhap so 1-6 roi Enter').Trim()

$base = ''; $model = ''; $provider = ''
switch ($choice) {
  '1' { $base = 'https://api.deepseek.com';                                $model = 'deepseek-chat';     $provider = 'openai' }
  '2' { $base = 'https://dashscope.aliyuncs.com/compatible-mode/v1';       $model = 'qwen-plus';         $provider = 'openai' }
  '3' { $base = 'https://generativelanguage.googleapis.com/v1beta/openai'; $model = 'gemini-2.0-flash';  $provider = 'openai' }
  '4' { $base = 'https://api.openai.com/v1';                               $model = 'gpt-4o-mini';       $provider = 'openai' }
  '5' { $base = 'https://api.anthropic.com';                               $model = 'claude-haiku-4-5';  $provider = 'anthropic' }
  '6' {
    $base = (Read-Host 'Dia chi goc API (vd http://127.0.0.1:11434/v1)').Trim()
    $model = (Read-Host 'Ten model (vd llama3.1, qwen2.5...)').Trim()
    $provider = (Read-Host 'Chuan API: go "openai" hoac "anthropic" (Enter = openai)').Trim()
    if ([string]::IsNullOrWhiteSpace($provider)) { $provider = 'openai' }
  }
  default { Write-Host 'Lua chon khong hop le. Thoat.' -ForegroundColor Red; Read-Host 'Nhan Enter'; exit }
}

Write-Host ''
Write-Host "Da chon: base=$base  model=$model" -ForegroundColor Green
$key = (Read-Host 'Dan API key vao day roi Enter (tu host khong can key thi bo trong)').Trim()
if ([string]::IsNullOrWhiteSpace($key)) { $key = 'none' }  # mot so server tu host khong yeu cau key

# Cap nhat (hoac them) cac dong AI_*, giu nguyen cac dong khac.
$want = @{ 'AI_API_KEY' = $key; 'AI_BASE_URL' = $base; 'AI_MODEL' = $model; 'AI_PROVIDER' = $provider }
$lines = @()
if (Test-Path $envFile) { $lines = @(Get-Content $envFile) }
$result = @()
$seen = @{}
foreach ($l in $lines) {
  $matched = $false
  foreach ($k in $want.Keys) {
    if ($l -match "^\s*$k\s*=") { $result += "$k=$($want[$k])"; $seen[$k] = $true; $matched = $true; break }
  }
  if (-not $matched) { $result += $l }
}
foreach ($k in $want.Keys) { if (-not $seen.ContainsKey($k)) { $result += "$k=$($want[$k])" } }

# Ghi file UTF-8 KHONG BOM (tranh loi doc bien dau tien).
[System.IO.File]::WriteAllLines($envFile, $result, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Da luu cau hinh AI vao: $envFile" -ForegroundColor Green

Write-Host 'Dang khoi dong lai ung dung de ap dung...' -ForegroundColor Yellow
# --force-recreate de ap dung bien moi; --remove-orphans de don container cu bi ket
# (tranh loi "container name already in use" khi up that bai giua chung lan truoc).
docker compose -f "$Compose" up -d --force-recreate --remove-orphans
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Khoi dong lai bi loi (co the do container cu ket ten). Dang don dep va thu lai...' -ForegroundColor Yellow
  docker rm -f zenithtasks-app-1 2>$null
  docker compose -f "$Compose" up -d
}

Write-Host ''
Write-Host '================ DA BAT AI ================' -ForegroundColor Green
Write-Host ' Vao app -> mo ho so 1 khach -> o "Cham soc khach hang"' -ForegroundColor Green
Write-Host ' se thay nut "AI soan tin".' -ForegroundColor Green
Write-Host ' Doi nha cung cap: chay lai file nay va chon so khac.' -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Green
Read-Host 'Nhan Enter de dong'
