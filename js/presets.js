/**
 * Classic Commodore 64 Sprite Presets
 * Includes the legendary C64 User's Guide Balloon, Space Invader, Starfighter, and 8-bit Hero.
 */

const SPRITE_PRESETS = [
  {
    name: "C64 User's Guide Balloon",
    mode: 'hires',
    colors: { bg: 6, sprite: 1, mc1: 2, mc2: 7 },
    expandX: false,
    expandY: false,
    bytes: [
      0, 127, 0,
      1, 255, 192,
      3, 255, 224,
      3, 255, 224,
      7, 255, 240,
      7, 255, 240,
      7, 255, 240,
      3, 255, 224,
      3, 255, 224,
      1, 255, 192,
      0, 127, 0,
      0, 62, 0,
      0, 28, 0,
      0, 28, 0,
      0, 8, 0,
      0, 20, 0,
      0, 8, 0,
      0, 62, 0,
      0, 62, 0,
      0, 62, 0,
      0, 0, 0
    ]
  },
  {
    name: "Classic Space Invader",
    mode: 'hires',
    colors: { bg: 0, sprite: 13, mc1: 2, mc2: 7 }, // Green on black
    expandX: false,
    expandY: false,
    bytes: [
      0, 0, 0,
      0, 60, 0,
      0, 126, 0,
      0, 255, 0,
      1, 107, 128,
      1, 255, 128,
      0, 36, 0,
      0, 90, 0,
      0, 165, 0,
      0, 129, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0
    ]
  },
  {
    name: "Multicolor Starfighter",
    mode: 'lores',
    // 00=bg (black:0), 01=mc1 (red:2), 10=sprite (white:1), 11=mc2 (cyan:3)
    colors: { bg: 0, sprite: 1, mc1: 2, mc2: 3 },
    expandX: false,
    expandY: false,
    bytes: [
      0, 10, 0,
      0, 10, 0,
      0, 42, 0,
      0, 170, 0,
      0, 170, 0,
      0, 186, 0,
      0, 186, 0,
      1, 186, 64,
      1, 170, 64,
      1, 170, 64,
      2, 170, 128,
      2, 238, 128,
      6, 254, 160,
      10, 170, 168,
      10, 170, 168,
      2, 170, 128,
      0, 186, 0,
      0, 85, 0,
      0, 85, 0,
      0, 101, 0,
      0, 16, 0
    ]
  },
  {
    name: "Retro 8-Bit Hero",
    mode: 'lores',
    // 00=bg(blue:6), 01=mc1(brown:9), 10=sprite(light red:10), 11=mc2(yellow:7)
    colors: { bg: 6, sprite: 10, mc1: 9, mc2: 7 },
    expandX: false,
    expandY: false,
    bytes: [
      0, 21, 0,
      0, 85, 0,
      0, 21, 0,
      0, 170, 0,
      0, 186, 0,
      0, 170, 0,
      0, 174, 0,
      0, 10, 0,
      0, 106, 0,
      1, 170, 64,
      1, 170, 64,
      1, 238, 64,
      2, 254, 128,
      2, 254, 128,
      0, 238, 0,
      0, 170, 0,
      0, 170, 0,
      0, 138, 0,
      0, 138, 0,
      0, 162, 0,
      0, 162, 0
    ]
  },
  {
    name: "Multicolor Ghost",
    mode: 'lores',
    // 00=bg (black:0), 01=mc1 (purple:4), 10=sprite (white:1), 11=mc2 (blue:6)
    colors: { bg: 0, sprite: 1, mc1: 4, mc2: 14 },
    expandX: false,
    expandY: false,
    bytes: [
      0, 85, 0,
      1, 85, 64,
      1, 85, 64,
      5, 85, 80,
      21, 85, 84,
      26, 10, 164,
      27, 43, 164,
      26, 10, 164,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      21, 85, 84,
      85, 85, 85,
      81, 21, 81,
      65, 1, 65
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SPRITE_PRESETS };
}

