param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectDir,

  [int]$Port = 3010,
  [string]$HostName = "127.0.0.1",
  [string]$NodePath = "",
  [switch]$SkipInstall
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

$pnpmPath = Find-OnPath @("pnpm.cmd", "pnpm")
if (-not $pnpmPath) { $pnpmPath = Find-CodexRuntimeTool "pnpm.cmd" }

$env:Path = "$(Split-Path -Parent $NodePath);$env:Path"

Push-Location -LiteralPath $ProjectDir
try {
  if (-not $SkipInstall -and -not (Test-Path -LiteralPath (Join-Path $ProjectDir "node_modules"))) {
    if (-not $pnpmPath) { throw "pnpm was not found. Install pnpm or enable Corepack." }
    & $pnpmPath install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed with exit code $LASTEXITCODE" }
  }

  $cliPath = Join-Path $ProjectDir "node_modules\@remotion\cli\remotion-cli.js"
  if (-not (Test-Path -LiteralPath $cliPath)) {
    throw "Remotion CLI not found. Run pnpm install first: $cliPath"
  }

  Write-Output "Starting Remotion Studio at http://localhost:$Port"
  Write-Output "Keep this process running while previewing in the browser."
  & $NodePath $cliPath studio src/index.ts --port $Port --host $HostName
} finally {
  Pop-Location
}
