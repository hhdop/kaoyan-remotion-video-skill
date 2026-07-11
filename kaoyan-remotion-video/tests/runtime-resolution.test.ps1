param(
  [string]$NodePath = '',
  [string]$PnpmPath = '',
  [string]$BrowserPath = '',
  [string]$FfmpegPath = '',
  [string]$FfprobePath = ''
)

$ErrorActionPreference = 'Stop'
$modulePath = Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts\lib\KaoyanRuntime.psm1'
Import-Module $modulePath -Force

if (-not $NodePath) {
  $NodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not $PnpmPath) {
  $PnpmPath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "Assertion failed: $Message" }
}

function Assert-Equal {
  param($Actual, $Expected, [string]$Message)
  if ($Actual -ne $Expected) { throw "Assertion failed: $Message. Expected '$Expected', got '$Actual'." }
}

$runtimeRoot = Join-Path $env:TEMP ("kaoyan-runtime-test-{0}" -f [guid]::NewGuid().ToString('N'))
try {
  $resolvedRoot = Get-KaoyanRuntimeRoot -RuntimeRoot $runtimeRoot
  Assert-Equal $resolvedRoot ([System.IO.Path]::GetFullPath($runtimeRoot)) 'explicit runtime root wins'

  $shortPreferred = Join-Path $env:TEMP 'kaoyan-short-root'
  $shortTemp = Get-KaoyanShortTempRoot -PreferredRoot $shortPreferred -ReservedLength 24 -MaxPathLength 120
  Assert-Equal $shortTemp ([System.IO.Path]::GetFullPath($shortPreferred)) 'short preferred temp root is retained'

  $longPreferred = Join-Path $env:TEMP ('nested-' + ('x' * 160))
  $fallbackTemp = Get-KaoyanShortTempRoot -PreferredRoot $longPreferred -ReservedLength 24 -MaxPathLength 120
  Assert-Equal $fallbackTemp ([System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())) 'long preferred temp root falls back to the system temp root'

  $node = Resolve-KaoyanNode -ExplicitPath $NodePath -RuntimeRoot $runtimeRoot
  Assert-True ($null -ne $node) 'explicit Node resolves'
  Assert-Equal $node.Path ([System.IO.Path]::GetFullPath($NodePath)) 'resolved Node path matches'
  Assert-True $node.Version.StartsWith('v') 'Node version is executable output'

  $pnpm = Resolve-KaoyanPnpm -ExplicitPath $PnpmPath -NodePath $node.Path -RuntimeRoot $runtimeRoot
  Assert-True ($null -ne $pnpm) 'explicit pnpm resolves'
  Assert-True ([version]$pnpm.Version -ge [version]'1.0.0') 'pnpm version is executable output'
  Assert-Equal $pnpm.NodePath $node.Path 'pnpm retains the executable Node path'

  if ($BrowserPath) {
    $browser = Resolve-KaoyanBrowser -ExplicitPath $BrowserPath -RuntimeRoot $runtimeRoot
    Assert-True ($null -ne $browser) 'explicit browser resolves'
  }

  if ($FfmpegPath -and $FfprobePath) {
    $ffmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $FfmpegPath -ExplicitFfprobePath $FfprobePath -RuntimeRoot $runtimeRoot
    Assert-True ($null -ne $ffmpeg) 'explicit FFmpeg and FFprobe resolve'
  }

  $manifest = [ordered]@{
    schemaVersion = 1
    node = [ordered]@{path = $node.Path; version = $node.Version}
    pnpm = [ordered]@{path = $pnpm.Path; version = $pnpm.Version}
  }
  $manifestPath = Write-KaoyanRuntimeManifest -Manifest $manifest -RuntimeRoot $runtimeRoot
  Assert-True (Test-Path -LiteralPath $manifestPath) 'manifest is written'
  $roundTrip = Read-KaoyanRuntimeManifest -RuntimeRoot $runtimeRoot
  Assert-Equal $roundTrip.node.path $node.Path 'manifest round-trips Node path'

  Write-Output 'runtime-resolution.test.ps1: PASS'
} finally {
  if (Test-Path -LiteralPath $runtimeRoot) {
    $resolved = [System.IO.Path]::GetFullPath($runtimeRoot)
    if (-not $resolved.StartsWith([System.IO.Path]::GetFullPath($env:TEMP), [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing cleanup outside TEMP: $resolved"
    }
    [System.IO.Directory]::Delete('\\?\' + $resolved, $true)
  }
}
