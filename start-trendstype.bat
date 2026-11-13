@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=%LOCALAPPDATA%\Programs\TrendsType-Node\node.exe"
set "NPM_CMD=%LOCALAPPDATA%\Programs\TrendsType-Node\npm.cmd"

if not exist "%NODE_EXE%" (
    where node.exe >nul 2>nul
    if errorlevel 1 goto node_missing
    set "NODE_EXE=node.exe"
    set "NPM_CMD=npm.cmd"
)

if not exist "node_modules\express\package.json" (
    echo Eenmalige installatie van de benodigde onderdelen...
    call "%NPM_CMD%" install
    if errorlevel 1 goto install_failed
)

echo TrendsType start. Open http://localhost:3000 in je browser.
echo Laat dit venster open. Druk op Ctrl+C om de server te stoppen.
echo.
"%NODE_EXE%" server.js
if errorlevel 1 goto server_failed
exit /b 0

:node_missing
echo Node.js is niet gevonden. De draagbare Node.js-installatie ontbreekt.
echo Bekijk README.md voor hulp bij het installeren van Node.js.
pause
exit /b 1

:install_failed
echo Installatie mislukt. Controleer je internetverbinding en probeer opnieuw.
pause
exit /b 1

:server_failed
echo De server is gestopt met een fout. Controleer de melding hierboven.
pause
exit /b 1
