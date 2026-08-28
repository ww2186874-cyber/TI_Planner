. (Join-Path $PSScriptRoot 'common.ps1')

Ensure-DesktopBuildDependencies
Invoke-Pnpm run start
