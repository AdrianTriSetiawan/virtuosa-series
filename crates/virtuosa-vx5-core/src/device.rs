use hidapi::{DeviceInfo, HidApi, HidDevice, HidError};
use std::ffi::CStr;

use crate::protocol::{
    build_handshake_report, build_key_matrix_report, build_read_profile_trigger, BULK_REPORT_SIZE,
    USAGE_PAGE_VENDOR, VORTEX_PID, VORTEX_VID,
};

#[derive(Debug, thiserror::Error)]
pub enum DeviceError {
    #[error("HID API error: {0}")]
    Hid(#[from] HidError),
    #[error("Device not connected or not found (VID: {0:#06x}, PID: {1:#06x})")]
    NotFound(u16, u16),
    #[error("Invalid report response (expected opcode {expected:#04x}, got {received:#04x})")]
    InvalidResponse { expected: u8, received: u8 },
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Operation suspended: {0}")]
    Suspended(&'static str),
}

/// Representation of a connected Vortex VX5 keyboard session
/// Supports dual-handle architecture (Cmd Handle for short 0x05 reports, Data Handle for bulk 0x06 reports)
pub struct VortexDevice {
    pub cmd_device: Option<HidDevice>,
    pub data_device: Option<HidDevice>,
    pub device: HidDevice,
    pub path: String,
}

impl VortexDevice {
    /// Discovers and opens matching Vortex VX5 device handles for both command and bulk data endpoints
    pub fn open_first(api: &HidApi) -> Result<Self, DeviceError> {
        let vendor_devs: Vec<_> = api
            .device_list()
            .filter(|d| {
                d.vendor_id() == VORTEX_VID
                    && d.product_id() == VORTEX_PID
                    && (d.usage_page() == USAGE_PAGE_VENDOR || d.usage_page() == 0)
            })
            .collect();

        if vendor_devs.is_empty() {
            return Err(DeviceError::NotFound(VORTEX_VID, VORTEX_PID));
        }

        // Select the vendor interface (Interface 2 or vendor usage page) without sending probe packets
        let target_dev = vendor_devs
            .iter()
            .find(|d| d.interface_number() == 2 || d.usage_page() == USAGE_PAGE_VENDOR)
            .unwrap_or(&vendor_devs[0]);

        let fallback_path = target_dev.path();
        let fallback = api.open_path(fallback_path)?;
        let primary_path = fallback_path.to_string_lossy().to_string();

        Ok(Self {
            cmd_device: None,
            data_device: None,
            device: fallback,
            path: primary_path,
        })
    }

    /// Opens device by CStr path
    pub fn open_path(api: &HidApi, path: &CStr) -> Result<Self, DeviceError> {
        let dev = api.open_path(path)?;
        let path_str = path.to_string_lossy().to_string();
        Ok(Self {
            cmd_device: None,
            data_device: None,
            device: dev,
            path: path_str,
        })
    }

    /// Enumerate all detected Vortex VX5 HID interfaces
    pub fn enumerate_devices(api: &HidApi) -> Vec<DeviceInfo> {
        api.device_list()
            .filter(|d| d.vendor_id() == VORTEX_VID && d.product_id() == VORTEX_PID)
            .cloned()
            .collect()
    }

    /// Sends the 9-byte handshake packet (Report ID 0x05 + PSD) via send_feature_report
    pub fn send_handshake(&self) -> Result<(), DeviceError> {
        let report = build_handshake_report();
        if let Some(cmd) = &self.cmd_device {
            cmd.send_feature_report(&report)?;
        } else {
            self.device.send_feature_report(&report)?;
        }
        Ok(())
    }

    /// Sends the 1032-byte key matrix report (Report ID 0x06, Opcode 0x04)
    pub fn write_key_matrix(&self, matrix: &[u32; 256]) -> Result<(), DeviceError> {
        let report = build_key_matrix_report(matrix);
        if let Some(data) = &self.data_device {
            data.send_feature_report(&report)?;
        } else {
            self.device.send_feature_report(&report)?;
        }
        Ok(())
    }

    /// Sends the 1032-byte LED matrix report (Report ID 0x06, Opcode 0x09)
    pub fn write_led_matrix(
        &self,
        _red: &[u8; 132],
        _green: &[u8; 132],
        _blue: &[u8; 132],
    ) -> Result<(), DeviceError> {
        Err(DeviceError::Suspended(
            "LED hardware write operations are suspended pending protocol specification verification",
        ))
    }

    /// Sets the hardware LED effect mode, brightness, speed, and per-key color palette
    pub fn set_led_config(
        &self,
        _mode_idx: u8,
        _brightness: u8,
        _speed: u8,
        _red: &[u8; 132],
        _green: &[u8; 132],
        _blue: &[u8; 132],
    ) -> Result<(), DeviceError> {
        Err(DeviceError::Suspended(
            "LED hardware write operations are suspended pending protocol specification verification",
        ))
    }

    /// Triggers read configuration and fetches the 1032-byte profile buffer from device
    pub fn read_profile(&self) -> Result<Vec<u8>, DeviceError> {
        // Step 1: Send trigger feature report (Report ID 0x05, Opcode 0x83)
        let trigger = build_read_profile_trigger();
        if let Some(cmd) = &self.cmd_device {
            cmd.send_feature_report(&trigger)?;
        } else {
            self.device.send_feature_report(&trigger)?;
        }

        std::thread::sleep(std::time::Duration::from_millis(15));

        // Step 2: Read feature report (Report ID 0x06, 1032 bytes)
        let mut buf = vec![0u8; BULK_REPORT_SIZE];
        buf[0] = 0x06; // Set Report ID request
        let len = if let Some(data) = &self.data_device {
            data.get_feature_report(&mut buf)?
        } else {
            self.device.get_feature_report(&mut buf)?
        };

        if len > 1 && buf[1] != 0x83 {
            return Err(DeviceError::InvalidResponse {
                expected: 0x83,
                received: buf[1],
            });
        }

        Ok(buf)
    }
}
