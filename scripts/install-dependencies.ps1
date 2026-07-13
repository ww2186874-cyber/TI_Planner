. (Join-Path $PSScriptRoot 'common.ps1')

Write-Host 'Installing Electron development dependencies...'
Invoke-Pnpm install --frozen-lockfile
Write-Host 'Dependencies are ready.'
