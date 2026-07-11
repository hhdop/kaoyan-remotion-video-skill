Set-StrictMode -Version Latest

function Get-RenderOutputName {
  param(
    [Parameter(Mandatory = $true)][string]$ProjectDir,
    [ValidateSet('preview', '4k')][string]$Mode = 'preview',
    [string]$OutputBaseName = ''
  )
  $baseName = if ($OutputBaseName) { $OutputBaseName } else { Split-Path -Leaf ([System.IO.Path]::GetFullPath($ProjectDir)) }
  $baseName = ($baseName -replace '[^A-Za-z0-9._-]+', '-').Trim('-').Trim()
  if (-not $baseName) { $baseName = 'kaoyan-video' }
  if ($Mode -eq '4k') { return "$baseName-4k.mp4" }
  return "$baseName-720p-preview.mp4"
}

function Get-FrameChunks {
  param(
    [Parameter(Mandatory = $true)][int]$DurationInFrames,
    [int]$ChunkSize = 900
  )
  if ($DurationInFrames -le 0) { throw 'FRAME_DURATION_INVALID: DurationInFrames must be positive.' }
  if ($ChunkSize -le 0) { throw 'FRAME_CHUNK_INVALID: ChunkSize must be positive.' }
  for ($start = 0; $start -lt $DurationInFrames; $start += $ChunkSize) {
    $end = [math]::Min($DurationInFrames - 1, $start + $ChunkSize - 1)
    [pscustomobject]@{Start = $start; End = $end; Count = $end - $start + 1}
  }
}

function Get-FrameNumber {
  param([Parameter(Mandatory = $true)][string]$FileName)
  $match = [regex]::Match($FileName, '(\d+)(?=\.(?:jpe?g|png)$)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if (-not $match.Success) { return $null }
  return [int]$match.Groups[1].Value
}

function Get-NormalizedFramePlan {
  param(
    [Parameter(Mandatory = $true)][string]$FrameDir,
    [Parameter(Mandatory = $true)][int]$DurationInFrames
  )
  if (-not (Test-Path -LiteralPath $FrameDir -PathType Container)) {
    throw "FRAME_DIRECTORY_MISSING: $FrameDir"
  }
  $byNumber = @{}
  $files = Get-ChildItem -LiteralPath $FrameDir -File -ErrorAction Stop |
    Where-Object { $_.Extension -match '^\.(jpe?g|png)$' }
  foreach ($file in $files) {
    $number = Get-FrameNumber -FileName $file.Name
    if ($null -eq $number) { continue }
    if ($byNumber.ContainsKey($number)) {
      throw "FRAME_SEQUENCE_DUPLICATE: frame $number appears more than once."
    }
    $byNumber[$number] = $file
  }
  $missing = New-Object System.Collections.Generic.List[int]
  for ($number = 0; $number -lt $DurationInFrames; $number++) {
    if (-not $byNumber.ContainsKey($number)) { $missing.Add($number) | Out-Null }
  }
  if ($missing.Count -gt 0 -or $byNumber.Count -ne $DurationInFrames) {
    $sample = ($missing | Select-Object -First 12) -join ', '
    throw "FRAME_SEQUENCE_INCOMPLETE: expected $DurationInFrames frames, found $($byNumber.Count); missing: $sample"
  }
  for ($number = 0; $number -lt $DurationInFrames; $number++) {
    [pscustomobject]@{
      Number = $number
      SourcePath = $byNumber[$number].FullName
      TargetName = ('frame-{0:D6}.jpeg' -f $number)
      TargetPath = Join-Path $FrameDir ('frame-{0:D6}.jpeg' -f $number)
    }
  }
}

function Rename-RenderFrames {
  param(
    [Parameter(Mandatory = $true)][string]$FrameDir,
    [Parameter(Mandatory = $true)][int]$DurationInFrames
  )
  $plan = @(Get-NormalizedFramePlan -FrameDir $FrameDir -DurationInFrames $DurationInFrames)
  $temporary = @()
  foreach ($item in $plan) {
    $tempPath = Join-Path $FrameDir ('.normalizing-' + [guid]::NewGuid().ToString('N') + '.tmp')
    Move-Item -LiteralPath $item.SourcePath -Destination $tempPath -Force
    $temporary += [pscustomobject]@{TempPath = $tempPath; TargetPath = $item.TargetPath}
  }
  foreach ($item in $temporary) {
    Move-Item -LiteralPath $item.TempPath -Destination $item.TargetPath -Force
  }
  return @(Get-NormalizedFramePlan -FrameDir $FrameDir -DurationInFrames $DurationInFrames)
}

Export-ModuleMember -Function @(
  'Get-RenderOutputName',
  'Get-FrameChunks',
  'Get-FrameNumber',
  'Get-NormalizedFramePlan',
  'Rename-RenderFrames'
)
