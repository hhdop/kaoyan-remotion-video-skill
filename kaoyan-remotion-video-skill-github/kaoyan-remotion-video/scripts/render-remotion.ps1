param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectDir,

  [ValidateSet("preview", "4k")]
  [string]$Mode = "preview",

  [string]$PnpmPath = "C:\Users\yz\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd",
  [string]$NodeBin = "C:\Users\yz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
)

if (-not (Test-Path -LiteralPath $ProjectDir)) {
  throw "ProjectDir does not exist: $ProjectDir"
}

if (-not (Test-Path -LiteralPath $PnpmPath)) {
  throw "pnpm not found: $PnpmPath"
}

$env:Path = "$NodeBin;$env:Path"
$scriptName = if ($Mode -eq "4k") { "render:4k" } else { "render" }

Push-Location -LiteralPath $ProjectDir
try {
  & $PnpmPath run $scriptName
  if ($LASTEXITCODE -ne 0) {
    throw "Render failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
