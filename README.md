# Virtuosa Series

> *for support my old keyboard vx5 😉*

[![Rust](https://img.shields.io/badge/Rust-1.80%2B-orange.svg?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![WebHID](https://img.shields.io/badge/WebHID-W3C%20Standard-blue.svg?logo=googlechrome&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)
[![Bun](https://img.shields.io/badge/Bun-1.4%2B-black.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-lightgrey.svg?logo=windows&logoColor=white)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Virtuosa Series** adalah ekosistem kontrol modern, berkinerja tinggi, dan berbobot ringan untuk mechanical keyboard **Vortex Series VX5** (arsitektur mikrokontroler **BY-Tech / Beiying K816**). Proyek ini menggabungkan core driver berbasis **Rust** tanpa runtime overhead dan graphical suite berbasis **WebHID + Bun** untuk memberikan kontrol penuh terhadap keyboard tanpa bloatware.

---

## Daftar Isi
- [1. Latar Belakang & Filosofi Proyek](#1-latar-belakang--filosofi-proyek)
- [2. Tech Stack Lengkap](#2-tech-stack-lengkap)
- [3. Fitur-Fitur Utama](#3-fitur-fitur-utama)
  - [Hardware Matrix Dynamic Fn ↔ Win Swap](#hardware-matrix-dynamic-fn--win-swap)
  - [Snap Tap / SOCD (Simultaneous Opposing Cardinal Directions)](#snap-tap--socd-simultaneous-opposing-cardinal-directions)
  - [Dual-Action / Tap-Dance (Mod-Tap)](#dual-action--tap-dance-mod-tap)
  - [RGB Lighting Studio](#rgb-lighting-studio)
  - [Onboard Macro Studio](#onboard-macro-studio)
  - [Local-First JSON Profiles](#local-first-json-profiles)
- [4. Cara Penggunaan](#4-cara-penggunaan)
  - [Metode 1: WebHID Control Center (Zero-Install)](#metode-1-webhid-control-center-zero-install)
  - [Metode 2: Virtuosa CLI (Power Users & Otomasi)](#metode-2-virtuosa-cli-power-users--otomasi)
- [5. Panduan Build dari Source Code](#5-panduan-build-dari-source-code)
- [6. Dokumentasi Protokol & Referensi](#6-dokumentasi-protokol--referensi)
- [7. Lisensi](#7-lisensi)

---

## 1. Latar Belakang & Filosofi Proyek

Mechanical keyboard **Vortex Series VX5** (ANSI 60% 61-key) merupakan salah satu keyboard budget-friendly yang populer di eranya. Namun, pengalaman pengguna jangka panjang terhambat oleh keterbatasan perangkat lunak bawaan:

1. **Software Resmi Mati & Terabaikan**: Tautan download driver resmi sering kali hilang, domain kadaluarsa, atau terkubur di file sharing lama tanpa pembaruan.
2. **Arsitektur Bloatware MFC Era 2010**: Software OEM bawaan (`OemDrv.exe` & `Lowerdev.dll`) dibangun dengan stack Microsoft Foundation Classes (MFC) lawas yang boros resource, lambat dibuka, dan membutuhkan hak akses Administrator terus-menerus.
3. **Batasan Buatan pada Fitur Krusial (Artificial Lockout)**: Pada software bawaan, upaya menukar tombol **Fn** dengan tombol lain diblokir secara sepihak oleh pesan pop-up `MessageBoxW("Get wrong fn!")`. Padahal, mikrokontroler hardware K816 sama sekali tidak memiliki batasan tersebut.

### Mengapa Virtuosa Series Dibuat?
**Virtuosa Series** lahir untuk memberikan *nafas baru* bagi keyboard VX5 lama. Kami membongkar batasan artifisial firmware melalui rekayasa balik (reverse engineering) yang bersih, menghadirkan:
- **Zero Bloatware**: Core CLI berukuran sangat ramping tanpa dependensi runtime besar.
- **Modern Hardware Features**: Membawa kapabilitas keyboard flagship masa kini (seperti *Snap Tap / SOCD*, *Tap-Dance*, dan *Dynamic Matrix Swap*) ke hardware klasik Anda.
- **Portabilitas & Zero-Install**: Dapat dikonfigurasi langsung dari browser modern tanpa perlu memasang driver mencurigakan.

---

## 2. Tech Stack Lengkap

Virtuosa dirancang dengan standar rekayasa perangkat lunak modern untuk keandalan maksimal dan latensi minimal:

### 🦀 Backend Core: Rust
- **Aman & Super Cepat**: Memory safety tanpa garbage collector, bebas overhead runtime.
- **`hidapi`**: Akses direct low-level USB HID Feature Report dan I/O Control via Endpoint 0 Control Transfers (`UsagePage = 0xFF00`, `Usage = 0x01`).
- **`clap 4.5`**: Parser Command-Line Interface modern dengan validasi argumen kuat dan help-text otomatis.
- **`serde` & `serde_json`**: Serialisasi dan deserialisasi profil hardware tanpa kehilangan integritas skema.
- **`thiserror` & `anyhow`**: Penanganan typed error yang ketat di level kernel/protokol hingga user layer.

### 🌐 Frontend UI: Modern WebHID + Bun
- **WebHID W3C API**: Berkomunikasi langsung dengan hardware USB dari browser (Google Chrome, Brave, Microsoft Edge, Opera) tanpa perlu menginstal driver WinUSB atau kernel filter driver tambahan.
- **Bun 1.4**: Bundler dan JavaScript runtime super cepat. Proses bundling UI selesai hanya dalam rentang **5–20 ms**.
- **Tailwind CSS & JetBrains Mono**: Tampilan visual dark-mode bernuansa industrial cybernetic dengan rendering interaktif matriks ANSI 60% 61 tombol.

### 🪟 Cross-Compilation & Distribution
- Dukungan **MinGW-w64** toolchain yang menghasilkan native Windows binary standalone (`.exe`) dan Linux ELF 64-bit murni tanpa dependensi eksternal.

---

## 3. Fitur-Fitur Utama

### Hardware Matrix Dynamic Fn ↔ Win Swap
- **Temuan Teknis Reverse Engineering**:
  Pada software OEM resmi, fungsi swap Fn ditolak oleh validasi sisi klien GUI dengan dialog `MessageBoxW "Get wrong fn!"`. Investigasi terhadap paket biner membuktikan bahwa firmware MCU BY-Tech K816 menerima tag fungsi khusus `0x20` (Fn layer activator) di **slot matriks mana saja** pada tabel 64-byte `KBMatrix`.
- **Cara Kerja**:
  Virtuosa menulis ulang slot K55 (default Left Win) dan K59 (default Fn), menukar fungsinya secara permanen pada memori internal keyboard:
  - Posisi Fn kanan menjadi tombol **Windows Key** standar.
  - Posisi Win kiri menjadi tombol **Fn Activator**, memungkinkan kombinasi satu tangan untuk akses layer panah (`Fn + WASD` / `Fn + IJKL`).

### Snap Tap / SOCD (Simultaneous Opposing Cardinal Directions)
Algoritma resolusi arah simultan yang populer di keyboard esport flagship:
- **Last-Win Priority**: Saat dua tombol arah berlawanan ditekan bersamaan (misal: `A` dan `D`), tombol terakhir yang ditekan akan langsung mengambil alih input tanpa jeda rilis tombol sebelumnya. Menghasilkan *counter-strafing* instan di game kompetitif seperti **Counter-Strike 2** dan **Valorant**.
- **Neutral Mode**: Membatalkan kedua input ketika ditekan berbarengan (`A + D = None`).
- **Absolute Mode**: Memprioritaskan tombol utama yang telah ditentukan.

### Dual-Action / Tap-Dance (Mod-Tap)
- **Tap Cepat vs Hold**: Tombol dapat mengirimkan input berbeda tergantung durasi penekanan.
- Tekan singkat (tap) mengirimkan tombol standar (misalnya `Caps Lock`), sementara tekan dan tahan (hold) bertindak sebagai tombol modifier (`Ctrl`) atau layer switch.

### RGB Lighting Studio
- **Arsitektur 3 Bidang Warna (Planes)**:
  Firmware K816 menerima data pencahayaan melalui **USB HID Feature Report `0x09`** yang dibagi menjadi 3 buffer warna terpisah berukuran masing-masing 132 bytes:
  - *Plane 0*: Red Component (132 bytes)
  - *Plane 1*: Green Component (132 bytes)
  - *Plane 2*: Blue Component (132 bytes)
- **Kontrol Penuh**: Menyesuaikan Brightness (level 0–5), Animation Speed (level 0–5), palet warna kustom, hingga efek statis per-tombol.

### Onboard Macro Studio
- Kapasitas penyimpanan hingga **32 slot macro onboard**.
- Dukungan perekaman event penekanan tombol (*Key Down* / *Key Up*) dengan timestamp delay berpresisi milidetik.
- Bit-marking cerdas: Event *Key Up* ditandai dengan bit 7 aktif (`0x80 | Scancode`) untuk sinkronisasi akurat pada firmware K816.

### Local-First JSON Profiles
- Simpan, muat, dan bagikan konfigurasi tombol, makro, dan pencahayaan dalam file format JSON yang bersih dan manusiawi.
- Bebas dari format biner tertutup atau registri Windows yang rapuh.

---

## 4. Cara Penggunaan

### Metode 1: WebHID Control Center (Zero-Install)
Cara termudah untuk mengontrol keyboard langsung dari browser berbasis Chromium.

1. Jalankan server lokal:
   - **Windows**: Double-click file `Start-Virtuosa.bat` atau jalankan via PowerShell.
   - **Linux**: Jalankan terminal:
     ```bash
     chmod +x start-virtuosa.sh
     ./start-virtuosa.sh
     ```
2. Browser akan membuka antarmuka Virtuosa di `http://localhost:3000`.
3. Klik tombol **"Connect WebHID"**.
4. Pada jendela pop-up browser, pilih keyboard Anda:
   - **Vendor ID (VID)**: `0x258A`
   - **Product ID (PID)**: `0x0016`
5. Atur mapping, Snap Tap, swap Fn, atau pencahayaan RGB secara interaktif.

---

### Metode 2: Virtuosa CLI (Power Users & Otomasi)
Bagi pengguna terminal yang menginginkan otomasi skrip, integrasi CI/CD, atau preferensi tanpa browser:

#### Di Windows:
```powershell
# 1. Pindai dan deteksi keyboard
.\virtuosa-vx5-cli.exe inspect

# 2. Kirim handshake ping ke MCU
.\virtuosa-vx5-cli.exe handshake

# 3. Tukar posisi tombol Fn dan Left Win di level hardware matrix
.\virtuosa-vx5-cli.exe swap-fn

# 4. Kembalikan susunan Fn dan Win ke standar pabrik
.\virtuosa-vx5-cli.exe reset-fn

# 5. Atur warna LED keyboard (Hex RGB)
.\virtuosa-vx5-cli.exe set-led --hex "#00FFFF"

# 6. Ekspor profil aktif ke file JSON
.\virtuosa-vx5-cli.exe profile-export --out my-profile.json

# 7. Terapkan kembali konfigurasi dari file JSON
.\virtuosa-vx5-cli.exe profile-import --file my-profile.json
```

#### Di Linux:
```bash
# Berikan hak akses USB (atau jalankan dengan sudo jika aturan udev belum diset)
# 1. Pindai dan deteksi keyboard
./virtuosa-vx5-cli inspect

# 2. Kirim handshake ping
./virtuosa-vx5-cli handshake

# 3. Tukar posisi tombol Fn dan Left Win
./virtuosa-vx5-cli swap-fn

# 4. Kembalikan ke pengaturan awal
./virtuosa-vx5-cli reset-fn

# 5. Atur warna LED
./virtuosa-vx5-cli set-led --hex "#FF007F"

# 6. Ekspor profil ke file JSON
./virtuosa-vx5-cli profile-export --out my-profile.json

# 7. Impor konfigurasi profil dari file JSON
./virtuosa-vx5-cli profile-import --file my-profile.json
```

> **Tips Linux (udev rule)**: Agar dapat mengakses perangkat USB tanpa `sudo`, buat file `/etc/udev/rules.d/99-virtuosa-vx5.rules`:
> ```udev
> SUBSYSTEM=="usb", ATTR{idVendor}=="258a", ATTR{idProduct}=="0016", MODE="0666"
> SUBSYSTEM=="hidraw", ATTRS{idVendor}=="258a", ATTRS{idProduct}=="0016", MODE="0666"
> ```
> Lalu jalankan `sudo udevadm control --reload-rules && sudo udevadm trigger`.

---

## 5. Panduan Build dari Source Code

### Prasyarat:
- **Rust & Cargo** (versi 1.80 atau lebih baru)
- **Bun** (versi 1.1 atau 1.4+)
- **GCC / Clang** dan library HID development (`libudev-dev` di Ubuntu/Debian, `systemd-libs` di Arch Linux).

### 1. Build Backend CLI (Rust)
```bash
# Masuk ke workspace root
cd /path/to/virtuosa-series

# Build semua workspace crates dalam mode release
cargo build --release

# Binary executable akan berada di:
# target/release/virtuosa-vx5-cli (Linux)
# target/release/virtuosa-vx5-cli.exe (Windows)
```

### 2. Build Frontend UI (Bun)
```bash
cd app

# Install dependensi (jika diperlukan)
bun install

# Jalankan server lokal untuk development
bun run start
```

---

## 6. Dokumentasi Protokol & Referensi

Hasil rekayasa balik lengkap terkait format paket USB HID, kontrol Feature Report `0x05`, `0x06`, `0x09`, matriks scanning hardware K816, dan struktur byte macro didokumentasikan secara komprehensif di:
👉 **[docs/PROTOCOL_SPEC.md](docs/PROTOCOL_SPEC.md)**

---

## 7. Lisensi

Proyek ini dilisensikan di bawah **[MIT License](LICENSE)**.

Copyright (c) 2026 **Adrian Tri Setiawan**

- **100% Open Source & Gratis**: Bebas digunakan untuk keperluan personal maupun komersial.
- **Hak Penuh Komunitas**: Anda bebas menyalin, memodifikasi, menggabungkan, mempublikasikan, mendistribusikan, mensublisensikan, dan/atau menjual salinan perangkat lunak ini.
- **Disediakan "AS IS"**: Disediakan apa adanya tanpa jaminan atau garansi apa pun, demi kebebasan berinovasi dan menjaga keyboard lawas tetap bertenaga! 🚀
