param(
  [string]$ProjectDir = (Get-Location).Path,
  [string]$SrtPath = "",
  [string]$AudioFile = "",
  [string]$Title = "",
  [ValidateSet('auto', 'planning', 'news', 'knowledge')]
  [string]$Profile = 'auto',
  [int]$Fps = 30,
  [double]$AudioDurationSeconds = 0,
  [double]$TailHoldSeconds = 0,
  [string]$NodePath = "",
  [string]$FfmpegPath = "",
  [string]$FfprobePath = "",
  [string]$RuntimeRoot = ""
)

$ErrorActionPreference = "Stop"

function Find-OnPath {
  param([string[]]$Names)
  foreach ($name in $Names) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

function Find-CodexRuntimeTool {
  param([string]$FileName)
  $roots = @(
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes"),
    (Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes")
  )
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $match = Get-ChildItem -LiteralPath $root -Recurse -File -Filter $FileName -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($match) { return $match.FullName }
  }
  return $null
}

if (-not (Test-Path -LiteralPath $ProjectDir)) {
  throw "ProjectDir does not exist: $ProjectDir"
}

if (-not $NodePath) { $NodePath = Find-OnPath @("node.exe", "node") }
if (-not $NodePath) { $NodePath = Find-CodexRuntimeTool "node.exe" }
if (-not $NodePath -or -not (Test-Path -LiteralPath $NodePath)) {
  throw "Node was not found. Install Node.js or run inside a Codex runtime that provides Node."
}

if ($AudioDurationSeconds -le 0) {
  $runtimeModule = Join-Path $PSScriptRoot 'lib\KaoyanRuntime.psm1'
  if (Test-Path -LiteralPath $runtimeModule) {
    Import-Module $runtimeModule -Force
    $ffmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $FfmpegPath -ExplicitFfprobePath $FfprobePath -RuntimeRoot $RuntimeRoot
    if ($ffmpeg) {
      $publicDir = Join-Path $ProjectDir 'public'
      $audioPath = if ($AudioFile) {
        if ([System.IO.Path]::IsPathRooted($AudioFile)) { $AudioFile } else { Join-Path $publicDir $AudioFile }
      } else {
        $preferred = Join-Path $publicDir 'voice.mp3'
        if (Test-Path -LiteralPath $preferred) {
          $preferred
        } else {
          Get-ChildItem -LiteralPath $publicDir -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '\.(mp3|wav|m4a|aac)$' } |
            Select-Object -First 1 -ExpandProperty FullName
        }
      }
      if ($audioPath -and (Test-Path -LiteralPath $audioPath)) {
        $durationText = & $ffmpeg.FfprobePath -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $audioPath
        if ($LASTEXITCODE -eq 0) {
          $parsedDuration = 0.0
          if ([double]::TryParse(($durationText | Select-Object -First 1), [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsedDuration)) {
            $AudioDurationSeconds = $parsedDuration
          }
        }
      }
    }
  }
}

$generatorPath = Join-Path $PSScriptRoot "generate-remotion-content.mjs"
if (-not (Test-Path -LiteralPath $generatorPath)) {
  throw "Generator script not found: $generatorPath"
}

$nodeArgs = @($generatorPath, "--project-dir", $ProjectDir, "--fps", "$Fps")
if ($SrtPath) { $nodeArgs += @("--srt", $SrtPath) }
if ($AudioFile) { $nodeArgs += @("--audio", $AudioFile) }
if ($Title) { $nodeArgs += @("--title", $Title) }
$nodeArgs += @('--profile', $Profile, '--tail-hold', "$TailHoldSeconds")
if ($AudioDurationSeconds -gt 0) { $nodeArgs += @('--audio-duration', ([string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0:0.###}', $AudioDurationSeconds))) }

& $NodePath @nodeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Content generation failed with exit code $LASTEXITCODE"
}
