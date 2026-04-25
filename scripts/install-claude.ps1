$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "claude\install-repo"
$target = Join-Path $env:USERPROFILE ".claude\skills\install-repo"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source skill not found: $source"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Recurse -Force

Write-Host "Installed Claude skill -> $target"
