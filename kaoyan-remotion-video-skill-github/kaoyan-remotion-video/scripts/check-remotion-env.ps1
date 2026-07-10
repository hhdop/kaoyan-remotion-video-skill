param(
  [string]$ProjectDir = (Get-Location).Path,
  [string]$SkillDir = (Split-Path -Parent $PSScriptRoot),
  [int]$Port = 3010,
  [switch]$SkipCompositionCheck
)

$ErrorActionPreference = "Stop"
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Result {
  param([string]$Level, [string]$Message)
  if ($Level -eq "FAIL") { $failures.Add($Message) | Out-Null }
  elseif ($Level -eq "WARN") { $warnings.Add($Message) | Out-Null }
  Write-Host "[$Level] $Message"
}

function Test-RequiredPath {
  param([string]$Path, [string]$Label)
  if (Test-Path -LiteralPath $Path) {
    Add-Result "OK" "$Label exists: $Path"
    return $true
  }
  Add-Result "FAIL" "$Label missing: $Path"
  return $false
}

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

Write-Host "=== Kaoyan Remotion Preflight ==="
Write-Host "SkillDir: $SkillDir"
Write-Host "ProjectDir: $ProjectDir"

$skillOk = Test-RequiredPath $SkillDir "Skill directory"
if ($skillOk) {
  Test-RequiredPath (Join-Path $SkillDir "SKILL.md") "Skill manifest" | Out-Null
  Test-RequiredPath (Join-Path $SkillDir "assets\remotion-template\package.json") "Template package.json" | Out-Null
  Test-RequiredPath (Join-Path $SkillDir "scripts\render-remotion.ps1") "Render helper" | Out-Null
}

$projectOk = Test-RequiredPath $ProjectDir "Project directory"
if ($projectOk) {
  Test-RequiredPath (Join-Path $ProjectDir "package.json") "Project package.json" | Out-Null
  Test-RequiredPath (Join-Path $ProjectDir "src\index.ts") "Remotion entry" | Out-Null
  Test-RequiredPath (Join-Path $ProjectDir "src\Root.tsx") "Remotion root" | Out-Null
  Test-RequiredPath (Join-Path $ProjectDir "src\Video.tsx") "Remotion video" | Out-Null
  Test-RequiredPath (Join-Path $ProjectDir "src\generatedContent.ts") "Generated video content" | Out-Null

  $publicDir = Join-Path $ProjectDir "public"
  $voicePath = Join-Path $publicDir "voice.mp3"
  if (Test-Path -LiteralPath $voicePath) {
    Add-Result "OK" "Voiceover audio exists: $voicePath"
  } else {
    $audioMatch = Get-ChildItem -LiteralPath $publicDir -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '\.(mp3|wav|m4a|aac)$' } |
      Select-Object -First 1
    if ($audioMatch) {
      Add-Result "WARN" "Audio exists but is not voice.mp3: $($audioMatch.FullName). Run content generation before rendering."
    } else {
      Add-Result "FAIL" "Voiceover audio missing. Put voice.mp3 or another audio file in: $publicDir"
    }
  }

  $srtMatch = Get-ChildItem -LiteralPath $publicDir -File -Filter "*.srt" -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($srtMatch) {
    Add-Result "OK" "Transcript SRT exists: $($srtMatch.FullName)"
  } else {
    Add-Result "FAIL" "Transcript SRT missing. Put script.srt or another .srt file in: $publicDir"
  }

  if (-not (Test-Path -LiteralPath (Join-Path $ProjectDir "node_modules"))) {
    Add-Result "WARN" "node_modules missing; run pnpm install or the render helper before rendering."
  }
}

$nodePath = Find-OnPath @("node.exe", "node")
if (-not $nodePath) { $nodePath = Find-CodexRuntimeTool "node.exe" }
if ($nodePath) {
  Add-Result "OK" "Node resolved: $nodePath"
  Add-Result "OK" "Node version: $(& $nodePath -v)"
} else {
  Add-Result "FAIL" "Node was not found. Install Node.js or run inside a Codex runtime that provides Node."
}

$pnpmPath = Find-OnPath @("pnpm.cmd", "pnpm")
if (-not $pnpmPath) { $pnpmPath = Find-CodexRuntimeTool "pnpm.cmd" }
if ($pnpmPath) {
  Add-Result "OK" "pnpm resolved: $pnpmPath"
  Add-Result "OK" "pnpm version: $(& $pnpmPath -v)"
} else {
  Add-Result "FAIL" "pnpm was not found. Install pnpm or enable Corepack."
}

if ($projectOk -and $nodePath -and -not $SkipCompositionCheck) {
  $cliPath = Join-Path $ProjectDir "node_modules\@remotion\cli\remotion-cli.js"
  if (Test-Path -LiteralPath $cliPath) {
    Push-Location -LiteralPath $ProjectDir
    try {
      $oldPreference = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      $output = & $nodePath $cliPath compositions src/index.ts 2>&1
      $exitCode = $LASTEXITCODE
      $ErrorActionPreference = $oldPreference
      $text = $output -join "`n"
      if ($text -match "Caching failed") {
        Add-Result "WARN" "Webpack cache write failed; non-fatal, but renders may be slower."
      }
      if ($exitCode -eq 0 -and $text -match "Main") {
        Add-Result "OK" "Remotion compositions can be listed."
      } else {
        Add-Result "FAIL" "Remotion compositions could not be listed."
        $output | ForEach-Object { Write-Host "  $_" }
      }
    } finally {
      Pop-Location
    }
  } else {
    Add-Result "WARN" "Remotion CLI is not installed yet; run pnpm install."
  }
}

$portLine = netstat -ano | Select-String -Pattern (":$Port\s")
if ($portLine) {
  Add-Result "OK" "Port $Port is listening."
} else {
  Add-Result "WARN" "Port $Port is not listening; Remotion Studio is not running."
}

Write-Host "=== Summary ==="
Write-Host "Failures: $($failures.Count)"
Write-Host "Warnings: $($warnings.Count)"
if ($failures.Count -gt 0) { exit 1 }
exit 0
