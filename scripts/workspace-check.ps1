$ErrorActionPreference = 'Stop'

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Find-Git {
  $command = Get-Command git -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $codexGit = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe'
  if (Test-Path -LiteralPath $codexGit) { return $codexGit }
  throw 'Git was not found.'
}

$required = @(
  'AGENTS.md',
  'README.md',
  'desktop\package.json',
  'web\app.js',
  'web\data-validation.js',
  'web\validate-data.js',
  'legal\LICENSE.md',
  'legal\THIRD_PARTY_NOTICES.md',
  'legal\DATA_SOURCES.md',
  'memory\PROJECT_STATE.md',
  'memory\DECISIONS.md',
  'memory\LESSONS.md',
  'memory\KNOWN_ISSUES.md',
  'memory\SESSION_HANDOFF.md',
  '.pnpm-store',
  '.cache\electron-builder',
  'desktop\node_modules\electron'
)

foreach ($relative in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $relative))) {
    $errors.Add("Missing required path: $relative")
  }
}

$package = Get-Content -LiteralPath (Join-Path $root 'desktop\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$package.version
$releaseDir = Join-Path $root "releases\v$version"
if (-not (Test-Path -LiteralPath $releaseDir)) {
  $warnings.Add("Current package version has no formal release archive: v$version")
}

$allowedRootNames = @(
  '.cache', '.git', '.pnpm-store', '.tmp', 'desktop', 'docs', 'legal', 'memory', 'outputs', 'releases', 'scripts', 'web',
  '.gitignore', 'AGENTS.md', 'CHANGELOG.md', 'README.md', 'build-portable.cmd', 'build-web.cmd',
  'build-folder.cmd', 'create-release.cmd', 'install-dependencies.cmd', 'run-dev.cmd', 'workspace-check.cmd'
)
$unexpected = Get-ChildItem -LiteralPath $root -Force | Where-Object { $allowedRootNames -notcontains $_.Name }
foreach ($item in $unexpected) { $warnings.Add("Unexpected root item: $($item.Name)") }

$git = Find-Git
$status = @(& $git -C $root status --porcelain)
$trackedGenerated = @(& $git -C $root ls-files 'outputs/*' 'desktop/app/*' 'desktop/node_modules/*' '.cache/*' '.pnpm-store/*') |
  Where-Object { $_ -ne 'outputs/.gitkeep' }
foreach ($item in $trackedGenerated) { $errors.Add("Generated or cached file is tracked by Git: $item") }

Write-Host "MSPM0 workspace: $root"
Write-Host "Package version: $version"
Write-Host "Git changes: $($status.Count)"
if ($status.Count -gt 0) { $status | ForEach-Object { Write-Host "  $_" } }

if ($warnings.Count -gt 0) {
  Write-Host 'Warnings:'
  $warnings | ForEach-Object { Write-Host "  - $_" }
}
if ($errors.Count -gt 0) {
  Write-Host 'Errors:'
  $errors | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

Write-Host 'Workspace check passed.'
