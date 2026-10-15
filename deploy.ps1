<#
.SYNOPSIS
    Copy the LuCI Violet theme to an OpenWrt router.

.DESCRIPTION
    The theme is installed next to the stock themes; Bootstrap is never
    modified or removed. By default the active theme is left unchanged.

    The router address defaults to this PC's default gateway. The SSH client
    is taken from Windows (OpenSSH Client) or, if that is not installed, from
    Git for Windows. You are asked for the router's root password twice
    (upload + install) unless you use an SSH key.

.EXAMPLE
    .\deploy.ps1 -Activate            # install / update and switch LuCI to Violet
    .\deploy.ps1                      # install / update only
    .\deploy.ps1 -Deactivate          # switch back to the previous theme
    .\deploy.ps1 -Uninstall           # remove Violet, restore the previous theme
    .\deploy.ps1 -Router 192.168.50.1 -Activate
#>
param(
    [string]$Router = "",
    [string]$User = "root",
    [switch]$Activate,
    [switch]$Deactivate,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-Tool([string]$name) {
    # Real executables only: an alias (e.g. "Set-Alias ssh ...") has no path of its own
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

$ssh = Find-Tool "ssh"
$scp = Find-Tool "scp"
$tar = Find-Tool "tar"

if (-not $ssh -or -not $scp) {
    throw "No SSH client found. Install 'OpenSSH Client' (Settings > System > Optional features) or Git for Windows."
}
if (-not $tar) {
    throw "tar was not found (it ships with Windows 10 1803 and later)."
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

# Router address: the default gateway that serves LuCI (a PC can have several,
# e.g. Wi-Fi + phone hotspot), unless given with -Router
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

# OpenSSH 9+ defaults to SFTP for scp; OpenWrt's Dropbear needs the classic protocol (-O).
# (ssh -V prints to stderr, which Windows PowerShell would treat as an error, so go via cmd)
$scpArgs = @()
$version = cmd /c "`"$ssh`" -V 2>&1"
if ("$version" -match "OpenSSH_for_Windows_(\d+)|OpenSSH_(\d+)") {
    $major = [int]("$($Matches[1])$($Matches[2])")
    if ($major -ge 9) { $scpArgs += "-O" }
}

Write-Host "Router : $target" -ForegroundColor Cyan
Write-Host "SSH    : $ssh" -ForegroundColor DarkGray

# Package the theme + installer (files keep their LF line endings)
$archive = Join-Path $env:TEMP "violet-theme.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

Push-Location $here
try {
    & $tar -czf $archive install.sh luci-theme-violet
    if ($LASTEXITCODE -ne 0) { throw "tar failed" }
}
finally {
    Pop-Location
}

$action = ""
if ($Activate) { $action = "activate" }
if ($Deactivate) { $action = "deactivate" }
if ($Uninstall) { $action = "uninstall" }

try {
    Write-Host ""
    Write-Host "[1/2] Uploading theme (enter the router's root password) ..." -ForegroundColor Cyan
    & $scp @scpArgs $archive "${target}:/tmp/violet-theme.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw "Upload failed (exit code $LASTEXITCODE)" }

    Write-Host ""
    Write-Host "[2/2] Installing (enter the password again) ..." -ForegroundColor Cyan
    $remote = "rm -rf /tmp/violet-theme && mkdir -p /tmp/violet-theme && tar -xzf /tmp/violet-theme.tar.gz -C /tmp/violet-theme && rm -f /tmp/violet-theme.tar.gz && sh /tmp/violet-theme/install.sh $action"
    & $ssh $target $remote
    if ($LASTEXITCODE -ne 0) { throw "Install failed (exit code $LASTEXITCODE)" }
}
finally {
    Remove-Item $archive -Force -ErrorAction SilentlyContinue
}

Write-Host ""
if ($Uninstall -or $Deactivate) {
    Write-Host "Done. Reload http://$Router/ (Ctrl+F5)." -ForegroundColor Green
}
elseif ($Activate) {
    Write-Host "Violet is active. Open http://$Router/ and press Ctrl+F5." -ForegroundColor Green
}
else {
    Write-Host "Installed alongside your current theme. Choose 'Violet' in" -ForegroundColor Green
    Write-Host "System > System > Language and Style, or run: .\deploy.ps1 -Activate" -ForegroundColor Green
}
