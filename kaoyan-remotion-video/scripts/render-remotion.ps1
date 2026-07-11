param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectDir,
  [ValidateSet('preview', '4k')]
  [string]$Mode = 'preview',
  [string]$OutputPath = '',
  [string]$OutputBaseName = '',
  [ValidateSet('auto', 'native', 'external')]
  [string]$Renderer = 'auto',
  [int]$ChunkSize = 900,
  [int]$Concurrency = 0,
  [int]$JpegQuality = 94,
  [int]$Crf = -1,
  [string]$RuntimeRoot = '',
  [string]$NodePath = '',
  [string]$PnpmPath = '',
  [string]$BrowserPath = '',
  [string]$FfmpegPath = '',
  [string]$FfprobePath = '',
  [switch]$KeepFrames,
  [switch]$SkipInstall,
  [switch]$SkipPreflight,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$startedAt = [DateTime]::UtcNow
$report = [ordered]@{
  status = 'starting'
  mode = $Mode
  requestedRenderer = $Renderer
  renderer = $null
  fallbackUsed = $false
  outputPath = $null
  reportPath = $null
  frameDirectory = $null
  nativeFailure = $null
  verification = $null
  startedAt = $startedAt.ToString('o')
  completedAt = $null
  error = $null
}

function Invoke-CapturedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = ''
  )
  $previousPreference = $ErrorActionPreference
  if ($WorkingDirectory) { Push-Location -LiteralPath $WorkingDirectory }
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $Path @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{exitCode = $exitCode; output = (($output | ForEach-Object { "$_" }) -join "`n")}
  } catch {
    return [pscustomobject]@{exitCode = -1; output = $_.Exception.Message}
  } finally {
    $ErrorActionPreference = $previousPreference
    if ($WorkingDirectory) { Pop-Location }
  }
}

function Invoke-PnpmInstall {
  param($Pnpm, [string]$WorkingDirectory, [string]$ResolvedNodePath)
  $arguments = @('install', '--frozen-lockfile', '--config.update-notifier=false')
  $previousNotifier = $env:NO_UPDATE_NOTIFIER
  $previousSelfUpdate = $env:PNPM_DISABLE_SELF_UPDATE_CHECK
  $env:NO_UPDATE_NOTIFIER = '1'
  $env:PNPM_DISABLE_SELF_UPDATE_CHECK = 'true'
  try {
    if ($Pnpm.Kind -eq 'node-script') {
      $nodeArguments = @($Pnpm.Path) + $arguments
      $result = Invoke-CapturedCommand -Path $ResolvedNodePath -Arguments $nodeArguments -WorkingDirectory $WorkingDirectory
    } else {
      $previousPath = $env:Path
      try {
        $env:Path = "$(Split-Path -Parent $ResolvedNodePath);$previousPath"
        $result = Invoke-CapturedCommand -Path $Pnpm.Path -Arguments $arguments -WorkingDirectory $WorkingDirectory
      } finally {
        $env:Path = $previousPath
      }
    }
    if ($result.exitCode -ne 0) { throw "PNPM_INSTALL_FAILED: $($result.output)" }
  } finally {
    $env:NO_UPDATE_NOTIFIER = $previousNotifier
    $env:PNPM_DISABLE_SELF_UPDATE_CHECK = $previousSelfUpdate
  }
}

function Get-GeneratedMetadata {
  param([string]$GeneratedPath)
  if (-not (Test-Path -LiteralPath $GeneratedPath -PathType Leaf)) {
    throw "GENERATED_CONTENT_MISSING: $GeneratedPath"
  }
  $text = Get-Content -LiteralPath $GeneratedPath -Raw -Encoding UTF8
  $fpsMatch = [regex]::Match($text, '["'']?fps["'']?\s*:\s*(\d+(?:\.\d+)?)')
  $framesMatch = [regex]::Match($text, '["'']?durationInFrames["'']?\s*:\s*(\d+)')
  $audioMatch = [regex]::Match($text, '["'']?audioFile["'']?\s*:\s*["'']([^"'']+)["'']')
  if (-not $fpsMatch.Success -or -not $framesMatch.Success -or -not $audioMatch.Success) {
    throw 'GENERATED_METADATA_INVALID: fps, durationInFrames, or audioFile is missing.'
  }
  $fps = [double]::Parse($fpsMatch.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
  $durationInFrames = [int]$framesMatch.Groups[1].Value
  return [pscustomobject]@{
    Fps = $fps
    DurationInFrames = $durationInFrames
    DurationSeconds = $durationInFrames / $fps
    AudioFile = $audioMatch.Groups[1].Value
  }
}

function Get-FpsValue {
  param([string]$Rate)
  if ($Rate -match '^(\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)$') {
    $numerator = [double]::Parse($matches[1], [Globalization.CultureInfo]::InvariantCulture)
    $denominator = [double]::Parse($matches[2], [Globalization.CultureInfo]::InvariantCulture)
    if ($denominator -ne 0) { return $numerator / $denominator }
  }
  return [double]::Parse($Rate, [Globalization.CultureInfo]::InvariantCulture)
}

function Test-RenderedMedia {
  param(
    [string]$Path,
    [string]$Ffprobe,
    [int]$ExpectedWidth,
    [int]$ExpectedHeight,
    [double]$ExpectedFps,
    [double]$ExpectedDuration
  )
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf) -or (Get-Item -LiteralPath $Path).Length -le 0) {
    throw "OUTPUT_MISSING: $Path"
  }
  $probe = Invoke-CapturedCommand -Path $Ffprobe -Arguments @('-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,width,height,r_frame_rate', '-show_entries', 'format=duration', '-of', 'json', $Path)
  if ($probe.exitCode -ne 0) { throw "OUTPUT_PROBE_FAILED: $($probe.output)" }
  $data = $probe.output | ConvertFrom-Json
  $video = @($data.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1)
  $audio = @($data.streams | Where-Object { $_.codec_type -eq 'audio' } | Select-Object -First 1)
  if ($video.Count -ne 1) { throw 'OUTPUT_VIDEO_STREAM_MISSING' }
  if ($audio.Count -ne 1) { throw 'OUTPUT_AUDIO_STREAM_MISSING' }
  if ($video[0].codec_name -ne 'h264') { throw "OUTPUT_CODEC_INVALID: $($video[0].codec_name)" }
  if ([int]$video[0].width -ne $ExpectedWidth -or [int]$video[0].height -ne $ExpectedHeight) {
    throw "OUTPUT_DIMENSIONS_INVALID: $($video[0].width)x$($video[0].height)"
  }
  $actualFps = Get-FpsValue -Rate "$($video[0].r_frame_rate)"
  if ([math]::Abs($actualFps - $ExpectedFps) -gt 0.02) { throw "OUTPUT_FPS_INVALID: $actualFps" }
  $duration = [double]::Parse("$($data.format.duration)", [Globalization.CultureInfo]::InvariantCulture)
  $durationTolerance = [math]::Max(0.35, 2 / $ExpectedFps)
  if ([math]::Abs($duration - $ExpectedDuration) -gt $durationTolerance) {
    throw "OUTPUT_DURATION_INVALID: expected $ExpectedDuration, received $duration"
  }
  return [pscustomobject]@{
    width = [int]$video[0].width
    height = [int]$video[0].height
    fps = $actualFps
    durationSeconds = $duration
    videoCodec = $video[0].codec_name
    audioCodec = $audio[0].codec_name
    fileSize = (Get-Item -LiteralPath $Path).Length
  }
}

function Write-RenderReport {
  param([string]$Path)
  $jsonText = [pscustomobject]$report | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($Path, $jsonText, (New-Object System.Text.UTF8Encoding($false)))
}

function Get-NativeFailureKind {
  param([string]$Text)
  if ($Text -match '(?i)smart app control|blocked|compositor|ffmpeg\.exe|0x8007|eperm|eacces|unknownapp') { return 'security-or-compositor-blocked' }
  if ($Text -match '(?i)browser|chrome|headless') { return 'browser-failed' }
  return 'native-render-failed'
}

$ProjectDir = [System.IO.Path]::GetFullPath($ProjectDir)
if (-not (Test-Path -LiteralPath $ProjectDir -PathType Container)) { throw "PROJECT_MISSING: $ProjectDir" }
$runtimeModule = Join-Path $PSScriptRoot 'lib\KaoyanRuntime.psm1'
$sequenceModule = Join-Path $PSScriptRoot 'lib\RenderSequence.psm1'
Import-Module $runtimeModule -Force | Out-Null
Import-Module $sequenceModule -Force | Out-Null

$node = Resolve-KaoyanNode -ExplicitPath $NodePath -RuntimeRoot $RuntimeRoot
if (-not $node) { throw 'NODE_MISSING' }
$pnpm = Resolve-KaoyanPnpm -ExplicitPath $PnpmPath -NodePath $node.Path -RuntimeRoot $RuntimeRoot
if (-not $pnpm) { throw 'PNPM_MISSING' }
$browser = Resolve-KaoyanBrowser -ExplicitPath $BrowserPath -RuntimeRoot $RuntimeRoot
if (-not $browser) { throw 'BROWSER_MISSING' }
$ffmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $FfmpegPath -ExplicitFfprobePath $FfprobePath -RuntimeRoot $RuntimeRoot
if (-not $ffmpeg) { throw 'FFMPEG_MISSING' }
$env:REMOTION_BROWSER_EXECUTABLE = $browser.Path

$nodeModules = Join-Path $ProjectDir 'node_modules'
if (-not $SkipInstall -and -not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
  Invoke-PnpmInstall -Pnpm $pnpm -WorkingDirectory $ProjectDir -ResolvedNodePath $node.Path
}
$cliPath = Join-Path $ProjectDir 'node_modules\@remotion\cli\remotion-cli.js'
if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) { throw "REMOTION_CLI_MISSING: $cliPath" }

$metadata = Get-GeneratedMetadata -GeneratedPath (Join-Path $ProjectDir 'src\generatedContent.ts')
$composition = if ($Mode -eq '4k') { 'Main4K' } else { 'Main' }
$expectedWidth = if ($Mode -eq '4k') { 3840 } else { 1280 }
$expectedHeight = if ($Mode -eq '4k') { 2160 } else { 720 }
if ($Crf -lt 0) { $Crf = if ($Mode -eq '4k') { 12 } else { 18 } }
if ($JpegQuality -lt 1 -or $JpegQuality -gt 100) { throw 'JPEG_QUALITY_INVALID' }

$outDir = Join-Path $ProjectDir 'out'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (-not $OutputPath) {
  $OutputPath = Join-Path $outDir (Get-RenderOutputName -ProjectDir $ProjectDir -Mode $Mode -OutputBaseName $OutputBaseName)
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $ProjectDir $OutputPath
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
$reportPath = "$OutputPath.render-report.json"
$report.outputPath = $OutputPath
$report.reportPath = $reportPath

if (Test-Path -LiteralPath $OutputPath -PathType Leaf) {
  try {
    $stream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    $stream.Dispose()
  } catch {
    throw "OUTPUT_LOCKED: $OutputPath"
  }
}

try {
  if (-not $SkipPreflight) {
    $preflightScript = Join-Path $PSScriptRoot 'check-remotion-env.ps1'
    $preflightArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $preflightScript, '-ProjectDir', $ProjectDir, '-OutputDir', (Split-Path -Parent $OutputPath), '-RuntimeRoot', $RuntimeRoot, '-NodePath', $node.Path, '-PnpmPath', $pnpm.Path, '-BrowserPath', $browser.Path, '-FfmpegPath', $ffmpeg.Path, '-FfprobePath', $ffmpeg.FfprobePath, '-Json')
    $preflight = Invoke-CapturedCommand -Path 'powershell.exe' -Arguments $preflightArgs
    if ($preflight.exitCode -ne 0) { throw "PREFLIGHT_FAILED: $($preflight.output)" }
  }

  $nativeSucceeded = $false
  if ($Renderer -ne 'external') {
    $nativeArgs = @($cliPath, 'render', 'src/index.ts', $composition, $OutputPath, '--codec', 'h264', '--audio-codec', 'aac', '--audio-bitrate', '192k', '--pixel-format', 'yuv420p', '--crf', "$Crf", '--bundle-cache=false', '--log=info')
    if ($Mode -eq '4k') {
      $nativeArgs += @('--image-format', 'png')
    } else {
      $nativeArgs += @('--image-format', 'jpeg', '--jpeg-quality', "$JpegQuality")
    }
    if ($Concurrency -gt 0) { $nativeArgs += @('--concurrency', "$Concurrency") }
    $nativeResult = Invoke-CapturedCommand -Path $node.Path -Arguments $nativeArgs -WorkingDirectory $ProjectDir
    if ($nativeResult.exitCode -eq 0) {
      try {
        $report.verification = Test-RenderedMedia -Path $OutputPath -Ffprobe $ffmpeg.FfprobePath -ExpectedWidth $expectedWidth -ExpectedHeight $expectedHeight -ExpectedFps $metadata.Fps -ExpectedDuration $metadata.DurationSeconds
        $nativeSucceeded = $true
        $report.renderer = 'native'
      } catch {
        $report.nativeFailure = [pscustomobject]@{kind = 'native-output-invalid'; message = $_.Exception.Message}
      }
    } else {
      $report.nativeFailure = [pscustomobject]@{kind = (Get-NativeFailureKind -Text $nativeResult.output); message = $nativeResult.output}
    }
    if (-not $nativeSucceeded -and $Renderer -eq 'native') {
      throw "NATIVE_RENDER_FAILED: $($report.nativeFailure.message)"
    }
  }

  if (-not $nativeSucceeded) {
    $report.fallbackUsed = ($Renderer -eq 'auto')
    $report.renderer = 'external'
    if (Test-Path -LiteralPath $OutputPath -PathType Leaf) { Remove-Item -LiteralPath $OutputPath -Force }
    $frameDir = Join-Path (Split-Path -Parent $OutputPath) ('frames-' + [System.IO.Path]::GetFileNameWithoutExtension($OutputPath) + '-' + [guid]::NewGuid().ToString('N'))
    $resolvedFrameDir = [System.IO.Path]::GetFullPath($frameDir)
    $resolvedOutputDir = [System.IO.Path]::GetFullPath((Split-Path -Parent $OutputPath)).TrimEnd('\') + '\'
    if (-not $resolvedFrameDir.StartsWith($resolvedOutputDir, [StringComparison]::OrdinalIgnoreCase)) {
      throw "FRAME_DIRECTORY_UNSAFE: $resolvedFrameDir"
    }
    New-Item -ItemType Directory -Force -Path $frameDir | Out-Null
    $report.frameDirectory = $frameDir
    foreach ($chunk in @(Get-FrameChunks -DurationInFrames $metadata.DurationInFrames -ChunkSize $ChunkSize)) {
      $sequenceArgs = @($cliPath, 'render', 'src/index.ts', $composition, $frameDir, '--sequence', '--image-format', 'jpeg', '--jpeg-quality', "$JpegQuality", "--frames=$($chunk.Start)-$($chunk.End)", '--image-sequence-pattern=frame-[frame].[ext]', '--bundle-cache=false', '--log=info')
      if ($Concurrency -gt 0) { $sequenceArgs += @('--concurrency', "$Concurrency") }
      $sequenceResult = Invoke-CapturedCommand -Path $node.Path -Arguments $sequenceArgs -WorkingDirectory $ProjectDir
      if ($sequenceResult.exitCode -ne 0) { throw "FRAME_RENDER_FAILED: $($sequenceResult.output)" }
    }
    Rename-RenderFrames -FrameDir $frameDir -DurationInFrames $metadata.DurationInFrames | Out-Null
    $audioPath = if ([System.IO.Path]::IsPathRooted($metadata.AudioFile)) { $metadata.AudioFile } else { Join-Path (Join-Path $ProjectDir 'public') $metadata.AudioFile }
    if (-not (Test-Path -LiteralPath $audioPath -PathType Leaf)) { throw "AUDIO_MISSING: $audioPath" }
    $fpsText = [string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0:0.###}', $metadata.Fps)
    $durationText = [string]::Format([Globalization.CultureInfo]::InvariantCulture, '{0:0.###}', $metadata.DurationSeconds)
    $ffmpegArgs = @('-y', '-framerate', $fpsText, '-start_number', '0', '-i', (Join-Path $frameDir 'frame-%06d.jpeg'), '-i', $audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', "$Crf", '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', $durationText, '-movflags', '+faststart', $OutputPath)
    $muxResult = Invoke-CapturedCommand -Path $ffmpeg.Path -Arguments $ffmpegArgs
    if ($muxResult.exitCode -ne 0) { throw "FFMPEG_MUX_FAILED: $($muxResult.output)" }
    $report.verification = Test-RenderedMedia -Path $OutputPath -Ffprobe $ffmpeg.FfprobePath -ExpectedWidth $expectedWidth -ExpectedHeight $expectedHeight -ExpectedFps $metadata.Fps -ExpectedDuration $metadata.DurationSeconds
    if (-not $KeepFrames) {
      Remove-Item -LiteralPath $resolvedFrameDir -Recurse -Force
      $report.frameDirectory = $null
    }
  }

  $report.status = 'complete'
  $report.completedAt = [DateTime]::UtcNow.ToString('o')
  Write-RenderReport -Path $reportPath
  if ($Json) {
    Write-Output ([pscustomobject]$report | ConvertTo-Json -Depth 8 -Compress)
  } else {
    Write-Output "Rendered $Mode video with $($report.renderer): $OutputPath"
    Write-Output "Verification report: $reportPath"
  }
} catch {
  $report.status = 'failed'
  $report.error = $_.Exception.Message
  $report.completedAt = [DateTime]::UtcNow.ToString('o')
  Write-RenderReport -Path $reportPath
  if ($Json) { Write-Output ([pscustomobject]$report | ConvertTo-Json -Depth 8 -Compress) }
  throw
}
