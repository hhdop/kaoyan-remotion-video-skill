param(
  [Parameter(Mandatory=$true)]
  [string]$SkillDir,

  [Parameter(Mandatory=$true)]
  [string]$OutputDir
)

$templateDir = Join-Path $SkillDir "assets\remotion-template"
if (-not (Test-Path -LiteralPath $templateDir)) {
  throw "Template not found: $templateDir"
}

if (Test-Path -LiteralPath $OutputDir) {
  throw "OutputDir already exists: $OutputDir"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Copy-Item -Path (Join-Path $templateDir "*") -Destination $OutputDir -Recurse -Force

$publicDir = Join-Path $OutputDir "public"
New-Item -ItemType Directory -Force -Path $publicDir | Out-Null

Write-Output "Created Remotion template project: $OutputDir"
Write-Output "Next: put voice.mp3 into $publicDir, then run pnpm install and pnpm run dev."
