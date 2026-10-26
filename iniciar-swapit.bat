@echo off
chcp 65001 >nul
title Swapit - NO CIERRES esta ventana mientras uses la app
cd /d "%~dp0"
echo.
echo  ============================================================
echo   SWAPIT
echo   Iniciando... la primera vez tarda 1 o 2 minutos.
echo   Cuando veas "Swap It listo", la app ya esta en:
echo       http://localhost:3000
echo   (se abrira sola en tu navegador)
echo.
echo   PARA APAGARLA: cierra esta ventana, o presiona Ctrl+C.
echo   Si algo queda trabado, abre "detener-swapit.bat".
echo  ============================================================
echo.
rem Por si quedo una copia anterior encendida (si no, los puertos estarian ocupados).
powershell -NoProfile -Command "foreach($p in 3000,4000,5433){ Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 240;$i++){ try { $c=New-Object Net.Sockets.TcpClient('127.0.0.1',3000); $c.Close(); Start-Sleep 3; Start-Process 'http://localhost:3000'; break } catch { Start-Sleep 2 } }"
call pnpm demo
echo.
echo  Swapit se detuvo. Ya puedes cerrar esta ventana.
pause
