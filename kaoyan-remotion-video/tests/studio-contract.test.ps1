param()

$ErrorActionPreference = 'Stop'
$skillDir = Split-Path -Parent $PSScriptRoot
$studioScript = Join-Path $skillDir 'scripts\start-remotion-studio.ps1'
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)

try {
  $listener.Start()
  $occupiedPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  $arguments = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $studioScript,
    '-ProjectDir', $PSScriptRoot,
    '-HostName', '127.0.0.1',
    '-Port', $occupiedPort,
    '-ResolveOnly',
    '-Json'
  )
  $output = & powershell.exe @arguments 2>$null
  $report = (($output | ForEach-Object { "$_" }) -join "`n") | ConvertFrom-Json

  if ($report.port -eq $occupiedPort) { throw 'Studio selected an occupied port.' }
  if ($report.url -ne "http://127.0.0.1:$($report.port)/Main") {
    throw "Unexpected Studio URL: $($report.url)"
  }
  if ($report.status -ne 'resolved') { throw "Unexpected resolve status: $($report.status)" }

  Write-Output 'studio-contract.test.ps1: PASS'
} finally {
  $listener.Stop()
}
