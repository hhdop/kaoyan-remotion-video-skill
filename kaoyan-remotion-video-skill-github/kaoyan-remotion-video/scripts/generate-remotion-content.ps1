param(
  [string]$ProjectDir = (Get-Location).Path,
  [string]$SrtPath = "",
  [string]$AudioFile = "",
  [string]$Title = "",
  [int]$Fps = 30,
  [string]$NodePath = ""
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

$generatorPath = Join-Path $PSScriptRoot "generate-remotion-content.mjs"
if (-not (Test-Path -LiteralPath $generatorPath)) {
  throw "Generator script not found: $generatorPath"
}

$nodeArgs = @($generatorPath, "--project-dir", $ProjectDir, "--fps", "$Fps")
if ($SrtPath) { $nodeArgs += @("--srt", $SrtPath) }
if ($AudioFile) { $nodeArgs += @("--audio", $AudioFile) }
if ($Title) { $nodeArgs += @("--title", $Title) }

& $NodePath @nodeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Content generation failed with exit code $LASTEXITCODE"
}
