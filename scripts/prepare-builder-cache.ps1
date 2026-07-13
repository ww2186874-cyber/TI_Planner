. (Join-Path $PSScriptRoot 'common.ps1')

$toolName = 'winCodeSign-2.6.0'
$cacheRoot = Join-Path $env:ELECTRON_BUILDER_CACHE 'winCodeSign'
$toolRoot = Join-Path $cacheRoot $toolName
$requiredFiles = @(
  (Join-Path $toolRoot 'rcedit-x64.exe'),
  (Join-Path $toolRoot 'windows-10\x64\signtool.exe')
)

if (($requiredFiles | Where-Object { -not (Test-Path -LiteralPath $_) }).Count -eq 0) {
  Write-Host 'Windows builder cache is ready.'
  return
}

New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
$archive = Get-ChildItem -LiteralPath $cacheRoot -Filter '*.7z' -File -ErrorAction SilentlyContinue |
  Sort-Object Length -Descending |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $archive) {
  $archive = Join-Path $cacheRoot "$toolName.7z"
  $url = "https://npmmirror.com/mirrors/electron-builder-binaries/$toolName/$toolName.7z"
  Write-Host "Downloading $toolName..."
  Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
}

$sevenZip = Get-ChildItem -LiteralPath (Join-Path $script:DesktopRoot 'node_modules\.pnpm') -Recurse -Filter '7za.exe' -File |
  Where-Object { $_.FullName -like '*7zip-bin*\win\x64\7za.exe' } |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $sevenZip) { throw 'Cannot find the bundled 7-Zip executable.' }

if (Test-Path -LiteralPath $toolRoot) { Remove-Item -LiteralPath $toolRoot -Recurse -Force }
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null

# The archive contains two macOS symbolic links that standard Windows users cannot create.
# Windows packaging only needs rcedit and the Windows signing tools, so the macOS folder is skipped.
& $sevenZip x -bd -y $archive "-o$toolRoot" '-xr!darwin'
if ($LASTEXITCODE -ne 0) { throw "7-Zip failed with exit code $LASTEXITCODE" }

$missing = $requiredFiles | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing.Count -ne 0) { throw "Windows builder cache is incomplete: $($missing -join ', ')" }
Write-Host 'Windows builder cache is ready.'
