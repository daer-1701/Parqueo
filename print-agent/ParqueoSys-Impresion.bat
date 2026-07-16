@echo off
title ParqueoSys - Impresion automatica
cd /d "%~dp0"

echo.
echo  ========================================
echo   ParqueoSys - Servicio de impresion
echo  ========================================
echo   Deja esta ventana ABIERTA.
echo   Luego abre la web en ESTE mismo PC:
echo   https://parqueo-two.vercel.app
echo  ========================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ParqueoSys-Impresion.ps1"
if errorlevel 1 (
  echo.
  echo Si fallo, clic derecho en el .ps1 -^> Ejecutar con PowerShell
  pause
)
