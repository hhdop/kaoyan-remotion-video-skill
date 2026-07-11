param()

$ErrorActionPreference = 'Stop'
$skillDir = Split-Path -Parent $PSScriptRoot
$modulePath = Join-Path $skillDir 'scripts\lib\RenderSequence.psm1'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("kaoyan-render-" + [guid]::NewGuid().ToString('N'))

function Assert-Equal {
  param($Actual, $Expected, [string]$Message)
  if ($Actual -ne $Expected) { throw "$Message Expected '$Expected', received '$Actual'." }
}

try {
  Import-Module $modulePath -Force

  Assert-Equal (Get-RenderOutputName -ProjectDir 'C:\work\summer-plan' -Mode preview) 'summer-plan-720p-preview.mp4' 'Preview name mismatch.'
  Assert-Equal (Get-RenderOutputName -ProjectDir 'C:\work\summer-plan' -Mode 4k) 'summer-plan-4k.mp4' '4K name mismatch.'
  Assert-Equal (Get-RenderOutputName -ProjectDir 'C:\work\summer-plan' -Mode preview -OutputBaseName 'july-plan') 'july-plan-720p-preview.mp4' 'Explicit base name mismatch.'

  $chunks = @(Get-FrameChunks -DurationInFrames 10 -ChunkSize 4)
  Assert-Equal $chunks.Count 3 'Chunk count mismatch.'
  Assert-Equal $chunks[0].Start 0 'First chunk start mismatch.'
  Assert-Equal $chunks[0].End 3 'First chunk end mismatch.'
  Assert-Equal $chunks[1].Start 4 'Second chunk start mismatch.'
  Assert-Equal $chunks[2].End 9 'Final chunk end mismatch.'

  New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
  @('element-000000.jpeg', 'frame1.jpeg', 'chunk-02-000002.jpg') | ForEach-Object {
    [System.IO.File]::WriteAllBytes((Join-Path $testRoot $_), [byte[]](1, 2, 3))
  }
  $plan = @(Get-NormalizedFramePlan -FrameDir $testRoot -DurationInFrames 3)
  Assert-Equal $plan.Count 3 'Normalized frame count mismatch.'
  Assert-Equal $plan[2].TargetName 'frame-000002.jpeg' 'Normalized target name mismatch.'

  Remove-Item -LiteralPath (Join-Path $testRoot 'frame1.jpeg') -Force
  $missingFailed = $false
  try {
    Get-NormalizedFramePlan -FrameDir $testRoot -DurationInFrames 3 | Out-Null
  } catch {
    $missingFailed = $_.Exception.Message -match 'FRAME_SEQUENCE_INCOMPLETE'
  }
  if (-not $missingFailed) { throw 'Missing frames were not rejected.' }

  Write-Output 'render-contract.test.ps1: PASS'
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
