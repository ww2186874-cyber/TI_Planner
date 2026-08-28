. (Join-Path $PSScriptRoot 'common.ps1')

$packageJson = Get-Content -LiteralPath (Join-Path $script:DesktopRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$packageJson.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw "Formal release version required: $version" }

$releaseRoot = Join-Path $script:ProjectRoot 'releases'
$releaseDir = Join-Path $releaseRoot "v$version"
$lockPath = Join-Path $releaseRoot ".v$version.release.lock"
if (Test-Path -LiteralPath $releaseDir) {
  throw "Release v$version already exists. Increase the version number instead of overwriting it."
}

$lockStream = $null
$lockOwned = $false
try {
  try {
    $lockStream = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $lockOwned = $true
    $lockText = "PID=$PID`r`nVersion=$version`r`nStarted=$(Get-Date -Format o)`r`n"
    $lockBytes = [Text.Encoding]::UTF8.GetBytes($lockText)
    $lockStream.Write($lockBytes, 0, $lockBytes.Length)
    $lockStream.Flush()
  } catch [IO.IOException] {
    throw "Release v$version is already being built, or a stale release lock exists: $lockPath"
  }

  & (Join-Path $PSScriptRoot 'build-portable.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Portable build failed.' }
  & (Join-Path $PSScriptRoot 'build-folder.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Folder build failed.' }
  & (Join-Path $PSScriptRoot 'archive-release.ps1') -ReleaseLockPath $lockPath
} finally {
  if ($lockStream) { $lockStream.Dispose() }
  if ($lockOwned -and (Test-Path -LiteralPath $lockPath)) { Remove-Item -LiteralPath $lockPath -Force }
}
