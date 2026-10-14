# SPESIFIKASI PROTOKOL USB HID TECWARE EX1 WIRELESS MOUSE
## Reverse Engineering Report & USB Feature Report Specification

---

## 1. Ringkasan Eksekutif & Identifikasi Perangkat

Mouse **Tecware EX1 Wireless** adalah mouse gaming ultra-lightweight yang menggunakan komunikasi USB HID multi-interface untuk pengiriman data gerakan standar dan konfigurasi onboard (DPI, polling rate, debounce time, pencahayaan RGB, serta macro).

### Parameter Identifikasi Perangkat:
- **Vendor ID (VID)**: `0x1D57` (Xenta / OEM Vendor)
- **Product ID (PID)**: `0xFA61` (`Tecware EX1`)
- **USB Speed**: Full Speed (12 Mbps), `bcdUSB = 1.10`
- **Device Class**: USB HID Composite Device (4 Interface):
  - **Interface 0** (`8-1:1.0`): Boot Interface Subclass 1, Protocol 1 (Keyboard emulation untuk multimedia/shortcut keys).
  - **Interface 1** (`8-1:1.1`): Boot Interface Subclass 1, Protocol 2 (Standard Mouse report, movement delta, wheel, buttons).
  - **Interface 2** (`8-1:1.2`): **Configuration Endpoint** (`UsagePage = 0x000B` Telephony / Custom Vendor, `wDescriptorLength = 236`).
  - **Interface 3** (`8-1:1.3`): Boot Interface Subclass 1, Protocol 1 (Auxiliary controls).

---

## 2. Analisis Arsitektur Driver OEM (`Mouse.exe` & `hiddriver_1.dll`)

Aplikasi konfigurasi resmi (`Mouse.exe`) berbasis C++ / DuiLib menggunakan pustaka pendukung `hidapi.dll`, `hiddriver_1.dll`, dan `hiddriver_2.dll`.

### 2.1. Dynamic Linking & Driver API
Pada runtime, `Mouse.exe` memuat driver HID secara dinamis menggunakan `LoadLibraryW` dan memetakan pointer fungsi:
```c
// Alokasi struktur konteks driver pada [esi]:
[esi+0x48] = GetProcAddress(hDriver, "Set_VIDPID");
[esi+0x30] = GetProcAddress(hDriver, "Open_DevMonitor");
[esi+0x34] = GetProcAddress(hDriver, "Close_DevMonitor");
[esi+0x38] = GetProcAddress(hDriver, "Open_FeatureDevice");
[esi+0x3c] = GetProcAddress(hDriver, "Close_FeatureDevice");
[esi+0x40] = GetProcAddress(hDriver, "SetFeature");         // -> HidD_SetFeature wrapper
[esi+0x44] = GetProcAddress(hDriver, "GetFeature");         // -> HidD_GetFeature wrapper
```

### 2.2. Fungsi Sentral Transmisi Paket (`0x415d20`)
Fungsi `0x415d20` bertindak sebagai dispatcher pengiriman laporan HID ke perangkat:
```c
int send_command(void *buffer, int length) {
    uint8_t report_id = ((uint8_t*)buffer)[0];
    if (report_id == 0x09) {
        // Mode stream multi-chunk 64 bytes (LED matrix / macro data)
        // Packet header: [0x09, 0x40, sub_param, chunk_index, ...]
        return SetFeature_Chunked(buffer, 64);
    } else {
        // Direct pass-through ke Windows HidD_SetFeature / WebHID sendFeatureReport
        return driver->SetFeature(buffer, length);
    }
}
```

---

## 3. Rincian Format Paket USB HID Feature Report

Semua perintah konfigurasi dikirimkan melalui **Interface 2** (`UsagePage = 0x0B`). Setiap paket diawali oleh 1 byte **Report ID**.

### 3.1. Report ID `0x06`: Polling Rate Configuration
Mengatur frekuensi polling sensor mouse (125 Hz s/d 1000 Hz).

- **Ukuran Buffer**: 9 Bytes (1 byte Report ID + 8 bytes payload).
- **Struktur Byte**:
  | Offset | Field | Tipe | Deskripsi / Nilai |
  | :--- | :--- | :--- | :--- |
  | `0x00` | `Report ID` | `uint8` | `0x06` |
  | `0x01` | `Opcode` | `uint8` | `0x09` (Set Polling Rate) |
  | `0x02` | `SubCommand` | `uint8` | `0x01` |
  | `0x03` | `IntervalMs` | `uint8` | `0x08` = 125 Hz (8 ms)<br>`0x04` = 250 Hz (4 ms)<br>`0x02` = 500 Hz (2 ms)<br>`0x01` = 1000 Hz (1 ms) |
  | `0x04` | `Checksum` | `uint8` | Bitwise NOT dari `IntervalMs` (`~IntervalMs`)<br>Contoh 1000 Hz: `~0x01 = 0xFE` |
  | `0x05..0x08`| `Padding` | `uint8[4]` | `0x00, 0x00, 0x00, 0x00` |

### 3.2. Report ID `0x04`: DPI Table & Sensor Configuration
Mengatur tabel resolusi DPI (hingga 8 stage), stage aktif, debounce time, dan Motion Sync.

- **Ukuran Buffer**: 52 Bytes (1 byte Report ID + 51 bytes payload, stack buffer 56 bytes).
- **Struktur Byte**:
  | Offset | Field | Tipe | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `0x00` | `Report ID` | `uint8` | `0x04` |
  | `0x01` | `Opcode` | `uint8` | `0x38` (Set Sensor/DPI Table) |
  | `0x02` | `SubCommand` | `uint8` | `0x01` |
  | `0x03` | `ProfileID` | `uint8` | Indeks profil onboard (default: `0x00`) |
  | `0x04` | `LOD_Mode` | `uint8` | Lift-off distance setting (1mm / 2mm) |
  | `0x05` | `StageEnableMask` | `uint8` | Bitmask stage yang aktif:<br>Bit 0: Stage 1 (`0x01`)<br>Bit 1: Stage 2 (`0x02`)<br>Bit 2: Stage 3 (`0x04`)<br>... hingga Bit 7: Stage 8 (`0x80`) |
  | `0x06` | `ConfigFlag1` | `uint8` | Sensor extended parameter 1 |
  | `0x07` | `ConfigFlag2` | `uint8` | Sensor extended parameter 2 |
  | `0x08..0x0F`| `DPI_LSB[8]` | `uint8[8]` | Byte rendah (LSB) resolusi untuk Stage 1 s/d 8 |
  | `0x10..0x17`| `DPI_MSB[8]` | `uint8[8]` | Byte tinggi (MSB) resolusi untuk Stage 1 s/d 8 |
  | `0x18` | `ActiveStage` | `uint8` | Stage DPI yang aktif saat ini (`0` s/d `7`) |
  | `0x19` | `DebounceMs` | `uint8` | Waktu debounce tombol (ms, misal `4` untuk 4ms) |
  | `0x1A` | `MotionSync` | `uint8` | `0x01` = Enabled, `0x00` = Disabled |
  | `0x1B..0x30`| `Reserved` | `uint8[22]`| Konfigurasi tombol / auxiliary mapping |
  | `0x31` | `EndMarker` | `uint8` | `0x01` |
  | `0x32` | `Checksum_MSB` | `uint8` | Byte tinggi dari 16-bit sum (offset `0x00..0x31`) |
  | `0x33` | `Checksum_LSB` | `uint8` | Byte rendah dari 16-bit sum (offset `0x00..0x31`) |

*Catatan Resolusi DPI*:
`DPI = (MSB << 8) | LSB`. Contoh 800 DPI: LSB = `0x20`, MSB = `0x03` (`0x0320 = 800`).

### 3.3. Report ID `0x05`: LED Lighting Mode & Color
Mengatur efek pencahayaan LED RGB mouse (Static, Breathing, Rainbow, Off, dll.).

- **Ukuran Buffer**: 13 Bytes (1 byte Report ID + 12 bytes payload).
- **Struktur Byte**:
  | Offset | Field | Tipe | Deskripsi |
  | :--- | :--- | :--- | :--- |
  | `0x00` | `Report ID` | `uint8` | `0x05` |
  | `0x01` | `Opcode` | `uint8` | `0x0F` (Set LED Effect) |
  | `0x02` | `SubOp` | `uint8` | `0x01` |
  | `0x03` | `EffectMode` | `uint8` | `0x00` = Off, `0x01` = Static, `0x02` = Breathing, `0x03` = Neon / Spectrum |
  | `0x04` | `Speed_Bright` | `uint8` | Nibble gabungan: `(Speed << 4) | Brightness` |
  | `0x05` | `Red` | `uint8` | Komponen warna Merah (`0..255`) |
  | `0x06` | `Green` | `uint8` | Komponen warna Hijau (`0..255`) |
  | `0x07` | `Blue` | `uint8` | Komponen warna Biru (`0..255`) |
  | `0x08..0x0A`| `Params` | `uint8[3]` | Parameter efek tambahan |
  | `0x0B` | `Checksum_MSB`| `uint8` | Checksum 16-bit MSB |
  | `0x0C` | `Checksum_LSB`| `uint8` | Checksum 16-bit LSB |

### 3.4. Report ID `0x08`: Per-Stage DPI RGB Palette Table
Menyimpan warna LED indikator DPI untuk tiap stage (58 bytes payload):
- `0x00`: `0x08` (Report ID)
- `0x01`: `0x3B` (Opcode Palette)
- `0x02`: `0x01`
- `0x03..0x39`: Array warna RGB berturutan (`R, G, B` untuk Stage 1..8).

### 3.5. Report ID `0x0C`: Sync / Handshake Ping
- **Struktur**: `[0x0C, 0x0A, 0x01, 0xFE, 0x01, 0xFE, 0x00, 0x00, 0x00, 0x00]` (10 bytes). Digunakan aplikasi untuk memastikan mouse merespons sebelum menulis profil.

---

## 4. Panduan Implementasi WebHID (Browser Client)

Karena antarmuka konfigurasi berada pada **Usage Page `0x0B`**, Chromium mengizinkan komunikasi tanpa terhalang blocklist Generic Desktop.

### Snippet JavaScript WebHID:
```javascript
// 1. Request akses ke Tecware EX1
const [device] = await navigator.hid.requestDevice({
  filters: [{ vendorId: 0x1d57, productId: 0xfa61 }]
});
await device.open();

// 2. Mengubah Polling Rate ke 1000 Hz
const pollingPacket = new Uint8Array([
  0x09,       // Opcode Set Polling Rate
  0x01,       // Sub-command
  0x01,       // Interval: 1 ms (1000 Hz)
  0xFE,       // Checksum: ~0x01
  0x00, 0x00, 0x00, 0x00 // Padding
]);
// WebHID sendFeatureReport: argumen 1 adalah Report ID, argumen 2 adalah payload data
await device.sendFeatureReport(0x06, pollingPacket);
```
