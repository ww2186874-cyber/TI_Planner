. (Join-Path $PSScriptRoot 'common.ps1')

& (Join-Path $PSScriptRoot 'build-portable.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Portable build failed.' }
& (Join-Path $PSScriptRoot 'build-folder.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Folder build failed.' }
& (Join-Path $PSScriptRoot 'archive-release.ps1')
