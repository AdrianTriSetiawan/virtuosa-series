use hidapi::{DeviceInfo, HidApi, HidDevice, HidError};
use std::ffi::CStr;

use crate::protocol::{
    build_handshake_report, build_key_matrix_report, build_led_matrix_report,
    build_read_profile_trigger, BULK_REPORT_SIZE, VORTEX_PID, VORTEX_VID,
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
}

/// Representation of a connected Vortex VX5 keyboard session
pub struct VortexDevice {
    pub device: HidDevice,
    pub path: String,
}

impl VortexDevice {
    /// Discovers and opens the first matching Vortex VX5 device
    pub fn open_first(api: &HidApi) -> Result<Self, DeviceError> {
        let matching_dev = api
            .device_list()
            .find(|d| d.vendor_id() == VORTEX_VID && d.product_id() == VORTEX_PID);

        match matching_dev {
            Some(info) => Self::open_path(api, info.path()),
            None => Err(DeviceError::NotFound(VORTEX_VID, VORTEX_PID)),
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
        self.device.send_feature_report(&report)?;
        Ok(())
    }

    /// Sends the 1032-byte key matrix report (Report ID 0x06, Opcode 0x04)
    pub fn write_key_matrix(&self, matrix: &[u32; 256]) -> Result<(), DeviceError> {
        let report = build_key_matrix_report(matrix);
        self.device.send_feature_report(&report)?;
        Ok(())
    }

    /// Sends the 1032-byte LED matrix report (Report ID 0x06, Opcode 0x09)
    pub fn write_led_matrix(
        &self,
        red: &[u8; 132],
        green: &[u8; 132],
        blue: &[u8; 132],
    ) -> Result<(), DeviceError> {
        let report = build_led_matrix_report(red, green, blue);
        self.device.send_feature_report(&report)?;
        Ok(())
    }

    /// Triggers read configuration and fetches the 1032-byte profile buffer from device
    pub fn read_profile(&self) -> Result<Vec<u8>, DeviceError> {
        // Step 1: Send trigger feature report (Report ID 0x05, Opcode 0x83)
        let trigger = build_read_profile_trigger();
        self.device.send_feature_report(&trigger)?;

        std::thread::sleep(std::time::Duration::from_millis(15));

        // Step 2: Read feature report (Report ID 0x06, 1032 bytes)
        let mut buf = vec![0u8; BULK_REPORT_SIZE];
        buf[0] = 0x06; // Set Report ID request
        let len = self.device.get_feature_report(&mut buf)?;

        if len > 1 && buf[1] != 0x83 {
            return Err(DeviceError::InvalidResponse {
                expected: 0x83,
                received: buf[1],
            });
        }

        Ok(buf)
    }
}
