param(
  [Parameter(Mandatory=$true)][string]$SourceServer,
  [Parameter(Mandatory=$true)][string]$JavaExe
)
$ErrorActionPreference = 'Stop'
$labRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $labRoot '.local\server'
if (Test-Path -LiteralPath $destination) { throw 'A lab server already exists. Keep it or choose a fresh lab copy.' }
if (!(Test-Path -LiteralPath (Join-Path $SourceServer 'paper.jar'))) { throw 'Select an existing Paper 1.21.11 server folder containing paper.jar.' }
if (!(Test-Path -LiteralPath $JavaExe)) { throw 'Java executable was not found.' }
$existingEula = Join-Path $SourceServer 'eula.txt'
if (!(Test-Path -LiteralPath $existingEula) -or !(Select-String -LiteralPath $existingEula -Pattern '^eula=true$' -Quiet)) {
  throw 'The teacher must first read and accept the Minecraft EULA in the source server.'
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($item in @('paper.jar','cache','libraries','versions','eula.txt')) {
  $sourceItem = Join-Path $SourceServer $item
  if (Test-Path -LiteralPath $sourceItem) { Copy-Item -LiteralPath $sourceItem -Destination $destination -Recurse }
}
@'
server-ip=127.0.0.1
server-port=25585
online-mode=false
enforce-secure-profile=false
enable-rcon=false
enable-query=false
management-server-enabled=false
white-list=false
max-players=5
gamemode=adventure
difficulty=peaceful
level-type=minecraft:flat
generate-structures=false
spawn-protection=0
view-distance=4
simulation-distance=4
pause-when-empty-seconds=-1
motd=Tech Labs - local AI test only
log-ips=false
'@ | Set-Content -LiteralPath (Join-Path $destination 'server.properties') -Encoding utf8
@{ java=(Resolve-Path -LiteralPath $JavaExe).Path; server=$destination } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $labRoot '.local\runtime.json') -Encoding utf8
Write-Output 'Created an isolated loopback server. Existing plugins, worlds, player data and secrets were not copied.'
