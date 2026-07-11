param(
  [string]$ProjectDir = (Get-Location).Path,
  [string]$SkillDir = (Split-Path -Parent $PSScriptRoot),
  [int]$Port = 3010,
  [string]$OutputDir = '',
  [string]$RuntimeRoot = '',
  [string]$NodePath = '',
  [string]$PnpmPath = '',
  [string]$BrowserPath = '',
  [string]$FfmpegPath = '',
  [string]$FfprobePath = '',
  [double]$DurationToleranceSeconds = 0.35,
  [switch]$Bootstrap,
  [switch]$SkipCompositionCheck,
  [switch]$RenderStill,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$checks = New-Object System.Collections.Generic.List[object]
$failures = New-Object System.Collections.Generic.List[object]
$warnings = New-Object System.Collections.Generic.List[object]
$runtime = [ordered]@{}
$media = [ordered]@{}
$compositions = @()

function Add-Check {
  param(
    [string]$Code,
    [ValidateSet('ok', 'warning', 'failed')][string]$Status,
    [string]$Message,
    $Data = $null
  )
  $item = [pscustomobject]@{code = $Code; status = $Status; message = $Message; data = $Data}
  $checks.Add($item) | Out-Null
  if ($Status -eq 'failed') { $failures.Add($item) | Out-Null }
  if ($Status -eq 'warning') { $warnings.Add($item) | Out-Null }
  if (-not $Json) {
    $label = if ($Status -eq 'ok') { 'OK' } elseif ($Status -eq 'warning') { 'WARN' } else { 'FAIL' }
    Write-Host "[$label] $Code - $Message"
  }
}

function Test-ScaffoldFile {
  param([string]$RelativePath)
  $path = Join-Path $ProjectDir $RelativePath
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    Add-Check 'SCAFFOLD_FILE_OK' 'ok' "$RelativePath exists." $path
    return $true
  }
  Add-Check 'SCAFFOLD_MISSING' 'failed' "Required project file is missing: $RelativePath" $path
  return $false
}

function Get-FirstMediaFile {
  param([string]$Directory, [string[]]$PreferredNames, [string]$Pattern)
  foreach ($name in $PreferredNames) {
    $candidate = Join-Path $Directory $name
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  }
  $match = Get-ChildItem -LiteralPath $Directory -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match $Pattern } |
    Select-Object -First 1
  if ($match) { return $match.FullName }
  return $null
}

function Get-GeneratedDuration {
  param([string]$GeneratedPath)
  if (-not (Test-Path -LiteralPath $GeneratedPath -PathType Leaf)) { return $null }
  $text = Get-Content -LiteralPath $GeneratedPath -Raw -Encoding UTF8
  $match = [regex]::Match($text, '["'']?durationSeconds["'']?\s*:\s*(\d+(?:\.\d+)?)')
  if (-not $match.Success) { return $null }
  $value = 0.0
  if ([double]::TryParse($match.Groups[1].Value, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$value)) {
    return $value
  }
  return $null
}

function Invoke-CapturedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string[]]$Arguments = @()
  )
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $Path @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
      exitCode = $exitCode
      output = (($output | ForEach-Object { "$_" }) -join "`n")
    }
  } catch {
    return [pscustomobject]@{exitCode = -1; output = $_.Exception.Message}
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

function Write-ReportAndExit {
  $status = if ($failures.Count -gt 0) { 'failed' } elseif ($warnings.Count -gt 0) { 'warning' } else { 'ready' }
  $report = [pscustomobject]@{
    status = $status
    checks = $checks.ToArray()
    failures = $failures.ToArray()
    warnings = $warnings.ToArray()
    runtime = [pscustomobject]$runtime
    media = [pscustomobject]$media
    compositions = @($compositions)
    projectDir = $ProjectDir
    outputDir = $OutputDir
  }
  if ($Json) {
    Write-Output ($report | ConvertTo-Json -Depth 8 -Compress)
  } else {
    Write-Host "Preflight status: $status; failures=$($failures.Count); warnings=$($warnings.Count)"
  }
  if ($failures.Count -gt 0) { exit 1 }
  exit 0
}

$ProjectDir = [System.IO.Path]::GetFullPath($ProjectDir)
$SkillDir = [System.IO.Path]::GetFullPath($SkillDir)
if (-not $OutputDir) { $OutputDir = Join-Path $ProjectDir 'out' }
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)

$runtimeModule = Join-Path $PSScriptRoot 'lib\KaoyanRuntime.psm1'
if (-not (Test-Path -LiteralPath $runtimeModule -PathType Leaf)) {
  Add-Check 'RUNTIME_MODULE_MISSING' 'failed' 'The shared Windows runtime module is missing.' $runtimeModule
  Write-ReportAndExit
}
Import-Module $runtimeModule -Force | Out-Null

if ($Bootstrap) {
  $bootstrapScript = Join-Path $PSScriptRoot 'bootstrap-windows.ps1'
  $bootstrapArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $bootstrapScript, '-ProjectDir', $ProjectDir, '-RuntimeRoot', $RuntimeRoot, '-Json')
  if ($NodePath) { $bootstrapArgs += @('-NodePath', $NodePath) }
  if ($PnpmPath) { $bootstrapArgs += @('-PnpmPath', $PnpmPath) }
  if ($BrowserPath) { $bootstrapArgs += @('-BrowserPath', $BrowserPath) }
  if ($FfmpegPath) { $bootstrapArgs += @('-FfmpegPath', $FfmpegPath) }
  if ($FfprobePath) { $bootstrapArgs += @('-FfprobePath', $FfprobePath) }
  $bootstrapResult = Invoke-CapturedCommand -Path 'powershell.exe' -Arguments $bootstrapArgs
  if ($bootstrapResult.exitCode -eq 0) {
    Add-Check 'BOOTSTRAP_OK' 'ok' 'Windows runtime bootstrap completed.'
  } else {
    Add-Check 'BOOTSTRAP_FAILED' 'failed' 'Windows runtime bootstrap failed.' $bootstrapResult.output
  }
}

if (-not (Test-Path -LiteralPath $ProjectDir -PathType Container)) {
  Add-Check 'PROJECT_MISSING' 'failed' 'Project directory does not exist.' $ProjectDir
  Write-ReportAndExit
}

$requiredFiles = @(
  'package.json',
  'tsconfig.json',
  'remotion.config.ts',
  'src\index.ts',
  'src\Root.tsx',
  'src\Video.tsx',
  'src\generatedContent.ts',
  'src\timeline.ts',
  'src\motion.ts',
  'src\visualSystem.ts'
)
foreach ($relativePath in $requiredFiles) { Test-ScaffoldFile $relativePath | Out-Null }

$resolvedNode = Resolve-KaoyanNode -ExplicitPath $NodePath -RuntimeRoot $RuntimeRoot
if ($resolvedNode) {
  $runtime.node = $resolvedNode
  $env:Path = "$(Split-Path -Parent $resolvedNode.Path);$env:Path"
  Add-Check 'NODE_OK' 'ok' "Node is executable: $($resolvedNode.Version)" $resolvedNode.Path
} else {
  Add-Check 'NODE_MISSING' 'failed' 'Node.js could not be resolved or executed.' $NodePath
}

$resolvedPnpm = Resolve-KaoyanPnpm -ExplicitPath $PnpmPath -NodePath $(if ($resolvedNode) { $resolvedNode.Path } else { '' }) -RuntimeRoot $RuntimeRoot
if ($resolvedPnpm) {
  $runtime.pnpm = $resolvedPnpm
  Add-Check 'PNPM_OK' 'ok' "pnpm is executable: $($resolvedPnpm.Version)" $resolvedPnpm.Path
} else {
  Add-Check 'PNPM_MISSING' 'failed' 'pnpm could not be resolved or executed.' $PnpmPath
}

if ($BrowserPath) {
  $browserTest = Test-KaoyanExecutable -Path $BrowserPath -Arguments @('--version')
  if (-not $browserTest.Ok) {
    Add-Check 'BROWSER_INVALID' 'failed' 'The explicit browser path is not executable.' $BrowserPath
  }
}
$resolvedBrowser = Resolve-KaoyanBrowser -ExplicitPath $BrowserPath -RuntimeRoot $RuntimeRoot
if ($resolvedBrowser) {
  $runtime.browser = $resolvedBrowser
  $env:REMOTION_BROWSER_EXECUTABLE = $resolvedBrowser.Path
  Add-Check 'BROWSER_OK' 'ok' 'A Remotion-compatible browser is executable.' $resolvedBrowser.Path
} elseif (-not $BrowserPath) {
  Add-Check 'BROWSER_MISSING' 'failed' 'Chrome, Edge, or Playwright Headless Shell could not be resolved.'
}

if ($FfprobePath) {
  $probeTest = Test-KaoyanExecutable -Path $FfprobePath -Arguments @('-version')
  if (-not $probeTest.Ok) {
    Add-Check 'FFPROBE_INVALID' 'failed' 'The explicit FFprobe path is not executable.' $FfprobePath
  }
}
$resolvedFfmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $FfmpegPath -ExplicitFfprobePath $FfprobePath -RuntimeRoot $RuntimeRoot
if ($resolvedFfmpeg) {
  $runtime.ffmpeg = $resolvedFfmpeg
  Add-Check 'FFMPEG_OK' 'ok' 'FFmpeg and FFprobe are executable.' $resolvedFfmpeg.Path
} elseif (-not $FfprobePath) {
  Add-Check 'FFMPEG_MISSING' 'failed' 'FFmpeg and FFprobe could not be resolved as an executable pair.'
}

$publicDir = Join-Path $ProjectDir 'public'
$audioPath = Get-FirstMediaFile -Directory $publicDir -PreferredNames @('voice.mp3', 'voice.wav', 'voice.m4a') -Pattern '\.(mp3|wav|m4a|aac)$'
$srtPath = Get-FirstMediaFile -Directory $publicDir -PreferredNames @('script.srt') -Pattern '\.srt$'
if ($audioPath) {
  $media.audioPath = $audioPath
  Add-Check 'AUDIO_OK' 'ok' 'Voiceover audio was found.' $audioPath
} else {
  Add-Check 'AUDIO_MISSING' 'failed' 'No supported voiceover audio exists in public/.' $publicDir
}
if ($srtPath) {
  $media.srtPath = $srtPath
  Add-Check 'SRT_FOUND' 'ok' 'Transcript SRT was found.' $srtPath
} else {
  Add-Check 'SRT_MISSING' 'failed' 'No transcript SRT exists in public/.' $publicDir
}

if ($srtPath -and $resolvedNode) {
  $generator = Join-Path $PSScriptRoot 'generate-remotion-content.mjs'
  $inspectResult = Invoke-CapturedCommand -Path $resolvedNode.Path -Arguments @($generator, '--inspect', '--srt', $srtPath)
  if ($inspectResult.exitCode -eq 0) {
    try {
      $inspection = $inspectResult.output | ConvertFrom-Json
      $media.srt = $inspection
      Add-Check 'SRT_OK' 'ok' "SRT parsed into $($inspection.cueCount) timed cues." $inspection
    } catch {
      Add-Check 'SRT_INVALID' 'failed' 'SRT inspection did not return valid JSON.' $inspectResult.output
    }
  } else {
    Add-Check 'SRT_INVALID' 'failed' 'SRT could not be parsed by the content generator.' $inspectResult.output
  }
}

if ($audioPath -and $resolvedFfmpeg) {
  $probeResult = Invoke-CapturedCommand -Path $resolvedFfmpeg.FfprobePath -Arguments @('-v', 'error', '-show_entries', 'format=duration', '-of', 'json', $audioPath)
  if ($probeResult.exitCode -eq 0) {
    try {
      $probeJson = $probeResult.output | ConvertFrom-Json
      $audioDuration = [double]::Parse("$($probeJson.format.duration)", [Globalization.CultureInfo]::InvariantCulture)
      $media.audioDurationSeconds = $audioDuration
      Add-Check 'AUDIO_PROBE_OK' 'ok' "Audio duration is $([math]::Round($audioDuration, 3)) seconds." $audioDuration
      $generatedDuration = Get-GeneratedDuration -GeneratedPath (Join-Path $ProjectDir 'src\generatedContent.ts')
      if ($null -eq $generatedDuration) {
        Add-Check 'GENERATED_DURATION_MISSING' 'failed' 'generatedContent.ts does not expose durationSeconds.'
      } else {
        $media.generatedDurationSeconds = $generatedDuration
        $delta = [math]::Abs($generatedDuration - $audioDuration)
        if ($delta -le $DurationToleranceSeconds) {
          Add-Check 'DURATION_OK' 'ok' "Generated duration matches audio within $DurationToleranceSeconds seconds." $delta
        } else {
          Add-Check 'DURATION_MISMATCH' 'failed' 'Generated duration does not match the measured audio duration.' $delta
        }
      }
    } catch {
      Add-Check 'AUDIO_PROBE_FAILED' 'failed' 'FFprobe output could not be parsed.' $probeResult.output
    }
  } else {
    Add-Check 'AUDIO_PROBE_FAILED' 'failed' 'FFprobe could not read the voiceover audio.' $probeResult.output
  }
}

$nodeModules = Join-Path $ProjectDir 'node_modules'
if (-not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
  Add-Check 'NODE_MODULES_MISSING' 'failed' 'Project-local node_modules is missing.' $nodeModules
} else {
  $nodeModulesItem = Get-Item -LiteralPath $nodeModules -Force
  if (($nodeModulesItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    Add-Check 'NODE_MODULES_LINKED' 'failed' 'node_modules must be local, not a junction or symbolic link.' $nodeModules
  } else {
    Add-Check 'NODE_MODULES_OK' 'ok' 'Project-local node_modules is present.' $nodeModules
  }
}

$cliPath = Join-Path $ProjectDir 'node_modules\@remotion\cli\remotion-cli.js'
if (Test-Path -LiteralPath $cliPath -PathType Leaf) {
  Add-Check 'REMOTION_CLI_OK' 'ok' 'Project-local Remotion CLI exists.' $cliPath
} else {
  Add-Check 'REMOTION_CLI_MISSING' 'failed' 'Project-local Remotion CLI is missing.' $cliPath
}

try {
  if (Test-Path -LiteralPath $OutputDir -PathType Leaf) {
    throw 'The output path is a file.'
  }
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $probeFile = Join-Path $OutputDir ('.write-probe-' + [guid]::NewGuid().ToString('N') + '.tmp')
  [System.IO.File]::WriteAllText($probeFile, 'ok', (New-Object System.Text.UTF8Encoding($false)))
  Remove-Item -LiteralPath $probeFile -Force
  Add-Check 'OUTPUT_WRITABLE' 'ok' 'Output directory is writable.' $OutputDir
} catch {
  Add-Check 'OUTPUT_UNWRITABLE' 'failed' 'Output directory is not writable.' "$OutputDir :: $($_.Exception.Message)"
}

if (-not $SkipCompositionCheck -and $resolvedNode -and $resolvedBrowser -and (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
  Push-Location -LiteralPath $ProjectDir
  try {
    $compositionResult = Invoke-CapturedCommand -Path $resolvedNode.Path -Arguments @($cliPath, 'compositions', 'src/index.ts')
    if ($compositionResult.exitCode -ne 0) {
      Add-Check 'COMPOSITION_DISCOVERY_FAILED' 'failed' "Remotion composition discovery failed with exit code $($compositionResult.exitCode)." $compositionResult.output
    } elseif ($compositionResult.output -match '(?m)^Main\s' -and $compositionResult.output -match '(?m)^Main4K\s') {
      $compositions = @('Main', 'Main4K')
      Add-Check 'COMPOSITIONS_OK' 'ok' 'Main and Main4K compositions were discovered.' $compositions
    } else {
      Add-Check 'COMPOSITIONS_MISSING' 'failed' 'Composition discovery ran, but Main and Main4K were not both present.' $compositionResult.output
    }

    if ($RenderStill -and $compositionResult.exitCode -eq 0) {
      $stillPath = Join-Path $OutputDir 'preflight-still.png'
      $stillResult = Invoke-CapturedCommand -Path $resolvedNode.Path -Arguments @($cliPath, 'still', 'src/index.ts', 'Main', $stillPath, '--frame=15')
      if ($stillResult.exitCode -eq 0 -and (Test-Path -LiteralPath $stillPath -PathType Leaf) -and (Get-Item -LiteralPath $stillPath).Length -gt 0) {
        Add-Check 'STILL_OK' 'ok' 'Representative Remotion still rendered successfully.' $stillPath
      } else {
        Add-Check 'STILL_FAILED' 'failed' 'Representative Remotion still failed.' $stillResult.output
      }
    }
  } finally {
    Pop-Location
  }
}

$isListening = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
  Where-Object { $_.Port -eq $Port } |
  Select-Object -First 1
if ($isListening) {
  Add-Check 'STUDIO_PORT_ACTIVE' 'ok' "Port $Port is listening." $Port
} else {
  Add-Check 'STUDIO_NOT_RUNNING' 'warning' "Port $Port is available; Remotion Studio is not currently running." $Port
}

Write-ReportAndExit
