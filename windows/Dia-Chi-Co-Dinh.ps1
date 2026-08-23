$ErrorActionPreference='Continue'
function Has($n){[bool](Get-Command $n -ErrorAction SilentlyContinue)}
Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   ZENITH CLINIC - Dia chi co dinh (24/7)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
if(-not (Has cloudflared)){
  Write-Host 'Cai cloudflared...' -ForegroundColor Yellow
  winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
  $env:Path+=';C:\Program Files (x86)\cloudflared;C:\Program Files\cloudflared'
}else{Write-Host 'cloudflared: OK' -ForegroundColor Green}
$cf=(Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if(-not $cf){$cf='cloudflared'}
Write-Host ''
Write-Host 'Mo Cloudflare > Zero Trust > Networks > Tunnels, tao 1 tunnel,' -ForegroundColor Yellow
Write-Host 'chon Windows. Co the COPY ca dong lenh hoac chi chuoi TOKEN (bat dau bang eyJ...).' -ForegroundColor Yellow
Write-Host ''
$raw=Read-Host 'Dan TOKEN (hoac ca dong lenh) vao day roi Enter'
$token=$raw.Trim()
# Neu dan ca cau lenh "cloudflared ... service install <token>" thi chi lay phan token
if($token -match 'service\s+install\s+(.+)$'){$token=$Matches[1].Trim()}
$token=$token.Trim('"').Trim("'").Trim()
if([string]::IsNullOrWhiteSpace($token)){Write-Host 'Chua co token. Thoat.' -ForegroundColor Red;Read-Host 'Nhan Enter';exit}
& $cf service uninstall *>$null 2>$null
& $cf service install $token
Write-Host ''
if($LASTEXITCODE -eq 0){
  Write-Host '================ DA CAI DICH VU ================' -ForegroundColor Green
  Write-Host ' Tunnel chay NEN 24/7 (ke ca khi dong cua so nay).' -ForegroundColor Green
  Write-Host ' Yeu cau: may chu LUON BAT + Docker dang chay.' -ForegroundColor Green
  Write-Host ' Quay lai Cloudflare bam Next -> them Public Hostname (http://127.0.0.1:3000).' -ForegroundColor Green
  Write-Host '================================================' -ForegroundColor Green
}else{
  Write-Host '================ CAI DAT THAT BAI ================' -ForegroundColor Red
  Write-Host ' Token chua dung. Hay copy lai va chi dan phan bat dau bang eyJ...' -ForegroundColor Yellow
  Write-Host ' (KHONG dan "cloudflared.exe service install" o dau), roi chay lai file nay.' -ForegroundColor Yellow
  Write-Host '=================================================' -ForegroundColor Red
}
Read-Host 'Nhan Enter de dong'
