$ErrorActionPreference = 'Stop'

$script:ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:DesktopRoot = Join-Path $script:ProjectRoot 'desktop'

function Find-Executable {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string[]]$Candidates
  )

  foreach ($candidate in $Candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
  }

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  throw "Cannot find $Name. Run this project through Codex, or install Node.js and pnpm."
}

$codexRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$script:NodeExe = Find-Executable -Name 'node' -Candidates @(
  $env:MSPM0_NODE,
  (Join-Path $script:ProjectRoot 'tools\node\node.exe'),
  (Join-Path $codexRuntime 'node\bin\node.exe')
)
$script:PnpmExe = Find-Executable -Name 'pnpm' -Candidates @(
  $env:MSPM0_PNPM,
  (Join-Path $script:ProjectRoot 'tools\pnpm.cmd'),
  (Join-Path $codexRuntime 'bin\fallback\pnpm.cmd')
)

$nodeDirectory = Split-Path -Parent $script:NodeExe
if (($env:Path -split ';') -notcontains $nodeDirectory) {
  $env:Path = "$nodeDirectory;$env:Path"
}

$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
$env:ELECTRON_CACHE = Join-Path $script:ProjectRoot '.cache\electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $script:ProjectRoot '.cache\electron-builder'
$script:PnpmStore = Join-Path $script:ProjectRoot '.pnpm-store'
$env:pnpm_config_store_dir = $script:PnpmStore

New-Item -ItemType Directory -Path $env:ELECTRON_CACHE, $env:ELECTRON_BUILDER_CACHE, $script:PnpmStore -Force | Out-Null

function Invoke-Pnpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  Push-Location $script:DesktopRoot
  try {
    & $script:PnpmExe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "pnpm failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

function Ensure-DesktopBuildDependencies {
  $required = @(
    (Join-Path $script:DesktopRoot 'node_modules\electron\package.json'),
    (Join-Path $script:DesktopRoot 'node_modules\electron\dist\electron.exe'),
    (Join-Path $script:DesktopRoot 'node_modules\electron-builder\package.json'),
    (Join-Path $script:DesktopRoot 'node_modules\electron-builder\out\cli\cli.js')
  )
  $missing = @($required | Where-Object { -not (Test-Path -LiteralPath $_) })
  if ($missing.Count -eq 0) { return }

  $previousCi = $env:CI
  try {
    $env:CI = 'true'
    Invoke-Pnpm install --frozen-lockfile
  } finally {
    $env:CI = $previousCi
  }

  foreach ($path in $required) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing desktop build dependency: $path" }
  }
}
