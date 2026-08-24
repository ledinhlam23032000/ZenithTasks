$ErrorActionPreference = 'Stop'
$root = Join-Path $env:TEMP ('zenith-sua-loi-stash-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
try {
  git -C $root init -q
  git -C $root config user.email qa@example.invalid
  git -C $root config user.name qa
  Set-Content (Join-Path $root 'tracked.txt') 'base' -Encoding ASCII
  New-Item -ItemType Directory -Path (Join-Path $root 'checks') | Out-Null
  Set-Content (Join-Path $root 'checks\tracked-check.txt') 'checks-base' -Encoding ASCII
  git -C $root add tracked.txt checks\tracked-check.txt
  git -C $root commit -qm init
  Set-Content (Join-Path $root 'tracked.txt') 'owner-change' -Encoding ASCII
  Set-Content (Join-Path $root 'checks\tracked-check.txt') 'checks-owner-change' -Encoding ASCII
  New-Item -ItemType Directory -Path (Join-Path $root 'checks\qa-chrome-profile') -Force | Out-Null
  Set-Content (Join-Path $root 'checks\qa-chrome-profile\qa-secret.tmp') 'local-only' -Encoding ASCII
  New-Item -ItemType Directory -Path (Join-Path $root 'worktrees\nested\.git') -Force | Out-Null
  Set-Content (Join-Path $root 'worktrees\nested\README') 'nested-repo' -Encoding ASCII
  $paths = @('.', ':(exclude)checks/qa-chrome-profile/**', ':(exclude)worktrees/**')
  git -C $root stash push --include-untracked -m 'qa stash test' -- $paths | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'stash command failed' }
  $tracked = (Get-Content (Join-Path $root 'tracked.txt') -Raw).Trim()
  if ($tracked -ne 'base') { throw 'tracked change was not stashed' }
  $trackedChecks = (Get-Content (Join-Path $root 'checks\tracked-check.txt') -Raw).Trim()
  if ($trackedChecks -ne 'checks-base') { throw 'tracked checks change was not stashed' }
  if (-not (Test-Path (Join-Path $root 'checks\qa-chrome-profile\qa-secret.tmp'))) { throw 'QA Chrome profile was unexpectedly removed' }
  if (-not (Test-Path (Join-Path $root 'worktrees\nested\README'))) { throw 'nested worktree artifact was unexpectedly removed' }
  Write-Output 'SUA_LOI_STASH_ISOLATION_PASS'
} finally {
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
