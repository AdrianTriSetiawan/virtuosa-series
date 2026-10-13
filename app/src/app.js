import { ANSI_60_LAYOUT, PRESET_FUNCTIONS, INITIAL_STATE } from "./constants.js";

class VirtuosaApp {
  constructor() {
    this.state = structuredClone(INITIAL_STATE);
    this.hidDevice = null;
    this.wsClient = null;

    this.initDOM();
    this.renderKeyboard();
    this.renderRemapPresets();
    this.renderTapDanceRules();
    this.updateProfileJSON();
    this.attachEventListeners();
  }

  initDOM() {
    this.dom = {
      keyboardGrid: document.getElementById("keyboard-grid"),
      activeKeyName: document.getElementById("active-key-name"),
      activeKeyDetail: document.getElementById("active-key-detail"),
      connBadge: document.getElementById("conn-status-badge"),
      connText: document.getElementById("conn-status-text"),
      btnWebHID: document.getElementById("btn-webhid"),
      btnDaemon: document.getElementById("btn-daemon"),
      tabButtons: document.querySelectorAll(".nav-tab"),
      tabPanes: document.querySelectorAll(".tab-pane"),
      remapTargetLabel: document.getElementById("remap-target-label"),
      remapTargetScancode: document.getElementById("remap-target-scancode"),
      remapPresetsGrid: document.getElementById("remap-presets-grid"),
      btnApplyRemap: document.getElementById("btn-apply-remap"),
      btnResetKey: document.getElementById("btn-reset-key"),
      socdToggle: document.getElementById("socd-toggle"),
      socdStateText: document.getElementById("socd-state-text"),
      socdRadios: document.querySelectorAll('input[name="socd-mode"]'),
      debounceSlider: document.getElementById("debounce-slider"),
      debounceVal: document.getElementById("debounce-val"),
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
    };
  }

  renderKeyboard() {
    this.dom.keyboardGrid.innerHTML = "";

    ANSI_60_LAYOUT.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "key-row";

      row.forEach((key) => {
        const keyEl = document.createElement("div");
        keyEl.className = "key-cap";
        keyEl.dataset.code = key.code;
        keyEl.style.flex = `${key.u} 0 0`;

        if (this.state.activeKey === key.code) {
          keyEl.classList.add("selected");
        }

        if (this.state.remappedKeys[key.code]) {
          keyEl.classList.add("is-remapped");
        }
        if (["KeyA", "KeyD", "KeyW", "KeyS"].includes(key.code) && this.state.socd.enabled) {
          keyEl.classList.add("is-socd");
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = key.label;

        const subSpan = document.createElement("span");
        subSpan.className = "key-sub";
        subSpan.textContent = key.sub || "";

        keyEl.appendChild(labelSpan);
        keyEl.appendChild(subSpan);

        keyEl.addEventListener("click", () => this.selectKey(key.code, key.label));
        rowEl.appendChild(keyEl);
      });

      this.dom.keyboardGrid.appendChild(rowEl);
    });
  }

  selectKey(code, label) {
    this.state.activeKey = code;
    this.dom.activeKeyName.textContent = `${label} (${code})`;
    this.dom.activeKeyDetail.textContent = `Code: ${code} | Layer: Base (L0) | Width: standard`;
    this.dom.remapTargetLabel.textContent = label;
    this.dom.remapTargetScancode.textContent = code;

    document.querySelectorAll(".key-cap").forEach((el) => {
      el.classList.toggle("selected", el.dataset.code === code);
    });
  }

  renderRemapPresets() {
    this.dom.remapPresetsGrid.innerHTML = "";
    PRESET_FUNCTIONS.forEach((fn) => {
      const btn = document.createElement("button");
      btn.className = "p-2 rounded-lg bg-[#141826] border border-[#232a40] hover:border-cyan-500/50 text-xs font-medium text-gray-300 hover:text-cyan-400 transition-all text-left flex items-center justify-between";
      btn.innerHTML = `<span>${fn.label}</span><span class="text-[9px] text-gray-500 font-mono">&rarr;</span>`;
      btn.addEventListener("click", () => {
        this.state.remappedKeys[this.state.activeKey] = {
          type: "standard",
          label: fn.label,
          targetCode: fn.code,
        };
        this.renderKeyboard();
        this.updateProfileJSON();
      });
      this.dom.remapPresetsGrid.appendChild(btn);
    });
  }

  renderTapDanceRules() {
    this.dom.tapDanceContainer.innerHTML = "";
    this.state.tapDance.forEach((rule, idx) => {
      const card = document.createElement("div");
      card.className = "p-4 rounded-xl bg-[#0b0e17] border border-[#1b2133] flex flex-col gap-3";
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Trigger: ${rule.triggerKey}</span>
          <button class="text-xs text-red-400 hover:text-red-300 font-semibold btn-del-rule" data-idx="${idx}">Remove</button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-2.5 rounded-lg bg-[#141826] border border-[#232a40]">
            <span class="text-gray-400 block text-[10px]">TAP ACTION</span>
            <span class="font-bold text-white">${rule.tapAction}</span>
          </div>
          <div class="p-2.5 rounded-lg bg-[#141826] border border-[#232a40]">
            <span class="text-gray-400 block text-[10px]">HOLD ACTION (&gt; ${rule.holdThresholdMs}ms)</span>
            <span class="font-bold text-cyan-300">${rule.holdAction}</span>
          </div>
        </div>
      `;
      card.querySelector(".btn-del-rule").addEventListener("click", () => {
        this.state.tapDance.splice(idx, 1);
        this.renderTapDanceRules();
        this.updateProfileJSON();
      });
      this.dom.tapDanceContainer.appendChild(card);
    });
  }

  updateProfileJSON() {
    this.dom.profileJSONPreview.value = JSON.stringify(this.state, null, 2);
  }

  attachEventListeners() {
    this.dom.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTabId = btn.dataset.tab;
        this.dom.tabButtons.forEach((b) => {
          b.className = "nav-tab px-4 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-gray-200";
        });
        btn.className = "nav-tab px-4 py-2 rounded-lg text-xs font-bold transition-all text-cyan-400 bg-cyan-950/40 border border-cyan-800/40";

        this.dom.tabPanes.forEach((pane) => {
          pane.classList.toggle("hidden", pane.id !== targetTabId);
        });
      });
    });

    this.dom.btnResetKey.addEventListener("click", () => {
      delete this.state.remappedKeys[this.state.activeKey];
      this.renderKeyboard();
      this.updateProfileJSON();
    });

    this.dom.socdToggle.addEventListener("change", (e) => {
      this.state.socd.enabled = e.target.checked;
      this.dom.socdStateText.textContent = e.target.checked ? "Enabled" : "Disabled";
      this.dom.socdStateText.className = e.target.checked ? "ml-3 text-xs font-bold text-emerald-400" : "ml-3 text-xs font-bold text-gray-500";
      this.renderKeyboard();
      this.updateProfileJSON();
    });

    this.dom.socdRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.state.socd.mode = e.target.value;
          this.updateProfileJSON();
        }
      });
    });

    this.dom.debounceSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      this.state.socd.debounceMs = Number(val);
      this.dom.debounceVal.textContent = `${val} ms`;
      this.updateProfileJSON();
    });

    this.dom.btnAddTapDance.addEventListener("click", () => {
      this.state.tapDance.push({
        triggerKey: this.state.activeKey || "CapsLock",
        tapAction: "Escape",
        holdAction: "ControlLeft",
        holdThresholdMs: 200,
      });
      this.renderTapDanceRules();
      this.updateProfileJSON();
    });

    this.dom.rgbModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.dom.rgbModeBtns.forEach((b) => {
          b.className = "rgb-mode-btn p-2.5 rounded-lg text-left text-xs font-medium bg-[#141826] border border-[#232a40] text-gray-300 hover:border-gray-600";
        });
        btn.className = "rgb-mode-btn p-2.5 rounded-lg text-left text-xs font-medium bg-cyan-950/60 border border-cyan-800/50 text-cyan-300";
        this.state.rgb.mode = btn.dataset.mode;
        this.updateProfileJSON();
      });
    });

    this.dom.rgbColorPicker.addEventListener("input", (e) => {
      const hex = e.target.value;
      this.state.rgb.hexColor = hex;
      this.dom.rgbColorHex.textContent = hex.toUpperCase();
      this.updateProfileJSON();
    });

    document.querySelectorAll(".palette-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        const hex = swatch.dataset.hex;
        this.dom.rgbColorPicker.value = hex;
        this.state.rgb.hexColor = hex;
        this.dom.rgbColorHex.textContent = hex.toUpperCase();
        this.updateProfileJSON();
      });
    });

    this.dom.rgbBrightSlider.addEventListener("input", (e) => {
      this.state.rgb.brightness = Number(e.target.value);
      this.dom.rgbBrightVal.textContent = `${e.target.value}%`;
      this.updateProfileJSON();
    });

    this.dom.rgbSpeedSlider.addEventListener("input", (e) => {
      this.state.rgb.speed = Number(e.target.value);
      this.dom.rgbSpeedVal.textContent = `${e.target.value}x`;
      this.updateProfileJSON();
    });

    this.dom.btnWebHID.addEventListener("click", () => this.connectWebHID());
    this.dom.btnDaemon.addEventListener("click", () => this.connectDaemon());

    this.dom.btnExportProfile.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "virtuosa-profile.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

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
            this.updateProfileJSON();
          } catch (err) {
            alert("Invalid JSON profile: " + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async connectWebHID() {
    if (!("hid" in navigator)) {
      alert("WebHID API is not supported in this browser. Please use Chrome/Edge or connect via Virtuosa Daemon.");
      return;
    }

    try {
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x258a, productId: 0x0016 },
          { vendorId: 0x04d9 },
        ],
      });

      if (devices && devices.length > 0) {
        this.hidDevice = devices[0];
        await this.hidDevice.open();
        this.setConnectedState("WebHID Direct", "emerald");
      }
    } catch (err) {
      console.warn("WebHID connection cancelled or failed:", err);
    }
  }

  connectDaemon() {
    this.setConnectedState("Connecting Daemon...", "amber");
    try {
      this.wsClient = new WebSocket("ws://127.0.0.1:9092/virtuosa-ipc");
      this.wsClient.onopen = () => {
        this.setConnectedState("Virtuosa Daemon (1000Hz)", "emerald");
      };
      this.wsClient.onerror = () => {
        setTimeout(() => {
          this.setConnectedState("Virtuosa Emulated (Offline)", "cyan");
        }, 500);
      };
    } catch {
      this.setConnectedState("Virtuosa Emulated (Offline)", "cyan");
    }
  }

  setConnectedState(text, color) {
    this.state.connected = true;
    this.dom.connText.textContent = text;
    this.dom.connBadge.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${color}-950/40 border border-${color}-800/50 text-${color}-400 text-xs font-medium`;
    const dot = this.dom.connBadge.querySelector("span:first-child");
    if (dot) dot.className = `w-2 h-2 rounded-full bg-${color}-500`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.virtuosaApp = new VirtuosaApp();
});
