pub mod device;
pub mod features;
pub mod matrix;
pub mod protocol;

pub use device::{DeviceError, VortexDevice};
pub use features::{KeyboardProfile, RgbConfig, SocdConfig, SocdMode, SocdPairState, TapDanceRule};
pub use matrix::{
    create_default_matrix, reset_fn_win, swap_fn_win, MATRIX_INDEX_FN, MATRIX_INDEX_LWIN,
    VALUE_FN_ACTIVATOR, VALUE_LWIN_DEFAULT_DUAL, VALUE_LWIN_MODIFIER,
};
pub use protocol::{
    build_handshake_report, build_key_matrix_report, build_led_matrix_report, build_macro_report,
    build_read_profile_trigger, BULK_REPORT_SIZE, MAGIC_PSD, SHORT_REPORT_SIZE,
    TRIGGER_REPORT_SIZE, USAGE_PAGE_VENDOR, USAGE_VENDOR, VORTEX_PID, VORTEX_VID,
};

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}
