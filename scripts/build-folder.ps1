. (Join-Path $PSScriptRoot 'common.ps1')

if (-not (Test-Path -LiteralPath (Join-Path $script:DesktopRoot 'node_modules\electron'))) {
  Invoke-Pnpm install --frozen-lockfile
}
& (Join-Path $PSScriptRoot 'prepare-builder-cache.ps1')
Invoke-Pnpm run build:folder
Write-Host "Fast-start folder build is available in $(Join-Path $script:ProjectRoot 'outputs')."
