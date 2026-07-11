param(
  [string]$NodePath = '',
  [string]$PnpmPath = '',
  [string]$BrowserPath = '',
  [string]$FfmpegPath = '',
  [string]$FfprobePath = '',
  [string]$TempRoot = '',
  [switch]$SkipScaffoldSmoke,
  [switch]$KeepTemp
)

$ErrorActionPreference = 'Stop'
$skillDir = Split-Path -Parent $PSScriptRoot
$repoDir = Split-Path -Parent $skillDir
$runtimeModule = Join-Path $PSScriptRoot 'lib\KaoyanRuntime.psm1'
Import-Module $runtimeModule -Force | Out-Null

function Write-Step {
  param([string]$Name)
  Write-Output "`n=== $Name ==="
}

function Invoke-Checked {
  param([string]$Path, [string[]]$Arguments, [string]$WorkingDirectory = '')
  if ($WorkingDirectory) { Push-Location -LiteralPath $WorkingDirectory }
  try {
    & $Path @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $Path $($Arguments -join ' ')" }
  } finally {
    if ($WorkingDirectory) { Pop-Location }
  }
}

$requestedTempRoot = if ($TempRoot) { [System.IO.Path]::GetFullPath($TempRoot) } else { [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()) }
$TempRoot = Get-KaoyanShortTempRoot -PreferredRoot $requestedTempRoot -ReservedLength 24 -MaxPathLength 120
if ($TempRoot -ne $requestedTempRoot) {
  Write-Output "Long temporary path detected; smoke test will use: $TempRoot"
}
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
$sessionRoot = Join-Path $TempRoot ('krs-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$runtimeRoot = Join-Path $sessionRoot 'runtime'
$projectDir = Join-Path $sessionRoot 'project'

try {
  New-Item -ItemType Directory -Force -Path $sessionRoot | Out-Null
  $node = Resolve-KaoyanNode -ExplicitPath $NodePath -RuntimeRoot $runtimeRoot
  if (-not $node) { throw 'NODE_MISSING' }
  $pnpm = Resolve-KaoyanPnpm -ExplicitPath $PnpmPath -NodePath $node.Path -RuntimeRoot $runtimeRoot
  if (-not $pnpm) { throw 'PNPM_MISSING' }
  $browser = Resolve-KaoyanBrowser -ExplicitPath $BrowserPath -RuntimeRoot $runtimeRoot
  if (-not $browser) { throw 'BROWSER_MISSING' }
  $ffmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $FfmpegPath -ExplicitFfprobePath $FfprobePath -RuntimeRoot $runtimeRoot
  if (-not $ffmpeg) { throw 'FFMPEG_MISSING' }

  Write-Step 'Node tests (node --test)'
  $nodeTests = Get-ChildItem -LiteralPath (Join-Path $skillDir 'tests') -Filter '*.test.mjs' -File |
    Sort-Object Name |
    Select-Object -ExpandProperty FullName
  if (-not (Test-Path -LiteralPath (Join-Path $repoDir 'README.md') -PathType Leaf)) {
    $nodeTests = @($nodeTests | Where-Object { (Split-Path -Leaf $_) -notin @('ci-contract.test.mjs', 'documentation-contract.test.mjs') })
    Write-Output 'Installed-copy mode: repository-only documentation and CI contracts skipped.'
  }
  Invoke-Checked -Path $node.Path -Arguments (@('--test') + @($nodeTests)) -WorkingDirectory $repoDir

  Write-Step 'PowerShell contract tests'
  $runtimeTestArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $skillDir 'tests\runtime-resolution.test.ps1'), '-NodePath', $node.Path, '-PnpmPath', $pnpm.Path, '-BrowserPath', $browser.Path, '-FfmpegPath', $ffmpeg.Path, '-FfprobePath', $ffmpeg.FfprobePath)
  Invoke-Checked -Path 'powershell.exe' -Arguments $runtimeTestArgs
  $bootstrapTestArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $skillDir 'tests\bootstrap-contract.test.ps1'), '-NodePath', $node.Path, '-PnpmPath', $pnpm.Path, '-BrowserPath', $browser.Path, '-FfmpegPath', $ffmpeg.Path, '-FfprobePath', $ffmpeg.FfprobePath)
  Invoke-Checked -Path 'powershell.exe' -Arguments $bootstrapTestArgs
  foreach ($testName in @('preflight-contract.test.ps1', 'studio-contract.test.ps1', 'render-contract.test.ps1')) {
    Invoke-Checked -Path 'powershell.exe' -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $skillDir "tests\$testName"))
  }

  if ($SkipScaffoldSmoke) {
    Write-Output 'test-skill.ps1: PASS (scaffold smoke skipped)'
    exit 0
  }

  Write-Step 'Fresh scaffold'
  Invoke-Checked -Path 'powershell.exe' -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'scaffold-remotion-project.ps1'), '-SkillDir', $skillDir, '-OutputDir', $projectDir)
  foreach ($excluded in @('node_modules', 'out')) {
    if (Test-Path -LiteralPath (Join-Path $projectDir $excluded)) { throw "SCAFFOLD_NOT_CLEAN: $excluded" }
  }
  if (Get-ChildItem -LiteralPath (Join-Path $projectDir 'public') -File -ErrorAction SilentlyContinue) {
    throw 'SCAFFOLD_NOT_CLEAN: public contains media.'
  }

  Write-Step 'Planning fixture and generated content'
  $audioPath = Join-Path $projectDir 'public\voice.mp3'
  Invoke-Checked -Path $ffmpeg.Path -Arguments @('-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '12', '-c:a', 'libmp3lame', '-b:a', '128k', $audioPath)
  Copy-Item -LiteralPath (Join-Path $skillDir 'tests\fixtures\planning.srt') -Destination (Join-Path $projectDir 'public\script.srt') -Force
  $generatorArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'generate-remotion-content.ps1'), '-ProjectDir', $projectDir, '-Profile', 'planning', '-NodePath', $node.Path, '-FfmpegPath', $ffmpeg.Path, '-FfprobePath', $ffmpeg.FfprobePath, '-RuntimeRoot', $runtimeRoot)
  Invoke-Checked -Path 'powershell.exe' -Arguments $generatorArgs
  $generatedText = Get-Content -LiteralPath (Join-Path $projectDir 'src\generatedContent.ts') -Raw -Encoding UTF8
  if ($generatedText -notmatch '"profile": "planning"' -or $generatedText -match '原专业课') {
    throw 'PLANNING_PROFILE_INVALID'
  }

  Write-Step 'Project-local dependency install'
  $previousPath = $env:Path
  $previousNotifier = $env:NO_UPDATE_NOTIFIER
  $previousSelfUpdate = $env:PNPM_DISABLE_SELF_UPDATE_CHECK
  try {
    $env:Path = "$(Split-Path -Parent $node.Path);$previousPath"
    $env:NO_UPDATE_NOTIFIER = '1'
    $env:PNPM_DISABLE_SELF_UPDATE_CHECK = 'true'
    if ($pnpm.Kind -eq 'node-script') {
      Invoke-Checked -Path $node.Path -Arguments @($pnpm.Path, 'install', '--frozen-lockfile', '--config.update-notifier=false') -WorkingDirectory $projectDir
    } else {
      Invoke-Checked -Path $pnpm.Path -Arguments @('install', '--frozen-lockfile', '--config.update-notifier=false') -WorkingDirectory $projectDir
    }
  } finally {
    $env:Path = $previousPath
    $env:NO_UPDATE_NOTIFIER = $previousNotifier
    $env:PNPM_DISABLE_SELF_UPDATE_CHECK = $previousSelfUpdate
  }

  Write-Step 'Preflight and representative stills'
  $preflightArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'check-remotion-env.ps1'), '-ProjectDir', $projectDir, '-RuntimeRoot', $runtimeRoot, '-NodePath', $node.Path, '-PnpmPath', $pnpm.Path, '-BrowserPath', $browser.Path, '-FfmpegPath', $ffmpeg.Path, '-FfprobePath', $ffmpeg.FfprobePath, '-RenderStill')
  Invoke-Checked -Path 'powershell.exe' -Arguments $preflightArgs

  $cliPath = Join-Path $projectDir 'node_modules\@remotion\cli\remotion-cli.js'
  $env:REMOTION_BROWSER_EXECUTABLE = $browser.Path
  $still4K = Join-Path $projectDir 'out\preflight-still-4k.png'
  Invoke-Checked -Path $node.Path -Arguments @($cliPath, 'still', 'src/index.ts', 'Main4K', $still4K, '--frame=183', '--log=error') -WorkingDirectory $projectDir
  if (-not (Test-Path -LiteralPath $still4K -PathType Leaf) -or (Get-Item -LiteralPath $still4K).Length -le 0) {
    throw 'STILL_4K_MISSING'
  }

  Write-Output "Fresh project: $projectDir"
  Write-Output 'test-skill.ps1: PASS'
} finally {
  if (-not $KeepTemp -and (Test-Path -LiteralPath $sessionRoot)) {
    $resolvedSession = [System.IO.Path]::GetFullPath($sessionRoot)
    $resolvedParent = $TempRoot.TrimEnd('\') + '\'
    if (-not $resolvedSession.StartsWith($resolvedParent, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing cleanup outside TempRoot: $resolvedSession"
    }
    Remove-Item -LiteralPath $resolvedSession -Recurse -Force -ErrorAction SilentlyContinue
  }
}
