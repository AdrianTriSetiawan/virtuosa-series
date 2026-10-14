@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   Virtuosa Series - VX5 Pro 60%% Web Control Center
echo   for support my old keyboard vx5 ;)
echo ========================================================
echo.

where bun >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Menjalankan local server via Bun (http://localhost:3000)...
    set "SERVER_SCRIPT="
    if exist "%~dp0app\server.js" set "SERVER_SCRIPT=%~dp0app\server.js"
    if not defined SERVER_SCRIPT if exist "%~dp0server.js" set "SERVER_SCRIPT=%~dp0server.js"

    if defined SERVER_SCRIPT (
        start "Virtuosa Server" /min bun "%SERVER_SCRIPT%"
        timeout /t 1 >nul 2>&1
    )
    where msedge >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        start msedge "http://localhost:3000"
    ) else (
        start http://localhost:3000
    )
    echo Virtuosa Web UI berhasil dibuka di browser!
    echo WebHID membutuhkan browser berbasis Chromium (Edge, Chrome, Brave).
    timeout /t 3 >nul 2>&1
    exit /b 0
)

echo [WARNING] Bun tidak ditemukan di PATH.
echo Membuka index.html langsung...
set "TARGET_HTML="
if exist "%~dp0app\index.html" set "TARGET_HTML=%~dp0app\index.html"
if not defined TARGET_HTML if exist "%~dp0index.html" set "TARGET_HTML=%~dp0index.html"

if not defined TARGET_HTML (
    echo [ERROR] index.html tidak ditemukan!
    pause
    exit /b 1
)

start msedge "%TARGET_HTML%" 2>nul || start chrome "%TARGET_HTML%" 2>nul || start "" "%TARGET_HTML%"
echo.
echo Virtuosa Web Controller dibuka!
timeout /t 3 >nul 2>&1
