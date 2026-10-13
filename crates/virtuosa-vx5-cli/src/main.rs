use anyhow::Result;
use clap::{Parser, Subcommand};
use colored::*;
use hidapi::HidApi;
use std::fs;
use std::path::PathBuf;

use virtuosa_vx5_core::{
    create_default_matrix, reset_fn_win, swap_fn_win, KeyboardProfile, VortexDevice,
    MATRIX_INDEX_FN, MATRIX_INDEX_LWIN,
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
                println!(
                    "{}",
                    "No matching Virtuosa / VX5 device detected.".yellow()
                );
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
            println!("{}", "Initiating handshake with Virtuosa Series VX5...".cyan());
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

        Commands::SetLed { hex } => {
            let (r, g, b) = hex_to_rgb(&hex)?;
            println!(
                "Applying RGB static color: R={}, G={}, B={} ({})",
                r,
                g,
                b,
                hex.cyan()
            );

            let red = [r; 132];
            let green = [g; 132];
            let blue = [b; 132];

            match VortexDevice::open_first(&api) {
                Ok(dev) => {
                    dev.send_handshake()?;
                    dev.write_led_matrix(&red, &green, &blue)?;
                    println!(
                        "{}",
                        "✓ LED color matrix applied successfully!".green().bold()
                    );
                }
                Err(e) => {
                    println!("{} {}", "Device not connected:".yellow(), e);
                }
            }
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
    }

    Ok(())
}
