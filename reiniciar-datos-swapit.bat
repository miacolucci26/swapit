@echo off
chcp 65001 >nul
title Swapit - reiniciar datos de demostracion
cd /d "%~dp0"
echo.
echo  ============================================================
echo   Esto BORRA los datos de la demostracion y los vuelve a crear
echo   (intermediarios, proveedores, lotes, certificados).
echo   Se pierde lo que hayas registrado probando.
echo  ============================================================
echo.
choice /m "Quieres continuar"
if errorlevel 2 goto fin
powershell -NoProfile -Command "foreach($p in 3000,4000,5433){ Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 240;$i++){ try { $c=New-Object Net.Sockets.TcpClient('127.0.0.1',3000); $c.Close(); Start-Sleep 3; Start-Process 'http://localhost:3000'; break } catch { Start-Sleep 2 } }"
call pnpm demo:reset
:fin
echo.
pause
