. (Join-Path $PSScriptRoot 'common.ps1')

$packageJson = Get-Content -LiteralPath (Join-Path $script:DesktopRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$packageJson.version
if ($version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') { throw "Invalid version: $version" }

$exeName = "MSPM0-Pin-Planner-$version-Portable.exe"
$folderName = "MSPM0-Pin-Planner-$version-Folder"
$htmlName = 'mspm0g3519-pin-planner.html'
$exePath = Join-Path $script:ProjectRoot "outputs\$exeName"
$folderPath = Join-Path $script:ProjectRoot "outputs\$folderName"
$htmlPath = Join-Path $script:ProjectRoot "outputs\$htmlName"
$releaseDir = Join-Path $script:ProjectRoot "releases\v$version"

if (-not (Test-Path -LiteralPath $exePath)) { throw "Missing release executable: $exePath" }
if (-not (Test-Path -LiteralPath $folderPath)) { throw "Missing release folder build: $folderPath" }
if (-not (Test-Path -LiteralPath $htmlPath)) { throw "Missing release HTML: $htmlPath" }
if (Test-Path -LiteralPath $releaseDir) {
  throw "Release v$version already exists. Increase the version number instead of overwriting it."
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
Copy-Item -LiteralPath $exePath, $htmlPath -Destination $releaseDir
Copy-Item -LiteralPath $folderPath -Destination $releaseDir -Recurse

$exeHash = (Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash
$htmlHash = (Get-FileHash -LiteralPath $htmlPath -Algorithm SHA256).Hash
$hashText = "$exeHash  $exeName`r`n$htmlHash  $htmlName`r`n"
Set-Content -LiteralPath (Join-Path $releaseDir 'SHA256.txt') -Value $hashText -Encoding UTF8
$folderManifest = Get-ChildItem -LiteralPath (Join-Path $releaseDir $folderName) -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring((Join-Path $releaseDir $folderName).Length + 1)
  "$(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 | Select-Object -ExpandProperty Hash)  $relative"
}
Set-Content -LiteralPath (Join-Path $releaseDir 'FOLDER-SHA256.txt') -Value $folderManifest -Encoding UTF8

$date = Get-Date -Format 'yyyy-MM-dd'
$notes = @(
  "# MSPM0 Pin Planner v$version",
  '',
  "- Release date: $date",
  '- Windows x64 single-file portable build',
  '- This build is not commercially code-signed',
  '- See the project CHANGELOG.md for details'
)
Set-Content -LiteralPath (Join-Path $releaseDir 'RELEASE_NOTES.md') -Value $notes -Encoding UTF8

Write-Host "Release v$version archived at $releaseDir"
