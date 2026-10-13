// Vortex Series VX5 (BY-Tech K816 MCU) Protocol Constants & Layout
// Extracted and synchronized with /tmp/PROTOCOL_SPEC.md, Cfg.ini, and KBMatrix.bin

export const PROTOCOL_CONSTANTS = {
  VID: 0x258A,
  PID: 0x0016,
  USAGE_PAGE: 0xFF00,
  USAGE: 0x01,
  REPORT_ID_SHORT: 0x05,
  REPORT_ID_BULK: 0x06,
  SHORT_REPORT_DATA_LEN: 8,      // 8 bytes in WebHID sendFeatureReport(0x05, data)
  BULK_REPORT_DATA_LEN: 1031,    // 1031 bytes in WebHID sendFeatureReport(0x06, data)
  PSD_HANDSHAKE: [0xAA, 0xBB, 0xCC, 0x0D],
  OPCODES: {
    PROFILE_WRITE: 0x03,
    MATRIX_WRITE: 0x04,
    MACRO_WRITE: 0x05,
    RGB_TABLE_WRITE: 0x08,
    LED_MATRIX_WRITE: 0x09,
    PROFILE_READ: 0x83,
  },
};

// Base64 encoding of exact 1024-byte default KBMatrix.bin
export const DEFAULT_KB_MATRIX_BASE64 = "AAAAAAIAAA0CAAAXAAAAOQYAAOEGAADgAAAAAAIAAAACAAASAAAABAAAAB0CAAAMAAAAAAIAAAECAAATAAAAFgAAABsGAADiAAAAAAIAAAICAAAUAAAABwAAAAYAAAAAAAAAAAIAAAMAAAAVAAAACQAAABkAAAAAAAAAAAIAAAQAAAAXAAAACgAAAAUAAAAsAAAAAAIAAAUAAAAcAAAACwAAABEAAAAAAAAAAAIAAAYAAAAYAAAADQAAABAAAAAAAAAAAAIAAAcAAAAMAAAADgIAABUCAAAYAAAAAAIAAAgAAAASAAAADwIAABYCAAAZAAAAAAIAAAkCAAAPAAAAMwIAABsCAAAaAAAAAAIAAAoCAAAQAAAANAAAAAAAAAAAAAAAAAIAAAsCAAARAAAAMQAAAAAAAAAAAAAAAAIAAA4CAAAdAAAAKAIAABwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAB8AAAAgAAAAIQAAACIAAAAjAAAAJAAAACUAAAAmAAAAJwAAAC0AAAAuBgAA4wAAACkAAAAqAAAAEwAAAC8AAAAwAAAAFAAAABoAAAAIAAAANgAAADcAAAArBgAA5gAAAGUGAADkAAAAOAYAAOUAAAAxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOgAAADsAAAA8AAAAPQAAAD4AAAA/AAAAQAAAAEEAAABCAAAAQwAAAEQAAABFDgAAAQAAADUAAABMDgAAFAwAAgAMAAEADgAADg4AAA8OAAAQDQACAA0AAQAOAAATAAAAUAAAAFEAAABPAAAAUhIAAwALAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

/**
 * Creates a fresh 1024-byte Uint8Array cloned from default KBMatrix.bin
 * @returns {Uint8Array}
 */
export function createDefaultKbMatrix() {
  const binary = atob(DEFAULT_KB_MATRIX_BASE64);
  const bytes = new Uint8Array(1024);
  for (let i = 0; i < 1024; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Complete 61-Key Layout matching Vortex VX5 Cfg.ini [KEY] K1..K61
export const ANSI_60_LAYOUT = [
  [
    {
      "code": "Escape",
      "label": "ESC",
      "sub": "`",
      "u": 1.0,
      "kId": "K1",
      "name": "Esc",
      "coords": [
        35,
        17,
        59,
        45
      ],
      "vk": 27,
      "matrixIndex": 1,
      "keyId": 1,
      "hidUsage": 41,
      "defaultMatrix": 218103810
    },
    {
      "code": "Digit1",
      "label": "1",
      "sub": "!",
      "u": 1.0,
      "kId": "K2",
      "name": "1",
      "coords": [
        71,
        17,
        95,
        45
      ],
      "vk": 49,
      "matrixIndex": 7,
      "keyId": 2,
      "hidUsage": 30,
      "defaultMatrix": 2
    },
    {
      "code": "Digit2",
      "label": "2",
      "sub": "@",
      "u": 1.0,
      "kId": "K3",
      "name": "2",
      "coords": [
        108,
        17,
        132,
        45
      ],
      "vk": 50,
      "matrixIndex": 13,
      "keyId": 3,
      "hidUsage": 31,
      "defaultMatrix": 16777218
    },
    {
      "code": "Digit3",
      "label": "3",
      "sub": "#",
      "u": 1.0,
      "kId": "K4",
      "name": "3",
      "coords": [
        145,
        17,
        169,
        45
      ],
      "vk": 51,
      "matrixIndex": 19,
      "keyId": 4,
      "hidUsage": 32,
      "defaultMatrix": 33554434
    },
    {
      "code": "Digit4",
      "label": "4",
      "sub": "$",
      "u": 1.0,
      "kId": "K5",
      "name": "4",
      "coords": [
        181,
        17,
        205,
        45
      ],
      "vk": 52,
      "matrixIndex": 25,
      "keyId": 5,
      "hidUsage": 33,
      "defaultMatrix": 50331650
    },
    {
      "code": "Digit5",
      "label": "5",
      "sub": "%",
      "u": 1.0,
      "kId": "K6",
      "name": "5",
      "coords": [
        217,
        17,
        241,
        45
      ],
      "vk": 53,
      "matrixIndex": 31,
      "keyId": 6,
      "hidUsage": 34,
      "defaultMatrix": 67108866
    },
    {
      "code": "Digit6",
      "label": "6",
      "sub": "^",
      "u": 1.0,
      "kId": "K7",
      "name": "6",
      "coords": [
        254,
        17,
        278,
        45
      ],
      "vk": 54,
      "matrixIndex": 37,
      "keyId": 7,
      "hidUsage": 35,
      "defaultMatrix": 83886082
    },
    {
      "code": "Digit7",
      "label": "7",
      "sub": "&",
      "u": 1.0,
      "kId": "K8",
      "name": "7",
      "coords": [
        290,
        17,
        314,
        45
      ],
      "vk": 55,
      "matrixIndex": 43,
      "keyId": 8,
      "hidUsage": 36,
      "defaultMatrix": 100663298
    },
    {
      "code": "Digit8",
      "label": "8",
      "sub": "*",
      "u": 1.0,
      "kId": "K9",
      "name": "8",
      "coords": [
        326,
        17,
        350,
        45
      ],
      "vk": 56,
      "matrixIndex": 49,
      "keyId": 9,
      "hidUsage": 37,
      "defaultMatrix": 117440514
    },
    {
      "code": "Digit9",
      "label": "9",
      "sub": "(",
      "u": 1.0,
      "kId": "K10",
      "name": "9",
      "coords": [
        363,
        17,
        387,
        45
      ],
      "vk": 57,
      "matrixIndex": 55,
      "keyId": 10,
      "hidUsage": 38,
      "defaultMatrix": 134217730
    },
    {
      "code": "Digit0",
      "label": "0",
      "sub": ")",
      "u": 1.0,
      "kId": "K11",
      "name": "0",
      "coords": [
        399,
        17,
        423,
        45
      ],
      "vk": 48,
      "matrixIndex": 61,
      "keyId": 11,
      "hidUsage": 39,
      "defaultMatrix": 150994946
    },
    {
      "code": "Minus",
      "label": "-",
      "sub": "_",
      "u": 1.0,
      "kId": "K12",
      "name": "-",
      "coords": [
        435,
        17,
        459,
        45
      ],
      "vk": 189,
      "matrixIndex": 67,
      "keyId": 12,
      "hidUsage": 45,
      "defaultMatrix": 167772162
    },
    {
      "code": "Equal",
      "label": "=",
      "sub": "+",
      "u": 1.0,
      "kId": "K13",
      "name": "=",
      "coords": [
        472,
        17,
        496,
        45
      ],
      "vk": 187,
      "matrixIndex": 73,
      "keyId": 13,
      "hidUsage": 46,
      "defaultMatrix": 184549378
    },
    {
      "code": "Backspace",
      "label": "BACKSPACE",
      "sub": "",
      "u": 2.0,
      "kId": "K14",
      "name": "Delete",
      "coords": [
        508,
        17,
        569,
        45
      ],
      "vk": 46,
      "matrixIndex": 92,
      "keyId": 14,
      "hidUsage": 42,
      "defaultMatrix": 0
    }
  ],
  [
    {
      "code": "Tab",
      "label": "TAB",
      "sub": "",
      "u": 1.5,
      "kId": "K15",
      "name": "Tab",
      "coords": [
        35,
        53,
        78,
        81
      ],
      "vk": 9,
      "matrixIndex": 2,
      "keyId": 22,
      "hidUsage": 43,
      "defaultMatrix": 385875970
    },
    {
      "code": "KeyQ",
      "label": "Q",
      "sub": "",
      "u": 1.0,
      "kId": "K16",
      "name": "Q",
      "coords": [
        90,
        53,
        114,
        81
      ],
      "vk": 81,
      "matrixIndex": 8,
      "keyId": 23,
      "hidUsage": 20,
      "defaultMatrix": 301989890
    },
    {
      "code": "KeyW",
      "label": "W",
      "sub": "",
      "u": 1.0,
      "kId": "K17",
      "name": "W",
      "coords": [
        126,
        53,
        150,
        81
      ],
      "vk": 87,
      "matrixIndex": 14,
      "keyId": 24,
      "hidUsage": 26,
      "defaultMatrix": 318767106
    },
    {
      "code": "KeyE",
      "label": "E",
      "sub": "",
      "u": 1.0,
      "kId": "K18",
      "name": "E",
      "coords": [
        162,
        53,
        186,
        81
      ],
      "vk": 69,
      "matrixIndex": 20,
      "keyId": 25,
      "hidUsage": 8,
      "defaultMatrix": 335544322
    },
    {
      "code": "KeyR",
      "label": "R",
      "sub": "",
      "u": 1.0,
      "kId": "K19",
      "name": "R",
      "coords": [
        199,
        53,
        223,
        81
      ],
      "vk": 82,
      "matrixIndex": 26,
      "keyId": 26,
      "hidUsage": 21,
      "defaultMatrix": 352321536
    },
    {
      "code": "KeyT",
      "label": "T",
      "sub": "",
      "u": 1.0,
      "kId": "K20",
      "name": "T",
      "coords": [
        236,
        53,
        260,
        81
      ],
      "vk": 84,
      "matrixIndex": 32,
      "keyId": 27,
      "hidUsage": 23,
      "defaultMatrix": 385875968
    },
    {
      "code": "KeyY",
      "label": "Y",
      "sub": "",
      "u": 1.0,
      "kId": "K21",
      "name": "Y",
      "coords": [
        272,
        53,
        296,
        81
      ],
      "vk": 89,
      "matrixIndex": 38,
      "keyId": 28,
      "hidUsage": 28,
      "defaultMatrix": 469762048
    },
    {
      "code": "KeyU",
      "label": "U",
      "sub": "",
      "u": 1.0,
      "kId": "K22",
      "name": "U",
      "coords": [
        308,
        53,
        332,
        81
      ],
      "vk": 85,
      "matrixIndex": 44,
      "keyId": 29,
      "hidUsage": 24,
      "defaultMatrix": 402653184
    },
    {
      "code": "KeyI",
      "label": "I",
      "sub": "",
      "u": 1.0,
      "kId": "K23",
      "name": "I",
      "coords": [
        344,
        53,
        368,
        81
      ],
      "vk": 73,
      "matrixIndex": 50,
      "keyId": 30,
      "hidUsage": 12,
      "defaultMatrix": 201326592
    },
    {
      "code": "KeyO",
      "label": "O",
      "sub": "",
      "u": 1.0,
      "kId": "K24",
      "name": "O",
      "coords": [
        380,
        53,
        404,
        81
      ],
      "vk": 79,
      "matrixIndex": 56,
      "keyId": 31,
      "hidUsage": 18,
      "defaultMatrix": 301989888
    },
    {
      "code": "KeyP",
      "label": "P",
      "sub": "",
      "u": 1.0,
      "kId": "K25",
      "name": "P",
      "coords": [
        418,
        53,
        442,
        81
      ],
      "vk": 80,
      "matrixIndex": 62,
      "keyId": 32,
      "hidUsage": 19,
      "defaultMatrix": 251658242
    },
    {
      "code": "BracketLeft",
      "label": "[",
      "sub": "{",
      "u": 1.0,
      "kId": "K26",
      "name": "[",
      "coords": [
        454,
        53,
        478,
        81
      ],
      "vk": 219,
      "matrixIndex": 68,
      "keyId": 33,
      "hidUsage": 47,
      "defaultMatrix": 268435458
    },
    {
      "code": "BracketRight",
      "label": "]",
      "sub": "}",
      "u": 1.0,
      "kId": "K27",
      "name": "]",
      "coords": [
        490,
        53,
        514,
        81
      ],
      "vk": 221,
      "matrixIndex": 74,
      "keyId": 34,
      "hidUsage": 48,
      "defaultMatrix": 285212674
    },
    {
      "code": "Backslash",
      "label": "\\",
      "sub": "|",
      "u": 1.5,
      "kId": "K28",
      "name": "\\",
      "coords": [
        527,
        53,
        569,
        81
      ],
      "vk": 220,
      "matrixIndex": 79,
      "keyId": 35,
      "hidUsage": 49,
      "defaultMatrix": 234881026
    }
  ],
  [
    {
      "code": "CapsLock",
      "label": "CAPS",
      "sub": "",
      "u": 1.75,
      "kId": "K29",
      "name": "CapsLock",
      "coords": [
        35,
        90,
        86,
        118
      ],
      "vk": 20,
      "matrixIndex": 3,
      "keyId": 44,
      "hidUsage": 57,
      "defaultMatrix": 956301312
    },
    {
      "code": "KeyA",
      "label": "A",
      "sub": "",
      "u": 1.0,
      "kId": "K30",
      "name": "A",
      "coords": [
        100,
        90,
        124,
        118
      ],
      "vk": 65,
      "matrixIndex": 9,
      "keyId": 45,
      "hidUsage": 4,
      "defaultMatrix": 67108864
    },
    {
      "code": "KeyS",
      "label": "S",
      "sub": "",
      "u": 1.0,
      "kId": "K31",
      "name": "S",
      "coords": [
        135,
        90,
        159,
        118
      ],
      "vk": 83,
      "matrixIndex": 15,
      "keyId": 46,
      "hidUsage": 22,
      "defaultMatrix": 369098752
    },
    {
      "code": "KeyD",
      "label": "D",
      "sub": "",
      "u": 1.0,
      "kId": "K32",
      "name": "D",
      "coords": [
        172,
        90,
        196,
        118
      ],
      "vk": 68,
      "matrixIndex": 21,
      "keyId": 47,
      "hidUsage": 7,
      "defaultMatrix": 117440512
    },
    {
      "code": "KeyF",
      "label": "F",
      "sub": "",
      "u": 1.0,
      "kId": "K33",
      "name": "F",
      "coords": [
        208,
        90,
        232,
        118
      ],
      "vk": 70,
      "matrixIndex": 27,
      "keyId": 48,
      "hidUsage": 9,
      "defaultMatrix": 150994944
    },
    {
      "code": "KeyG",
      "label": "G",
      "sub": "",
      "u": 1.0,
      "kId": "K34",
      "name": "G",
      "coords": [
        245,
        90,
        269,
        118
      ],
      "vk": 71,
      "matrixIndex": 33,
      "keyId": 49,
      "hidUsage": 10,
      "defaultMatrix": 167772160
    },
    {
      "code": "KeyH",
      "label": "H",
      "sub": "",
      "u": 1.0,
      "kId": "K35",
      "name": "H",
      "coords": [
        281,
        90,
        305,
        118
      ],
      "vk": 72,
      "matrixIndex": 39,
      "keyId": 50,
      "hidUsage": 11,
      "defaultMatrix": 184549376
    },
    {
      "code": "KeyJ",
      "label": "J",
      "sub": "",
      "u": 1.0,
      "kId": "K36",
      "name": "J",
      "coords": [
        317,
        90,
        341,
        118
      ],
      "vk": 74,
      "matrixIndex": 45,
      "keyId": 51,
      "hidUsage": 13,
      "defaultMatrix": 218103808
    },
    {
      "code": "KeyK",
      "label": "K",
      "sub": "",
      "u": 1.0,
      "kId": "K37",
      "name": "K",
      "coords": [
        354,
        90,
        378,
        118
      ],
      "vk": 75,
      "matrixIndex": 51,
      "keyId": 52,
      "hidUsage": 14,
      "defaultMatrix": 234881024
    },
    {
      "code": "KeyL",
      "label": "L",
      "sub": "",
      "u": 1.0,
      "kId": "K38",
      "name": "L",
      "coords": [
        390,
        90,
        414,
        118
      ],
      "vk": 76,
      "matrixIndex": 57,
      "keyId": 53,
      "hidUsage": 15,
      "defaultMatrix": 251658240
    },
    {
      "code": "Semicolon",
      "label": ";",
      "sub": ":",
      "u": 1.0,
      "kId": "K39",
      "name": ";",
      "coords": [
        427,
        90,
        451,
        118
      ],
      "vk": 186,
      "matrixIndex": 63,
      "keyId": 54,
      "hidUsage": 51,
      "defaultMatrix": 855638016
    },
    {
      "code": "Quote",
      "label": "'",
      "sub": "\"",
      "u": 1.0,
      "kId": "K40",
      "name": "'",
      "coords": [
        463,
        90,
        487,
        118
      ],
      "vk": 222,
      "matrixIndex": 69,
      "keyId": 55,
      "hidUsage": 52,
      "defaultMatrix": 872415232
    },
    {
      "code": "Enter",
      "label": "ENTER",
      "sub": "",
      "u": 2.25,
      "kId": "K41",
      "name": "Enter",
      "coords": [
        500,
        90,
        569,
        118
      ],
      "vk": 13,
      "matrixIndex": 81,
      "keyId": 57,
      "hidUsage": 40,
      "defaultMatrix": 671088640
    }
  ],
  [
    {
      "code": "ShiftLeft",
      "label": "SHIFT",
      "sub": "",
      "u": 2.25,
      "kId": "K42",
      "name": "LShift",
      "coords": [
        36,
        126,
        104,
        154
      ],
      "vk": 160,
      "matrixIndex": 4,
      "keyId": 66,
      "hidUsage": 225,
      "defaultMatrix": 3774873606
    },
    {
      "code": "KeyZ",
      "label": "Z",
      "sub": "",
      "u": 1.0,
      "kId": "K43",
      "name": "Z",
      "coords": [
        117,
        126,
        141,
        154
      ],
      "vk": 90,
      "matrixIndex": 10,
      "keyId": 68,
      "hidUsage": 29,
      "defaultMatrix": 486539264
    },
    {
      "code": "KeyX",
      "label": "X",
      "sub": "",
      "u": 1.0,
      "kId": "K44",
      "name": "X",
      "coords": [
        154,
        126,
        178,
        154
      ],
      "vk": 88,
      "matrixIndex": 16,
      "keyId": 69,
      "hidUsage": 27,
      "defaultMatrix": 452984832
    },
    {
      "code": "KeyC",
      "label": "C",
      "sub": "",
      "u": 1.0,
      "kId": "K45",
      "name": "C",
      "coords": [
        190,
        125,
        214,
        153
      ],
      "vk": 67,
      "matrixIndex": 22,
      "keyId": 70,
      "hidUsage": 6,
      "defaultMatrix": 100663296
    },
    {
      "code": "KeyV",
      "label": "V",
      "sub": "",
      "u": 1.0,
      "kId": "K46",
      "name": "V",
      "coords": [
        226,
        125,
        250,
        153
      ],
      "vk": 86,
      "matrixIndex": 28,
      "keyId": 71,
      "hidUsage": 25,
      "defaultMatrix": 419430400
    },
    {
      "code": "KeyB",
      "label": "B",
      "sub": "",
      "u": 1.0,
      "kId": "K47",
      "name": "B",
      "coords": [
        262,
        125,
        286,
        153
      ],
      "vk": 66,
      "matrixIndex": 34,
      "keyId": 72,
      "hidUsage": 5,
      "defaultMatrix": 83886080
    },
    {
      "code": "KeyN",
      "label": "N",
      "sub": "",
      "u": 1.0,
      "kId": "K48",
      "name": "N",
      "coords": [
        299,
        125,
        323,
        153
      ],
      "vk": 78,
      "matrixIndex": 40,
      "keyId": 73,
      "hidUsage": 17,
      "defaultMatrix": 285212672
    },
    {
      "code": "KeyM",
      "label": "M",
      "sub": "",
      "u": 1.0,
      "kId": "K49",
      "name": "M",
      "coords": [
        336,
        126,
        360,
        154
      ],
      "vk": 77,
      "matrixIndex": 46,
      "keyId": 74,
      "hidUsage": 16,
      "defaultMatrix": 268435456
    },
    {
      "code": "Comma",
      "label": ",",
      "sub": "<",
      "u": 1.0,
      "kId": "K50",
      "name": ",",
      "coords": [
        372,
        126,
        396,
        154
      ],
      "vk": 188,
      "matrixIndex": 52,
      "keyId": 75,
      "hidUsage": 54,
      "defaultMatrix": 352321538
    },
    {
      "code": "Period",
      "label": ".",
      "sub": ">",
      "u": 1.0,
      "kId": "K51",
      "name": ".",
      "coords": [
        409,
        126,
        433,
        154
      ],
      "vk": 190,
      "matrixIndex": 58,
      "keyId": 76,
      "hidUsage": 55,
      "defaultMatrix": 369098754
    },
    {
      "code": "Slash",
      "label": "/",
      "sub": "?",
      "u": 1.0,
      "kId": "K52",
      "name": "/",
      "coords": [
        444,
        127,
        468,
        155
      ],
      "vk": 191,
      "matrixIndex": 64,
      "keyId": 77,
      "hidUsage": 56,
      "defaultMatrix": 452984834
    },
    {
      "code": "ShiftRight",
      "label": "SHIFT",
      "sub": "",
      "u": 2.75,
      "kId": "K53",
      "name": "RShift",
      "coords": [
        482,
        126,
        569,
        154
      ],
      "vk": 161,
      "matrixIndex": 82,
      "keyId": 80,
      "hidUsage": 229,
      "defaultMatrix": 469762050
    }
  ],
  [
    {
      "code": "ControlLeft",
      "label": "CTRL",
      "sub": "",
      "u": 1.25,
      "kId": "K54",
      "name": "LCtrl",
      "coords": [
        35,
        162,
        68,
        190
      ],
      "vk": 162,
      "matrixIndex": 5,
      "keyId": 88,
      "hidUsage": 224,
      "defaultMatrix": 3758096390
    },
    {
      "code": "MetaLeft",
      "label": "WIN",
      "sub": "",
      "u": 1.25,
      "kId": "K55",
      "name": "LWin",
      "coords": [
        81,
        162,
        113,
        190
      ],
      "vk": 91,
      "matrixIndex": 11,
      "keyId": 89,
      "hidUsage": 227,
      "defaultMatrix": 201326594
    },
    {
      "code": "AltLeft",
      "label": "ALT",
      "sub": "",
      "u": 1.25,
      "kId": "K56",
      "name": "LAlt",
      "coords": [
        127,
        162,
        159,
        190
      ],
      "vk": 164,
      "matrixIndex": 17,
      "keyId": 90,
      "hidUsage": 226,
      "defaultMatrix": 3791650822
    },
    {
      "code": "Space",
      "label": "SPACE",
      "sub": "",
      "u": 6.25,
      "kId": "K57",
      "name": "Space",
      "coords": [
        172,
        162,
        386,
        190
      ],
      "vk": 32,
      "matrixIndex": 35,
      "keyId": 93,
      "hidUsage": 44,
      "defaultMatrix": 738197504
    },
    {
      "code": "AltRight",
      "label": "ALT",
      "sub": "",
      "u": 1.25,
      "kId": "K58",
      "name": "RAlt",
      "coords": [
        400,
        162,
        432,
        190
      ],
      "vk": 165,
      "matrixIndex": 53,
      "keyId": 96,
      "hidUsage": 230,
      "defaultMatrix": 402653186
    },
    {
      "code": "ContextMenu",
      "label": "APP",
      "sub": "",
      "u": 1.25,
      "kId": "K60",
      "name": "App",
      "coords": [
        445,
        162,
        477,
        190
      ],
      "vk": 93,
      "matrixIndex": 59,
      "keyId": 97,
      "hidUsage": 101,
      "defaultMatrix": 419430402
    },
    {
      "code": "ControlRight",
      "label": "CTRL",
      "sub": "",
      "u": 1.25,
      "kId": "K61",
      "name": "RCtrl",
      "coords": [
        491,
        162,
        524,
        190
      ],
      "vk": 163,
      "matrixIndex": 65,
      "keyId": 98,
      "hidUsage": 228,
      "defaultMatrix": 436207618
    },
    {
      "code": "Fn",
      "label": "FN",
      "sub": "",
      "u": 1.25,
      "kId": "K59",
      "name": "Fn",
      "coords": [
        536,
        162,
        569,
        190
      ],
      "vk": 250,
      "matrixIndex": 83,
      "keyId": 101,
      "hidUsage": 250,
      "defaultMatrix": 32
    }
  ]
];

// Flat lookup array of all 61 keys (K1..K61)
export const VX5_61_KEYS = ANSI_60_LAYOUT.flat();

// Quick lookup maps
export const VX5_KEY_BY_CODE = Object.fromEntries(VX5_61_KEYS.map((k) => [k.code, k]));
export const VX5_KEY_BY_KID = Object.fromEntries(VX5_61_KEYS.map((k) => [k.kId, k]));
export const VX5_KEY_BY_MATRIX_IDX = Object.fromEntries(VX5_61_KEYS.map((k) => [k.matrixIndex, k]));

export const PRESET_FUNCTIONS = [
  { label: "Escape", code: "Escape" },
  { label: "Left Ctrl", code: "ControlLeft" },
  { label: "Left Alt", code: "AltLeft" },
  { label: "Left Win", code: "MetaLeft" },
  { label: "Function (Fn)", code: "Fn" },
  { label: "Mute", code: "AudioVolumeMute" },
  { label: "Vol +", code: "AudioVolumeUp" },
  { label: "Vol -", code: "AudioVolumeDown" },
  { label: "Play/Pause", code: "MediaPlayPause" },
  { label: "Next Track", code: "MediaTrackNext" },
  { label: "Prev Track", code: "MediaTrackPrevious" },
  { label: "Disable Key", code: "Disabled" },
];

export const INITIAL_STATE = {
  connected: false,
  connectionType: null, // "webhid" | "daemon"
  activeKey: "CapsLock",
  profileName: "Profile 1 (Default / FPS)",
  fnWinSwapped: false,
  socd: {
    enabled: true,
    mode: "last_priority", // "last_priority" | "neutral" | "absolute_priority"
    debounceMs: 1,
    pairs: [
      { keyA: "KeyA", keyB: "KeyD", label: "Strafe (A / D)" },
      { keyA: "KeyW", keyB: "KeyS", label: "Forward / Back (W / S)" },
    ],
  },
  tapDance: [
    {
      triggerKey: "CapsLock",
      tapAction: "Escape",
      holdAction: "ControlLeft",
      holdThresholdMs: 200,
    },
    {
      triggerKey: "Space",
      tapAction: "Space",
      holdAction: "Fn Layer 1",
      holdThresholdMs: 250,
    },
  ],
  rgb: {
    mode: "rainbow_wave",
    hexColor: "#06b6d4",
    brightness: 80,
    speed: 5,
  },
  remappedKeys: {
    CapsLock: { type: "tap_dance", label: "Esc/Ctrl" },
    MetaLeft: { type: "standard", label: "Win" },
  },
};
