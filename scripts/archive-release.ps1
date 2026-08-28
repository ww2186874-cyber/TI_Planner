param(
  [Parameter(Mandatory = $true)][string]$ReleaseLockPath
)

. (Join-Path $PSScriptRoot 'common.ps1')

$packageJson = Get-Content -LiteralPath (Join-Path $script:DesktopRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$packageJson.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw "Formal release version required: $version" }

$exeName = "MSPM0-Pin-Planner-$version-Portable.exe"
$folderName = "MSPM0-Pin-Planner-$version-Folder"
$htmlName = 'mspm0g3519-pin-planner.html'
$exePath = Join-Path $script:ProjectRoot "outputs\$exeName"
$folderPath = Join-Path $script:ProjectRoot "outputs\$folderName"
$htmlPath = Join-Path $script:ProjectRoot "outputs\$htmlName"
$releaseDir = Join-Path $script:ProjectRoot "releases\v$version"
$expectedLockPath = Join-Path $script:ProjectRoot "releases\.v$version.release.lock"
if ([IO.Path]::GetFullPath($ReleaseLockPath) -ne [IO.Path]::GetFullPath($expectedLockPath) -or -not (Test-Path -LiteralPath $expectedLockPath)) {
  throw "archive-release.ps1 must run through create-release.ps1 with the v$version release lock."
}

if (-not (Test-Path -LiteralPath $exePath)) { throw "Missing release executable: $exePath" }
if (-not (Test-Path -LiteralPath $folderPath)) { throw "Missing release folder build: $folderPath" }
if (-not (Test-Path -LiteralPath $htmlPath)) { throw "Missing release HTML: $htmlPath" }
if (Test-Path -LiteralPath $releaseDir) {
  throw "Release v$version already exists. Increase the version number instead of overwriting it."
}

$stagingDir = Join-Path (Split-Path -Parent $releaseDir) ".v$version-$([guid]::NewGuid().ToString('N')).staging"
try {
  New-Item -ItemType Directory -Path $stagingDir | Out-Null
  Copy-Item -LiteralPath $exePath, $htmlPath -Destination $stagingDir
  Copy-Item -LiteralPath $folderPath -Destination $stagingDir -Recurse

  $archivedExe = Join-Path $stagingDir $exeName
  $archivedHtml = Join-Path $stagingDir $htmlName
  $exeHash = (Get-FileHash -LiteralPath $archivedExe -Algorithm SHA256).Hash
  $htmlHash = (Get-FileHash -LiteralPath $archivedHtml -Algorithm SHA256).Hash
  $hashText = "$exeHash  $exeName`r`n$htmlHash  $htmlName"
  Set-Content -LiteralPath (Join-Path $stagingDir 'SHA256.txt') -Value $hashText -Encoding UTF8
  $archivedFolder = Join-Path $stagingDir $folderName
  $folderManifest = Get-ChildItem -LiteralPath $archivedFolder -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($archivedFolder.Length + 1)
    "$(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 | Select-Object -ExpandProperty Hash)  $relative"
  }
  Set-Content -LiteralPath (Join-Path $stagingDir 'FOLDER-SHA256.txt') -Value $folderManifest -Encoding UTF8

  $date = Get-Date -Format 'yyyy-MM-dd'
  $notes = @(
    "# MSPM0 Pin Planner v$version",
    '',
    "- Release date: $date",
    "- Single-file portable build: $exeName",
    "- Fast-start folder build: $folderName",
    "- Offline web build: $htmlName",
    '- Copy the entire folder build when using or distributing it; do not copy only its EXE.',
    '- This build is not commercially code-signed',
    '- See the project CHANGELOG.md for details'
  )
  Set-Content -LiteralPath (Join-Path $stagingDir 'RELEASE_NOTES.md') -Value $notes -Encoding UTF8

  if (Test-Path -LiteralPath $releaseDir) { throw "Release v$version was created concurrently." }
  [IO.Directory]::Move($stagingDir, $releaseDir)
} finally {
  if (Test-Path -LiteralPath $stagingDir) { Remove-Item -LiteralPath $stagingDir -Recurse -Force }
}

Write-Host "Release v$version archived at $releaseDir"
