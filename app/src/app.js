import { ANSI_60_LAYOUT, PRESET_FUNCTIONS, INITIAL_STATE } from "./constants.js";

class VirtuosaApp {
  constructor() {
    this.state = structuredClone(INITIAL_STATE);
    this.state.currentLayer = 0; // 0 = Base (L0), 1 = Fn (L1)
    this.state.fnSwapped = false; // Left Win <-> Fn swap
    this.hidDevice = null;
    this.wsClient = null;

    // Strafe tester state
    this.testerState = {
      keyA: false,
      keyD: false,
      lastPressed: null,
    };

    this.initDOM();
    this.renderKeyboard();
    this.renderRemapPresets();
    this.renderTapDanceRules();
    this.updateProfileJSON();
    this.applyRgbSimulation();
    this.attachEventListeners();
    this.attachKeyboardListener();
    this.checkHardwareConnection();
  }

  initDOM() {
    this.dom = {
      keyboardGrid: document.getElementById("keyboard-grid"),
      keyboardCase: document.getElementById("keyboard-case"),
      activeKeyName: document.getElementById("active-key-name"),
      activeKeyDetail: document.getElementById("active-key-detail"),
      connBadge: document.getElementById("conn-status-badge"),
      connText: document.getElementById("conn-status-text"),
      btnWebHID: document.getElementById("btn-webhid"),
      tabButtons: document.querySelectorAll(".nav-tab"),
      tabPanes: document.querySelectorAll(".tab-pane"),
      remapTargetLabel: document.getElementById("remap-target-label"),
      remapTargetScancode: document.getElementById("remap-target-scancode"),
      remapPresetsGrid: document.getElementById("remap-presets-grid"),
      remapCategorySelect: document.getElementById("remap-category-select"),
      btnApplyRemap: document.getElementById("btn-apply-remap"),
      btnResetKey: document.getElementById("btn-reset-key"),
      btnQuickRemapFn: document.getElementById("btn-quick-remap-fn"),
      btnQuickReset: document.getElementById("btn-quick-reset"),
      btnQuickSwapFn: document.getElementById("btn-quick-swap-fn"),
      swapStatusText: document.getElementById("swap-status-text"),
      btnLayer0: document.getElementById("btn-layer-0"),
      btnLayer1: document.getElementById("btn-layer-1"),
      socdToggle: document.getElementById("socd-toggle"),
      socdStateText: document.getElementById("socd-state-text"),
      socdRadios: document.querySelectorAll('input[name="socd-mode"]'),
      debounceSlider: document.getElementById("debounce-slider"),
      debounceVal: document.getElementById("debounce-val"),
      simKeyA: document.getElementById("sim-key-a"),
      simKeyD: document.getElementById("sim-key-d"),
      simResolvedOutput: document.getElementById("sim-resolved-output"),
      tapDanceContainer: document.getElementById("tapdance-rules-container"),
      btnAddTapDance: document.getElementById("btn-add-tapdance"),
      rgbModeBtns: document.querySelectorAll(".rgb-mode-btn"),
      rgbColorPicker: document.getElementById("rgb-color-picker"),
      rgbColorHex: document.getElementById("rgb-color-hex"),
      rgbBrightSlider: document.getElementById("rgb-bright-slider"),
      rgbBrightVal: document.getElementById("rgb-bright-val"),
      rgbSpeedSlider: document.getElementById("rgb-speed-slider"),
      rgbSpeedVal: document.getElementById("rgb-speed-val"),
      btnApplyRGB: document.getElementById("btn-apply-rgb"),
      profileSelector: document.getElementById("profile-selector"),
      profileJSONPreview: document.getElementById("profile-json-preview"),
      btnExportProfile: document.getElementById("btn-export-profile"),
      btnImportProfile: document.getElementById("btn-import-profile"),
      macroTimeline: document.getElementById("macro-timeline"),
      btnRecordMacro: document.getElementById("btn-record-macro"),
      toastContainer: document.getElementById("toast-container"),
    };
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast";

    let icon = `<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    if (type === "success") {
      icon = `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === "warn") {
      icon = `<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    }

    toast.innerHTML = `${icon}<span>${message}</span>`;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "toast-out 0.25s forwards";
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  renderKeyboard() {
    this.dom.keyboardGrid.innerHTML = "";
    const isL1 = this.state.currentLayer === 1;

    ANSI_60_LAYOUT.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "key-row";

      row.forEach((key) => {
        const keyEl = document.createElement("div");
        keyEl.className = "key-cap";
        keyEl.dataset.code = key.code;
        keyEl.style.flex = `${key.u} 0 0`;

        // Check selected
        if (this.state.activeKey === key.code) {
          keyEl.classList.add("selected");
        }

        // Check remapped
        if (this.state.remappedKeys[key.code]) {
          keyEl.classList.add("is-remapped");
        }

        // Check SOCD
        if (["KeyA", "KeyD", "KeyW", "KeyS"].includes(key.code) && this.state.socd.enabled) {
          keyEl.classList.add("is-socd");
        }

        // RGB underglow simulation element
        const rgbGlow = document.createElement("div");
        rgbGlow.className = "rgb-glow";
        keyEl.appendChild(rgbGlow);

        // Labels
        let displayLabel = key.label;
        let displaySub = key.sub || "";

        // Handle Fn Swap indicator
        if (this.state.fnSwapped) {
          if (key.code === "MetaLeft") {
            displayLabel = "Fn";
            displaySub = "SWAP";
          } else if (key.code === "Fn" || key.kId === "K59") {
            displayLabel = "Win";
            displaySub = "SWAP";
          }
        }

        // Handle Fn Layer (L1) secondary functions
        if (isL1) {
          if (["KeyW", "KeyI"].includes(key.code)) displayLabel = "▲ UP";
          if (["KeyA", "KeyJ"].includes(key.code)) displayLabel = "◀ LEFT";
          if (["KeyS", "KeyK"].includes(key.code)) displayLabel = "▼ DOWN";
          if (["KeyD", "KeyL"].includes(key.code)) displayLabel = "▶ RIGHT";
          if (key.code.startsWith("Digit")) {
            const digit = key.code.replace("Digit", "");
            displayLabel = `F${digit}`;
          }
          if (key.code === "Minus") displayLabel = "F11";
          if (key.code === "Equal") displayLabel = "F12";
          if (key.code === "Backspace") displayLabel = "DEL";
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = displayLabel;

        const subSpan = document.createElement("span");
        subSpan.className = "key-sub";
        subSpan.textContent = displaySub;

        keyEl.appendChild(labelSpan);
        keyEl.appendChild(subSpan);

        keyEl.addEventListener("click", () => this.selectKey(key));
        rowEl.appendChild(keyEl);
      });

      this.dom.keyboardGrid.appendChild(rowEl);
    });

    this.applyRgbSimulation();
  }

  selectKey(key) {
    this.state.activeKey = key.code;
    this.dom.activeKeyName.textContent = `${key.label} (${key.code})`;
    this.dom.activeKeyDetail.innerHTML = `
      <span>Matrix: <strong class="text-gray-200">#${key.matrixIndex ?? "--"}</strong></span>
      <span>HID: <strong class="text-gray-200">0x${(key.hidUsage || 0).toString(16).toUpperCase()}</strong></span>
      <span>Width: <strong class="text-gray-200">${key.u}u</strong></span>
    `;
    this.dom.remapTargetLabel.textContent = key.label;
    this.dom.remapTargetScancode.textContent = `0x${(key.hidUsage || 0).toString(16).toUpperCase()} (${key.code})`;

    document.querySelectorAll(".key-cap").forEach((el) => {
      el.classList.toggle("selected", el.dataset.code === key.code);
    });
  }

  renderRemapPresets() {
    this.dom.remapPresetsGrid.innerHTML = "";
    const category = this.dom.remapCategorySelect ? this.dom.remapCategorySelect.value : "all";

    PRESET_FUNCTIONS.forEach((fn) => {
      // Optional category filtering
      if (category === "navigation" && !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(fn.code)) return;
      if (category === "modifiers" && !["ControlLeft", "ShiftLeft", "AltLeft", "MetaLeft", "Fn"].includes(fn.code)) return;
      if (category === "media" && !fn.label.includes("Vol") && !fn.label.includes("Mute") && !fn.label.includes("Play")) return;

      const btn = document.createElement("button");
      btn.className = "p-2.5 rounded-xl bg-[#111624] border border-[#202940] hover:border-cyan-500/60 text-xs font-semibold text-gray-300 hover:text-cyan-300 hover:bg-[#161c2e] transition-all text-left flex items-center justify-between shadow-sm";
      btn.innerHTML = `<span>${fn.label}</span><span class="text-[10px] text-gray-500 font-mono">&rarr;</span>`;
      btn.addEventListener("click", () => {
        if (!this.state.activeKey) {
          this.showToast("Pilih tombol pada keyboard terlebih dahulu!", "warn");
          return;
        }
        this.state.remappedKeys[this.state.activeKey] = {
          type: "standard",
          label: fn.label,
          targetCode: fn.code,
        };
        this.renderKeyboard();
        this.updateProfileJSON();
        this.showToast(`Tombol diremap ke ${fn.label}`, "success");
      });
      this.dom.remapPresetsGrid.appendChild(btn);
    });
  }

  renderTapDanceRules() {
    this.dom.tapDanceContainer.innerHTML = "";
    this.state.tapDance.forEach((rule, idx) => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-xl bg-[#090c14] border border-[#1a2236] flex flex-col gap-3 shadow-md";
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">Trigger: ${rule.triggerKey}</span>
          <button class="text-xs text-red-400 hover:text-red-300 font-semibold btn-del-rule" data-idx="${idx}">Hapus</button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-lg bg-[#111624] border border-[#202940]">
            <span class="text-gray-400 block text-[10px] font-mono">TAP ACTION</span>
            <span class="font-bold text-white text-sm">${rule.tapAction}</span>
          </div>
          <div class="p-3 rounded-lg bg-[#111624] border border-[#202940]">
            <span class="text-gray-400 block text-[10px] font-mono">HOLD ACTION (&gt; ${rule.holdThresholdMs}ms)</span>
            <span class="font-bold text-cyan-300 text-sm">${rule.holdAction}</span>
          </div>
        </div>
      `;
      card.querySelector(".btn-del-rule").addEventListener("click", () => {
        this.state.tapDance.splice(idx, 1);
        this.renderTapDanceRules();
        this.updateProfileJSON();
        this.showToast("Aturan Tap-Dance dihapus", "info");
      });
      this.dom.tapDanceContainer.appendChild(card);
    });
  }

  applyRgbSimulation() {
    const { mode, hexColor, brightness } = this.state.rgb;
    const alpha = (brightness / 100) * 0.45;

    document.querySelectorAll(".key-cap .rgb-glow").forEach((glowEl) => {
      if (mode === "off") {
        glowEl.style.background = "transparent";
        glowEl.style.boxShadow = "none";
      } else if (mode === "static_color") {
        glowEl.style.background = hexColor;
        glowEl.style.opacity = alpha;
        glowEl.style.boxShadow = `0 0 12px ${hexColor}`;
      } else if (mode === "rainbow_wave") {
        glowEl.style.background = "linear-gradient(135deg, #06b6d4, #6366f1, #ec4899, #10b981)";
        glowEl.style.opacity = alpha * 0.9;
        glowEl.style.boxShadow = "0 0 10px rgba(6, 182, 212, 0.3)";
      } else if (mode === "breathing") {
        glowEl.style.background = hexColor;
        glowEl.style.opacity = alpha * 0.7;
        glowEl.style.animation = "pulse-subtle 2s infinite";
      } else {
        glowEl.style.background = hexColor;
        glowEl.style.opacity = alpha * 0.5;
      }
    });

    // Outer case ambient glow
    if (this.dom.keyboardCase) {
      if (mode === "off") {
        this.dom.keyboardCase.style.boxShadow = "none";
      } else {
        this.dom.keyboardCase.style.boxShadow = `0 0 25px ${hexColor}25, inset 0 0 20px rgba(0,0,0,0.8)`;
      }
    }
  }

  updateProfileJSON() {
    this.dom.profileJSONPreview.value = JSON.stringify(this.state, null, 2);
  }

  attachKeyboardListener() {
    // Physical keyboard live keypress tracking
    window.addEventListener("keydown", (e) => {
      const keyCap = document.querySelector(`.key-cap[data-code="${e.code}"]`);
      if (keyCap) {
        keyCap.classList.add("is-pressed");
      }

      // Update Strafe Tester if on Tab SOCD
      if (e.code === "KeyA") {
        this.testerState.keyA = true;
        this.testerState.lastPressed = "A";
        this.updateStrafeTester();
      } else if (e.code === "KeyD") {
        this.testerState.keyD = true;
        this.testerState.lastPressed = "D";
        this.updateStrafeTester();
      }
    });

    window.addEventListener("keyup", (e) => {
      const keyCap = document.querySelector(`.key-cap[data-code="${e.code}"]`);
      if (keyCap) {
        keyCap.classList.remove("is-pressed");
      }

      if (e.code === "KeyA") {
        this.testerState.keyA = false;
        if (this.testerState.keyD) this.testerState.lastPressed = "D";
        this.updateStrafeTester();
      } else if (e.code === "KeyD") {
        this.testerState.keyD = false;
        if (this.testerState.keyA) this.testerState.lastPressed = "A";
        this.updateStrafeTester();
      }
    });
  }

  updateStrafeTester() {
    if (!this.dom.simKeyA || !this.dom.simKeyD) return;

    const { keyA, keyD, lastPressed } = this.testerState;
    const mode = this.state.socd.mode;

    // Visual styles for tester cards
    this.dom.simKeyA.className = keyA
      ? "w-16 h-16 rounded-xl bg-cyan-950 border-2 border-cyan-400 text-cyan-200 flex flex-col items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/30 scale-105 transition-all"
      : "w-16 h-16 rounded-xl bg-[#121624] border-2 border-[#26314c] flex flex-col items-center justify-center font-bold text-lg text-gray-400 transition-all shadow-md";

    this.dom.simKeyD.className = keyD
      ? "w-16 h-16 rounded-xl bg-cyan-950 border-2 border-cyan-400 text-cyan-200 flex flex-col items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/30 scale-105 transition-all"
      : "w-16 h-16 rounded-xl bg-[#121624] border-2 border-[#26314c] flex flex-col items-center justify-center font-bold text-lg text-gray-400 transition-all shadow-md";

    let resolved = "NONE";
    if (keyA && !keyD) resolved = "A (LEFT)";
    else if (!keyA && keyD) resolved = "D (RIGHT)";
    else if (keyA && keyD) {
      if (mode === "last_priority") {
        resolved = lastPressed === "A" ? "A (LAST-WIN)" : "D (LAST-WIN)";
      } else if (mode === "neutral") {
        resolved = "NEUTRAL (0 CANCELLED)";
      } else if (mode === "absolute_priority") {
        resolved = lastPressed === "A" ? "D (FIRST-WIN)" : "A (FIRST-WIN)";
      }
    }

    this.dom.simResolvedOutput.textContent = resolved;
  }

  attachEventListeners() {
    // Tab Switching
    this.dom.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTabId = btn.dataset.tab;
        this.dom.tabButtons.forEach((b) => {
          b.className = "nav-tab px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-gray-200 hover:bg-[#111624] border border-transparent flex items-center gap-2 shrink-0";
        });
        btn.className = "nav-tab px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 shadow-sm flex items-center gap-2 shrink-0";

        this.dom.tabPanes.forEach((pane) => {
          pane.classList.toggle("hidden", pane.id !== targetTabId);
        });
      });
    });

    // Layer Switcher
    this.dom.btnLayer0.addEventListener("click", () => {
      this.state.currentLayer = 0;
      this.dom.btnLayer0.className = "px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/50";
      this.dom.btnLayer1.className = "px-2.5 py-0.5 rounded-md text-gray-400 hover:text-white";
      this.renderKeyboard();
    });

    this.dom.btnLayer1.addEventListener("click", () => {
      this.state.currentLayer = 1;
      this.dom.btnLayer1.className = "px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/50";
      this.dom.btnLayer0.className = "px-2.5 py-0.5 rounded-md text-gray-400 hover:text-white";
      this.renderKeyboard();
      this.showToast("Mode Fn Layer (L1) aktif - Arrow & F1-F12 terlihat", "info");
    });

    // Quick Matrix Swap (Fn <-> Win)
    this.dom.btnQuickSwapFn.addEventListener("click", async () => {
      this.state.fnSwapped = !this.state.fnSwapped;
      this.dom.swapStatusText.textContent = this.state.fnSwapped ? "Swapped (Fn on LWin)" : "Default";
      this.dom.swapStatusText.className = this.state.fnSwapped ? "text-amber-400 font-bold" : "text-gray-400";
      this.renderKeyboard();

      const endpoint = this.state.fnSwapped ? "/api/swap-fn" : "/api/reset-fn";
      try {
        const res = await fetch(endpoint, { method: "POST" });
        const data = await res.json();
        if (data.success) {
          this.showToast(this.state.fnSwapped ? "✓ Matrix Hardware: Left Win dan Fn berhasil ditukar!" : "✓ Matrix Hardware: Default Fn/Win dipulihkan!", "success");
        } else {
          this.showToast("Gagal update matrix: " + (data.output || "Error"), "warn");
        }
      } catch (err) {
        this.showToast("Error update matrix: " + err.message, "warn");
      }
    });

    // Reset Selected Key
    this.dom.btnResetKey.addEventListener("click", () => {
      if (this.state.activeKey) {
        delete this.state.remappedKeys[this.state.activeKey];
        this.renderKeyboard();
        this.updateProfileJSON();
        this.showToast(`Tombol ${this.state.activeKey} dikembalikan ke default`, "info");
      }
    });

    if (this.dom.btnQuickReset) {
      this.dom.btnQuickReset.addEventListener("click", () => {
        if (this.state.activeKey) {
          delete this.state.remappedKeys[this.state.activeKey];
          this.renderKeyboard();
          this.updateProfileJSON();
          this.showToast(`Reset tombol ${this.state.activeKey}`, "info");
        }
      });
    }

    if (this.dom.btnQuickRemapFn) {
      this.dom.btnQuickRemapFn.addEventListener("click", () => {
        if (this.state.activeKey) {
          this.state.remappedKeys[this.state.activeKey] = {
            type: "layer",
            label: "Fn",
            targetCode: "Fn",
          };
          this.renderKeyboard();
          this.updateProfileJSON();
          this.showToast(`${this.state.activeKey} sekarang berfungsi sebagai Fn Key`, "success");
        }
      });
    }

    // Category Select
    if (this.dom.remapCategorySelect) {
      this.dom.remapCategorySelect.addEventListener("change", () => {
        this.renderRemapPresets();
      });
    }

    // Save Remap
    this.dom.btnApplyRemap.addEventListener("click", () => {
      this.showToast("Konfigurasi remapping tersimpan ke memori aktif", "success");
    });

    // SOCD Toggle
    this.dom.socdToggle.addEventListener("change", (e) => {
      this.state.socd.enabled = e.target.checked;
      this.dom.socdStateText.textContent = e.target.checked ? "Enabled" : "Disabled";
      this.dom.socdStateText.className = e.target.checked ? "ml-3 text-xs font-bold text-emerald-400" : "ml-3 text-xs font-bold text-gray-500";
      this.renderKeyboard();
      this.updateProfileJSON();
      this.showToast(e.target.checked ? "Snap Tap / SOCD diaktifkan" : "SOCD dinonaktifkan", "info");
    });

    // SOCD Mode Radios
    this.dom.socdRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.state.socd.mode = e.target.value;
          this.updateProfileJSON();
          this.updateStrafeTester();
          this.showToast(`Mode SOCD diubah ke: ${e.target.value}`, "info");
        }
      });
    });

    // Debounce Slider
    this.dom.debounceSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      this.state.socd.debounceMs = Number(val);
      this.dom.debounceVal.textContent = `${val} ms`;
      this.updateProfileJSON();
    });

    // Add TapDance Rule
    this.dom.btnAddTapDance.addEventListener("click", () => {
      this.state.tapDance.push({
        triggerKey: this.state.activeKey || "CapsLock",
        tapAction: "Escape",
        holdAction: "ControlLeft",
        holdThresholdMs: 200,
      });
      this.renderTapDanceRules();
      this.updateProfileJSON();
      this.showToast("Aturan Tap-Dance baru ditambahkan", "success");
    });

    // RGB Mode Buttons
    this.dom.rgbModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.dom.rgbModeBtns.forEach((b) => {
          b.className = "rgb-mode-btn p-3 rounded-xl text-left text-xs font-semibold bg-[#111624] border border-[#212b44] text-gray-300 hover:border-gray-500 transition-all";
        });
        btn.className = "rgb-mode-btn p-3 rounded-xl text-left text-xs font-semibold bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 transition-all";
        this.state.rgb.mode = btn.dataset.mode;
        this.applyRgbSimulation();
        this.updateProfileJSON();
        this.showToast(`Efek RGB: ${btn.textContent.trim()}`, "info");
      });
    });

    // RGB Color Picker
    this.dom.rgbColorPicker.addEventListener("input", (e) => {
      const hex = e.target.value;
      this.state.rgb.hexColor = hex;
      this.dom.rgbColorHex.textContent = hex.toUpperCase();
      this.applyRgbSimulation();
      this.updateProfileJSON();
    });

    // Color Swatches
    document.querySelectorAll(".palette-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        const hex = swatch.dataset.hex;
        this.dom.rgbColorPicker.value = hex;
        this.state.rgb.hexColor = hex;
        this.dom.rgbColorHex.textContent = hex.toUpperCase();
        this.applyRgbSimulation();
        this.updateProfileJSON();
        this.showToast(`Warna RGB diatur ke ${hex.toUpperCase()}`, "info");
      });
    });

    // Brightness Slider
    this.dom.rgbBrightSlider.addEventListener("input", (e) => {
      this.state.rgb.brightness = Number(e.target.value);
      this.dom.rgbBrightVal.textContent = `${e.target.value}%`;
      this.applyRgbSimulation();
      this.updateProfileJSON();
    });

    // Speed Slider
    this.dom.rgbSpeedSlider.addEventListener("input", (e) => {
      this.state.rgb.speed = Number(e.target.value);
      this.dom.rgbSpeedVal.textContent = `${e.target.value}x`;
      this.updateProfileJSON();
    });

    // Apply RGB
    this.dom.btnApplyRGB.addEventListener("click", async () => {
      const modeMap = {
        static_color: 0,
        breathing: 1,
        trigger_reactive: 2,
        rainbow_wave: 4,
        off: 15,
      };
      const modeIdx = modeMap[this.state.rgb.mode] ?? 0;
      const brightness = Math.max(1, Math.min(5, Math.round((this.state.rgb.brightness / 100) * 4) + 1));
      const speed = Math.max(1, Math.min(5, Math.round(this.state.rgb.speed / 2)));
      const hex = this.state.rgb.hexColor;

      try {
        const res = await fetch("/api/set-rgb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: modeIdx, hex, brightness, speed }),
        });
        const data = await res.json();
        if (data.success) {
          this.showToast(`✓ Efek RGB (${this.state.rgb.mode}) berhasil diaplikasikan ke hardware!`, "success");
        } else {
          this.showToast("Gagal set RGB: " + (data.output || "Error"), "warn");
        }
      } catch (err) {
        this.showToast("Gagal set RGB: " + err.message, "warn");
      }
    });

    // WebHID Connection
    this.dom.btnWebHID.addEventListener("click", () => this.connectWebHID());

    // Export Profile
    this.dom.btnExportProfile.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "virtuosa-profile.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.showToast("Profil JSON berhasil didownload!", "success");
    });

    // Import Profile
    this.dom.btnImportProfile.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            this.state = parsed;
            this.renderKeyboard();
            this.renderTapDanceRules();
            this.applyRgbSimulation();
            this.updateProfileJSON();
            this.showToast("Profil JSON berhasil dimuat!", "success");
          } catch (err) {
            this.showToast("Format JSON tidak valid: " + err.message, "warn");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async checkHardwareConnection() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.output && data.output.toLowerCase().includes("0x258a")) {
          this.setConnectedState("Hardware Bridge (1000Hz)", "emerald");
          this.showToast("Keyboard Vortex VX5 terdeteksi & terhubung via Hardware Bridge!", "success");
          return;
        }
      }
    } catch {}

    if ("hid" in navigator) {
      try {
        const devices = await navigator.hid.getDevices();
        const match = devices.find((d) => d.vendorId === 0x258a && d.productId === 0x0016);
        if (match) {
          this.hidDevice = match;
          if (!match.opened) await match.open();
          this.setConnectedState("WebHID Connected", "emerald");
        }
      } catch {}
    }
  }

  async connectWebHID() {
    if ("hid" in navigator) {
      try {
        const devices = await navigator.hid.requestDevice({
          filters: [
            { vendorId: 0x258a, productId: 0x0016, usagePage: 0xff00, usage: 0x01 },
            { vendorId: 0x258a, productId: 0x0016 },
          ],
        });

        if (devices && devices.length > 0) {
          this.hidDevice = devices[0];
          await this.hidDevice.open();
          this.setConnectedState("WebHID Connected", "emerald");
          this.showToast("Tersambung ke Vortex VX5 via WebHID!", "success");
          return;
        }
      } catch (err) {
        console.warn("WebHID connection cancelled or restricted:", err);
      }
    }

    // Fallback: Check local Hardware Bridge
    try {
      const res = await fetch("/api/handshake", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        this.setConnectedState("Hardware Bridge (1000Hz)", "emerald");
        this.showToast("✓ Handshake berhasil via Hardware Bridge!", "success");
        return;
      }
    } catch {}

    this.showToast("Gagal menyambungkan ke keyboard", "warn");
  }

  setConnectedState(text, color) {
    this.state.connected = true;
    this.dom.connText.textContent = text;
    this.dom.connBadge.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${color}-950/40 border border-${color}-800/50 text-${color}-400 text-xs font-semibold shadow-sm`;
    const dot = this.dom.connBadge.querySelector("span:first-child");
    if (dot) dot.className = `w-2 h-2 rounded-full bg-${color}-500`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.virtuosaApp = new VirtuosaApp();
});
