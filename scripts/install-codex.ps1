$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "codex\install-repo"
$target = Join-Path $env:USERPROFILE ".codex\skills\install-repo"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source skill not found: $source"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Recurse -Force

Write-Host "Installed Codex skill -> $target"
