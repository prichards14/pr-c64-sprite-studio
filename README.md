# Commodore 64 Sprite Studio

A modern HTML5 / JavaScript / CSS Single Page Application (SPA) utility for designing and editing Commodore 64 sprites, featuring authentic VIC-II hardware mode support, live previews, and instant Commodore BASIC V2 `.BAS` code generation.

---

## Features

### 1. Authentic VIC-II Modes & Standard Dimensions
* **Standard 24×21 Dot Dimensions**: Exactly matches the Commodore 64 VIC-II sprite matrix (63 binary data bytes per sprite).
* **Hires (2-Color) Mode**:
  * 24×21 individual pixels (1-to-1 aspect ratio).
  * 1 bit per pixel: `%0` (Background / Transparent) and `%1` (Sprite individual color).
* **Lores Multicolor (4-Color) Mode**:
  * 12×21 double-width pixels (2-to-1 aspect ratio, accurately reflecting wide pixels on CRT monitors).
  * 2 bits per pixel:
    * `%00`: Background / Screen Color (`$D021`)
    * `%01`: Multicolor 1 (`$D025`)
    * `%10`: Sprite Individual Color (`$D028`)
    * `%11`: Multicolor 2 (`$D026`)

### 2. Standard 16 C64 Colors Palette
* Full 16 Commodore 64 color swatches (0 to 15) using the industry-standard Colodore CRT phosphor palette.
* Interactive Color Slot picker: click any slot, then click any of the 16 colors to assign it.
* Active color indicator with color ID, name, and binary bit values.

### 3. Editor Grid
* High-precision responsive drawing canvas with crisp nearest-neighbor pixel scaling.
* **Drawing Tools**: Pencil, Eraser (sets to background), Paint Bucket (Flood Fill), and Eyedropper (Color Picker).
* **Transformations**: Flip Horizontal, Flip Vertical, Invert, Shift Up/Down/Left/Right, Clear.
* **Visual Guides**: Toggleable pixel grid lines and 8-bit byte boundary markers (every 8 hires dots / 4 multicolor dots = 1 byte).
* **Full Undo / Redo**: History stack with keyboard shortcuts (`Ctrl+Z` / `Cmd+Z`, `Ctrl+Y` / `Cmd+Shift+Z`).

### 4. Actual Size Thumbnail & Previews
* **1× Actual Size Thumbnail (24×21 px)**: Pixel-perfect native scale rendering.
* **Zoomed Previews**: 2× and 4× scale previews.
* **VIC-II Hardware Expansion**:
  * Expand X (`$D01D`): Double-width sprite preview.
  * Expand Y (`$D017`): Double-height sprite preview.
* **Background Mode**: Preview against C64 screen color (`$D021`), transparent checkerboard, or black.

### 5. Live Commodore BASIC V2 (.BAS) Generator
* Real-time code generation updated on every brush stroke and color change.
* **Setup routine starting at line 100**:
  * POKEs VIC-II base address (`V = 53248` / `$D000`), border color, background color.
  * Reads 63 data bytes into cassette buffer (`832` / `$0340`).
  * Sets Sprite 0 pointer at `2040` (`1024 + 1016`) to block `13` (`13 * 64 = 832`).
  * Configures coordinates, colors, multicolor mode (`$D01C`), and expansion (`$D01D`, `$D017`).
  * Enables Sprite 0 via `POKE V+21, PEEK(V+21) OR 1`.
* **Sprite DATA statements starting at line 1000**:
  * Default: Row-by-row format (21 lines, 3 bytes per line from lines 1000 to 1200).
  * Option: Compact format (8 bytes per line from lines 1000 to 1070).
* **Uppercase / Lowercase Toggle**:
  * One-click toggle between Uppercase and Lowercase code formatting directly above the code box.
  * **Emulator Paste Mode (Lowercase)**: Essential when copying/pasting into VICE or other C64 emulators, which treat unshifted ASCII lowercase input as unshifted PETSCII (rendering correctly as uppercase C64 characters without syntax errors or triggering graphic symbols).
* **Quick Actions**: One-click "Copy BASIC" and "Download .BAS".

### 6. Save and Load
* **Save**:
  * **Save Project (`.json`)**: Preserves complete editor state, 63 data bytes, mode, color registers, and expansions.
  * **Export `.BAS`**: Plain Commodore BASIC source file ready to load or run in VICE or emulator.
  * **Export `.BIN` / `.SPR`**: Raw 63-byte binary file suitable for assembly projects (`!bin` in ACME, KickAssembler, etc.).
  * **Export `.PNG`**: Scaled pixel art image.
* **Load**:
  * Supports loading `.json` project files.
  * Parses `.bas` / `.txt` files: automatically extracts `DATA` lines and VIC-II `POKE` color/mode settings.
  * Imports raw `.bin`, `.spr`, or `.prg` binary sprite files (skips 2-byte load address on PRG).
  * Full drag-and-drop support: drag any supported file directly into the browser window.

---

## Built-In Iconic Presets
* **C64 User's Guide Balloon**: The legendary sprite from Chapter 6 of the official Commodore 64 User's Guide!
* **Classic Space Invader**: Authentic 24×21 retro arcade alien in Hires green.
* **Multicolor Starfighter**: 4-color sci-fi spaceship with cockpit and thruster flames.
* **Retro 8-Bit Hero**: Platformer hero character in multicolor.
* **Multicolor Ghost**: Retro arcade ghost.

---

## Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `1` | Select Slot 0 (Background / `%0` or `%00`) |
| `2` | Select Slot 1 (Sprite Color in Hires / MC1 in Lores) |
| `3` | Select Slot 2 (Sprite Color in Lores `%10`) |
| `4` | Select Slot 3 (MC2 in Lores `%11`) |
| `P` / `D` | Pencil Tool |
| `E` | Eraser Tool |
| `B` | Bucket / Flood Fill Tool |
| `I` | Eyedropper / Color Picker Tool |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Shift+Z` | Redo |
| Right-Click | Erase (draws background / transparent) |

---

## Running Locally
No build step or dependencies required! Simply open `index.html` in any modern web browser:

```bash
# Using python simple HTTP server:
python3 -m http.server 8000

# Open in browser:
# http://localhost:8000
```

To run test suite:
```bash
node tests/test-core.js
```

