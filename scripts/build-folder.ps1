. (Join-Path $PSScriptRoot 'common.ps1')

Ensure-DesktopBuildDependencies
& (Join-Path $PSScriptRoot 'prepare-builder-cache.ps1')
Invoke-Pnpm run build:folder
Write-Host "Fast-start folder build is available in $(Join-Path $script:ProjectRoot 'outputs')."
