const assert = require('assert');
const { C64_PALETTE, getColorHex, getColorName } = require('../js/palette.js');
const { C64Sprite } = require('../js/sprite.js');
const { BasicGenerator } = require('../js/basic-generator.js');
const { SPRITE_PRESETS } = require('../js/presets.js');

console.log('--- RUNNING C64 SPRITE SUITE TESTS ---');

// 1. Test Palette
assert.strictEqual(C64_PALETTE.length, 16, 'Palette must have 16 colors');
assert.strictEqual(getColorName(0), 'Black');
assert.strictEqual(getColorName(1), 'White');
assert.strictEqual(getColorName(6), 'Blue');
console.log('✓ Palette tests passed');

// 2. Test Sprite Dimensions & Bytes
const sprite = new C64Sprite();
assert.strictEqual(sprite.bytes.length, 63, 'Sprite must be exactly 63 bytes');
assert.strictEqual(sprite.getWidth(), 24, 'Hires width must be 24');
assert.strictEqual(sprite.getHeight(), 21, 'Height must be 21');

// 3. Test Hires Pixel Manipulation
// Test top-left pixel (0, 0) -> bit 7 of byte 0
sprite.setPixel(0, 0, 1);
assert.strictEqual(sprite.bytes[0], 0x80, 'Setting (0,0) in hires should set bit 7 of byte 0');
assert.strictEqual(sprite.getPixel(0, 0), 1);

// Test pixel (7, 0) -> bit 0 of byte 0
sprite.setPixel(7, 0, 1);
assert.strictEqual(sprite.bytes[0], 0x81, 'Setting (7,0) should set bit 0 of byte 0');

// Test pixel (8, 0) -> bit 7 of byte 1
sprite.setPixel(8, 0, 1);
assert.strictEqual(sprite.bytes[1], 0x80, 'Setting (8,0) should set bit 7 of byte 1');

// Test bottom-right pixel (23, 20) -> bit 0 of byte 62
sprite.setPixel(23, 20, 1);
assert.strictEqual(sprite.bytes[62], 0x01, 'Setting (23,20) should set bit 0 of byte 62');
assert.strictEqual(sprite.getPixel(23, 20), 1);

// Clear pixel
sprite.setPixel(0, 0, 0);
assert.strictEqual(sprite.getPixel(0, 0), 0);
assert.strictEqual(sprite.bytes[0], 0x01);
console.log('✓ Hires pixel bit-packing tests passed');

// 4. Test Lores (Multicolor) Pixel Manipulation
sprite.clear();
sprite.setMode('lores');
assert.strictEqual(sprite.getWidth(), 12, 'Lores width must be 12');
assert.strictEqual(sprite.getHeight(), 21, 'Lores height must be 21');

// Pixel (0, 0) with slot 1 (01 binary) -> bits 7-6 of byte 0: 01000000 = 0x40 = 64
sprite.setPixel(0, 0, 1);
assert.strictEqual(sprite.bytes[0], 0x40, 'Slot 1 at (0,0) should be 0x40');
assert.strictEqual(sprite.getPixel(0, 0), 1);

// Pixel (0, 0) with slot 2 (10 binary) -> bits 7-6: 10000000 = 0x80
sprite.setPixel(0, 0, 2);
assert.strictEqual(sprite.bytes[0], 0x80, 'Slot 2 at (0,0) should be 0x80');
assert.strictEqual(sprite.getPixel(0, 0), 2);

// Pixel (0, 0) with slot 3 (11 binary) -> bits 7-6: 11000000 = 0xC0
sprite.setPixel(0, 0, 3);
assert.strictEqual(sprite.bytes[0], 0xC0, 'Slot 3 at (0,0) should be 0xC0');
assert.strictEqual(sprite.getPixel(0, 0), 3);

// Pixel (1, 0) with slot 1 -> bits 5-4: 00010000 = 0x10
sprite.setPixel(1, 0, 1);
assert.strictEqual(sprite.bytes[0], 0xD0, 'Slot 3 at 0, slot 1 at 1 should be 0xD0 (11010000)');

// Pixel (3, 0) with slot 2 -> bits 1-0: 00000010 = 0x02
sprite.setPixel(3, 0, 2);
assert.strictEqual(sprite.bytes[0], 0xD2);

// Pixel (4, 0) is byte 1, bits 7-6
sprite.setPixel(4, 0, 3);
assert.strictEqual(sprite.bytes[1], 0xC0);

// Pixel (11, 20) is bottom right: byte 62, bits 1-0
sprite.setPixel(11, 20, 3);
assert.strictEqual(sprite.bytes[62], 0x03);
console.log('✓ Lores multicolor pixel bit-packing tests passed');

// 5. Test Transformations: Invert, Flip, Shift
sprite.clear();
sprite.setMode('hires');
sprite.setPixel(0, 0, 1);
sprite.flipHorizontal();
assert.strictEqual(sprite.getPixel(0, 0), 0);
assert.strictEqual(sprite.getPixel(23, 0), 1, 'Flip horizontal should move bit from 0 to 23');

sprite.flipVertical();
assert.strictEqual(sprite.getPixel(23, 0), 0);
assert.strictEqual(sprite.getPixel(23, 20), 1, 'Flip vertical should move pixel from row 0 to 20');

sprite.shift(-1, 0); // Shift left
assert.strictEqual(sprite.getPixel(22, 20), 1, 'Shift left by 1 moves col 23 to col 22');

sprite.clear();
sprite.setPixel(2, 2, 1);
sprite.floodFill(0, 0, 1);
// Flood fill from (0,0) with 1 should fill the entire canvas
assert.strictEqual(sprite.getPixel(0, 0), 1);
assert.strictEqual(sprite.getPixel(10, 10), 1);
console.log('✓ Transform and flood fill tests passed');

// 6. Test Basic Code Generation & Requirements
const balloonPreset = SPRITE_PRESETS[0];
sprite.loadBytes(balloonPreset.bytes);
sprite.mode = balloonPreset.mode;
sprite.colors = { ...balloonPreset.colors };

const basicCode = BasicGenerator.generate(sprite);
console.log('Generated BASIC sample (first 5 lines):');
console.log(basicCode.split('\n').slice(0, 5).join('\n'));

// Requirement 1: starting at line 100
assert.ok(basicCode.startsWith('100 REM'), 'BASIC code must start at line 100');
// Requirement 2: DATA starting at line 1000
assert.ok(basicCode.includes('1000 DATA 0,127,0'), 'DATA must start at line 1000');
// Exactly 21 DATA lines in row-by-row mode
const dataLines = basicCode.split('\n').filter(l => /^\d+\s+DATA\b/.test(l));
assert.strictEqual(dataLines.length, 21, 'Must have 21 DATA lines for 21 sprite rows');
console.log('✓ BASIC generation requirements verified (Line 100 setup, Line 1000 DATA)');

// 7. Test Basic Parser (Roundtrip)
const parsed = BasicGenerator.parse(basicCode);
assert.strictEqual(parsed.bytes.length, 63);
for (let i = 0; i < 63; i++) {
  assert.strictEqual(parsed.bytes[i], balloonPreset.bytes[i], `Byte ${i} mismatch in parsed BASIC`);
}
assert.strictEqual(parsed.colors.bg, 6);
assert.strictEqual(parsed.colors.sprite, 1);
console.log('✓ BASIC parser roundtrip test passed');

// 8. Test JSON serialization
const json = sprite.toJSON();
const loadedSprite = new C64Sprite();
loadedSprite.fromJSON(json);
assert.deepStrictEqual(Array.from(loadedSprite.bytes), Array.from(sprite.bytes));
assert.deepStrictEqual(loadedSprite.colors, sprite.colors);
console.log('✓ JSON serialization roundtrip passed');

// 9. Test Multicolor Preset & Basic generation with compact layout
const starfighterPreset = SPRITE_PRESETS[2];
sprite.loadBytes(starfighterPreset.bytes);
sprite.mode = starfighterPreset.mode;
sprite.colors = { ...starfighterPreset.colors };
sprite.expandX = true;
sprite.expandY = true;

const compactBasic = BasicGenerator.generate(sprite, {
  spriteNumber: 2,
  dataFormat: 'compact'
});

assert.ok(compactBasic.includes('POKE V+28,4'), 'Multicolor register for Sprite 2 must set bit 2 (4)');
assert.ok(compactBasic.includes('POKE V+29,4'), 'X expand register for Sprite 2 must set bit 2 (4)');
assert.ok(compactBasic.includes('POKE V+23,4'), 'Y expand register for Sprite 2 must set bit 2 (4)');
assert.ok(compactBasic.includes('POKE V+37,'), 'Must set Multicolor 1 register');
assert.ok(compactBasic.includes('POKE V+38,'), 'Must set Multicolor 2 register');

const compactParsed = BasicGenerator.parse(compactBasic);
assert.strictEqual(compactParsed.bytes.length, 63);
for (let i = 0; i < 63; i++) {
  assert.strictEqual(compactParsed.bytes[i], starfighterPreset.bytes[i]);
}
assert.strictEqual(compactParsed.mode, 'lores');
console.log('✓ Multicolor and compact layout tests passed');

// 10. Test Binary PRG header handling
const prgData = new Uint8Array(65);
prgData[0] = 0x40; // $0340 Load Address Lo
prgData[1] = 0x03; // $0340 Load Address Hi
for (let i = 0; i < 63; i++) {
  prgData[i + 2] = (i * 3) & 0xFF;
}
// Load skipping 2 byte header
const prgSprite = new C64Sprite();
prgSprite.loadBytes(prgData.subarray(2, 65));
assert.strictEqual(prgSprite.bytes[0], 0);
assert.strictEqual(prgSprite.bytes[1], 3);
assert.strictEqual(prgSprite.bytes[62], (62 * 3) & 0xFF);
console.log('✓ Binary PRG payload test passed');

// 11. Test Uppercase vs Lowercase Code Generation (for emulator pasting)
const lowerCode = BasicGenerator.generate(sprite, { codeCase: 'lower' });
assert.ok(lowerCode.startsWith('100 rem'), 'Lowercase option must produce lowercase commands');
assert.ok(lowerCode.includes('data'), 'DATA keyword must be lowercase');
assert.ok(lowerCode.includes('poke 53281,'), 'POKE keyword must be lowercase');
assert.ok(!/[A-Z]/.test(lowerCode), 'Lowercase option should not contain uppercase letters');

const upperCode = BasicGenerator.generate(sprite, { codeCase: 'upper' });
assert.ok(upperCode.startsWith('100 REM'), 'Uppercase option must produce uppercase commands');
assert.ok(upperCode.includes('DATA'), 'DATA keyword must be uppercase');
assert.ok(!/[a-z]/.test(upperCode), 'Uppercase option should not contain lowercase letters');

// Verify parser works identically on lowercase code
const lowerParsed = BasicGenerator.parse(lowerCode);
assert.strictEqual(lowerParsed.bytes.length, 63);
assert.strictEqual(lowerParsed.mode, 'lores');
console.log('✓ Uppercase and Lowercase generator & roundtrip parsing tests passed');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
