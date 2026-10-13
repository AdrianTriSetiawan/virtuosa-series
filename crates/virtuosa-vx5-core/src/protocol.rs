pub const VORTEX_VID: u16 = 0x258A;
pub const VORTEX_PID: u16 = 0x0016;
pub const USAGE_PAGE_VENDOR: u16 = 0xFF00;
pub const USAGE_VENDOR: u16 = 0x01;

pub const MAGIC_PSD: [u8; 4] = [0xAA, 0xBB, 0xCC, 0x0D];

pub const REPORT_ID_SHORT: u8 = 0x05;
pub const REPORT_ID_BULK: u8 = 0x06;

pub const OPCODE_READ_PROFILE_TRIGGER: u8 = 0x83;
pub const OPCODE_WRITE_PROFILE: u8 = 0x03;
pub const OPCODE_WRITE_KEY_MATRIX: u8 = 0x04;
pub const OPCODE_WRITE_MACRO: u8 = 0x05;
pub const OPCODE_WRITE_RGB_TABLE: u8 = 0x08;
pub const OPCODE_WRITE_LED_MATRIX: u8 = 0x09;

pub const BULK_REPORT_SIZE: usize = 1032;
pub const SHORT_REPORT_SIZE: usize = 9;
pub const TRIGGER_REPORT_SIZE: usize = 7;

/// Builds the 9-byte handshake packet sent via short command handle.
/// Report ID 0x05 + PSD (0xAA, 0xBB, 0xCC, 0x0D) + 4 bytes padding (0x00).
pub fn build_handshake_report() -> [u8; SHORT_REPORT_SIZE] {
    let mut report = [0u8; SHORT_REPORT_SIZE];
    report[0] = REPORT_ID_SHORT;
    report[1..5].copy_from_slice(&MAGIC_PSD);
    report
}

/// Builds the 7-byte read profile trigger packet sent via short command handle.
/// Report ID 0x05 + opcode 0x83 + profile address (0x00) + 4 zero padding bytes.
pub fn build_read_profile_trigger() -> [u8; TRIGGER_REPORT_SIZE] {
    let mut report = [0u8; TRIGGER_REPORT_SIZE];
    report[0] = REPORT_ID_SHORT;
    report[1] = OPCODE_READ_PROFILE_TRIGGER;
    report
}

/// Builds the 1032-byte key matrix report.
/// Byte 0: Report ID 0x06
/// Byte 1: Opcode 0x04
/// Byte 2..7: Header [0xC8, 0x00, 0x40, 0x00, 0x00, 0x00]
/// Byte 8..1031: 256 DWORD entries in little-endian format (1024 bytes)
pub fn build_key_matrix_report(matrix: &[u32; 256]) -> [u8; BULK_REPORT_SIZE] {
    let mut report = [0u8; BULK_REPORT_SIZE];
    report[0] = REPORT_ID_BULK;
    report[1] = OPCODE_WRITE_KEY_MATRIX;
    report[2] = 0xC8;
    report[3] = 0x00;
    report[4] = 0x40;
    report[5] = 0x00;
    report[6] = 0x00;
    report[7] = 0x00;

    for (i, &entry) in matrix.iter().enumerate() {
        let offset = 8 + (i * 4);
        report[offset..offset + 4].copy_from_slice(&entry.to_le_bytes());
    }

    report
}

/// Builds the 1032-byte LED matrix report.
/// Byte 0: Report ID 0x06
/// Byte 1: Opcode 0x09
/// Byte 2..7: Header [0x00, 0x00, 0x40, 0x00, 0x00, 0x00]
/// Byte 8..: Color planes: 132 bytes Red, 132 bytes Green, 132 bytes Blue (total 396 bytes)
pub fn build_led_matrix_report(
    red: &[u8; 132],
    green: &[u8; 132],
    blue: &[u8; 132],
) -> [u8; BULK_REPORT_SIZE] {
    let mut report = [0u8; BULK_REPORT_SIZE];
    report[0] = REPORT_ID_BULK;
    report[1] = OPCODE_WRITE_LED_MATRIX;
    report[2] = 0x00;
    report[3] = 0x00;
    report[4] = 0x40;
    report[5] = 0x00; // ColorGroupAddr
    report[6] = 0x00;
    report[7] = 0x00;

    // Plane 0: Red (132 bytes)
    report[8..8 + 132].copy_from_slice(red);
    // Plane 1: Green (132 bytes)
    report[8 + 132..8 + 264].copy_from_slice(green);
    // Plane 2: Blue (132 bytes)
    report[8 + 264..8 + 396].copy_from_slice(blue);

    report
}

/// Builds the 1032-byte Macro report.
/// Byte 0: Report ID 0x06
/// Byte 1: Opcode 0x05
/// Byte 2: 0x40
/// Byte 4: macro_idx (1..32)
/// Byte 8..9: loop_count (little-endian)
/// Byte 10..N: Keystroke events: (is_up: bool, delay_ms: u8, usage_code: u8)
pub fn build_macro_report(
    macro_idx: u8,
    loop_count: u16,
    events: &[(bool, u8, u8)],
) -> [u8; BULK_REPORT_SIZE] {
    let mut report = [0u8; BULK_REPORT_SIZE];
    report[0] = REPORT_ID_BULK;
    report[1] = OPCODE_WRITE_MACRO;
    report[2] = 0x40;
    report[3] = 0x00;
    report[4] = macro_idx;
    report[5] = 0x00;
    report[6] = 0x00;
    report[7] = 0x00;

    report[8..10].copy_from_slice(&loop_count.to_le_bytes());

    let mut cursor = 10;
    for &(is_up, delay_ms, usage) in events {
        if cursor + 2 > BULK_REPORT_SIZE {
            break;
        }
        let delay_clamped = delay_ms & 0x7F;
        let byte0 = if is_up {
            0x80 | delay_clamped
        } else {
            delay_clamped
        };
        report[cursor] = byte0;
        report[cursor + 1] = usage;
        cursor += 2;
    }

    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handshake_report_exact_length_and_magic() {
        let report = build_handshake_report();
        assert_eq!(report.len(), 9);
        assert_eq!(report[0], 0x05);
        assert_eq!(&report[1..5], &[0xAA, 0xBB, 0xCC, 0x0D]);
        assert_eq!(&report[5..9], &[0x00, 0x00, 0x00, 0x00]);
    }

    #[test]
    fn test_read_profile_trigger_exact_length_and_opcode() {
        let trigger = build_read_profile_trigger();
        assert_eq!(trigger.len(), 7);
        assert_eq!(trigger[0], 0x05);
        assert_eq!(trigger[1], 0x83);
        assert_eq!(&trigger[2..7], &[0x00, 0x00, 0x00, 0x00, 0x00]);
    }

    #[test]
    fn test_key_matrix_report_exact_length_and_opcode() {
        let mut matrix = [0u32; 256];
        matrix[0] = 0x00000004; // Key 'A'
        matrix[11] = 0x060000E3; // Left Win
        matrix[83] = 0x00000020; // Fn

        let report = build_key_matrix_report(&matrix);
        assert_eq!(report.len(), 1032);
        assert_eq!(report[0], 0x06);
        assert_eq!(report[1], 0x04);
        assert_eq!(report[2], 0xC8);
        assert_eq!(report[4], 0x40);

        // Check index 0
        assert_eq!(&report[8..12], &0x00000004u32.to_le_bytes());
        // Check index 11
        let offset_11 = 8 + (11 * 4);
        assert_eq!(&report[offset_11..offset_11 + 4], &0x060000E3u32.to_le_bytes());
        // Check index 83
        let offset_83 = 8 + (83 * 4);
        assert_eq!(&report[offset_83..offset_83 + 4], &0x00000020u32.to_le_bytes());
    }

    #[test]
    fn test_led_matrix_report_exact_length_and_planes() {
        let red = [0xFF; 132];
        let green = [0xAA; 132];
        let blue = [0x55; 132];

        let report = build_led_matrix_report(&red, &green, &blue);
        assert_eq!(report.len(), 1032);
        assert_eq!(report[0], 0x06);
        assert_eq!(report[1], 0x09);
        assert_eq!(report[4], 0x40);
        assert_eq!(&report[8..8 + 132], &red);
        assert_eq!(&report[8 + 132..8 + 264], &green);
        assert_eq!(&report[8 + 264..8 + 396], &blue);
    }

    #[test]
    fn test_macro_report_formatting() {
        let events = [(false, 10, 0x04), (true, 10, 0x04)];
        let report = build_macro_report(1, 1, &events);
        assert_eq!(report.len(), 1032);
        assert_eq!(report[0], 0x06);
        assert_eq!(report[1], 0x05);
        assert_eq!(report[4], 1);
        // Loop count = 1
        assert_eq!(&report[8..10], &[0x01, 0x00]);
        // Event 1: Down 'A' delay 10 -> 0x0A, 0x04
        assert_eq!(&report[10..12], &[0x0A, 0x04]);
        // Event 2: Up 'A' delay 10 -> 0x8A, 0x04
        assert_eq!(&report[12..14], &[0x8A, 0x04]);
    }
}
