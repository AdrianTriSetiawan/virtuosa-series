# Virtuosa Series

for support my old keyboard vx5 😉

Workspace and control center for the **Virtuosa Series** (Vortex Series VX5 mechanical keyboard support).

## Structure

- `crates/virtuosa-vx5-core`: Core Rust library implementing low-level HID communication (Report ID 0x05 / 0x06), K816 MCU matrix mapping, SOCD resolution, and onboard profile parsing.
- `crates/virtuosa-vx5-cli`: Command-line tool for inspecting devices, sending handshakes, swapping Fn/Win keys, lighting control, and profile management.
- `app/`: Modern local-first web interface with direct WebHID browser support, 60% ANSI visual matrix, SOCD (Snap Tap) manager, Tap-Dance, and RGB lighting studio.
