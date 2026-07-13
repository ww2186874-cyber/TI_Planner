. (Join-Path $PSScriptRoot 'common.ps1')

& $script:NodeExe (Join-Path $script:ProjectRoot 'web\build.js')
if ($LASTEXITCODE -ne 0) { throw "Web build failed with exit code $LASTEXITCODE" }
Write-Host 'Web build completed.'
