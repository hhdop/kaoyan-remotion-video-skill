param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectDir,
  [int]$Port = 3010,
  [string]$HostName = '127.0.0.1',
  [string]$RuntimeRoot = '',
  [string]$NodePath = '',
  [string]$PnpmPath = '',
  [string]$BrowserPath = '',
  [int]$TimeoutSeconds = 45,
  [int]$PortSearchLimit = 50,
  [switch]$Background,
  [switch]$Bootstrap,
  [switch]$SkipInstall,
  [switch]$ResolveOnly,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'

function Test-StudioPortAvailable {
  param([int]$Candidate)
  $listener = $null
  try {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Candidate)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) { $listener.Stop() }
  }
}

function Get-AvailableStudioPort {
  param([int]$RequestedPort, [int]$SearchLimit)
  if ($RequestedPort -le 0) {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
    try {
      $listener.Start()
      return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    } finally {
      $listener.Stop()
    }
  }
  for ($offset = 0; $offset -le $SearchLimit; $offset++) {
    $candidate = $RequestedPort + $offset
    if (Test-StudioPortAvailable -Candidate $candidate) { return $candidate }
  }
  throw "STUDIO_PORT_UNAVAILABLE: no free port found from $RequestedPort through $($RequestedPort + $SearchLimit)."
}

function Get-StudioUrl {
  param([string]$BindHost, [int]$SelectedPort)
  $browserHost = if ($BindHost -in @('0.0.0.0', '::', '[::]')) { '127.0.0.1' } else { $BindHost }
  return "http://$browserHost`:$SelectedPort/Main"
}

function Invoke-PnpmInstall {
  param($Pnpm, [string]$WorkingDirectory, [string]$ResolvedNodePath)
  $previousPath = $env:Path
  $previousNotifier = $env:NO_UPDATE_NOTIFIER
  $previousSelfUpdate = $env:PNPM_DISABLE_SELF_UPDATE_CHECK
  Push-Location -LiteralPath $WorkingDirectory
  try {
    $env:Path = "$(Split-Path -Parent $ResolvedNodePath);$previousPath"
    $env:NO_UPDATE_NOTIFIER = '1'
    $env:PNPM_DISABLE_SELF_UPDATE_CHECK = 'true'
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    if ($Pnpm.Kind -eq 'node-script') {
      $output = & $Pnpm.NodePath $Pnpm.Path install --frozen-lockfile --config.update-notifier=false 2>&1
    } else {
      $output = & $Pnpm.Path install --frozen-lockfile --config.update-notifier=false 2>&1
    }
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference
    if ($exitCode -ne 0) {
      throw "PNPM_INSTALL_FAILED: $($output -join "`n")"
    }
  } finally {
    $ErrorActionPreference = $previousPreference
    $env:Path = $previousPath
    $env:NO_UPDATE_NOTIFIER = $previousNotifier
    $env:PNPM_DISABLE_SELF_UPDATE_CHECK = $previousSelfUpdate
    Pop-Location
  }
}

function Write-StudioResult {
  param($Result)
  if ($Json) {
    Write-Output ($Result | ConvertTo-Json -Depth 6 -Compress)
  } else {
    Write-Output "Studio status: $($Result.status)"
    Write-Output "URL: $($Result.url)"
    if ($Result.pid) { Write-Output "PID: $($Result.pid)" }
    if ($Result.logPath) { Write-Output "Log: $($Result.logPath)" }
  }
}

$selectedPort = Get-AvailableStudioPort -RequestedPort $Port -SearchLimit $PortSearchLimit
$url = Get-StudioUrl -BindHost $HostName -SelectedPort $selectedPort
if ($ResolveOnly) {
  Write-StudioResult ([pscustomobject]@{status = 'resolved'; url = $url; port = $selectedPort; pid = $null; logPath = $null})
  exit 0
}

$ProjectDir = [System.IO.Path]::GetFullPath($ProjectDir)
if (-not (Test-Path -LiteralPath $ProjectDir -PathType Container)) {
  throw "PROJECT_MISSING: $ProjectDir"
}

$runtimeModule = Join-Path $PSScriptRoot 'lib\KaoyanRuntime.psm1'
if (-not (Test-Path -LiteralPath $runtimeModule -PathType Leaf)) {
  throw "RUNTIME_MODULE_MISSING: $runtimeModule"
}
Import-Module $runtimeModule -Force | Out-Null

if ($Bootstrap) {
  $bootstrap = Join-Path $PSScriptRoot 'bootstrap-windows.ps1'
  $bootstrapArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $bootstrap, '-ProjectDir', $ProjectDir, '-RuntimeRoot', $RuntimeRoot)
  if ($NodePath) { $bootstrapArgs += @('-NodePath', $NodePath) }
  if ($PnpmPath) { $bootstrapArgs += @('-PnpmPath', $PnpmPath) }
  if ($BrowserPath) { $bootstrapArgs += @('-BrowserPath', $BrowserPath) }
  & powershell.exe @bootstrapArgs
  if ($LASTEXITCODE -ne 0) { throw 'BOOTSTRAP_FAILED' }
}

$node = Resolve-KaoyanNode -ExplicitPath $NodePath -RuntimeRoot $RuntimeRoot
if (-not $node) { throw 'NODE_MISSING: run bootstrap-windows.ps1 or pass -NodePath.' }
$pnpm = Resolve-KaoyanPnpm -ExplicitPath $PnpmPath -NodePath $node.Path -RuntimeRoot $RuntimeRoot
if (-not $pnpm) { throw 'PNPM_MISSING: run bootstrap-windows.ps1 or pass -PnpmPath.' }
$browser = Resolve-KaoyanBrowser -ExplicitPath $BrowserPath -RuntimeRoot $RuntimeRoot
if (-not $browser) { throw 'BROWSER_MISSING: run bootstrap-windows.ps1 or pass -BrowserPath.' }

$env:REMOTION_BROWSER_EXECUTABLE = $browser.Path

$nodeModules = Join-Path $ProjectDir 'node_modules'
if (-not $SkipInstall -and -not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
  Invoke-PnpmInstall -Pnpm $pnpm -WorkingDirectory $ProjectDir -ResolvedNodePath $node.Path
}

$cliPath = Join-Path $ProjectDir 'node_modules\@remotion\cli\remotion-cli.js'
if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
  throw "REMOTION_CLI_MISSING: $cliPath"
}

if (-not $Background) {
  Write-StudioResult ([pscustomobject]@{status = 'starting'; url = $url; port = $selectedPort; pid = $PID; logPath = $null})
  Push-Location -LiteralPath $ProjectDir
  try {
    & $node.Path $cliPath studio src/index.ts --port $selectedPort --host $HostName
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
}

$outDir = Join-Path $ProjectDir 'out'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$logPath = Join-Path $outDir "studio-$selectedPort.log"
$errorLogPath = Join-Path $outDir "studio-$selectedPort.error.log"
$startupLogPath = Join-Path $outDir "studio-$selectedPort.startup.log"
[System.IO.File]::WriteAllText($startupLogPath, "preparing`r`n", (New-Object System.Text.UTF8Encoding($false)))
$quotedNode = "'" + $node.Path.Replace("'", "''") + "'"
$quotedCli = "'" + $cliPath.Replace("'", "''") + "'"
$quotedHost = "'" + $HostName.Replace("'", "''") + "'"
$backgroundCommand = "& $quotedNode $quotedCli studio src/index.ts --port $selectedPort --host $quotedHost"
$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($backgroundCommand))
$currentProcessPath = $env:Path
[Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
[Environment]::SetEnvironmentVariable('Path', $currentProcessPath, 'Process')
$process = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand) -WorkingDirectory $ProjectDir -WindowStyle Hidden -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
[System.IO.File]::AppendAllText($startupLogPath, "started pid=$($process.Id)`r`n")
$deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
$ready = $false
while ([DateTime]::UtcNow -lt $deadline) {
  $process.Refresh()
  if ($process.HasExited) { break }
  $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
    Where-Object { $_.Port -eq $selectedPort } |
    Select-Object -First 1
  if ($listener) {
    [System.IO.File]::AppendAllText($startupLogPath, "listener-ready`r`n")
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        $ready = $true
        [System.IO.File]::AppendAllText($startupLogPath, "http-ready status=$($response.StatusCode)`r`n")
        break
      }
    } catch {
      [System.IO.File]::AppendAllText($startupLogPath, "http-wait $($_.Exception.Message)`r`n")
      # The socket may open before the Studio route is ready.
    }
  }
  Start-Sleep -Milliseconds 250
}

if (-not $ready) {
  if (-not $process.HasExited) { & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null }
  $errorText = if (Test-Path -LiteralPath $errorLogPath) { Get-Content -LiteralPath $errorLogPath -Raw -ErrorAction SilentlyContinue } else { '' }
  throw "STUDIO_START_TIMEOUT: $url did not become ready. $errorText"
}

[System.IO.File]::AppendAllText($startupLogPath, "reporting-ready`r`n")

Write-StudioResult ([pscustomobject]@{
  status = 'ready'
  url = $url
  port = $selectedPort
  pid = $process.Id
  logPath = $logPath
  errorLogPath = $errorLogPath
  startupLogPath = $startupLogPath
})
