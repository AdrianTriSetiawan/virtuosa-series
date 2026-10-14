use hidapi::{DeviceInfo, HidApi, HidDevice};
use serde::{Deserialize, Serialize};
use std::ffi::CStr;

use crate::device::DeviceError;

pub const EX1_VID: u16 = 0x1D57;
pub const EX1_PID: u16 = 0xFA61;
pub const EX1_USAGE_PAGE: u16 = 0x000B;
pub const EX1_INTERFACE_NUMBER: i32 = 2;

pub const REPORT_ID_POLLING: u8 = 0x06;
pub const REPORT_ID_DPI: u8 = 0x04;
pub const REPORT_ID_LED: u8 = 0x05;
pub const REPORT_ID_PING: u8 = 0x0C;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Ex1PollingRate {
    Hz125 = 8,
    Hz250 = 4,
    Hz500 = 2,
    Hz1000 = 1,
}

impl Ex1PollingRate {
    pub fn interval_ms(&self) -> u8 {
        *self as u8
    }

    pub fn from_hz(hz: u16) -> Option<Self> {
        match hz {
            125 => Some(Self::Hz125),
            250 => Some(Self::Hz250),
            500 => Some(Self::Hz500),
            1000 => Some(Self::Hz1000),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Ex1LedMode {
    Off = 0,
    Static = 1,
    Breathing = 2,
    Neon = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ex1LedConfig {
    pub mode: Ex1LedMode,
    pub brightness: u8,
    pub speed: u8,
    pub red: u8,
    pub green: u8,
    pub blue: u8,
}

impl Default for Ex1LedConfig {
    fn default() -> Self {
        Self {
            mode: Ex1LedMode::Static,
            brightness: 5,
            speed: 5,
            red: 0,
            green: 255,
            blue: 255,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ex1DpiConfig {
    pub stages: [u16; 8],
    pub enabled_mask: u8,
    pub active_stage: u8,
    pub debounce_ms: u8,
    pub motion_sync: bool,
}

impl Default for Ex1DpiConfig {
    fn default() -> Self {
        Self {
            stages: [400, 800, 1600, 2400, 3200, 6400, 12000, 16000],
            enabled_mask: 0x1F, // First 5 stages enabled
            active_stage: 1,    // 800 DPI
            debounce_ms: 4,
            motion_sync: true,
        }
    }
}

/// Builds the 9-byte Polling Rate configuration report (Report ID 0x06).
pub fn build_ex1_polling_rate_report(rate: Ex1PollingRate) -> [u8; 9] {
    let interval = rate.interval_ms();
    let checksum = !interval;
    [
        REPORT_ID_POLLING,
        0x09, // Opcode Set Polling Rate
        0x01, // Sub-command
        interval,
        checksum,
        0x00,
        0x00,
        0x00,
        0x00,
    ]
}

/// Builds the handshake / ping report (Report ID 0x0C).
///
/// Note: The vendor application `Mouse.exe` allocates a 10-byte buffer
/// `[0x0C, 0x0A, 0x01, 0xFE, 0x01, 0xFE, 0x00, 0x00, 0x00, 0x00]`, but the USB descriptor
/// specifies Report Count 5 (6 bytes including Report ID). This report format is experimental
/// until reconciled with USB captures.
pub fn build_ex1_ping_report() -> [u8; 10] {
    [
        REPORT_ID_PING,
        0x0A,
        0x01,
        0xFE,
        0x01,
        0xFE,
        0x00,
        0x00,
        0x00,
        0x00,
    ]
}

/// Builds the 13-byte LED lighting configuration report (Report ID 0x05).
pub fn build_ex1_led_report(config: &Ex1LedConfig) -> [u8; 13] {
    let mut report = [0u8; 13];
    report[0] = REPORT_ID_LED;
    report[1] = 0x0F; // Opcode Set LED Effect
    report[2] = 0x01; // Sub-opcode
    report[3] = config.mode as u8;
    report[4] = ((config.speed.min(10) & 0x0F) << 4) | (config.brightness.min(10) & 0x0F);
    report[5] = config.red;
    report[6] = config.green;
    report[7] = config.blue;

    // Calculate 16-bit sum checksum for bytes 0..10
    let mut sum: u16 = 0;
    for &b in &report[..11] {
        sum = sum.wrapping_add(b as u16);
    }

    report[11] = (sum >> 8) as u8;
    report[12] = (sum & 0xFF) as u8;
    report
}

/// Builds the 52-byte DPI & Sensor configuration report (Report ID 0x04).
pub fn build_ex1_dpi_report(config: &Ex1DpiConfig) -> [u8; 52] {
    let mut report = [0u8; 52];
    report[0] = REPORT_ID_DPI;
    report[1] = 0x38; // Opcode Set Sensor / DPI Table
    report[2] = 0x01; // Sub-command
    report[3] = 0x00; // Profile ID
    report[4] = 0x01; // LOD mode
    report[5] = config.enabled_mask;
    report[6] = 0x00;
    report[7] = 0x00;

    // DPI LSB (bytes 8..15) and MSB (bytes 16..23)
    for (i, &dpi) in config.stages.iter().enumerate() {
        report[8 + i] = (dpi & 0xFF) as u8;
        report[16 + i] = ((dpi >> 8) & 0xFF) as u8;
    }

    report[24] = config.active_stage.min(7);
    report[25] = config.debounce_ms;
    report[26] = if config.motion_sync { 0x01 } else { 0x00 };
    report[49] = 0x01; // End marker

    // 16-bit sum checksum over bytes 0..49
    let mut sum: u16 = 0;
    for &b in &report[..50] {
        sum = sum.wrapping_add(b as u16);
    }

    report[50] = (sum >> 8) as u8;
    report[51] = (sum & 0xFF) as u8;
    report
}

/// Connected Tecware EX1 Wireless Mouse session
pub struct Ex1Device {
    pub device: HidDevice,
    pub path: String,
}

impl Ex1Device {
    /// Discovers and opens the configuration interface (Interface 2 / UsagePage 0x0B) of Tecware EX1
    pub fn open_first(api: &HidApi) -> Result<Self, DeviceError> {
        let matching_dev = api.device_list().find(|d| {
            d.vendor_id() == EX1_VID
                && d.product_id() == EX1_PID
                && (d.interface_number() == EX1_INTERFACE_NUMBER
                    || d.usage_page() == EX1_USAGE_PAGE)
        });

        // Fallback to any matching EX1 if interface number filter yields nothing
        let target = matching_dev.or_else(|| {
            api.device_list()
                .find(|d| d.vendor_id() == EX1_VID && d.product_id() == EX1_PID)
        });

        match target {
            Some(info) => Self::open_path(api, info.path()),
            None => Err(DeviceError::NotFound(EX1_VID, EX1_PID)),
        }
    }

    /// Opens device by CStr path
    pub fn open_path(api: &HidApi, path: &CStr) -> Result<Self, DeviceError> {
        let dev = api.open_path(path)?;
        let path_str = path.to_string_lossy().to_string();
        Ok(Self {
            device: dev,
            path: path_str,
        })
    }

    /// Enumerate all detected Tecware EX1 HID interfaces
    pub fn enumerate_devices(api: &HidApi) -> Vec<DeviceInfo> {
        api.device_list()
            .filter(|d| d.vendor_id() == EX1_VID && d.product_id() == EX1_PID)
            .cloned()
            .collect()
    }

    /// Sends a feature report buffer to the mouse
    pub fn send_feature_report(&self, data: &[u8]) -> Result<(), DeviceError> {
        self.device.send_feature_report(data)?;
        Ok(())
    }

    /// Sets the hardware polling rate
    pub fn set_polling_rate(&self, rate: Ex1PollingRate) -> Result<(), DeviceError> {
        let report = build_ex1_polling_rate_report(rate);
        self.send_feature_report(&report)
    }

    /// Sets the onboard RGB lighting effect
    pub fn set_led(&self, config: &Ex1LedConfig) -> Result<(), DeviceError> {
        let report = build_ex1_led_report(config);
        self.send_feature_report(&report)
    }

    /// Sets the DPI sensor table, active stage, and debounce settings
    pub fn set_dpi(&self, config: &Ex1DpiConfig) -> Result<(), DeviceError> {
        let report = build_ex1_dpi_report(config);
        self.send_feature_report(&report)
    }

    /// Sends a handshake ping
    pub fn ping(&self) -> Result<(), DeviceError> {
        let report = build_ex1_ping_report();
        self.send_feature_report(&report)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_polling_rate_1000hz() {
        let report = build_ex1_polling_rate_report(Ex1PollingRate::Hz1000);
        assert_eq!(report.len(), 9);
        assert_eq!(report[0], 0x06); // Report ID
        assert_eq!(report[1], 0x09); // Opcode
        assert_eq!(report[2], 0x01);
        assert_eq!(report[3], 0x01); // 1 ms
        assert_eq!(report[4], 0xFE); // ~0x01
        assert_eq!(&report[5..], &[0, 0, 0, 0]);
    }

    #[test]
    fn test_build_polling_rate_500hz() {
        let report = build_ex1_polling_rate_report(Ex1PollingRate::Hz500);
        assert_eq!(report[3], 0x02); // 2 ms
        assert_eq!(report[4], 0xFD); // ~0x02
    }

    #[test]
    fn test_build_polling_rate_125hz() {
        let report = build_ex1_polling_rate_report(Ex1PollingRate::Hz125);
        assert_eq!(report[3], 0x08); // 8 ms
        assert_eq!(report[4], 0xF7); // ~0x08
    }

    #[test]
    fn test_build_ping_report() {
        let report = build_ex1_ping_report();
        assert_eq!(report[0], 0x0C);
        assert_eq!(report[1], 0x0A);
        assert_eq!(report[2], 0x01);
        assert_eq!(report[3], 0xFE);
    }

    #[test]
    fn test_build_led_report() {
        let config = Ex1LedConfig {
            mode: Ex1LedMode::Static,
            brightness: 10,
            speed: 5,
            red: 0x12,
            green: 0x34,
            blue: 0x56,
        };
        let report = build_ex1_led_report(&config);
        assert_eq!(report[0], 0x05);
        assert_eq!(report[1], 0x0F);
        assert_eq!(report[3], 0x01);
        assert_eq!(report[5], 0x12);
        assert_eq!(report[6], 0x34);
        assert_eq!(report[7], 0x56);
        let sum = report[11] as u16 * 256 + report[12] as u16;
        assert!(sum > 0);
    }

    #[test]
    fn test_build_dpi_report() {
        let config = Ex1DpiConfig::default();
        let report = build_ex1_dpi_report(&config);
        assert_eq!(report.len(), 52);
        assert_eq!(report[0], 0x04);
        assert_eq!(report[1], 0x38);
        assert_eq!(report[5], 0x1F); // 5 stages enabled
                                     // 800 DPI on stage 2 (index 1) -> 800 = 0x0320
        assert_eq!(report[8 + 1], 0x20); // LSB
        assert_eq!(report[16 + 1], 0x03); // MSB
        assert_eq!(report[24], 1); // active stage
        assert_eq!(report[25], 4); // 4ms debounce
        assert_eq!(report[26], 1); // motion sync
    }
}
