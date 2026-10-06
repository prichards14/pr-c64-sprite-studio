/**
 * Commodore 64 Sprite Data Model
 * Handles 63-byte binary sprite data, bit manipulation for Hires and Lores (Multicolor),
 * transformations (flip, shift, invert, flood fill), and slot mappings.
 */

class C64Sprite {
  constructor() {
    // 63 bytes representing 24x21 pixels (3 bytes * 21 rows = 63 bytes)
    this.bytes = new Uint8Array(63);
    
    // Mode: 'hires' (24x21, 2 colors) or 'lores' (12x21, 4 colors)
    this.mode = 'hires';
    
    // C64 Color registers (values 0-15)
    this.colors = {
      bg: 6,      // $D021 Screen Background (Default: Blue)
      sprite: 1,  // $D028 Sprite Color (Default: White)
      mc1: 2,     // $D025 Multicolor 1 (Default: Red)
      mc2: 7      // $D026 Multicolor 2 (Default: Yellow)
    };

    // VIC-II Sprite Expansion registers
    this.expandX = false; // $D01D (Double width)
    this.expandY = false; // $D017 (Double height)

    // Name / metadata
    this.name = 'SPRITE 0';
  }

  /**
   * Width in editable pixels: 24 in hires, 12 in lores
   */
  getWidth() {
    return this.mode === 'hires' ? 24 : 12;
  }

  /**
   * Height in rows: always 21
   */
  getHeight() {
    return 21;
  }

  /**
   * Get slot index at (x, y)
   * In Hires: returns 0 (bg/transparent) or 1 (sprite color)
   * In Lores: returns 0 (bg), 1 (mc1), 2 (sprite), 3 (mc2)
   */
  getPixel(x, y) {
    if (x < 0 || x >= this.getWidth() || y < 0 || y >= 21) {
      return 0;
    }

    if (this.mode === 'hires') {
      const byteOffset = y * 3 + Math.floor(x / 8);
      const bitOffset = 7 - (x % 8);
      return (this.bytes[byteOffset] >> bitOffset) & 1;
    } else {
      const byteOffset = y * 3 + Math.floor(x / 4);
      const bitShift = 6 - (x % 4) * 2;
      return (this.bytes[byteOffset] >> bitShift) & 3;
    }
  }

  /**
   * Set slot index at (x, y)
   */
  setPixel(x, y, slot) {
    if (x < 0 || x >= this.getWidth() || y < 0 || y >= 21) {
      return;
    }

    if (this.mode === 'hires') {
      const byteOffset = y * 3 + Math.floor(x / 8);
      const bitOffset = 7 - (x % 8);
      const mask = 1 << bitOffset;
      if (slot & 1) {
        this.bytes[byteOffset] |= mask;
      } else {
        this.bytes[byteOffset] &= ~mask;
      }
    } else {
      const byteOffset = y * 3 + Math.floor(x / 4);
      const bitShift = 6 - (x % 4) * 2;
      const mask = 3 << bitShift;
      const val = (slot & 3) << bitShift;
      this.bytes[byteOffset] = (this.bytes[byteOffset] & ~mask) | val;
    }
  }

  /**
   * Returns the actual C64 palette color ID (0-15) for a given slot index
   */
  getColorIdForSlot(slot) {
    if (this.mode === 'hires') {
      return slot === 1 ? this.colors.sprite : this.colors.bg;
    } else {
      switch (slot & 3) {
        case 0: return this.colors.bg;     // 00 = Background
        case 1: return this.colors.mc1;    // 01 = Multicolor 1 ($D025)
        case 2: return this.colors.sprite; // 10 = Sprite Individual Color ($D028)
        case 3: return this.colors.mc2;    // 11 = Multicolor 2 ($D026)
        default: return this.colors.bg;
      }
    }
  }

  /**
   * Switch mode between 'hires' and 'lores'
   * The 63 bytes are preserved, replicating how real C64 VIC-II chip switches modes!
   */
  setMode(newMode) {
    if (newMode === 'hires' || newMode === 'lores') {
      this.mode = newMode;
    }
  }

  /**
   * Clear all sprite bytes to 0
   */
  clear() {
    this.bytes.fill(0);
  }

  /**
   * Invert sprite pixels
   */
  invert() {
    if (this.mode === 'hires') {
      for (let i = 0; i < 63; i++) {
        this.bytes[i] = ~this.bytes[i] & 0xFF;
      }
    } else {
      // In multicolor: invert pairs 00 <-> 10 (bg <-> sprite), 01 <-> 11 (mc1 <-> mc2)
      for (let i = 0; i < 63; i++) {
        let b = this.bytes[i];
        let inverted = 0;
        for (let p = 0; p < 4; p++) {
          const shift = 6 - p * 2;
          const pair = (b >> shift) & 3;
          // Invert bit 1 of pair (0 <-> 2, 1 <-> 3)
          const newPair = pair ^ 2;
          inverted |= (newPair << shift);
        }
        this.bytes[i] = inverted;
      }
    }
  }

  /**
   * Flip horizontally
   */
  flipHorizontal() {
    const width = this.getWidth();
    for (let y = 0; y < 21; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(this.getPixel(x, y));
      }
      for (let x = 0; x < width; x++) {
        this.setPixel(x, y, row[width - 1 - x]);
      }
    }
  }

  /**
   * Flip vertically
   */
  flipVertical() {
    const width = this.getWidth();
    for (let y = 0; y < 10; y++) {
      const oppositeY = 20 - y;
      for (let x = 0; x < width; x++) {
        const p1 = this.getPixel(x, y);
        const p2 = this.getPixel(x, oppositeY);
        this.setPixel(x, y, p2);
        this.setPixel(x, oppositeY, p1);
      }
    }
  }

  /**
   * Shift sprite by dx, dy
   */
  shift(dx, dy, wrap = false) {
    const width = this.getWidth();
    const height = 21;
    const grid = [];

    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        grid[y][x] = this.getPixel(x, y);
      }
    }

    this.clear();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let targetX = x + dx;
        let targetY = y + dy;

        if (wrap) {
          targetX = (targetX % width + width) % width;
          targetY = (targetY % height + height) % height;
          this.setPixel(targetX, targetY, grid[y][x]);
        } else {
          if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
            this.setPixel(targetX, targetY, grid[y][x]);
          }
        }
      }
    }
  }

  /**
   * Flood fill starting from (startX, startY) with slot
   */
  floodFill(startX, startY, fillSlot) {
    const width = this.getWidth();
    const height = 21;
    const targetSlot = this.getPixel(startX, startY);

    if (targetSlot === fillSlot) return;

    const queue = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    while (queue.length > 0) {
      const [x, y] = queue.pop();
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx]) continue;
      if (this.getPixel(x, y) !== targetSlot) continue;

      visited[idx] = 1;
      this.setPixel(x, y, fillSlot);

      if (x + 1 < width) queue.push([x + 1, y]);
      if (x - 1 >= 0) queue.push([x - 1, y]);
      if (y + 1 < height) queue.push([x, y + 1]);
      if (y - 1 >= 0) queue.push([x, y - 1]);
    }
  }

  /**
   * Load raw 63 bytes (or 64 bytes VIC block)
   */
  loadBytes(data) {
    if (!data || data.length < 63) {
      throw new Error('Sprite data must be at least 63 bytes');
    }
    for (let i = 0; i < 63; i++) {
      this.bytes[i] = data[i] & 0xFF;
    }
  }

  /**
   * Return a copy of the 63 bytes
   */
  getBytes() {
    return new Uint8Array(this.bytes);
  }

  /**
   * Return 64-byte block (63 data bytes + 1 padding byte 0)
   */
  get64Bytes() {
    const block = new Uint8Array(64);
    block.set(this.bytes);
    block[63] = 0;
    return block;
  }

  /**
   * Deep clone of sprite
   */
  clone() {
    const copy = new C64Sprite();
    copy.bytes.set(this.bytes);
    copy.mode = this.mode;
    copy.colors = { ...this.colors };
    copy.expandX = this.expandX;
    copy.expandY = this.expandY;
    copy.name = this.name;
    return copy;
  }

  /**
   * Serialize to JSON-friendly object
   */
  toJSON() {
    return {
      format: 'c64-sprite-editor',
      version: '1.0',
      name: this.name,
      mode: this.mode,
      bytes: Array.from(this.bytes),
      colors: { ...this.colors },
      expandX: this.expandX,
      expandY: this.expandY
    };
  }

  /**
   * Load from JSON-friendly object
   */
  fromJSON(json) {
    if (!json || !json.bytes) {
      throw new Error('Invalid sprite project JSON');
    }
    this.name = json.name || 'SPRITE 0';
    this.mode = json.mode === 'lores' ? 'lores' : 'hires';
    this.loadBytes(json.bytes);
    if (json.colors) {
      this.colors = {
        bg: json.colors.bg !== undefined ? json.colors.bg : 6,
        sprite: json.colors.sprite !== undefined ? json.colors.sprite : 1,
        mc1: json.colors.mc1 !== undefined ? json.colors.mc1 : 2,
        mc2: json.colors.mc2 !== undefined ? json.colors.mc2 : 7
      };
    }
    this.expandX = !!json.expandX;
    this.expandY = !!json.expandY;
  }
}

// Export for Node/ESM/Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { C64Sprite };
}

