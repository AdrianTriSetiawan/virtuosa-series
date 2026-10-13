# AGENTS.md — AI Coding Assistant Guide

## 1. Project Overview & Mission

**Virtuosa Series** is a lightweight, modern driver & web control center for the **Vortex Series VX5** mechanical keyboard (powered by BY-Tech / Beiying K816 MCU).

> *"for support my old keyboard vx5 😉"*

The project aims to replace proprietary, bloated legacy software with an open, fast, zero-telemetry, and cross-platform toolkit that gives users complete control over keyboard remapping, matrix swaps, lighting profiles, and macro configurations.

---

## 2. Architecture & Workspace Structure

The repository is structured as a multi-language workspace (Rust workspace + WebHID web frontend):

```
virtuosa-series/
├── crates/
│   ├── virtuosa-vx5-core/    # Core Rust library & protocol implementation
│   └── virtuosa-vx5-cli/     # Command-line utility for inspection and control
├── app/                      # Local-first WebHID browser application (Bun + Tailwind)
└── docs/
    └── PROTOCOL_SPEC.md      # Reverse-engineered USB HID byte specification
```

### Component Breakdown

- **`crates/virtuosa-vx5-core`**:
  - Implements Report `0x05` (short 9-byte control/handshake) and Report `0x06` (bulk 1032-byte data) framing and framing validation.
  - Matrix 256 DWORD remapping table (4 bytes per key code, layer offsets).
  - SOCD (Simultaneous Opposite Cardinal Direction) engine & resolution logic.
  - Profile serialization and deserialization (JSON formats).

- **`crates/virtuosa-vx5-cli`**:
  - Native CLI tool for quick configuration and headless automation.
  - Commands:
    - `inspect`: Probe connected USB HID devices and print device descriptors.
    - `handshake`: Issue handshake packets to initialize K816 MCU communication.
    - `swap-fn`: Swap Left Windows (K55) and Fn (K59) keys in the matrix.
    - `reset-fn`: Restore default key assignments.
    - `set-led`: Configure lighting effects, speed, brightness, and colors.
    - `profile-export`: Dump active keyboard memory into a local JSON profile.
    - `profile-import`: Write a JSON profile back into the keyboard flash memory.

- **`app/`**:
  - Modern, zero-install, local-first browser interface using the W3C WebHID API.
  - Bundled with **Bun** and styled with **Tailwind CSS**.
  - Interactive, visual 60% ANSI keyboard matrix showing live key states and bindings.

- **`docs/PROTOCOL_SPEC.md`**:
  - Comprehensive reverse-engineered byte specifications, packet layouts, checksums, and timing requirements for USB HID communication with the K816 MCU.

---

## 3. Hardware & Protocol Reference

### USB Identifiers
- **Vendor ID (VID)**: `0x258A`
- **Product ID (PID)**: `0x0016`

### USB HID Report Types

1. **Short Command Report (Report ID: `0x05`)**:
   - Size: 9 bytes (`[0x05, cmd, p1, p2, p3, p4, p5, p6, p7]`).
   - Handshake PSD signature: `0xAA, 0xBB, 0xCC, 0x0D`.

2. **Bulk Command Report (Report ID: `0x06`)**:
   - Size: 1032 bytes (`[0x06, opcode, ... 1030 payload bytes]`).
   - Primary Opcodes:
     - `0x03`: `SetProfile` (Active profile configuration)
     - `0x04`: `SetKeyMatrix` (Full 256 DWORD key remapping table)
     - `0x05`: `SetMacro` (Macro action stream definitions)
     - `0x08`: `SetRgbTable` (Per-key RGB color palette table)
     - `0x09`: `SetLedMatrix` (Global LED animation, mode, and lighting state)
     - `0x83`: `GetProfile` (Read active profile block from MCU)

### Key Matrix & Swaps
- **Matrix Swap Feature**:
  - Left Windows (`K55`): Index `11`
  - Function Key (`K59`): Index `83`
  - Swapping indices 11 and 83 permits seamless physical / logical layout reconfiguration without firmware flashes.

---

## 4. Development Workflow & Quality Standards

### Rust Toolchain
- Always verify changes compile cleanly and tests pass with 100% success rate:
  ```bash
  cargo test --workspace
  ```
- Format and lint code:
  ```bash
  cargo fmt --all -- --check
  cargo clippy --workspace --all-targets -- -D warnings
  ```

### Frontend Build
- Frontend uses Bun as runtime and bundler:
  ```bash
  cd app
  bun install
  bun run build
  ```

### Commit Guidelines
- Use Conventional Commits strictly:
  - `feat:` New features or user-facing CLI/WebHID capabilities
  - `fix:` Bug fixes in packet encoding, matrix math, or UI
  - `docs:` Documentation changes, specifications, or guides
  - `refactor:` Code refactoring without behavior change
  - `test:` Unit, integration, or simulation test additions

---

## 5. Guidelines for AI Agents

When modifying or extending this codebase, AI assistants MUST adhere to the following principles:

1. **Strictly Local-First & Zero-Cloud**:
   - Never introduce telemetry, tracking, cloud sync, or external backend services.
   - All operations must run entirely offline through native OS HID or browser WebHID.

2. **No Bloatware or Background Daemons**:
   - Avoid long-running background processes, resident daemons, or unnecessary startup hooks unless explicitly instructed.
   - Favor instantaneous CLI execution and on-demand browser sessions.

3. **Protocol Integrity & Verification**:
   - All USB HID packet serialization, deserialization, offsets, and checksum calculations must conform to `docs/PROTOCOL_SPEC.md`.
   - Never invent arbitrary packet lengths, magic numbers, or undocumented report IDs. Always reference verified constants.
