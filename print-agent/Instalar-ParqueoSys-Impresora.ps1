# ParqueoSys — instalador único del agente de impresión
# - Copia el agente a %LOCALAPPDATA%\ParqueoSys
# - Registra el protocolo parqueosys:// (el botón de la web lo abre)
# - Lo agrega al inicio de Windows
# - Arranca el agente ahora

$ErrorActionPreference = 'Stop'

$SiteUrl = 'https://parqueo-two.vercel.app'
$InstallDir = Join-Path $env:LOCALAPPDATA 'ParqueoSys'
$AgentPs1 = Join-Path $InstallDir 'ParqueoSys-Impresion.ps1'
$AgentBat = Join-Path $InstallDir 'ParqueoSys-Impresion.bat'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' ParqueoSys - Instalar impresora' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Preferir archivos locales (misma carpeta); si no, descargar de la web
$localPs1 = Join-Path $ScriptDir 'ParqueoSys-Impresion.ps1'
$localBat = Join-Path $ScriptDir 'ParqueoSys-Impresion.bat'

if (Test-Path $localPs1) {
  Copy-Item $localPs1 $AgentPs1 -Force
  Write-Host 'Agente copiado desde esta carpeta.' -ForegroundColor Green
} else {
  $url = "$SiteUrl/print-agent/ParqueoSys-Impresion.ps1"
  Write-Host "Descargando agente desde $url ..."
  Invoke-WebRequest -Uri $url -OutFile $AgentPs1 -UseBasicParsing
  Write-Host 'Agente descargado.' -ForegroundColor Green
}

if (Test-Path $localBat) {
  Copy-Item $localBat $AgentBat -Force
} else {
  @"
@echo off
title ParqueoSys - Impresion automatica
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ParqueoSys-Impresion.ps1"
"@ | Set-Content -Path $AgentBat -Encoding ASCII
}

# Registrar protocolo parqueosys:// (sin admin: HKCU)
$psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$command = "`"$psExe`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$AgentPs1`" `"%1`""

$base = 'HKCU:\Software\Classes\parqueosys'
New-Item -Path $base -Force | Out-Null
Set-ItemProperty -Path $base -Name '(Default)' -Value 'URL:ParqueoSys Protocol'
New-ItemProperty -Path $base -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null

New-Item -Path "$base\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "$base\DefaultIcon" -Name '(Default)' -Value 'powershell.exe,0'

New-Item -Path "$base\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$base\shell\open\command" -Name '(Default)' -Value $command

Write-Host 'Protocolo parqueosys:// registrado.' -ForegroundColor Green

# Acceso directo al inicio de Windows
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'ParqueoSys Impresion.lnk'
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = $psExe
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$AgentPs1`""
$sc.WorkingDirectory = $InstallDir
$sc.WindowStyle = 7
$sc.Description = 'ParqueoSys impresion automatica'
$sc.Save()

Write-Host 'Se iniciara solo al encender Windows.' -ForegroundColor Green

# Arrancar ahora (si ya corre, el agente sale solo)
Write-Host 'Iniciando agente...'
Start-Process -FilePath $psExe -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $AgentPs1
) -WorkingDirectory $InstallDir

Start-Sleep -Seconds 2

Write-Host ''
Write-Host 'LISTO.' -ForegroundColor Green
Write-Host '1) Deja abierta la ventana del agente (o se abrira al iniciar Windows).'
Write-Host "2) Entra a $SiteUrl"
Write-Host '3) Pulsa "Activar impresora" si hace falta.'
Write-Host ''
Write-Host "Instalado en: $InstallDir"
Write-Host ''
Read-Host 'Enter para cerrar este instalador'
