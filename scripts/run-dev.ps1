. (Join-Path $PSScriptRoot 'common.ps1')

if (-not (Test-Path -LiteralPath (Join-Path $script:DesktopRoot 'node_modules\electron'))) {
  Invoke-Pnpm install --frozen-lockfile
}
Invoke-Pnpm run start
