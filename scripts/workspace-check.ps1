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
  '.gitattributes',
  'AGENTS.md',
  'README.md',
  'docs\DEVELOPMENT.md',
  'docs\RELEASE_CHECKLIST.md',
  'docs\WORKSPACE_HYGIENE.md',
  'desktop\package.json',
  'web\app.js',
  'web\app-bundle.js',
  'web\app\config.js',
  'web\app\state.js',
  'web\app\rules.js',
  'web\app\render.js',
  'web\app\io.js',
  'web\app\events.js',
  'web\app\test-api.js',
  'web\device-catalog.js',
  'web\data-validation.js',
  'web\board-schema-validation.js',
  'web\run-tests.js',
  'web\validate-data.js',
  'legal\LICENSE.md',
  'legal\THIRD_PARTY_NOTICES.md',
  'legal\DATA_SOURCES.md',
  'memory\README.md',
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

$git = Find-Git
$package = Get-Content -LiteralPath (Join-Path $root 'desktop\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$package.version
$releaseRoot = Join-Path $root 'releases'
$releaseDir = Join-Path $releaseRoot "v$version"
if ($version -notmatch '-') {
  if (-not (Test-Path -LiteralPath $releaseDir)) {
    $warnings.Add("Current package version has no formal release archive: v$version")
  } elseif (Test-Path -LiteralPath (Join-Path $releaseDir 'REJECTED.md')) {
    $errors.Add("Current package version points to a rejected release archive: v$version")
  }
}

$releaseDirectories = @(Get-ChildItem -LiteralPath $releaseRoot -Directory | Where-Object { $_.Name -match '^v\d+\.\d+\.\d+$' })
foreach ($directory in $releaseDirectories) {
  foreach ($metadata in @('RELEASE_NOTES.md', 'SHA256.txt')) {
    if (-not (Test-Path -LiteralPath (Join-Path $directory.FullName $metadata))) {
      $errors.Add("Release metadata is missing: $($directory.Name)/$metadata")
    }
  }
  $folderBuild = @(Get-ChildItem -LiteralPath $directory.FullName -Directory | Where-Object { $_.Name -like '*-Folder' })
  if ($folderBuild.Count -gt 0 -and -not (Test-Path -LiteralPath (Join-Path $directory.FullName 'FOLDER-SHA256.txt'))) {
    $errors.Add("Folder release manifest is missing: $($directory.Name)/FOLDER-SHA256.txt")
  }

  $tagExists = @(& $git -C $root tag --list $directory.Name).Count -gt 0
  $rejected = Test-Path -LiteralPath (Join-Path $directory.FullName 'REJECTED.md')
  if ($rejected) {
    if ($tagExists) { $errors.Add("Rejected release archive must not have a Git tag: $($directory.Name)") }
    $notesPath = Join-Path $directory.FullName 'RELEASE_NOTES.md'
    if ((Test-Path -LiteralPath $notesPath) -and ((Get-Content -LiteralPath $notesPath -Raw -Encoding UTF8) -notmatch 'Do not distribute|forbidden to distribute')) {
      $errors.Add("Rejected release notes must forbid distribution: $($directory.Name)")
    }
  } elseif (-not $tagExists) {
    $warnings.Add("Release archive is awaiting its matching Git tag: $($directory.Name)")
  }
}

$releaseLocks = @(Get-ChildItem -LiteralPath $releaseRoot -File -Force | Where-Object { $_.Name -match '^\.v\d+\.\d+\.\d+\.release\.lock$' })
foreach ($lock in $releaseLocks) { $errors.Add("Release lock is still present: $($lock.Name)") }

$releaseTags = @(& $git -C $root tag --list 'v[0-9]*') | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' }
foreach ($tag in $releaseTags) {
  if (-not (Test-Path -LiteralPath (Join-Path $releaseRoot $tag))) {
    $errors.Add("Formal Git tag has no release archive: $tag")
  }
}

$allowedRootNames = @(
  '.cache', '.git', '.pnpm-store', '.tmp', 'desktop', 'docs', 'legal', 'memory', 'outputs', 'releases', 'scripts', 'web',
  '.gitattributes', '.gitignore', 'AGENTS.md', 'CHANGELOG.md', 'README.md', 'build-portable.cmd', 'build-web.cmd',
  'build-folder.cmd', 'create-release.cmd', 'install-dependencies.cmd', 'run-dev.cmd', 'workspace-check.cmd'
)
$unexpected = Get-ChildItem -LiteralPath $root -Force | Where-Object { $allowedRootNames -notcontains $_.Name }
foreach ($item in $unexpected) { $warnings.Add("Unexpected root item: $($item.Name)") }

$status = @(& $git -C $root status --porcelain)
$trackedGenerated = @(& $git -C $root ls-files 'outputs/*' 'desktop/app/*' 'desktop/node_modules/*' '.cache/*' '.pnpm-store/*') |
  Where-Object { $_ -ne 'outputs/.gitkeep' }
foreach ($item in $trackedGenerated) { $errors.Add("Generated or cached file is tracked by Git: $item") }

Write-Host "MSPM0 workspace: $root"
Write-Host "Package version: $version"
if ($version -match '-') { Write-Host 'Release archive check: skipped for prerelease version' }
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
