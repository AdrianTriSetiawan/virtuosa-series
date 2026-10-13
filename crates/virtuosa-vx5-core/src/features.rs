use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SocdMode {
    #[serde(rename = "last_priority")]
    LastPriority, // Snap Tap / Rappy Snappy: latest pressed key wins
    #[serde(rename = "neutral")]
    Neutral, // Opposing presses cancel out (A + D = None)
    #[serde(rename = "absolute_priority")]
    AbsolutePriority, // First pressed key holds priority until released
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SocdPair {
    pub key_a: String,
    pub key_b: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocdConfig {
    pub enabled: bool,
    pub mode: SocdMode,
    pub debounce_ms: u32,
    pub pairs: Vec<SocdPair>,
}

impl Default for SocdConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            mode: SocdMode::LastPriority,
            debounce_ms: 1,
            pairs: vec![
                SocdPair {
                    key_a: "KeyA".to_string(),
                    key_b: "KeyD".to_string(),
                    label: "Strafe (A / D)".to_string(),
                },
                SocdPair {
                    key_a: "KeyW".to_string(),
                    key_b: "KeyS".to_string(),
                    label: "Forward / Back (W / S)".to_string(),
                },
            ],
        }
    }
}

/// Dynamic state tracker for an opposing key pair (e.g. A and D)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SocdPairState {
    pub key_a_pressed: bool,
    pub key_b_pressed: bool,
    pub last_pressed: Option<char>, // 'A' or 'B'
    pub active_output: Option<char>, // None, 'A', or 'B'
}

impl Default for SocdPairState {
    fn default() -> Self {
        Self {
            key_a_pressed: false,
            key_b_pressed: false,
            last_pressed: None,
            active_output: None,
        }
    }
}

impl SocdPairState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Process a physical key event ('A' or 'B', is_down: bool) and return the resolved active output
    pub fn update(&mut self, key: char, is_down: bool, mode: SocdMode) -> Option<char> {
        match key {
            'A' => self.key_a_pressed = is_down,
            'B' => self.key_b_pressed = is_down,
            _ => return self.active_output,
        }

        if is_down {
            self.last_pressed = Some(key);
        }

        self.active_output = match (self.key_a_pressed, self.key_b_pressed) {
            (false, false) => None,
            (true, false) => Some('A'),
            (false, true) => Some('B'),
            (true, true) => match mode {
                SocdMode::LastPriority => self.last_pressed,
                SocdMode::Neutral => None,
                SocdMode::AbsolutePriority => {
                    if self.last_pressed == Some('A') {
                        Some('B')
                    } else {
                        Some('A')
                    }
                }
            },
        };

        self.active_output
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TapDanceRule {
    pub trigger_key: String,
    pub tap_action: String,
    pub hold_action: String,
    pub hold_threshold_ms: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RgbConfig {
    pub mode: String,
    pub hex_color: String,
    pub brightness: u8,
    pub speed: u8,
}

impl Default for RgbConfig {
    fn default() -> Self {
        Self {
            mode: "rainbow_wave".to_string(),
            hex_color: "#06B6D4".to_string(),
            brightness: 80,
            speed: 5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardProfile {
    pub name: String,
    pub vid: u16,
    pub pid: u16,
    pub socd: SocdConfig,
    pub tap_dance: Vec<TapDanceRule>,
    pub rgb: RgbConfig,
    pub matrix: Vec<u32>,
}

impl Default for KeyboardProfile {
    fn default() -> Self {
        Self {
            name: "Default Profile (FPS)".to_string(),
            vid: crate::protocol::VORTEX_VID,
            pid: crate::protocol::VORTEX_PID,
            socd: SocdConfig::default(),
            tap_dance: vec![
                TapDanceRule {
                    trigger_key: "CapsLock".to_string(),
                    tap_action: "Escape".to_string(),
                    hold_action: "ControlLeft".to_string(),
                    hold_threshold_ms: 200,
                },
            ],
            rgb: RgbConfig::default(),
            matrix: crate::matrix::create_default_matrix().to_vec(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_socd_snap_tap_last_priority_resolution() {
        let mut state = SocdPairState::new();

        // 1. Press Key A -> Active output is A
        assert_eq!(state.update('A', true, SocdMode::LastPriority), Some('A'));

        // 2. While Key A is still held down, press Key D (B) -> Snap Tap switches active to D
        assert_eq!(state.update('B', true, SocdMode::LastPriority), Some('B'));

        // 3. Release Key D (B) while Key A is still held down -> Active snaps back to A!
        assert_eq!(state.update('B', false, SocdMode::LastPriority), Some('A'));

        // 4. Release Key A -> None active
        assert_eq!(state.update('A', false, SocdMode::LastPriority), None);
    }

    #[test]
    fn test_socd_neutral_resolution() {
        let mut state = SocdPairState::new();

        // Press A -> Output A
        assert_eq!(state.update('A', true, SocdMode::Neutral), Some('A'));
        // Press D (B) simultaneously -> Output Neutral (None)
        assert_eq!(state.update('B', true, SocdMode::Neutral), None);
        // Release A -> Output B
        assert_eq!(state.update('A', false, SocdMode::Neutral), Some('B'));
    }

    #[test]
    fn test_profile_json_serde() {
        let profile = KeyboardProfile::default();
        let json = serde_json::to_string_pretty(&profile).expect("Failed to serialize profile");
        let deserialized: KeyboardProfile =
            serde_json::from_str(&json).expect("Failed to deserialize profile");

        assert_eq!(profile.name, deserialized.name);
        assert_eq!(profile.vid, deserialized.vid);
        assert_eq!(profile.pid, deserialized.pid);
        assert_eq!(profile.socd.mode, deserialized.socd.mode);
        assert_eq!(profile.tap_dance.len(), deserialized.tap_dance.len());
        assert_eq!(profile.matrix.len(), deserialized.matrix.len());
    }
}
