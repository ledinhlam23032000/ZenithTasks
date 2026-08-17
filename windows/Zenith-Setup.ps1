$ErrorActionPreference='Continue'
$Repo='https://github.com/ledinhlam23032000/ZenithTasks.git'
$Branch='master'
$Dir=Join-Path $HOME 'ZenithTasks'
function Has($n){[bool](Get-Command $n -ErrorAction SilentlyContinue)}
Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   ZENITH CLINIC - cai dat tren may nay' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
if(-not (Has winget)){Write-Host 'Thieu winget. Mo Microsoft Store, cai App Installer, roi chay lai file nay.' -ForegroundColor Red;Read-Host 'Nhan Enter de thoat';exit}
if(-not (Has git)){Write-Host '[1/4] Cai Git...' -ForegroundColor Yellow;winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements;$env:Path+=';C:\Program Files\Git\cmd'}else{Write-Host '[1/4] Git: OK' -ForegroundColor Green}
Write-Host '[2/4] Tai ma nguon (co the hien cua so dang nhap GitHub - dang nhap giup neu duoc hoi)...' -ForegroundColor Yellow
if(Test-Path $Dir){git -C $Dir fetch origin $Branch;git -C $Dir checkout $Branch;git -C $Dir pull origin $Branch}else{git clone $Repo $Dir;git -C $Dir checkout $Branch}
if(-not (Has docker)){Write-Host '[3/4] Cai Docker Desktop...' -ForegroundColor Yellow;winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements;Write-Host '';Write-Host '==> DA CAI DOCKER. Hay: KHOI DONG LAI may, mo Docker Desktop (doi bieu tuong ca voi chuyen XANH), roi chay lai file nay.' -ForegroundColor Green;Read-Host 'Nhan Enter de thoat';exit}else{Write-Host '[3/4] Docker: OK' -ForegroundColor Green}
docker info *>$null
if($LASTEXITCODE -ne 0){Write-Host 'Docker chua chay. Mo Docker Desktop, doi bieu tuong XANH, roi chay lai file nay.' -ForegroundColor Yellow;Read-Host 'Nhan Enter de thoat';exit}
Set-Location $Dir
Write-Host '[4/4] Dang dung va chay (LAN DAU mat ~5-10 phut, lan sau rat nhanh)...' -ForegroundColor Cyan
docker compose up -d --build
$ok=$false
for($i=0;$i -lt 80;$i++){try{Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3|Out-Null;$ok=$true;break}catch{Start-Sleep 3}}
Write-Host ''
if($ok){Start-Process 'http://localhost:3000';Write-Host '================ THANH CONG ================' -ForegroundColor Green;Write-Host ' Mo: http://localhost:3000' -ForegroundColor Green;Write-Host ' Tai khoan lan dau: cau hinh BOOTSTRAP_ADMIN_* trong .env; khong dung mat khau demo.' -ForegroundColor Yellow;Write-Host ' May khac cung mang: http://<IP-may-nay>:3000' -ForegroundColor Green}else{Write-Host 'Dang khoi dong, mo http://localhost:3000 sau 1-2 phut.' -ForegroundColor Yellow}
Write-Host 'De DUNG app: mo thu muc ZenithTasks roi chay  docker compose down' -ForegroundColor DarkGray
Read-Host 'Nhan Enter de dong cua so'
