/**
 * Commodore 64 16-Color Palette Definitions and Helpers
 * Colors based on the industry-standard Colodore palette with Pepto alternate.
 */

const C64_PALETTE = [
  { id: 0,  name: 'Black',        colodore: '#000000', pepto: '#000000', light: false },
  { id: 1,  name: 'White',        colodore: '#FFFFFF', pepto: '#FFFFFF', light: true  },
  { id: 2,  name: 'Red',          colodore: '#813338', pepto: '#880000', light: false },
  { id: 3,  name: 'Cyan',         colodore: '#75CEC8', pepto: '#AAFFEE', light: true  },
  { id: 4,  name: 'Purple',       colodore: '#8E3C97', pepto: '#CC44CC', light: false },
  { id: 5,  name: 'Green',        colodore: '#56AC4D', pepto: '#00CC55', light: false },
  { id: 6,  name: 'Blue',         colodore: '#2E2C9B', pepto: '#0000AA', light: false },
  { id: 7,  name: 'Yellow',       colodore: '#EDF171', pepto: '#EEEE77', light: true  },
  { id: 8,  name: 'Orange',       colodore: '#8E5029', pepto: '#DD8855', light: false },
  { id: 9,  name: 'Brown',        colodore: '#553800', pepto: '#664400', light: false },
  { id: 10, name: 'Light Red',    colodore: '#C46C71', pepto: '#FF7777', light: true  },
  { id: 11, name: 'Dark Grey',    colodore: '#4A4A4A', pepto: '#333333', light: false },
  { id: 12, name: 'Grey',         colodore: '#7B7B7B', pepto: '#777777', light: false },
  { id: 13, name: 'Light Green',  colodore: '#A9FF9F', pepto: '#AAFF66', light: true  },
  { id: 14, name: 'Light Blue',   colodore: '#706DEB', pepto: '#0088FF', light: true  },
  { id: 15, name: 'Light Grey',   colodore: '#B2B2B2', pepto: '#BBBBBB', light: true  }
];

let currentPaletteType = 'colodore';

function setPaletteType(type) {
  if (type === 'colodore' || type === 'pepto') {
    currentPaletteType = type;
  }
}

function getPaletteType() {
  return currentPaletteType;
}

function getColorHex(colorId, paletteType = currentPaletteType) {
  const c = C64_PALETTE[colorId % 16];
  return c ? c[paletteType] : '#000000';
}

function getColorName(colorId) {
  const c = C64_PALETTE[colorId % 16];
  return c ? c.name : 'Unknown';
}

function isColorLight(colorId) {
  const c = C64_PALETTE[colorId % 16];
  return c ? c.light : false;
}

// Export for Node/ESM/Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    C64_PALETTE,
    setPaletteType,
    getPaletteType,
    getColorHex,
    getColorName,
    isColorLight
  };
}

