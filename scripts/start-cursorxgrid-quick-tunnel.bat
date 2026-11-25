@echo off
setlocal

set "CLOUDFLARED_EXE=%LOCALAPPDATA%\Programs\cloudflared\cloudflared.exe"

if not exist "%CLOUDFLARED_EXE%" (
    where cloudflared.exe >nul 2>nul
    if errorlevel 1 goto cloudflared_missing
    set "CLOUDFLARED_EXE=cloudflared.exe"
)

powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }"
if errorlevel 1 goto server_not_running

echo CursorXGrid is bereikbaar. De Quick Tunnel-URL verschijnt hieronder.
echo Laat dit venster open zolang collega's de app gebruiken.
echo Druk op Ctrl+C om de tunnel te stoppen.
echo.
"%CLOUDFLARED_EXE%" tunnel --url http://127.0.0.1:3000 --no-autoupdate
if errorlevel 1 goto tunnel_failed

echo.
echo De Quick Tunnel is gestopt.
pause
exit /b 0

:cloudflared_missing
echo cloudflared is niet gevonden.
echo Installeer cloudflared of plaats cloudflared.exe in:
echo %LOCALAPPDATA%\Programs\cloudflared\
pause
exit /b 1

:server_not_running
echo CursorXGrid reageert niet op http://127.0.0.1:3000.
echo Start eerst scripts\start-cursorxgrid.bat en probeer het opnieuw.
pause
exit /b 1

:tunnel_failed
echo De Cloudflare-tunnel is gestopt met een fout. Controleer de melding hierboven.
pause
exit /b 1
