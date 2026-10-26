@echo off
chcp 65001 >nul
title Swapit - detener
echo.
echo  Apagando Swapit...
powershell -NoProfile -Command "foreach($p in 3000,4000,5433){ Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
echo  Listo: Swapit esta apagado. Ya puedes cerrar esta ventana.
echo.
pause
