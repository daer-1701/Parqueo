@echo off
title ParqueoSys - Instalar impresora
cd /d "%~dp0"
echo.
echo  Instalando ParqueoSys Impresion (una sola vez)...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar-ParqueoSys-Impresora.ps1"
if errorlevel 1 pause
