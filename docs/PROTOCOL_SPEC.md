# SPESIFIKASI PROTOKOL USB HID VORTEX SERIES VX5
## BY-Tech / Beiying K816 MCU Reverse Engineering Report

---

## 1. Ringkasan Eksekutif & Identifikasi Perangkat

Keyboard **Vortex Series VX5** (61-key 60% mechanical keyboard) menggunakan mikrokontroler **BY-Tech / Beiying K816** (sering disebut arsitektur BY-K816 / BY-K816-106). Perangkat ini menggunakan protokol USB HID Vendor-Defined berpemilik (proprietary) untuk konfigurasi profil, pemetaan tombol (key mapping / remap), pencahayaan LED RGB per tombol, dan penyimpanan macro onboard.

### Parameter Identifikasi Perangkat:
- **Vendor ID (VID)**: `0x258A`
- **Product ID (PID)**: `0x0016`
- **Device Class**: USB HID Composite Device
  - **Interface 0 / 1**: Standard USB HID Keyboard & Consumer/System Controls (Boot Protocol, Report Descriptor standar).
  - **Interface 2 / Vendor Collections**: Vendor-Defined HID Communication (`UsagePage = 0xFF00`, `Usage = 0x01`).
- **Internal Driver Stack**:
  - `Lowerdev.dll` (Internal Name: `HidParse.dll`): Wrapper Win32 untuk Windows HID API (`hid.dll` & `setupapi.dll`).
  - `OemDrv.exe`: Aplikasi GUI MFC utama pengendali konfigurasi dan transmisi paket HID.
  - `Cfg.ini`: Konfigurasi tombol `K1..K61`, mapping layer `[FN]`, parameter `LEDParam`, dan password handshake `PSD`.
  - `KBMatrix.bin`: Tabel biner 1024 bytes (256 DWORDs) yang memetakan matrix scanning hardware ke scancode internal / USB HID usages.

---

## 2. Analisis Arsitektur `Lowerdev.dll` (HID Communication Layer)

`Lowerdev.dll` mengekspor 8 fungsi Win32 untuk manajemen perangkat USB HID:
```c
FindHidDevice(LPCWSTR MatchStr);
OpenHidDevice(USHORT UsagePage, USHORT Usage, LPCWSTR MatchStr, 
              BOOL (*FilterCallback)(ULONG inLen, ULONG outLen, ULONG featLen, PVOID pData),
              ...);
SetFeature(HANDLE hDevice, PVOID ReportBuffer, ULONG ReportBufferLength);
GetFeature(HANDLE hDevice, PVOID ReportBuffer, ULONG ReportBufferLength);
SetOutputReport(HANDLE hDevice, PVOID ReportBuffer, ULONG ReportBufferLength);
GetInputReport(HANDLE hDevice, PVOID ReportBuffer, ULONG ReportBufferLength);
GetProductID(HANDLE hDevice, DWORD *pVidPid);
GetProductString(HANDLE hDevice, LPWSTR pString, ULONG MaxChars);
```

### 2.1. Enumerasi Perangkat (`FindHidDevice` & `OpenHidDevice`)
- **`FindHidDevice` (RVA `0x1010`)**:
  - Memanggil `HidD_GetHidGuid(&HidGuid)`.
  - Memanggil `SetupDiGetClassDevsW(&HidGuid, NULL, NULL, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE)`.
  - Mengiterasi semua antarmuka via `SetupDiEnumDeviceInterfaces`.
  - Mengambil path perangkat (`DevicePath`) via `SetupDiGetDeviceInterfaceDetailW`.
  - Memfilter string `DevicePath` menggunakan `StrStrIW(DevicePath, MatchStr)` (mencari substring `VID_258A&PID_0016`).

- **`OpenHidDevice` (RVA `0x1170`)**:
  - Membuka handle perangkat menggunakan `CreateFileW`:
    ```c
    CreateFileW(
        DevicePath,
        dwDesiredAccess,               // GENERIC_READ | GENERIC_WRITE (0xC0000000) atau GENERIC_WRITE (0x40000000)
        FILE_SHARE_READ | FILE_SHARE_WRITE (0x03),
        NULL,
        OPEN_EXISTING (0x03),
        0,                             // non-overlapped
        NULL
    );
    ```
  - Mengekstrak kapabilitas perangkat:
    - `HidD_GetPreparsedData(hDev, &pData)`
    - `HidP_GetCaps(pData, &Caps)`
    - `HidD_FreePreparsedData(pData)`
  - Memeriksa kesesuaian:
    - `Caps.UsagePage == UsagePage` (harus `0xFF00`)
    - `Caps.Usage == Usage` (harus `0x01`)
  - Memanggil `FilterCallback(Caps.InputReportByteLength, Caps.OutputReportByteLength, Caps.FeatureReportByteLength, pData)`.

### 2.2. Dual Handle Architecture (`m_hDevice` vs `m_hCmd`)
Pada inisialisasi aplikasi di `OemDrv.exe` (fungsi `0x43e910`), aplikasi membuka **DUA HANDLE TERPISAH** ke keyboard pada `UsagePage = 0xFF00`, `Usage = 0x01`:

| Variabel Handle | Offset Kelas | Callback Pemeriksaan | Filter Feature Report Length | Peran Utama |
|---|---|---|---|---|
| `m_hDevice` | `[esi+0x1C]` | `0x43E870` | `FeatureReportByteLength == 1032` (`0x408`) | Transfer Data Bulk (Matrix Tombol, Profile, LED Matrix, Macro) |
| `m_hCmd` | `[esi+0x20]` | `0x43E880` | `FeatureReportByteLength == 6` (atau short report <= 9) | Handshake/Password Ping, Trigger Read Command |

### 2.3. Mekanisme `SetFeature`, `GetFeature`, vs `SetOutputReport`
- **`SetFeature` (RVA `0x14F0`)**:
  - Membungkus `HidD_SetFeature`. Mengirim USB Control Transfer pada Endpoint 0 (`bmRequestType = 0x21`, `bRequest = 0x09` SET_REPORT, `wValue = (HID_REPORT_TYPE_FEATURE << 8) | ReportID`).
  - Digunakan untuk **SEMUA** operasi pengiriman konfigurasi ke keyboard:
    - Paket Handshake (Report ID `0x05`, panjang 9 byte) pada `m_hCmd`.
    - Paket Trigger Baca (Report ID `0x05`, panjang 7 byte) pada `m_hCmd`.
    - Paket Bulk Data (Report ID `0x06`, panjang 1032 byte) pada `m_hDevice`.
- **`GetFeature` (RVA `0x1510`)**:
  - Membungkus `HidD_GetFeature`. Mengambil data via USB Control Transfer pada Endpoint 0 (`bmRequestType = 0xA1`, `bRequest = 0x01` GET_REPORT).
  - Digunakan untuk membaca konfigurasi (Profile/EEPROM) dari keyboard via `m_hDevice` (Report ID `0x06`, panjang buffer 1032 byte).
- **`SetOutputReport` (RVA `0x1530`)**:
  - Membungkus `HidD_SetOutputReport`.
  - **TEMUAN DISASSEMBLY**: Fungsi ini **TIDAK PERNAH DIIMPOR ATAU DIGUNAKAN** oleh `OemDrv.exe` (`GetProcAddress` di `0x43EAC0` hanya me-load `OpenHidDevice`, `SetFeature`, `GetFeature`, `GetProductString`, `GetInputReport`). Firmware Beiying K816 murni mengandalkan **HID Feature Reports (Endpoint 0 Control Transfers)** untuk seluruh jalur kontrol dan data konfigurasi.

---

## 3. Format Pembingkaian Paket (Packet Framing)

Semua paket komunikasi dikelompokkan ke dalam dua jenis framing:

### Tipe A: Short Command Report (Report ID 0x05) — Dikirim via `m_hCmd`
- **Ukuran Buffer**: 9 byte (Handshake) atau 7 byte (Trigger).
- **Struktur**:
  - Byte 0: Report ID = `0x05`
  - Byte 1: Opcode / Magic Byte 0
  - Byte 2..8: Payload parameter / Magic bytes

### Tipe B: Bulk Data Report (Report ID 0x06) — Dikirim/Diterima via `m_hDevice`
- **Ukuran Buffer**: Tepat **1032 byte** (`0x408` bytes).
- **Struktur**:
  - Byte 0: Report ID = `0x06`
  - Byte 1: Opcode Perintah (`0x03`, `0x04`, `0x05`, `0x08`, `0x09`, `0x83`)
  - Byte 2..7: Header Parameter / Alamat Memori (6 bytes)
  - Byte 8..1031: Payload Data (1024 bytes)

---

## 4. Analisis Rinci Paket Protokol

### 4.1. Paket Handshake / Ping (`SetPassword`)
Dijalankan setiap kali aplikasi mendeteksi keyboard atau sebelum transaksi konfigurasi dilakukan (`0x43ED20`).

- **Transport**: `SetFeature(m_hCmd, buffer, 9)`
- **Report ID**: `0x05`
- **Panjang Buffer**: 9 Byte
- **Sumber Nilai**: Dibaca dari baris `PSD` di `Cfg.ini` (`PSD = 0xAA,0xBB,0xCC,0x0D`).
- **Tabel Offset Byte**:

| Offset | Panjang | Tipe | Nilai Contoh | Keterangan |
|---|---|---|---|---|
| `0x00` | 1 | uint8 | `0x05` | Report ID |
| `0x01` | 1 | uint8 | `0xAA` | PSD Byte 0 (Magic Header) |
| `0x02` | 1 | uint8 | `0xBB` | PSD Byte 1 |
| `0x03` | 1 | uint8 | `0xCC` | PSD Byte 2 |
| `0x04` | 1 | uint8 | `0x0D` | PSD Byte 3 |
| `0x05` | 1 | uint8 | `0x00` | Reserved / Zero Padding |
| `0x06` | 1 | uint8 | `0x00` | Reserved / Zero Padding |
| `0x07` | 1 | uint8 | `0x00` | Reserved / Zero Padding |
| `0x08` | 1 | uint8 | `0x00` | Reserved / Zero Padding |

*Catatan Eksekusi*: Driver mencoba mengirim paket ini maksimal 3 kali berturut-turut dengan jeda `Sleep(100)` antar percobaan. Jika tidak ada error USB, handshake dianggap berhasil.

---

### 4.2. Paket Read Configuration / Profile (`GetProfile`)
Prosedur pembacaan konfigurasi aktif keyboard (`0x43EEF0`) terdiri dari dua fase sinkronisasi:

#### Fase 1: Trigger Baca (SetFeature ke `m_hCmd`)
- **Transport**: `SetFeature(m_hCmd, buffer, 7)`
- **Ukuran**: 7 Byte

| Offset | Nilai | Keterangan |
|---|---|---|
| `0x00` | `0x05` | Report ID |
| `0x01` | `0x83` | Opcode: Request Read Profile / Configuration |
| `0x02` | `0x00` | Parameter Alamat Profile (0x00 = Profile 1 / Global) |
| `0x03..0x06` | `0x00, 0x00, 0x00, 0x00` | Padding Zero |

#### Fase 2: Pengambilan Data (GetFeature dari `m_hDevice`)
- Setelah jeda `Sleep(10)`, driver memanggil `GetFeature(m_hDevice, inBuffer, 1032)` (`0x43EC20`).
- Buffer masukan diisi awal dengan Byte 0 = `0x06`.
- Keyboard merespons dengan buffer 1032 byte:
  - `inBuffer[0]` = `0x06` (Report ID)
  - `inBuffer[1]` = `0x83` (Echo Opcode, diverifikasi oleh driver pada `0x43EFDD`)
  - `inBuffer[2..137]`: 136 byte (`0x22` DWORDs) data konfigurasi aktif keyboard:
    - **Global Settings (32 bytes)**: Indeks profile aktif, global mode flags.
    - **Profile 1 Data (64 bytes)**: Mode LED, Speed, Brightness, dan Magic Footer `0x5A, 0xA5` pada offset byte ke 62-63.

---

### 4.3. Paket Write Configuration / Profile (`SetProfile`)
Mengirim konfigurasi global dan profil pencahayaan ke keyboard onboard EEPROM (`0x43EDF0`).

- **Transport**: `SetFeature(m_hDevice, buffer, 1032)`
- **Ukuran**: 1032 Byte
- **Tabel Offset Byte**:

| Offset | Panjang | Nilai | Keterangan |
|---|---|---|---|
| `0x00` | 1 | `0x06` | Report ID |
| `0x01` | 1 | `0x03` | Opcode: Write Profile Configuration |
| `0x02..0x07` | 6 | `0x00` | Header padding / Reserved |
| `0x08..0x27` | 32 | Byte Array | **Global Configuration Block** (32 byte) |
| `0x28..0x67` | 64 | Byte Array | **Profile 1 Configuration Block** (64 byte) |
| `0x68..0xA7` | 64 | Byte Array | **Profile 2 Configuration Block** (64 byte) |
| `0xA8..0x407`| 864| `0x00` | Zero Padding hingga 1032 bytes |

#### Struktur Profile Block (64 Byte):
- `Offset +0x00`: Status Aktif Profil (`0x01` jika aktif, `0x00` jika tidak).
- `Offset +0x01`: Mode Efek LED (`0x00`..`0x10` sesuai `LEDParam`).
- `Offset +0x02`: Packed Parameter Kecepatan & Kecerahan (Brightness & Speed):
  - Dihitung di `0x40D9ED`:
    $$\text{Byte} = ((\text{Brightness} - 1) \ll 4) \mid (\text{Speed} - 1)$$
    *Contoh*: Brightness = 5, Speed = 3 $\rightarrow$ $((5-1) \ll 4) \mid (3-1) = 0x42$.
- `Offset +0x03`: Direction / Option Flags (dari `Direct1`).
- `Offset +0x04..0x3D`: Parameter turunan mode pencahayaan & preset warna.
- `Offset +0x3E`: `0x5A` (Magic Footer Byte 1).
- `Offset +0x3F`: `0xA5` (Magic Footer Byte 2).

---

### 4.4. Paket Write Key Mapping (`SetKeyMatrix`)
Mengunggah pemetaan 61 tombol (K1..K61) ke keyboard saat tombol **Apply** ditekan (`0x43F0D0`).

- **Transport**: `SetFeature(m_hDevice, buffer, 1032)`
- **Ukuran**: 1032 Byte
- **Tabel Offset Byte**:

| Offset | Panjang | Tipe | Nilai | Keterangan |
|---|---|---|---|---|
| `0x00` | 1 | uint8 | `0x06` | Report ID |
| `0x01` | 1 | uint8 | `0x04` | Opcode: Write Key Matrix Table |
| `0x02` | 1 | uint8 | `0xC8` | Target Address / EEPROM Bank Low Byte |
| `0x03` | 1 | uint8 | `0x00` | Target Address High Byte |
| `0x04` | 1 | uint8 | `0x40` | Length High Byte (`0x0400` = 1024 bytes) |
| `0x05` | 1 | uint8 | `0x00` | Length Low Byte |
| `0x06..0x07` | 2 | uint8 | `0x00, 0x00` | Reserved Padding |
| `0x08..0x407`| 1024 | uint32[256] | Matrix Array | **Data Tabel Matriks Tombol (256 entri $\times$ 4 byte)** |

#### Struktur Entri 4-Byte (uint32 Little-Endian) Matriks Tombol:
Setiap tombol fisik dipetakan ke slot array di `buffer[8 + (MatrixIndex * 4)]`:

1. **Tombol Standar USB HID (Karakter, Angka, Fungsi Dasar)**:
   - `Byte 0`: `0x00` (Tag Standard HID)
   - `Byte 1..2`: `0x00, 0x00`
   - `Byte 3`: USB HID Key Usage Code (misal `0x04` = 'A', `0x28` = Enter, `0x2C` = Space, `0x39` = CapsLock).
2. **Tombol Modifier Fisik (Control, Shift, Alt)**:
   - `Byte 0`: `0x06` (Tag Modifier)
   - `Byte 1..2`: `0x00, 0x00`
   - `Byte 3`: Modifier HID Usage Code (`0xE0` = LCtrl, `0xE1` = LShift, `0xE2` = LAlt).
3. **Tombol Dual-Function / Firmware Interpreted (Layer Fn & Arrows)**:
   - `Byte 0`: `0x02` (Tag Firmware Dual-Layer)
   - `Byte 1..2`: `0x00, 0x00`
   - `Byte 3`: Sub-Indeks Layer Fn (misal `0x0C` = LWin/WinLock, `0x0D` = Esc/~, `0x18` = RAlt/Left, `0x1C` = RShift/Up).
4. **Tombol Hardware Fn**:
   - Nilai uint32: `0x00000020` (Bytes: `20 00 00 00`).
   - Byte 0 bernilai `0x20` menandakan pengaktif tombol hardware function modifier.

---

### 4.5. Paket Write LED / Backlight Matrix & Palette

Pencahayaan LED dikirim dalam dua paket terpisah:

#### Paket 1: Custom Palette / RGB Table (`0x43F1F0`)
- **Transport**: `SetFeature(m_hDevice, buffer, 1032)`
- **Report ID**: `0x06`
- **Header**:
  - Byte 1: Opcode `0x08` (Write RGB Table)
  - Byte 2: `0xA8` (EEPROM Target Address)
  - Byte 4: `0x40` (Panjang blok)
- **Payload**: Daftar tuple RGB warna kustom palette.

#### Paket 2: Per-Key LED Color Matrix (`0x43F020` & `SetLedMatrix`)
- **Transport**: `SetFeature(m_hDevice, buffer, 1032)`
- **Report ID**: `0x06`
- **Header**:
  - Byte 1: Opcode `0x09` (Write LED Matrix)
  - Byte 4: `0x40`
  - Byte 5: `<ColorGroupAddr>` (Alamat grup warna dari `GaoshouAddr`)
- **Payload**:
  - Membawa 792 byte (`0x318`) data LED.
  - Terdiri dari 3 bidang warna komponen independen (Planes):
    - **Plane 0 (Red)**: 132 byte komponen Merah (1 byte per titik LED matriks).
    - **Plane 1 (Green)**: 132 byte komponen Hijau.
    - **Plane 2 (Blue)**: 132 byte komponen Biru.
  - Total $132 \times 3 = 396$ byte per frame (2 bank = 792 byte).

---

### 4.6. Paket Macro (`SetMacroData`)
Macro disimpan onboard dan dikirim via fungsi `0x43F2D0`.

- **Transport**: `SetFeature(m_hDevice, buffer, 1032)`
- **Report ID**: `0x06`
- **Header**:
  - Byte 0: `0x06` (Report ID)
  - Byte 1: `0x05` (Opcode: Write Macro Data)
  - Byte 2: `0x40`
  - Byte 4: `<MacroIndex>` (Indeks slot macro: `0x01`..`0x20`, maksimal 32 macro onboard)
- **Struktur Payload Macro (Mulai Byte 8)**:
  - **Byte 8..9**: `LoopCount` (uint16 little-endian):
    - `0x0001` = Loop 1 kali (eksekusi tunggal).
    - `0x0002`..`0xFFFF` = Cycle times.
    - `0x0000` = Loop continuously sampai tombol dilepas (mode hold).
  - **Byte 10..N**: Rangkaian Event Keystroke (setiap event berukuran 2 byte):

| Offset Event | Bit Field | Deskripsi |
|---|---|---|
| `Byte 0` | Bit 7 | Status Tombol: `0` = Key Down (Press), `1` = Key Up (Release) |
| `Byte 0` | Bit 0..6 | Delay ms: Waktu tunda sebelum aksi berikutnya (0..127 ms) |
| `Byte 1` | Bit 0..7 | Scancode USB HID Usage (misal `0x04` = 'A', `0xE0` = LCtrl) |

*Penanganan Delay Panjang (> 127 ms)*:
Jika delay melebihi 127 ms (dianalisis pada `0x40D3FC`), encoder membagi delay dengan 100 dan menyisipkan event ekstensi berukuran 6 byte (`delay / 100` multiplier packet).

---

## 5. Analisis Mendalam: Tombol Fn vs Win (K59 vs K55)

Pertanyaan spesifik:
> Pada `Cfg.ini`:
> `K55 (LWin) = 0x02,0x5B,0x00,11,89`
> `K59 (Fn)   = 0x02,0xFA,0x00,83,101`
> Apakah firmware keyboard menerima jika index 11 (LWin) diisi nilai `0xFA` dan index 83 (Fn) diisi nilai `0x5B` pada payload buffer?

### 5.1. Analisis Parsing & Validasi di `OemDrv.exe`
1. **Representasi Nilai**:
   - `K55` (LWin): `MatrixIndex = 11`. Di `KBMatrix.bin`, nilai default slot 11 adalah `0x0C000002` (Bytes: `02 00 00 0C`).
   - `K59` (Fn): `MatrixIndex = 83`. Di `KBMatrix.bin`, nilai default slot 83 adalah `0x00000020` (Bytes: `20 00 00 00`).
2. **Pengecekan di Disassembly (`0x43BA6D` - `0x43BAB5`)**:
   - `OemDrv.exe` membaca `KBMatrix.bin` ke dalam buffer `bDefMatrix` (`0x5CF6B0`).
   - Saat memproses entri tombol, driver memanggil fungsi parser `0x43B580`:
     - Untuk MatrixIndex 83 (nilai `0x00000020`), `0x43B580` mengecek `cmp al, 0x20` $\rightarrow$ mengatur virtual key internal `0xFA` dan mengembalikan `eax = 0`.
     - Driver mengecek `cmp eax, 0x01` pada `0x43BAAE`. Karena untuk Fn `eax == 0` (bukan 1), driver menandai slot 83 sebagai **HARD-LOCKED / NON-REMAPPABLE**.
     - Untuk MatrixIndex 11, nilai default adalah `0x02`, sehingga `0x43B580` mengembalikan `eax = 1` (remappable). Namun, pada `0x43BAB5`, driver memeriksa apakah keycode yang dimasukkan $\ge 0x30$ atau bernilai Fn (`0xFA`). Jika terdeteksi:
       ```asm
       43BABF: push 0x59EC38  ; "Get wrong fn: dwMatrixInx=%d, Key=%d"
       43BAC4: call ds:0x5CF594
       43BAD4: push 0x59EC8C  ; "Get wrong fn!"
       43BADB: call MessageBoxW
       ```
3. **Kesimpulan Layer Aplikasi**:
   - Aplikasi resmi `OemDrv.exe` **SECARA EKSPLISIT MENOLAK** pertukaran ini di tingkat UI/validasi dan akan memunculkan dialog error *"Get wrong fn!"*, membatalkan proses pengiriman paket.

### 5.2. Analisis Layer Firmware (BY-Tech K816 MCU)
Jika payload biner 1024-byte dimodifikasi secara langsung (bypassing `OemDrv.exe` menggunakan custom script USB HID / Python hidapi) dengan:
- `Matrix[11]` (Offset `0x02C`) = `20 00 00 00` (Tag Fn: `0x20`)
- `Matrix[83]` (Offset `0x14C`) = `02 00 00 0C` (Tag Dual Win: `0x02`, Sub 0x0C) atau `06 00 00 E3` (Modifier Left GUI)

**Perilaku Firmware MCU**:
1. **Penerimaan Payload (Acceptance)**:
   - Firmware K816 menerima paket `SetFeature` (Opcode `0x04`) tanpa memverifikasi apakah byte `0x20` berada di indeks 83. MCU hanya menuliskan seluruh 1024 byte ke dalam RAM matriks tombol dan mem-flash-nya ke EEPROM.
2. **Scanning Matriks Dinamis**:
   - Scanner pin keyboard K816 mengeksekusi scanning matriks Row/Column. Saat tombol fisik K55 ditekan, MCU mengambil slot matriks ke-11.
   - Karena byte tag bernilai `0x20`, MCU mengeksekusi logika:
     ```c
     if ((Matrix[matrix_idx] & 0xFF) == 0x20) {
         bFnPressed = key_down_state; // K55 sekarang berfungsi sebagai Fn!
     }
     ```
   - Tombol K55 **berhasil mengaktifkan layer FN** (misal K55 + 1 menghasilkan F1).
3. **Tombol K59 (Slot 83)**:
   - Jika diisi `06 00 00 E3` (USB HID Left GUI Modifier), K59 akan mengirimkan event tombol **Windows / Start Menu** secara normal.
4. **Caveat & Efek Samping Hardware**:
   - **Win-Lock LED**: Firmware K816 mengontrol LED indikator Win-Lock dengan memantau toggle flag pada slot 11. Jika posisi tombol ditukar, indikator LED Win-Lock mungkin tidak sinkron saat menekan `Fn + Win`.
   - **Hardware Factory Reset**: Shortcut darurat firmware seperti `Fn + Space` (tahan 3 detik) di-hardcode pada tingkat GPIO hardware scanning pin tertentu yang berkorelasi dengan pin fisik K59. Jika K59 ditukar, shortcut reset darurat ini mungkin memerlukan penekanan pin asli K59 atau tidak berfungsi.

---

## 6. Tabel Ringkasan Opcode Protokol

| Report ID | Opcode Byte | Interface | Panjang Buffer | Arah Transfer | Fungsi |
|---|---|---|---|---|---|
| `0x05` | `0xAA` | `m_hCmd` | 9 Byte | Host $\rightarrow$ Device | Handshake Ping / SetPassword (`PSD`) |
| `0x05` | `0x83` | `m_hCmd` | 7 Byte | Host $\rightarrow$ Device | Trigger Pembacaan Profil (Read Request) |
| `0x06` | `0x83` | `m_hDevice` | 1032 Byte | Device $\rightarrow$ Host | Response Data Profil Konfigurasi (`GetFeature`) |
| `0x06` | `0x03` | `m_hDevice` | 1032 Byte | Host $\rightarrow$ Device | Tulis Profil Konfigurasi Global & Mode LED |
| `0x06` | `0x04` | `m_hDevice` | 1032 Byte | Host $\rightarrow$ Device | Tulis Matriks Pemetaan Tombol (1024 bytes) |
| `0x06` | `0x05` | `m_hDevice` | 1032 Byte | Host $\rightarrow$ Device | Tulis Data Macro Onboard (1024 bytes) |
| `0x06` | `0x08` | `m_hDevice` | 1032 Byte | Host $\rightarrow$ Device | Tulis Tabel Warna Preset RGB Palette |
| `0x06` | `0x09` | `m_hDevice` | 1032 Byte | Host $\rightarrow$ Device | Tulis Matriks Warna LED RGB (792 bytes Planes) |

---

## 7. Contoh Paket Hex Mentah (Reference Raw Packets)

### A. Handshake Paket (9 Byte):
```hex
05 AA BB CC 0D 00 00 00 00
```

### B. Trigger Baca Profil (7 Byte):
```hex
05 83 00 00 00 00 00
```

### C. Header Tulis Matriks Tombol (1032 Byte):
```hex
06 04 C8 00 40 00 00 00 [1024 bytes Matrix Data...]
```
- Contoh isi slot Index 11 (K55 LWin):
  `02 00 00 0C` (Default Dual Win) atau `06 00 00 E3` (Direct USB Left GUI)
- Contoh isi slot Index 83 (K59 Fn):
  `20 00 00 00` (Hardware Fn Tag)

### D. Header Tulis Macro Slot 1 (1032 Byte):
```hex
06 05 40 00 01 00 00 00 01 00 0A 04 8A 04 00 00 ... [padding to 1032]
```
- `06 05 40 00 01 00 00 00`: Header Report ID 0x06, Opcode 0x05, Slot Macro 1.
- `01 00`: Repeat Count = 1.
- `0A 04`: Key Down 'A' (Usage 0x04) dengan Delay 10 ms (`0x0A`).
- `8A 04`: Key Up 'A' (Bit 7 set = `0x8A`) dengan Delay 10 ms.
