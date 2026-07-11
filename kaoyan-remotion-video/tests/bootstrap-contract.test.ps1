param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$PnpmPath,
  [Parameter(Mandatory = $true)][string]$BrowserPath,
  [Parameter(Mandatory = $true)][string]$FfmpegPath,
  [Parameter(Mandatory = $true)][string]$FfprobePath
)

$ErrorActionPreference = 'Stop'
$skillDir = Split-Path -Parent $PSScriptRoot
$bootstrap = Join-Path $skillDir 'scripts\bootstrap-windows.ps1'
$runtimeRoot = Join-Path $env:TEMP ("kaoyan-bootstrap-test-{0}" -f [guid]::NewGuid().ToString('N'))

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "Assertion failed: $Message" }
}

try {
  $arguments = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $bootstrap,
    '-RuntimeRoot', $runtimeRoot,
    '-NodePath', $NodePath,
    '-PnpmPath', $PnpmPath,
    '-BrowserPath', $BrowserPath,
    '-FfmpegPath', $FfmpegPath,
    '-FfprobePath', $FfprobePath,
    '-NoDownload', '-Json'
  )

  $firstText = & powershell.exe @arguments
  Assert-True ($LASTEXITCODE -eq 0) 'first bootstrap succeeds'
  $first = ($firstText -join "`n") | ConvertFrom-Json
  Assert-True ($first.ok -eq $true) 'first result is OK'
  Assert-True (Test-Path -LiteralPath (Join-Path $runtimeRoot 'runtime.json')) 'runtime manifest exists'

  $secondText = & powershell.exe @arguments
  Assert-True ($LASTEXITCODE -eq 0) 'second bootstrap succeeds'
  $second = ($secondText -join "`n") | ConvertFrom-Json
  Assert-True ($second.ok -eq $true) 'second result is OK'
  Assert-True ($first.runtime.node.path -eq $second.runtime.node.path) 'Node path is idempotent'
  Assert-True ($first.runtime.browser.path -eq $second.runtime.browser.path) 'browser path is idempotent'
  Assert-True ($first.runtime.ffmpeg.path -eq $second.runtime.ffmpeg.path) 'FFmpeg path is idempotent'

  $unexpected = Get-ChildItem -LiteralPath $runtimeRoot -Force | Where-Object { $_.Name -notin @('runtime.json') }
  Assert-True (@($unexpected).Count -eq 0) 'explicit-path bootstrap writes only the manifest'
  Write-Output 'bootstrap-contract.test.ps1: PASS'
} finally {
  if (Test-Path -LiteralPath $runtimeRoot) {
    $resolved = [System.IO.Path]::GetFullPath($runtimeRoot)
    if (-not $resolved.StartsWith([System.IO.Path]::GetFullPath($env:TEMP), [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing cleanup outside TEMP: $resolved"
    }
    [System.IO.Directory]::Delete('\\?\' + $resolved, $true)
  }
}
