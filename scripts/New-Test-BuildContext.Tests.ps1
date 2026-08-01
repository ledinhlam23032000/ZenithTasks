$ErrorActionPreference = "Stop"

$destination = Join-Path ([IO.Path]::GetTempPath()) ("zenith-export-test-" + [guid]::NewGuid())

try {
  & "$PSScriptRoot/New-Test-BuildContext.ps1" -Destination $destination

  if (-not (Test-Path -LiteralPath (Join-Path $destination "web/package-lock.json"))) {
    throw "Build context is missing web/package-lock.json"
  }
  if (Test-Path -LiteralPath (Join-Path $destination "web/node_modules")) {
    throw "Build context leaked web/node_modules"
  }
  if (Test-Path -LiteralPath (Join-Path $destination ".git")) {
    throw "Build context leaked .git"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $destination "docs/superpowers/specs/2026-08-01-omnichannel-inbox-design.md"))) {
    throw "Build context is not exporting tracked project documentation"
  }

  Write-Output "PASS: tracked build context exported without local dependencies or Git metadata"
}
finally {
  if (Test-Path -LiteralPath $destination) {
    Remove-Item -LiteralPath $destination -Recurse -Force
  }
}
