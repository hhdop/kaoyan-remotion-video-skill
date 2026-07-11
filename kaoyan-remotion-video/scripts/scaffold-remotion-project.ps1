param(
  [Parameter(Mandatory=$true)]
  [string]$SkillDir,

  [Parameter(Mandatory=$true)]
  [string]$OutputDir
)

$ErrorActionPreference = 'Stop'

$templateDir = Join-Path $SkillDir "assets\remotion-template"
if (-not (Test-Path -LiteralPath $templateDir)) {
  throw "Template not found: $templateDir"
}

if (Test-Path -LiteralPath $OutputDir) {
  throw "OutputDir already exists: $OutputDir"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$excludedTemplateEntries = @('node_modules', 'out', 'public', 'frames', '.cache', '.remotion')
Get-ChildItem -LiteralPath $templateDir -Force |
  Where-Object { $_.Name -notin $excludedTemplateEntries } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $OutputDir $_.Name) -Recurse -Force
  }

$publicDir = Join-Path $OutputDir "public"
New-Item -ItemType Directory -Force -Path $publicDir | Out-Null

Write-Output "Created Remotion template project: $OutputDir"
Write-Output "Next: put voice.mp3 and script.srt into $publicDir."
Write-Output "Then run scripts\generate-remotion-content.ps1 from the skill directory before preflight/rendering."
