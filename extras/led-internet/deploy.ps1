<#
.SYNOPSIS
    Install the internet status light service on the router from Windows.

.EXAMPLE
    .\extras\led-internet\deploy.ps1              # copy + install
    .\extras\led-internet\deploy.ps1 -Uninstall   # remove it
    .\extras\led-internet\deploy.ps1 -Router 192.168.50.1

    You are asked for the router's root password twice (copy + install)
    unless you use an SSH key.
#>
param(
    [string]$Router = "",
    [string]$User = "root",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-Tool([string]$name) {
    $cmd = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.Source }

    foreach ($dir in "$env:WINDIR\System32\OpenSSH",
                     "$env:ProgramFiles\Git\usr\bin",
                     "${env:ProgramFiles(x86)}\Git\usr\bin",
                     "$env:LOCALAPPDATA\Programs\Git\usr\bin") {
        $p = Join-Path $dir "$name.exe"
        if (Test-Path $p) { return $p }
    }

    return $null
}

function Test-LuCI([string]$ip) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "http://$ip/"
        return ($r.Content -match "luci")
    }
    catch {
        return $false
    }
}

$ssh = Find-Tool "ssh"
$scp = Find-Tool "scp"
if (-not $ssh -or -not $scp) {
    throw "No SSH client found. Install 'OpenSSH Client' (Settings > System > Optional features) or Git for Windows."
}

if (-not $Router) {
    $gateways = @(Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Sort-Object RouteMetric | ForEach-Object { $_.NextHop } |
        Where-Object { $_ -and $_ -ne "0.0.0.0" } | Select-Object -Unique)

    $Router = $gateways | Where-Object { Test-LuCI $_ } | Select-Object -First 1

    if (-not $Router) {
        throw "Could not find an OpenWrt router among your gateways ($($gateways -join ', ')). Run with -Router <address>."
    }
}
$target = "$User@$Router"

# OpenWrt's Dropbear needs the classic scp protocol (-O) with OpenSSH 9+
$scpArgs = @()
$version = cmd /c "`"$ssh`" -V 2>&1"
if ("$version" -match "OpenSSH_for_Windows_(\d+)|OpenSSH_(\d+)") {
    if ([int]("$($Matches[1])$($Matches[2])") -ge 9) { $scpArgs += "-O" }
}

Write-Host "Router: $target" -ForegroundColor Cyan

Write-Host "[1/2] Copying files (enter the router's root password) ..." -ForegroundColor Cyan
# Copy by relative name: a "C:\..." path could be mistaken for a host called "C"
Push-Location (Split-Path -Parent $here)
try {
    & $scp @scpArgs -r (Split-Path -Leaf $here) "${target}:/tmp/"
    if ($LASTEXITCODE -ne 0) { throw "Copy failed (exit code $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

$action = if ($Uninstall) { "uninstall" } else { "" }

Write-Host "[2/2] Running the installer on the router (password again) ..." -ForegroundColor Cyan
& $ssh $target "sh /tmp/led-internet/install.sh $action"
if ($LASTEXITCODE -ne 0) { throw "Install failed (exit code $LASTEXITCODE)" }

Write-Host ""
Write-Host "Done." -ForegroundColor Green
