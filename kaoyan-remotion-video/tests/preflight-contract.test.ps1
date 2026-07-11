param()

$ErrorActionPreference = 'Stop'
$skillDir = Split-Path -Parent $PSScriptRoot
$preflight = Join-Path $skillDir 'scripts\check-remotion-env.ps1'
$runtimeModule = Join-Path $skillDir 'scripts\lib\KaoyanRuntime.psm1'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("kaoyan-preflight-" + [guid]::NewGuid().ToString('N'))

Import-Module $runtimeModule -Force

function Assert-ContainsCode {
  param($Report, [string]$Code)
  $codes = @($Report.failures | ForEach-Object { $_.code })
  if ($codes -notcontains $Code) {
    throw "Expected failure code '$Code', received: $($codes -join ', ')"
  }
}

function New-TestProject {
  param([string]$Name, [switch]$InvalidSrt, [switch]$MissingTsconfig)
  $project = Join-Path $testRoot $Name
  New-Item -ItemType Directory -Force -Path (Join-Path $project 'src'), (Join-Path $project 'public'), (Join-Path $project 'node_modules\@remotion\cli') | Out-Null
  @('package.json', 'remotion.config.ts') | ForEach-Object {
    Set-Content -LiteralPath (Join-Path $project $_) -Value '{}' -Encoding UTF8
  }
  if (-not $MissingTsconfig) {
    Set-Content -LiteralPath (Join-Path $project 'tsconfig.json') -Value '{}' -Encoding UTF8
  }
  @('index.ts', 'Root.tsx', 'Video.tsx', 'timeline.ts', 'motion.ts', 'visualSystem.ts') | ForEach-Object {
    Set-Content -LiteralPath (Join-Path $project "src\$_") -Value '// fixture' -Encoding UTF8
  }
  Set-Content -LiteralPath (Join-Path $project 'src\generatedContent.ts') -Value 'export const generatedVideo = {durationSeconds: 2};' -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $project 'node_modules\@remotion\cli\remotion-cli.js') -Value '// fixture' -Encoding UTF8
  [System.IO.File]::WriteAllBytes((Join-Path $project 'public\voice.mp3'), [byte[]](0x49, 0x44, 0x33))
  $srt = if ($InvalidSrt) { 'this is not an srt timeline' } else { "1`n00:00:00,000 --> 00:00:02,000`n测试文稿。`n" }
  Set-Content -LiteralPath (Join-Path $project 'public\script.srt') -Value $srt -Encoding UTF8
  return $project
}

function Invoke-PreflightJson {
  param([string]$ProjectDir, [string]$OutputDir = '')
  $runtimeRoot = Join-Path $testRoot 'runtime'
  $node = Resolve-KaoyanNode -RuntimeRoot $runtimeRoot
  $pnpm = Resolve-KaoyanPnpm -NodePath $(if ($node) { $node.Path } else { '' }) -RuntimeRoot $runtimeRoot
  $browser = Resolve-KaoyanBrowser -RuntimeRoot $runtimeRoot
  $ffmpeg = Resolve-KaoyanFfmpeg -RuntimeRoot $runtimeRoot
  $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $preflight, '-ProjectDir', $ProjectDir, '-RuntimeRoot', $runtimeRoot, '-Json', '-SkipCompositionCheck')
  if ($OutputDir) { $arguments += @('-OutputDir', $OutputDir) }
  if ($node) { $arguments += @('-NodePath', $node.Path) }
  if ($pnpm) { $arguments += @('-PnpmPath', $pnpm.Path) }
  if ($browser) { $arguments += @('-BrowserPath', $browser.Path) }
  if ($ffmpeg) { $arguments += @('-FfmpegPath', $ffmpeg.Path, '-FfprobePath', $ffmpeg.FfprobePath) }
  $output = & powershell.exe @arguments 2>$null
  $text = ($output -join "`n").Trim()
  if (-not $text) { throw 'Preflight returned no JSON output.' }
  return $text | ConvertFrom-Json
}

try {
  New-Item -ItemType Directory -Force -Path $testRoot | Out-Null

  $missingTsconfig = New-TestProject -Name 'missing-tsconfig' -MissingTsconfig
  Assert-ContainsCode (Invoke-PreflightJson -ProjectDir $missingTsconfig) 'SCAFFOLD_MISSING'

  $invalidSrt = New-TestProject -Name 'invalid-srt' -InvalidSrt
  Assert-ContainsCode (Invoke-PreflightJson -ProjectDir $invalidSrt) 'SRT_INVALID'

  $invalidBrowser = Join-Path $testRoot 'not-a-browser.exe'
  Set-Content -LiteralPath $invalidBrowser -Value 'blocked' -Encoding UTF8
  $browserProject = New-TestProject -Name 'invalid-browser'
  $browserArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $preflight, '-ProjectDir', $browserProject, '-BrowserPath', $invalidBrowser, '-RuntimeRoot', (Join-Path $testRoot 'runtime-browser'), '-Json', '-SkipCompositionCheck')
  $browserReport = ((& powershell.exe @browserArgs 2>$null) -join "`n") | ConvertFrom-Json
  Assert-ContainsCode $browserReport 'BROWSER_INVALID'

  $invalidProbe = Join-Path $testRoot 'not-ffprobe.exe'
  Set-Content -LiteralPath $invalidProbe -Value 'blocked' -Encoding UTF8
  $probeProject = New-TestProject -Name 'invalid-probe'
  $probeArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $preflight, '-ProjectDir', $probeProject, '-FfprobePath', $invalidProbe, '-RuntimeRoot', (Join-Path $testRoot 'runtime-probe'), '-Json', '-SkipCompositionCheck')
  $probeReport = ((& powershell.exe @probeArgs 2>$null) -join "`n") | ConvertFrom-Json
  Assert-ContainsCode $probeReport 'FFPROBE_INVALID'

  $outputFile = Join-Path $testRoot 'not-a-directory'
  Set-Content -LiteralPath $outputFile -Value 'file' -Encoding UTF8
  $outputProject = New-TestProject -Name 'invalid-output'
  Assert-ContainsCode (Invoke-PreflightJson -ProjectDir $outputProject -OutputDir $outputFile) 'OUTPUT_UNWRITABLE'

  Write-Output 'preflight-contract.test.ps1: PASS'
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
