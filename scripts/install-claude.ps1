$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "claude\install-repo"
$skillsRoot = Join-Path $env:USERPROFILE ".claude\skills"
$target = Join-Path $skillsRoot "install-repo"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source skill not found: $source"
}

New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null

if (Test-Path -LiteralPath $target) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$target.backup-$stamp"
  Move-Item -LiteralPath $target -Destination $backup
  Write-Host "Backed up existing Claude skill -> $backup"
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -LiteralPath (Join-Path $source "*") -Destination $target -Recurse -Force

Write-Host "Installed Claude skill -> $target"
