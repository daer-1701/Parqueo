@echo off
title ParqueoSys - Servicio de impresion
cd /d "%~dp0.."

echo.
echo  ParqueoSys - Impresion automatica
echo  Deja esta ventana ABIERTA mientras usas el sistema.
echo  Web: https://parqueo-two.vercel.app
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado en este PC.
  echo Instala Node LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias la primera vez...
  call npm install
)

npm run print:server
pause
