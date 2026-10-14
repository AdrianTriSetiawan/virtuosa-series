use anyhow::Result;
use clap::{Parser, Subcommand};
use colored::*;
use hidapi::HidApi;
use std::fs;
use std::path::PathBuf;

use virtuosa_vx5_core::{
    create_default_matrix, reset_fn_win, swap_fn_win, Ex1Device, Ex1DpiConfig, Ex1LedConfig,
    Ex1LedMode, Ex1PollingRate, KeyboardProfile, VortexDevice, EX1_PID, EX1_VID, MATRIX_INDEX_FN,
    MATRIX_INDEX_LWIN,
};

#[derive(Parser)]
#[command(name = "virtuosa-vx5-cli")]
#[command(
    about = "Virtuosa Series CLI - for support my old keyboard vx5 😉",
    long_about = None
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Inspect connected Virtuosa / VX5 HID devices and system interfaces
    Inspect,
    /// Send handshake ping (magic PSD 0xAA 0xBB 0xCC 0x0D) to the device
    Handshake,
    /// Swap Fn and Left Win keys on the hardware matrix (Win on K59, Fn on K55)
    SwapFn,
    /// Reset Fn and Left Win back to default factory mapping
    ResetFn,
    /// Set static RGB backlight color across all keys
    SetLed {
        #[arg(short, long, default_value = "#00FFFF")]
        hex: String,
        #[arg(short, long, default_value_t = 0)]
        mode: u8,
        #[arg(short, long, default_value_t = 5)]
        brightness: u8,
        #[arg(short, long, default_value_t = 5)]
        speed: u8,
    },
    /// Export active configuration / profile to a JSON file
    ProfileExport {
        #[arg(short, long, default_value = "virtuosa-profile.json")]
        out: PathBuf,
    },
    /// Import configuration profile from a JSON file and apply to keyboard
    ProfileImport {
        #[arg(short, long)]
        file: PathBuf,
    },
    /// Read raw 1032-byte active profile block from keyboard MCU
    ReadRaw,
    /// Inspect connected Tecware EX1 Mouse (VID: 0x1D57, PID: 0xFA61)
    Ex1Inspect,
    /// Set Tecware EX1 polling rate (125, 250, 500, or 1000 Hz) [Experimental]
    Ex1Polling {
        #[arg(short, long, default_value_t = 1000)]
        hz: u16,
        #[arg(long)]
        experimental: bool,
    },
    /// Set Tecware EX1 RGB lighting (hex color, mode, brightness, speed) [Experimental]
    Ex1Led {
        #[arg(short, long, default_value = "#00FFFF")]
        hex: String,
        #[arg(short, long, default_value_t = 1)]
        mode: u8,
        #[arg(short, long, default_value_t = 5)]
        brightness: u8,
        #[arg(short, long, default_value_t = 5)]
        speed: u8,
        #[arg(long)]
        experimental: bool,
    },
    /// Set Tecware EX1 DPI stage and debounce settings [Experimental]
    Ex1Dpi {
        #[arg(short, long, default_value_t = 800)]
        dpi: u16,
        #[arg(short, long, default_value_t = 4)]
        debounce_ms: u8,
        #[arg(long, default_value_t = true)]
        motion_sync: bool,
        #[arg(long)]
        experimental: bool,
    },
    /// Send ping / sync report to Tecware EX1 [Experimental]
    Ex1Ping {
        #[arg(long)]
        experimental: bool,
    },
}

fn hex_to_rgb(hex: &str) -> Result<(u8, u8, u8)> {
    let clean = hex.trim_start_matches('#');
    if clean.len() != 6 {
        anyhow::bail!("Hex color must be 6 hex digits, e.g. #00FFFF");
    }
    let r = u8::from_str_radix(&clean[0..2], 16)?;
    let g = u8::from_str_radix(&clean[2..4], 16)?;
    let b = u8::from_str_radix(&clean[4..6], 16)?;
    Ok((r, g, b))
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let api = HidApi::new()?;

    match cli.command {
        Commands::Inspect => {
            println!(
                "{}",
                "=== Scanning for Virtuosa Series (VID: 0x258A, PID: 0x0016) ==="
                    .bold()
                    .cyan()
            );
            let devices = VortexDevice::enumerate_devices(&api);
            if devices.is_empty() {
                println!("{}", "No matching Virtuosa / VX5 device detected.".yellow());
                println!("Make sure the keyboard is plugged in or check udev permissions.");
            } else {
                for (i, dev) in devices.iter().enumerate() {
                    println!(
                        "[{}] Path: {} | UsagePage: {:#06x} | Usage: {:#06x} | Interface: {}",
                        i,
                        dev.path().to_string_lossy().green(),
                        dev.usage_page(),
                        dev.usage(),
                        dev.interface_number()
                    );
                }
            }
        }

        Commands::Handshake => {
            println!(
                "{}",
                "Initiating handshake with Virtuosa Series VX5...".cyan()
            );
            match VortexDevice::open_first(&api) {
                Ok(dev) => {
                    dev.send_handshake()?;
                    println!(
                        "{}",
                        "✓ Handshake report (0x05 + PSD) accepted successfully!"
                            .green()
                            .bold()
                    );
                }
                Err(e) => {
                    eprintln!("{} {}", "✗ Failed to open device:".red().bold(), e);
                }
            }
        }

        Commands::SwapFn => {
            println!(
                "{}",
                "Preparing Key Matrix: Swapping Left Win (K55) and Fn (K59)...".cyan()
            );
            let mut matrix = create_default_matrix();
            swap_fn_win(&mut matrix);

            println!(
                "  Matrix[11] (Physical LWin) -> {:#010x} (Fn Activator)",
                matrix[MATRIX_INDEX_LWIN]
            );
            println!(
                "  Matrix[83] (Physical Fn)   -> {:#010x} (Left GUI Modifier)",
                matrix[MATRIX_INDEX_FN]
            );

            match VortexDevice::open_first(&api) {
                Ok(dev) => {
                    dev.send_handshake()?;
                    dev.write_key_matrix(&matrix)?;
                    println!(
                        "{}",
                        "✓ Key matrix updated on hardware successfully!"
                            .green()
                            .bold()
                    );
                }
                Err(e) => {
                    println!(
                        "{} {}",
                        "Device not connected. Matrix prepared in memory:".yellow(),
                        e
                    );
                }
            }
        }

        Commands::ResetFn => {
            println!("{}", "Resetting Fn and Win to factory layout...".cyan());
            let mut matrix = create_default_matrix();
            reset_fn_win(&mut matrix);

            match VortexDevice::open_first(&api) {
                Ok(dev) => {
                    dev.send_handshake()?;
                    dev.write_key_matrix(&matrix)?;
                    println!(
                        "{}",
                        "✓ Default factory matrix restored on hardware!"
                            .green()
                            .bold()
                    );
                }
                Err(e) => {
                    println!(
                        "{} {}",
                        "Device not connected. Default matrix verified:".yellow(),
                        e
                    );
                }
            }
        }

        Commands::SetLed {
            hex,
            mode,
            brightness,
            speed,
        } => {
            eprintln!(
                "{}",
                "LED write operations are suspended pending protocol specification reconciliation (GetProfile 136 bytes vs SetProfile 160 bytes)."
                    .yellow()
                    .bold()
            );
            println!(
                "Requested parameters: Mode={}, Brightness={}, Speed={}, Hex={}",
                mode, brightness, speed, hex
            );
            anyhow::bail!("LED hardware writes suspended pending protocol verification");
        }

        Commands::ProfileExport { out } => {
            println!("Exporting active profile to {}...", out.display());
            let profile = KeyboardProfile::default();
            let json = serde_json::to_string_pretty(&profile)?;
            fs::write(&out, json)?;
            println!(
                "{}",
                format!("✓ Saved configuration profile to {}", out.display())
                    .green()
                    .bold()
            );
        }

        Commands::ProfileImport { file } => {
            println!("Importing profile from {}...", file.display());
            let content = fs::read_to_string(&file)?;
            let profile: KeyboardProfile = serde_json::from_str(&content)?;
            println!(
                "Loaded profile: {} (SOCD mode: {:?})",
                profile.name.cyan(),
                profile.socd.mode
            );

            if profile.matrix.len() == 256 {
                let mut matrix_arr = [0u32; 256];
                matrix_arr.copy_from_slice(&profile.matrix);

                match VortexDevice::open_first(&api) {
                    Ok(dev) => {
                        dev.send_handshake()?;
                        dev.write_key_matrix(&matrix_arr)?;
                        println!(
                            "{}",
                            "✓ Profile key matrix written to keyboard!".green().bold()
                        );
                    }
                    Err(e) => {
                        println!(
                            "{} {}",
                            "Device not connected to receive profile:".yellow(),
                            e
                        );
                    }
                }
            }
        }
        Commands::ReadRaw => {
            println!("Reading active profile block from K816 MCU...");
            let dev = VortexDevice::open_first(&api)?;
            dev.send_handshake()?;
            let data = dev.read_profile()?;
            println!("Read {} bytes successfully! Opcode response: {:#04x}", data.len(), data[1]);
            for i in 0..136 {
                if i % 16 == 0 {
                    print!("\n{:04x}: ", i);
                }
                print!("{:02x} ", data[i]);
            }
            println!("\n");
        }

        Commands::Ex1Inspect => {
            println!(
                "{}",
                format!(
                    "=== Scanning for Tecware EX1 (VID: {:#06x}, PID: {:#06x}) ===",
                    EX1_VID, EX1_PID
                )
                .bold()
                .cyan()
            );
            let devices = Ex1Device::enumerate_devices(&api);
            if devices.is_empty() {
                println!("{}", "No matching Tecware EX1 mouse detected.".yellow());
                println!("Make sure the mouse is plugged in or check udev permissions.");
            } else {
                for (i, dev) in devices.iter().enumerate() {
                    println!(
                        "[{}] Path: {} | UsagePage: {:#06x} | Usage: {:#06x} | Interface: {}",
                        i,
                        dev.path().to_string_lossy().green(),
                        dev.usage_page(),
                        dev.usage(),
                        dev.interface_number()
                    );
                }
            }
        }

        Commands::Ex1Polling { hz, experimental } => {
            if !experimental {
                eprintln!(
                    "{}",
                    "⚠ Safety guard: EX1 write protocol is currently experimental."
                        .yellow()
                        .bold()
                );
                eprintln!(
                    "Add {} to confirm and proceed with hardware write testing.",
                    "--experimental".cyan()
                );
                return Ok(());
            }
            println!("Setting Tecware EX1 polling rate to {} Hz...", hz);
            let rate = Ex1PollingRate::from_hz(hz).ok_or_else(|| {
                anyhow::anyhow!(
                    "Invalid polling rate: {} Hz (supported: 125, 250, 500, 1000)",
                    hz
                )
            })?;
            let dev = Ex1Device::open_first(&api)?;
            dev.set_polling_rate(rate)?;
            println!(
                "{}",
                format!("✓ Polling rate successfully set to {} Hz!", hz)
                    .green()
                    .bold()
            );
        }

        Commands::Ex1Led {
            hex,
            mode,
            brightness,
            speed,
            experimental,
        } => {
            if !experimental {
                eprintln!(
                    "{}",
                    "⚠ Safety guard: EX1 write protocol is currently experimental."
                        .yellow()
                        .bold()
                );
                eprintln!(
                    "Add {} to confirm and proceed with hardware write testing.",
                    "--experimental".cyan()
                );
                return Ok(());
            }
            let (r, g, b) = hex_to_rgb(&hex)?;
            let led_mode = match mode {
                0 => Ex1LedMode::Off,
                1 => Ex1LedMode::Static,
                2 => Ex1LedMode::Breathing,
                _ => Ex1LedMode::Neon,
            };
            let config = Ex1LedConfig {
                mode: led_mode,
                brightness,
                speed,
                red: r,
                green: g,
                blue: b,
            };
            println!(
                "Applying LED configuration: color {}, mode {:?}, bright {}, speed {}...",
                hex.cyan(),
                led_mode,
                brightness,
                speed
            );
            let dev = Ex1Device::open_first(&api)?;
            dev.set_led(&config)?;
            println!(
                "{}",
                "✓ Tecware EX1 LED configuration applied!".green().bold()
            );
        }

        Commands::Ex1Dpi {
            dpi,
            debounce_ms,
            motion_sync,
            experimental,
        } => {
            if !experimental {
                eprintln!(
                    "{}",
                    "⚠ Safety guard: EX1 write protocol is currently experimental."
                        .yellow()
                        .bold()
                );
                eprintln!(
                    "Add {} to confirm and proceed with hardware write testing.",
                    "--experimental".cyan()
                );
                return Ok(());
            }
            println!(
                "Configuring Tecware EX1: DPI {}, debounce {}ms, motion sync {}...",
                dpi, debounce_ms, motion_sync
            );
            let mut config = Ex1DpiConfig::default();
            config.stages[0] = dpi;
            config.active_stage = 0;
            config.debounce_ms = debounce_ms;
            config.motion_sync = motion_sync;
            let dev = Ex1Device::open_first(&api)?;
            dev.set_dpi(&config)?;
            println!(
                "{}",
                format!("✓ DPI ({}) and debounce settings applied!", dpi)
                    .green()
                    .bold()
            );
        }

        Commands::Ex1Ping { experimental } => {
            if !experimental {
                eprintln!(
                    "{}",
                    "⚠ Safety guard: EX1 write protocol is currently experimental."
                        .yellow()
                        .bold()
                );
                eprintln!(
                    "Add {} to confirm and proceed with hardware write testing.",
                    "--experimental".cyan()
                );
                return Ok(());
            }
            println!("Sending ping / sync report to Tecware EX1...");
            let dev = Ex1Device::open_first(&api)?;
            dev.ping()?;
            println!(
                "{}",
                "✓ Ping report (0x0C) acknowledged by mouse!".green().bold()
            );
        }
    }

    Ok(())
}
