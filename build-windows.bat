@echo off
setlocal
echo ========================================================
echo  Virtuosa Series & Tecware EX1 - Automated Build Script
echo ========================================================
echo.

where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust / Cargo tidak ditemukan di PATH!
    echo Silakan install Rust terlebih dahulu dari https://rustup.rs
    pause
    exit /b 1
)

echo [1/2] Compiling virtuosa-vx5-cli dalam mode release...
cargo build --release --workspace
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Kompilasi gagal!
    pause
    exit /b 1
)

echo.
echo [2/2] Menyalin binary ke folder release-assets...
if not exist release-assets mkdir release-assets
copy /Y target\release\virtuosa-vx5-cli.exe release-assets\virtuosa-vx5-cli.exe >nul
echo Menjalankan inspeksi Tecware EX1 (read-only)...
release-assets\virtuosa-vx5-cli.exe ex1-inspect
echo.
echo CATATAN PENGUJIAN:
echo Gunakan perintah inspeksi di atas untuk memastikan perangkat terdeteksi.
echo Jangan menjalankan perintah penulisan (write) sebelum panjang paket
echo divalidasi dengan USB capture (Wireshark) pada software bawaan.
echo.
echo  - target\release\virtuosa-vx5-cli.exe
echo  - release-assets\virtuosa-vx5-cli.exe
echo ========================================================
echo.
echo Menjalankan inspeksi Tecware EX1...
release-assets\virtuosa-vx5-cli.exe ex1-inspect
echo.
pause
