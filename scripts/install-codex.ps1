$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "codex\install-repo"
$skillsRoot = Join-Path $env:USERPROFILE ".codex\skills"
$target = Join-Path $skillsRoot "install-repo"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source skill not found: $source"
}

New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null

if (Test-Path -LiteralPath $target) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$target.backup-$stamp"
  Move-Item -LiteralPath $target -Destination $backup
  Write-Host "Backed up existing Codex skill -> $backup"
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -LiteralPath (Join-Path $source "*") -Destination $target -Recurse -Force

Write-Host "Installed Codex skill -> $target"
