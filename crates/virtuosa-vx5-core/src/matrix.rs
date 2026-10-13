/// Physical key index K55 (Left Win) in BY-K816 matrix
pub const MATRIX_INDEX_LWIN: usize = 11;
/// Physical key index K59 (Fn) in BY-K816 matrix
pub const MATRIX_INDEX_FN: usize = 83;

/// Value representing Fn layer modifier activator in K816 firmware
pub const VALUE_FN_ACTIVATOR: u32 = 0x00000020;
/// Value representing USB HID Left GUI (Windows Key)
pub const VALUE_LWIN_MODIFIER: u32 = 0x060000E3;
/// Default value in slot 11 for K55 (Dual Win/WinLock)
pub const VALUE_LWIN_DEFAULT_DUAL: u32 = 0x0C000002;

/// Creates an initialized ANSI 61-key matrix default based on Cfg.ini and KBMatrix.bin
pub fn create_default_matrix() -> [u32; 256] {
    let mut matrix = [0u32; 256];

    // Standard default mapping for K55 (LWin) and K59 (Fn)
    matrix[MATRIX_INDEX_LWIN] = VALUE_LWIN_DEFAULT_DUAL;
    matrix[MATRIX_INDEX_FN] = VALUE_FN_ACTIVATOR;

    // Common standard mappings
    matrix[0] = 0x00000029; // Esc
    matrix[1] = 0x0000001E; // 1
    matrix[2] = 0x0000001F; // 2
    matrix[3] = 0x00000020; // 3
    matrix[4] = 0x00000021; // 4
    matrix[5] = 0x00000022; // 5

    // Movement keys (WASD)
    matrix[18] = 0x0000001A; // W (Usage 0x1A)
    matrix[30] = 0x00000004; // A (Usage 0x04)
    matrix[31] = 0x00000016; // S (Usage 0x16)
    matrix[32] = 0x00000007; // D (Usage 0x07)

    matrix
}

/// Swaps the hardware Fn key (K59) with the Left Win key (K55).
/// - Matrix index 11 (K55, physical LWin position) becomes Fn activator (`0x00000020`).
/// - Matrix index 83 (K59, physical Fn position) becomes USB HID Left GUI modifier (`0x060000E3`).
pub fn swap_fn_win(matrix: &mut [u32; 256]) {
    matrix[MATRIX_INDEX_LWIN] = VALUE_FN_ACTIVATOR;
    matrix[MATRIX_INDEX_FN] = VALUE_LWIN_MODIFIER;
}

/// Resets Fn and Left Win back to default factory mapping.
pub fn reset_fn_win(matrix: &mut [u32; 256]) {
    matrix[MATRIX_INDEX_LWIN] = VALUE_LWIN_DEFAULT_DUAL;
    matrix[MATRIX_INDEX_FN] = VALUE_FN_ACTIVATOR;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_swap_fn_win_verification() {
        let mut matrix = create_default_matrix();
        assert_eq!(matrix[MATRIX_INDEX_LWIN], VALUE_LWIN_DEFAULT_DUAL);
        assert_eq!(matrix[MATRIX_INDEX_FN], VALUE_FN_ACTIVATOR);

        swap_fn_win(&mut matrix);

        // Verification per acceptance criteria:
        // matrix[11] == 0x20 and matrix[83] == 0x060000E3
        assert_eq!(matrix[MATRIX_INDEX_LWIN], 0x00000020);
        assert_eq!(matrix[MATRIX_INDEX_FN], 0x060000E3);
    }

    #[test]
    fn test_reset_fn_win() {
        let mut matrix = create_default_matrix();
        swap_fn_win(&mut matrix);
        assert_eq!(matrix[MATRIX_INDEX_LWIN], 0x20);

        reset_fn_win(&mut matrix);
        assert_eq!(matrix[MATRIX_INDEX_LWIN], VALUE_LWIN_DEFAULT_DUAL);
        assert_eq!(matrix[MATRIX_INDEX_FN], VALUE_FN_ACTIVATOR);
    }
}
