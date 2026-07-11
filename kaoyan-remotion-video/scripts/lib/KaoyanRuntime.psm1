Set-StrictMode -Version Latest

function Get-KaoyanRuntimeRoot {
  param([string]$RuntimeRoot = '')

  if ($RuntimeRoot) {
    return [System.IO.Path]::GetFullPath($RuntimeRoot)
  }
  if ($env:KAOYAN_REMOTION_RUNTIME) {
    return [System.IO.Path]::GetFullPath($env:KAOYAN_REMOTION_RUNTIME)
  }
  if (-not $env:LOCALAPPDATA) {
    throw 'LOCALAPPDATA is unavailable and no RuntimeRoot was supplied.'
  }
  return (Join-Path $env:LOCALAPPDATA 'kaoyan-remotion-video\runtime')
}

function Test-KaoyanExecutable {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string[]]$Arguments = @('--version'),
    [string]$NodePath = ''
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return [pscustomobject]@{Ok = $false; Path = $Path; Version = ''; ExitCode = $null; Output = ''; Error = 'FILE_MISSING'}
  }

  try {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    if ($NodePath) {
      $output = & $NodePath $Path @Arguments 2>&1
    } else {
      $output = & $Path @Arguments 2>&1
    }
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldPreference
    $text = ($output | ForEach-Object { "$_" }) -join "`n"
    return [pscustomobject]@{
      Ok = ($exitCode -eq 0)
      Path = [System.IO.Path]::GetFullPath($Path)
      Version = (($text -split "`r?`n" | Select-Object -First 1) -as [string]).Trim()
      ExitCode = $exitCode
      Output = $text
      Error = if ($exitCode -eq 0) { '' } else { 'EXECUTION_FAILED' }
    }
  } catch {
    return [pscustomobject]@{
      Ok = $false
      Path = [System.IO.Path]::GetFullPath($Path)
      Version = ''
      ExitCode = $null
      Output = ''
      Error = $_.Exception.Message
    }
  } finally {
    $ErrorActionPreference = $oldPreference
  }
}

function Read-KaoyanRuntimeManifest {
  param([string]$RuntimeRoot = '')

  $root = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  $path = Join-Path $root 'runtime.json'
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    return $null
  }
  try {
    return (Get-Content -Raw -Encoding UTF8 -LiteralPath $path | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Write-KaoyanRuntimeManifest {
  param(
    [Parameter(Mandatory = $true)]$Manifest,
    [string]$RuntimeRoot = ''
  )

  $root = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  $target = Join-Path $root 'runtime.json'
  $temporary = Join-Path $root ("runtime-{0}.tmp" -f [guid]::NewGuid().ToString('N'))
  $json = $Manifest | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($temporary, $json, (New-Object System.Text.UTF8Encoding($false)))
  [void](Get-Content -Raw -Encoding UTF8 -LiteralPath $temporary | ConvertFrom-Json)
  Move-Item -LiteralPath $temporary -Destination $target -Force
  return $target
}

function Find-KaoyanOnPath {
  param([string[]]$Names)

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command -and $command.Source) {
      return $command.Source
    }
  }
  return $null
}

function Get-KaoyanCodexTool {
  param([Parameter(Mandatory = $true)][string]$RelativePath, [string]$FileName = '')

  $roots = @()
  if ($env:USERPROFILE) {
    $roots += (Join-Path $env:USERPROFILE '.cache\codex-runtimes')
  }
  if ($env:LOCALAPPDATA) {
    $roots += (Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\runtimes')
  }

  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $preferred = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name |
      ForEach-Object { Join-Path $_.FullName $RelativePath } |
      Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
      Select-Object -First 1
    if ($preferred) { return $preferred }
    if ($FileName) {
      $fallback = Get-ChildItem -LiteralPath $root -Recurse -File -Filter $FileName -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($fallback) { return $fallback.FullName }
    }
  }
  return $null
}

function Resolve-KaoyanNode {
  param([string]$ExplicitPath = '', [string]$RuntimeRoot = '')

  $root = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  $manifest = Read-KaoyanRuntimeManifest -RuntimeRoot $root
  $manifestPath = if ($manifest -and $manifest.node) { $manifest.node.path } else { '' }
  $codexPath = Get-KaoyanCodexTool -RelativePath 'codex-primary-runtime\dependencies\node\bin\node.exe' -FileName 'node.exe'
  $runtimeCandidates = @(
    (Join-Path $root 'node\node.exe'),
    (Join-Path $root 'node\bin\node.exe')
  )
  $versioned = Get-ChildItem -LiteralPath $root -Directory -Filter 'node-v*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName 'node.exe' }

  $candidates = @($ExplicitPath, $env:KAOYAN_NODE, (Find-KaoyanOnPath @('node.exe', 'node')), $codexPath, $manifestPath) + $runtimeCandidates + $versioned
  foreach ($candidate in $candidates | Where-Object { $_ } | Select-Object -Unique) {
    $test = Test-KaoyanExecutable -Path $candidate -Arguments @('-v')
    if ($test.Ok) {
      return [pscustomobject]@{Path = $test.Path; Version = $test.Version; Source = if ($candidate -eq $ExplicitPath) { 'explicit' } else { 'discovered' }}
    }
  }
  return $null
}

function Resolve-KaoyanPnpm {
  param([string]$ExplicitPath = '', [string]$NodePath = '', [string]$RuntimeRoot = '')

  $root = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  $manifest = Read-KaoyanRuntimeManifest -RuntimeRoot $root
  $manifestPath = if ($manifest -and $manifest.pnpm) { $manifest.pnpm.path } else { '' }
  $codexPath = Get-KaoyanCodexTool -RelativePath 'codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' -FileName 'pnpm.cmd'
  $candidates = @(
    $ExplicitPath,
    $env:KAOYAN_PNPM,
    (Find-KaoyanOnPath @('pnpm.cmd', 'pnpm.exe', 'pnpm')),
    $codexPath,
    $manifestPath,
    (Join-Path $root 'pnpm\node_modules\pnpm\bin\pnpm.cjs'),
    (Join-Path $root 'pnpm\node_modules\pnpm\bin\pnpm.js')
  )

  foreach ($candidate in $candidates | Where-Object { $_ } | Select-Object -Unique) {
    $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
    $test = if ($extension -in @('.cjs', '.js')) {
      if (-not $NodePath) { continue }
      Test-KaoyanExecutable -Path $candidate -Arguments @('-v') -NodePath $NodePath
    } else {
      Test-KaoyanExecutable -Path $candidate -Arguments @('-v')
    }
    if ($test.Ok) {
      return [pscustomobject]@{
        Path = $test.Path
        Version = $test.Version
        Kind = if ($extension -in @('.cjs', '.js')) { 'node-script' } else { 'executable' }
        NodePath = $NodePath
      }
    }
  }
  return $null
}

function Resolve-KaoyanBrowser {
  param([string]$ExplicitPath = '', [string]$RuntimeRoot = '')

  $root = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  $manifest = Read-KaoyanRuntimeManifest -RuntimeRoot $root
  $manifestPath = if ($manifest -and $manifest.browser) { $manifest.browser.path } else { '' }
  $known = @(
    $ExplicitPath,
    $env:REMOTION_BROWSER_EXECUTABLE,
    $env:KAOYAN_BROWSER,
    $manifestPath,
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
  )

  if ($env:LOCALAPPDATA) {
    $playwrightRoot = Join-Path $env:LOCALAPPDATA 'ms-playwright'
    if (Test-Path -LiteralPath $playwrightRoot) {
      $known += Get-ChildItem -LiteralPath $playwrightRoot -Recurse -File -Filter 'chrome-headless-shell.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -ExpandProperty FullName
      $known += Get-ChildItem -LiteralPath $playwrightRoot -Recurse -File -Filter 'chrome.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -ExpandProperty FullName
    }
  }

  foreach ($candidate in $known | Where-Object { $_ } | Select-Object -Unique) {
    $test = Test-KaoyanExecutable -Path $candidate -Arguments @('--version')
    if ($test.Ok) {
      $source = if ($candidate -match 'ms-playwright|headless') { 'playwright' } elseif ($candidate -match 'Edge') { 'edge' } elseif ($candidate -match 'Chrome') { 'chrome' } else { 'explicit' }
      return [pscustomobject]@{Path = $test.Path; Version = $test.Version; Source = $source}
    }
  }
  return $null
}

function Resolve-KaoyanFfmpeg {
  param(
    [string]$ExplicitFfmpegPath = '',
    [string]$ExplicitFfprobePath = '',
    [string]$RuntimeRoot = ''
  )

  $root = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  $manifest = Read-KaoyanRuntimeManifest -RuntimeRoot $root
  $manifestFfmpeg = if ($manifest -and $manifest.ffmpeg) { $manifest.ffmpeg.path } else { '' }
  $manifestFfprobe = if ($manifest -and $manifest.ffmpeg) { $manifest.ffmpeg.ffprobePath } else { '' }
  $ffmpegCandidates = @(
    $ExplicitFfmpegPath,
    $env:KAOYAN_FFMPEG,
    (Find-KaoyanOnPath @('ffmpeg.exe', 'ffmpeg')),
    $manifestFfmpeg,
    (Join-Path $root 'ffmpeg\bin\ffmpeg.exe')
  )

  foreach ($ffmpegPath in $ffmpegCandidates | Where-Object { $_ } | Select-Object -Unique) {
    $ffmpegTest = Test-KaoyanExecutable -Path $ffmpegPath -Arguments @('-version')
    if (-not $ffmpegTest.Ok) { continue }
    $sameDirectoryProbe = Join-Path (Split-Path -Parent $ffmpegPath) 'ffprobe.exe'
    $probeCandidates = @($ExplicitFfprobePath, $env:KAOYAN_FFPROBE, (Find-KaoyanOnPath @('ffprobe.exe', 'ffprobe')), $manifestFfprobe, $sameDirectoryProbe)
    foreach ($ffprobePath in $probeCandidates | Where-Object { $_ } | Select-Object -Unique) {
      $ffprobeTest = Test-KaoyanExecutable -Path $ffprobePath -Arguments @('-version')
      if ($ffprobeTest.Ok) {
        return [pscustomobject]@{
          Path = $ffmpegTest.Path
          FfprobePath = $ffprobeTest.Path
          Version = $ffmpegTest.Version
        }
      }
    }
  }
  return $null
}

function Get-KaoyanShortTempRoot {
  param(
    [string]$PreferredRoot = '',
    [int]$ReservedLength = 24,
    [int]$MaxPathLength = 120
  )

  if ($ReservedLength -lt 1 -or $MaxPathLength -le $ReservedLength) {
    throw '[TEMP_PATH_INVALID] ReservedLength must be positive and smaller than MaxPathLength.'
  }

  $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  $candidates = @($PreferredRoot, $systemTemp) |
    Where-Object { $_ } |
    ForEach-Object { [System.IO.Path]::GetFullPath($_) } |
    Select-Object -Unique

  foreach ($candidate in $candidates) {
    $projectedLength = $candidate.TrimEnd('\').Length + 1 + $ReservedLength
    if ($projectedLength -le $MaxPathLength) {
      return $candidate
    }
  }

  throw "[TEMP_PATH_TOO_LONG] No temporary root leaves enough room for Remotion dependencies (max project path: $MaxPathLength)."
}

function Invoke-KaoyanPnpm {
  param(
    [Parameter(Mandatory = $true)]$Pnpm,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )

  if ($Pnpm.Kind -eq 'node-script') {
    & $Pnpm.NodePath $Pnpm.Path @Arguments
  } else {
    & $Pnpm.Path @Arguments
  }
  return $LASTEXITCODE
}

Export-ModuleMember -Function @(
  'Get-KaoyanRuntimeRoot',
  'Test-KaoyanExecutable',
  'Read-KaoyanRuntimeManifest',
  'Write-KaoyanRuntimeManifest',
  'Find-KaoyanOnPath',
  'Resolve-KaoyanNode',
  'Resolve-KaoyanPnpm',
  'Resolve-KaoyanBrowser',
  'Resolve-KaoyanFfmpeg',
  'Get-KaoyanShortTempRoot',
  'Invoke-KaoyanPnpm'
)
