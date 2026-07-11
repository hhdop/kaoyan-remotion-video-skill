param(
  [string]$RuntimeRoot = '',
  [string]$NodePath = '',
  [string]$PnpmPath = '',
  [string]$BrowserPath = '',
  [string]$FfmpegPath = '',
  [string]$FfprobePath = '',
  [string]$ProjectDir = '',
  [switch]$NoDownload,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$NodeVersion = '24.14.0'
$PnpmVersion = '11.7.0'
$FfmpegVersion = '8.1.2'
$modulePath = Join-Path $PSScriptRoot 'lib\KaoyanRuntime.psm1'
Import-Module $modulePath -Force

function Stop-Bootstrap {
  param([string]$Code, [string]$Message)
  throw "[$Code] $Message"
}

function Assert-ChildPath {
  param([string]$Root, [string]$Path)
  $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
  $pathFull = [System.IO.Path]::GetFullPath($Path)
  if (-not $pathFull.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    Stop-Bootstrap 'PATH_OUTSIDE_RUNTIME' "Refusing to write outside runtime root: $pathFull"
  }
}

function Remove-RuntimeChild {
  param([string]$Root, [string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  Assert-ChildPath -Root $Root -Path $Path
  [System.IO.Directory]::Delete('\\?\' + [System.IO.Path]::GetFullPath($Path), $true)
}

function Invoke-Download {
  param([string]$Uri, [string]$Destination)
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $Destination
  if (-not (Test-Path -LiteralPath $Destination -PathType Leaf) -or (Get-Item -LiteralPath $Destination).Length -eq 0) {
    Stop-Bootstrap 'DOWNLOAD_FAILED' "Downloaded file is empty: $Uri"
  }
}

function Install-PortableNode {
  param([string]$Root)
  if ($NoDownload) { Stop-Bootstrap 'NODE_MISSING' 'Node was not found and downloads are disabled.' }

  $downloads = Join-Path $Root 'downloads'
  $temporary = Join-Path $Root ("node-install-{0}" -f [guid]::NewGuid().ToString('N'))
  $destination = Join-Path $Root 'node'
  New-Item -ItemType Directory -Force -Path $downloads | Out-Null
  $archiveName = "node-v$NodeVersion-win-x64.zip"
  $archive = Join-Path $downloads $archiveName
  $checksums = Join-Path $downloads 'SHASUMS256.txt'
  $baseUri = "https://nodejs.org/dist/v$NodeVersion"
  Invoke-Download -Uri "$baseUri/$archiveName" -Destination $archive
  Invoke-Download -Uri "$baseUri/SHASUMS256.txt" -Destination $checksums

  $checksumLine = Get-Content -Encoding UTF8 -LiteralPath $checksums |
    Where-Object { $_ -match "^([a-fA-F0-9]{64})\s+$([regex]::Escape($archiveName))$" } |
    Select-Object -First 1
  if (-not $checksumLine) { Stop-Bootstrap 'DOWNLOAD_FAILED' 'Official Node checksum was not found.' }
  $expectedHash = ([regex]::Match($checksumLine, '^([a-fA-F0-9]{64})')).Groups[1].Value.ToUpperInvariant()
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToUpperInvariant()
  if ($actualHash -ne $expectedHash) { Stop-Bootstrap 'DOWNLOAD_FAILED' 'Node archive SHA-256 verification failed.' }

  New-Item -ItemType Directory -Force -Path $temporary | Out-Null
  Expand-Archive -LiteralPath $archive -DestinationPath $temporary -Force
  $source = Join-Path $temporary "node-v$NodeVersion-win-x64"
  if (-not (Test-Path -LiteralPath (Join-Path $source 'node.exe'))) {
    Stop-Bootstrap 'DOWNLOAD_FAILED' 'Node archive did not contain node.exe.'
  }
  Remove-RuntimeChild -Root $Root -Path $destination
  Move-Item -LiteralPath $source -Destination $destination
  Remove-RuntimeChild -Root $Root -Path $temporary
  return (Join-Path $destination 'node.exe')
}

function Install-LocalPnpm {
  param([string]$Root, [string]$ResolvedNodePath)
  if ($NoDownload) { Stop-Bootstrap 'PNPM_MISSING' 'pnpm was not found and downloads are disabled.' }

  $nodeDir = Split-Path -Parent $ResolvedNodePath
  $npmCliCandidates = @(
    (Join-Path $nodeDir 'node_modules\npm\bin\npm-cli.js'),
    (Join-Path (Split-Path -Parent $nodeDir) 'node_modules\npm\bin\npm-cli.js')
  )
  $npmCli = $npmCliCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $npmCli) { Stop-Bootstrap 'PNPM_MISSING' 'The resolved Node runtime does not include npm for installing pnpm.' }

  $prefix = Join-Path $Root 'pnpm'
  New-Item -ItemType Directory -Force -Path $prefix | Out-Null
  & $ResolvedNodePath $npmCli install --prefix $prefix "pnpm@$PnpmVersion" --no-audit --no-fund --ignore-scripts=false | Out-Null
  if ($LASTEXITCODE -ne 0) { Stop-Bootstrap 'DOWNLOAD_FAILED' "pnpm installation failed with exit code $LASTEXITCODE." }
  $pnpmScript = Join-Path $prefix 'node_modules\pnpm\bin\pnpm.cjs'
  if (-not (Test-Path -LiteralPath $pnpmScript)) { Stop-Bootstrap 'PNPM_MISSING' 'pnpm.cjs was not installed.' }
  return $pnpmScript
}

function Ensure-RemotionBrowser {
  param([string]$ResolvedNodePath)
  if ($NoDownload) { return $null }
  if (-not $ProjectDir) { return $null }
  $cliPath = Join-Path $ProjectDir 'node_modules\@remotion\cli\remotion-cli.js'
  if (-not (Test-Path -LiteralPath $cliPath)) { return $null }
  Push-Location -LiteralPath $ProjectDir
  try {
    & $ResolvedNodePath $cliPath browser ensure 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { return $null }
  } finally {
    Pop-Location
  }
  return Resolve-KaoyanBrowser -RuntimeRoot $script:ResolvedRuntimeRoot
}

function Find-WinGetFfmpeg {
  $roots = @(
    (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links')
  )
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $ffmpeg = Get-ChildItem -LiteralPath $root -Recurse -File -Filter 'ffmpeg.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($ffmpeg) {
      $ffprobe = Get-ChildItem -LiteralPath (Split-Path -Parent $ffmpeg.FullName) -File -Filter 'ffprobe.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($ffprobe) { return [pscustomobject]@{Ffmpeg = $ffmpeg.FullName; Ffprobe = $ffprobe.FullName} }
    }
  }
  return $null
}

function Install-PortableFfmpeg {
  param([string]$Root)
  if ($NoDownload) { Stop-Bootstrap 'FFMPEG_MISSING' 'FFmpeg was not found and downloads are disabled.' }

  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    & $winget.Source install --id Gyan.FFmpeg.Essentials --exact --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
    $wingetResult = Find-WinGetFfmpeg
    if ($wingetResult) { return $wingetResult }
  }

  $downloads = Join-Path $Root 'downloads'
  $destination = Join-Path $Root 'ffmpeg'
  $archiveName = "ffmpeg-$FfmpegVersion-essentials_build.zip"
  $archive = Join-Path $downloads $archiveName
  $checksum = Join-Path $downloads "$archiveName.sha256"
  New-Item -ItemType Directory -Force -Path $downloads | Out-Null
  $baseUri = 'https://www.gyan.dev/ffmpeg/builds/packages'
  Invoke-Download -Uri "$baseUri/$archiveName" -Destination $archive
  Invoke-Download -Uri "$baseUri/$archiveName.sha256" -Destination $checksum
  $expectedHash = ([regex]::Match((Get-Content -Raw -Encoding UTF8 -LiteralPath $checksum), '[a-fA-F0-9]{64}')).Value.ToUpperInvariant()
  if (-not $expectedHash) { Stop-Bootstrap 'DOWNLOAD_FAILED' 'FFmpeg checksum file was invalid.' }
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToUpperInvariant()
  if ($actualHash -ne $expectedHash) { Stop-Bootstrap 'DOWNLOAD_FAILED' 'FFmpeg archive SHA-256 verification failed.' }
  Remove-RuntimeChild -Root $Root -Path $destination
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
  $ffmpeg = Get-ChildItem -LiteralPath $destination -Recurse -File -Filter 'ffmpeg.exe' | Select-Object -First 1
  $ffprobe = Get-ChildItem -LiteralPath $destination -Recurse -File -Filter 'ffprobe.exe' | Select-Object -First 1
  if (-not $ffmpeg -or -not $ffprobe) { Stop-Bootstrap 'FFMPEG_MISSING' 'FFmpeg archive did not contain both binaries.' }
  return [pscustomobject]@{Ffmpeg = $ffmpeg.FullName; Ffprobe = $ffprobe.FullName}
}

try {
  if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
    Stop-Bootstrap 'UNSUPPORTED_OS' 'This release supports Windows 10 and Windows 11 only.'
  }

  $script:ResolvedRuntimeRoot = Get-KaoyanRuntimeRoot -RuntimeRoot $RuntimeRoot
  New-Item -ItemType Directory -Force -Path $script:ResolvedRuntimeRoot | Out-Null

  $node = Resolve-KaoyanNode -ExplicitPath $NodePath -RuntimeRoot $script:ResolvedRuntimeRoot
  if (-not $node) {
    $installedNode = Install-PortableNode -Root $script:ResolvedRuntimeRoot
    $node = Resolve-KaoyanNode -ExplicitPath $installedNode -RuntimeRoot $script:ResolvedRuntimeRoot
  }
  if (-not $node) { Stop-Bootstrap 'NODE_MISSING' 'Node could not be resolved after installation.' }

  $env:Path = "$(Split-Path -Parent $node.Path);$env:Path"
  $pnpm = Resolve-KaoyanPnpm -ExplicitPath $PnpmPath -NodePath $node.Path -RuntimeRoot $script:ResolvedRuntimeRoot
  if (-not $pnpm) {
    $installedPnpm = Install-LocalPnpm -Root $script:ResolvedRuntimeRoot -ResolvedNodePath $node.Path
    $pnpm = Resolve-KaoyanPnpm -ExplicitPath $installedPnpm -NodePath $node.Path -RuntimeRoot $script:ResolvedRuntimeRoot
  }
  if (-not $pnpm) { Stop-Bootstrap 'PNPM_MISSING' 'pnpm could not be resolved after installation.' }

  $browser = Resolve-KaoyanBrowser -ExplicitPath $BrowserPath -RuntimeRoot $script:ResolvedRuntimeRoot
  if (-not $browser) { $browser = Ensure-RemotionBrowser -ResolvedNodePath $node.Path }
  if (-not $browser) { Stop-Bootstrap 'BROWSER_MISSING' 'No executable Chrome, Edge, Playwright browser, or Remotion browser was found.' }

  $ffmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $FfmpegPath -ExplicitFfprobePath $FfprobePath -RuntimeRoot $script:ResolvedRuntimeRoot
  if (-not $ffmpeg) {
    $installedFfmpeg = Install-PortableFfmpeg -Root $script:ResolvedRuntimeRoot
    $ffmpeg = Resolve-KaoyanFfmpeg -ExplicitFfmpegPath $installedFfmpeg.Ffmpeg -ExplicitFfprobePath $installedFfmpeg.Ffprobe -RuntimeRoot $script:ResolvedRuntimeRoot
  }
  if (-not $ffmpeg) { Stop-Bootstrap 'FFMPEG_MISSING' 'FFmpeg and FFprobe could not be resolved after installation.' }

  $manifest = [ordered]@{
    schemaVersion = 1
    node = [ordered]@{path = $node.Path; version = $node.Version}
    pnpm = [ordered]@{path = $pnpm.Path; version = $pnpm.Version; kind = $pnpm.Kind}
    browser = [ordered]@{path = $browser.Path; version = $browser.Version; source = $browser.Source}
    ffmpeg = [ordered]@{path = $ffmpeg.Path; ffprobePath = $ffmpeg.FfprobePath; version = $ffmpeg.Version}
  }
  $manifestPath = Write-KaoyanRuntimeManifest -Manifest $manifest -RuntimeRoot $script:ResolvedRuntimeRoot
  $result = [ordered]@{
    ok = $true
    runtimeRoot = $script:ResolvedRuntimeRoot
    manifestPath = $manifestPath
    runtime = $manifest
  }

  if ($Json) {
    $result | ConvertTo-Json -Depth 8 -Compress
  } else {
    Write-Output 'Kaoyan Remotion runtime is ready.'
    Write-Output "Node: $($node.Version) | $($node.Path)"
    Write-Output "pnpm: $($pnpm.Version) | $($pnpm.Path)"
    Write-Output "Browser: $($browser.Version) | $($browser.Path)"
    Write-Output "FFmpeg: $($ffmpeg.Version) | $($ffmpeg.Path)"
    Write-Output "Manifest: $manifestPath"
  }
  exit 0
} catch {
  $message = $_.Exception.Message
  $match = [regex]::Match($message, '^\[([^\]]+)\]\s*(.*)$')
  $code = if ($match.Success) { $match.Groups[1].Value } else { 'BOOTSTRAP_FAILED' }
  $detail = if ($match.Success) { $match.Groups[2].Value } else { $message }
  if ($Json) {
    [ordered]@{ok = $false; code = $code; message = $detail} | ConvertTo-Json -Compress
  } else {
    Write-Error "[$code] $detail"
  }
  exit 1
}
