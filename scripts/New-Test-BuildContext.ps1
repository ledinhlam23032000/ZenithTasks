param(
  [Parameter(Mandatory = $true)]
  [string]$Destination
)

$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$destinationPath = [IO.Path]::GetFullPath($Destination)

if (Test-Path -LiteralPath $destinationPath) {
  throw "Destination already exists: $destinationPath"
}

$archivePath = Join-Path ([IO.Path]::GetTempPath()) ("zenith-build-context-" + [guid]::NewGuid() + ".zip")

try {
  git -C $repoRoot archive --format=zip --output=$archivePath HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "git archive failed with exit code $LASTEXITCODE"
  }

  New-Item -ItemType Directory -Path $destinationPath | Out-Null
  Expand-Archive -LiteralPath $archivePath -DestinationPath $destinationPath
  Write-Output $destinationPath
}
finally {
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
}
