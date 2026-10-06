/**
 * Commodore 64 Sprite Studio - Main Application Controller
 * Handles editor canvas rendering, tool interactions, undo/redo history,
 * live preview updates, BASIC listing generation, and Save/Load operations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Core State ---
  const sprite = new C64Sprite();
  let activeTool = 'pencil'; // 'pencil', 'eraser', 'bucket', 'picker'
  let activeSlot = 1;        // Active color slot: 0, 1 (hires) or 0, 1, 2, 3 (lores)
  let activePaletteSlot = 'sprite'; // 'bg', 'sprite', 'mc1', 'mc2'
  let isDrawing = false;
  let drawButton = 0;        // 0 for left click, 2 for right click
  let showGrid = true;
  let showByteGuides = true;
  let previewBgMode = 'c64'; // 'c64', 'transparent', 'black'
  let dataFormat = 'rows';   // 'rows' (3 bytes/line) or 'compact' (8 bytes/line)
  let spriteNumber = 0;      // 0 to 7

  // Undo / Redo stacks
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 40;

  // --- DOM Elements ---
  const editorCanvas = document.getElementById('editorCanvas');
  const editorCtx = editorCanvas.getContext('2d');
  const thumbActualCanvas = document.getElementById('thumbActual');
  const thumbActualCtx = thumbActualCanvas.getContext('2d');
  const thumb2xCanvas = document.getElementById('thumb2x');
  const thumb2xCtx = thumb2xCanvas.getContext('2d');
  const thumb4xCanvas = document.getElementById('thumb4x');
  const thumb4xCtx = thumb4xCanvas.getContext('2d');

  const basicOutput = document.getElementById('basicOutput');
  const coordsDisplay = document.getElementById('coordsDisplay');
  const spriteStats = document.getElementById('spriteStats');
  const presetSelect = document.getElementById('presetSelect');
  const btnHires = document.getElementById('btnHires');
  const btnLores = document.getElementById('btnLores');
  const fileInput = document.getElementById('fileInput');
  const toast = document.getElementById('toast');

  // Checkbox inputs
  const chkExpandX = document.getElementById('chkExpandX');
  const chkExpandY = document.getElementById('chkExpandY');
  const chkShowGrid = document.getElementById('chkShowGrid');
  const chkShowGuides = document.getElementById('chkShowGuides');
  const selPreviewBg = document.getElementById('selPreviewBg');
  const selDataFormat = document.getElementById('selDataFormat');
  const selSpriteNum = document.getElementById('selSpriteNum');

  // Tool buttons
  const toolBtns = document.querySelectorAll('.tool-btn');
  const slotCards = document.querySelectorAll('.slot-card');

  // --- Initialize Palette Display ---
  function initPaletteGrid() {
    const paletteGrid = document.getElementById('paletteGrid');
    paletteGrid.innerHTML = '';

    C64_PALETTE.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = `c64-color-swatch ${c.light ? 'dark-text' : 'light-text'}`;
      swatch.style.backgroundColor = c.colodore;
      swatch.title = `${c.id}: ${c.name} (${c.colodore})`;
      swatch.dataset.colorId = c.id;

      const numSpan = document.createElement('span');
      numSpan.className = 'num';
      numSpan.textContent = c.id;
      swatch.appendChild(numSpan);

      swatch.addEventListener('click', () => {
        assignColorToSlot(c.id);
      });

      paletteGrid.appendChild(swatch);
    });
  }

  // Assign chosen 16 C64 color to currently active color slot
  function assignColorToSlot(colorId) {
    saveHistoryState();
    if (sprite.mode === 'hires') {
      if (activeSlot === 0 || activePaletteSlot === 'bg') {
        sprite.colors.bg = colorId;
      } else {
        sprite.colors.sprite = colorId;
      }
    } else {
      switch (activeSlot) {
        case 0: sprite.colors.bg = colorId; break;
        case 1: sprite.colors.mc1 = colorId; break;
        case 2: sprite.colors.sprite = colorId; break;
        case 3: sprite.colors.mc2 = colorId; break;
      }
    }
    updateUI();
  }

  // --- History Management ---
  function saveHistoryState() {
    if (undoStack.length >= MAX_HISTORY) {
      undoStack.shift();
    }
    undoStack.push(sprite.clone());
    redoStack.length = 0; // Clear redo on new action
    updateHistoryButtons();
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(sprite.clone());
    const previous = undoStack.pop();
    copySpriteState(previous, sprite);
    updateUI();
    showToast('Undo');
    updateHistoryButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(sprite.clone());
    const next = redoStack.pop();
    copySpriteState(next, sprite);
    updateUI();
    showToast('Redo');
    updateHistoryButtons();
  }

  function copySpriteState(src, dest) {
    dest.bytes.set(src.bytes);
    dest.mode = src.mode;
    dest.colors = { ...src.colors };
    dest.expandX = src.expandX;
    dest.expandY = src.expandY;
    dest.name = src.name;
  }

  function updateHistoryButtons() {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    if (btnUndo) btnUndo.disabled = undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
  }

  // --- Canvas Dimensions & Coordinate Calculation ---
  function getCanvasMetrics() {
    const isHires = sprite.mode === 'hires';
    const cols = isHires ? 24 : 12;
    const rows = 21;

    // We want the editor canvas to maintain the correct aspect ratio:
    // In Hires: 24 cols x 21 rows -> each cell is square (e.g. 18x18 px -> 432 x 378 px)
    // In Lores: 12 cols x 21 rows -> each cell is 2:1 double-width (e.g. 36x18 px -> 432 x 378 px)
    // That means the total canvas pixel size is identically 432x378 in both modes!
    const cellH = 20;
    const cellW = isHires ? 20 : 40;
    const totalW = cols * cellW;
    const totalH = rows * cellH;

    return { cols, rows, cellW, cellH, totalW, totalH, isHires };
  }

  // --- Render Editor Grid ---
  function renderEditorCanvas() {
    const { cols, rows, cellW, cellH, totalW, totalH, isHires } = getCanvasMetrics();

    if (editorCanvas.width !== totalW || editorCanvas.height !== totalH) {
      editorCanvas.width = totalW;
      editorCanvas.height = totalH;
    }

    editorCtx.imageSmoothingEnabled = false;

    // Draw pixels
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const slot = sprite.getPixel(x, y);
        const colorId = sprite.getColorIdForSlot(slot);
        const hex = getColorHex(colorId);

        editorCtx.fillStyle = hex;
        editorCtx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    // Draw grid lines
    if (showGrid) {
      editorCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      editorCtx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= cols; x++) {
        editorCtx.beginPath();
        editorCtx.moveTo(x * cellW + 0.5, 0);
        editorCtx.lineTo(x * cellW + 0.5, totalH);
        editorCtx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= rows; y++) {
        editorCtx.beginPath();
        editorCtx.moveTo(0, y * cellH + 0.5);
        editorCtx.lineTo(totalW, y * cellH + 0.5);
        editorCtx.stroke();
      }
    }

    // Draw Byte Boundary Guides (every 8 hires bits = 1 byte)
    if (showByteGuides) {
      editorCtx.strokeStyle = 'rgba(112, 109, 235, 0.7)';
      editorCtx.lineWidth = 2;

      if (isHires) {
        // Col 8 and Col 16 boundary lines
        [8, 16].forEach(c => {
          editorCtx.beginPath();
          editorCtx.moveTo(c * cellW, 0);
          editorCtx.lineTo(c * cellW, totalH);
          editorCtx.stroke();
        });
      } else {
        // Col 4 and Col 8 boundary lines in multicolor
        [4, 8].forEach(c => {
          editorCtx.beginPath();
          editorCtx.moveTo(c * cellW, 0);
          editorCtx.lineTo(c * cellW, totalH);
          editorCtx.stroke();
        });
      }
    }
  }

  // --- Render Sprite Thumbnail Previews ---
  function renderPreviews() {
    // Determine canvas dimensions based on X/Y Expand
    const expandX = sprite.expandX;
    const expandY = sprite.expandY;

    const baseW = 24 * (expandX ? 2 : 1);
    const baseH = 21 * (expandY ? 2 : 1);

    // Update actual size canvas dimensions (must match standard or expanded C64 sprite dimensions)
    thumbActualCanvas.width = baseW;
    thumbActualCanvas.height = baseH;

    thumb2xCanvas.width = baseW * 2;
    thumb2xCanvas.height = baseH * 2;

    thumb4xCanvas.width = baseW * 4;
    thumb4xCanvas.height = baseH * 4;

    // Draw offscreen 24x21 base image first
    const offscreen = document.createElement('canvas');
    offscreen.width = 24;
    offscreen.height = 21;
    const offCtx = offscreen.getContext('2d');
    offCtx.imageSmoothingEnabled = false;

    const isHires = sprite.mode === 'hires';
    const cols = sprite.getWidth();

    // Fill background if not transparent
    if (previewBgMode === 'c64') {
      offCtx.fillStyle = getColorHex(sprite.colors.bg);
      offCtx.fillRect(0, 0, 24, 21);
    } else if (previewBgMode === 'black') {
      offCtx.fillStyle = '#000000';
      offCtx.fillRect(0, 0, 24, 21);
    } else {
      offCtx.clearRect(0, 0, 24, 21);
    }

    // Render sprite dots
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < cols; x++) {
        const slot = sprite.getPixel(x, y);
        if (slot === 0 && previewBgMode === 'transparent') {
          // Transparent: skip drawing to leave transparent background
          continue;
        }
        const colorId = sprite.getColorIdForSlot(slot);
        offCtx.fillStyle = getColorHex(colorId);

        if (isHires) {
          offCtx.fillRect(x, y, 1, 1);
        } else {
          // In Lores mode, each multicolor pixel is 2 C64 screen pixels wide
          offCtx.fillRect(x * 2, y, 2, 1);
        }
      }
    }

    // Helper to draw to target preview canvas with hardware expansion
    function drawToTarget(ctx, targetW, targetH) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(offscreen, 0, 0, targetW, targetH);
    }

    drawToTarget(thumbActualCtx, baseW, baseH);
    drawToTarget(thumb2xCtx, baseW * 2, baseH * 2);
    drawToTarget(thumb4xCtx, baseW * 4, baseH * 4);
  }

  // --- Render C64 BASIC V2 Output ---
  function updateBasicCode() {
    const code = BasicGenerator.generate(sprite, {
      spriteNumber: spriteNumber,
      dataFormat: dataFormat
    });
    basicOutput.value = code;
  }

  // --- Update Color Slots UI ---
  function updateColorSlotsUI() {
    const isHires = sprite.mode === 'hires';

    // Show/hide multicolor slots in Hires mode
    const slotMC1 = document.getElementById('slotMC1');
    const slotMC2 = document.getElementById('slotMC2');
    const slotSprite = document.getElementById('slotSprite');
    const badgeBg = document.getElementById('badgeBg');
    const badgeSprite = document.getElementById('badgeSprite');
    const titleSprite = document.getElementById('titleSprite');

    if (slotMC1) slotMC1.style.display = isHires ? 'none' : 'flex';
    if (slotMC2) slotMC2.style.display = isHires ? 'none' : 'flex';

    if (isHires) {
      if (badgeBg) badgeBg.textContent = '%0';
      if (badgeSprite) badgeSprite.textContent = '%1';
      if (titleSprite) titleSprite.textContent = '1: Sprite Main Color';
      if (slotSprite) slotSprite.dataset.slot = '1';
      if (activeSlot > 1) activeSlot = 1;
    } else {
      if (badgeBg) badgeBg.textContent = '%00';
      if (badgeSprite) badgeSprite.textContent = '%10';
      if (titleSprite) titleSprite.textContent = '2: Sprite Color ($D028)';
      if (slotSprite) slotSprite.dataset.slot = '2';
    }

    // Update active highlight on slot cards
    slotCards.forEach(card => {
      const slotIndex = parseInt(card.dataset.slot, 10);
      card.classList.toggle('active', slotIndex === activeSlot);
    });

    // Update swatches and labels
    const bgSwatch = document.getElementById('swatchBg');
    const spriteSwatch = document.getElementById('swatchSprite');
    const mc1Swatch = document.getElementById('swatchMC1');
    const mc2Swatch = document.getElementById('swatchMC2');

    const lblBg = document.getElementById('lblBg');
    const lblSprite = document.getElementById('lblSprite');
    const lblMC1 = document.getElementById('lblMC1');
    const lblMC2 = document.getElementById('lblMC2');

    if (bgSwatch) bgSwatch.style.backgroundColor = getColorHex(sprite.colors.bg);
    if (spriteSwatch) spriteSwatch.style.backgroundColor = getColorHex(sprite.colors.sprite);
    if (mc1Swatch) mc1Swatch.style.backgroundColor = getColorHex(sprite.colors.mc1);
    if (mc2Swatch) mc2Swatch.style.backgroundColor = getColorHex(sprite.colors.mc2);

    if (lblBg) lblBg.textContent = `${sprite.colors.bg}: ${getColorName(sprite.colors.bg)}`;
    if (lblSprite) lblSprite.textContent = `${sprite.colors.sprite}: ${getColorName(sprite.colors.sprite)}`;
    if (lblMC1) lblMC1.textContent = `${sprite.colors.mc1}: ${getColorName(sprite.colors.mc1)}`;
    if (lblMC2) lblMC2.textContent = `${sprite.colors.mc2}: ${getColorName(sprite.colors.mc2)}`;

    // Highlight active color in 16-color palette
    const activeColorId = sprite.getColorIdForSlot(activeSlot);
    document.querySelectorAll('.c64-color-swatch').forEach(sw => {
      sw.classList.toggle('active-in-slot', parseInt(sw.dataset.colorId, 10) === activeColorId);
    });

    // Update mode buttons
    btnHires.classList.toggle('active', isHires);
    btnLores.classList.toggle('active', !isHires);

    // Update expansion checkboxes
    chkExpandX.checked = sprite.expandX;
    chkExpandY.checked = sprite.expandY;

    // Update stats bar
    if (spriteStats) {
      spriteStats.textContent = `Mode: ${isHires ? 'Hires (2-Color, 24x21)' : 'Lores Multicolor (4-Color, 12x21)'} | 63 Bytes`;
    }
  }

  // Master UI refresh
  function updateUI() {
    updateColorSlotsUI();
    renderEditorCanvas();
    renderPreviews();
    updateBasicCode();
  }

  // --- Canvas Mouse & Touch Interaction ---
  function getCanvasCoords(event) {
    const rect = editorCanvas.getBoundingClientRect();
    const { cols, rows, cellW, cellH } = getCanvasMetrics();

    // Scale in case canvas is scaled via CSS
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;

    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const x = Math.floor(canvasX / cellW);
    const y = Math.floor(canvasY / cellH);

    return {
      x: Math.max(0, Math.min(cols - 1, x)),
      y: Math.max(0, Math.min(rows - 1, y))
    };
  }

  function applyTool(x, y, button = 0) {
    const isRightClick = button === 2;
    const targetSlot = isRightClick ? 0 : activeSlot;

    if (activeTool === 'pencil') {
      sprite.setPixel(x, y, targetSlot);
    } else if (activeTool === 'eraser') {
      sprite.setPixel(x, y, 0);
    } else if (activeTool === 'bucket') {
      sprite.floodFill(x, y, targetSlot);
    } else if (activeTool === 'picker') {
      const pickedSlot = sprite.getPixel(x, y);
      activeSlot = pickedSlot;
      updateColorSlotsUI();
      // Switch back to pencil after picking
      setTool('pencil');
    }
    updateUI();
  }

  editorCanvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDrawing = true;
    drawButton = e.button;
    saveHistoryState();
    const { x, y } = getCanvasCoords(e);
    applyTool(x, y, drawButton);
  });

  window.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
    }
  });

  editorCanvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasCoords(e);
    const byteIndex = y * 3 + Math.floor(x / (sprite.mode === 'hires' ? 8 : 4));
    coordsDisplay.textContent = `X: ${x}, Y: ${y} | Row: ${y} | Byte: ${byteIndex}`;

    if (isDrawing && (activeTool === 'pencil' || activeTool === 'eraser')) {
      applyTool(x, y, drawButton);
    }
  });

  editorCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent right-click context menu so right click can erase
  });

  // Touch Support
  editorCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    drawButton = 0;
    saveHistoryState();
    const { x, y } = getCanvasCoords(e);
    applyTool(x, y, 0);
  }, { passive: false });

  editorCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDrawing) {
      const { x, y } = getCanvasCoords(e);
      applyTool(x, y, 0);
    }
  }, { passive: false });

  editorCanvas.addEventListener('touchend', () => {
    isDrawing = false;
  });

  // --- Tool Selection ---
  function setTool(toolName) {
    activeTool = toolName;
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
  }

  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setTool(btn.dataset.tool);
    });
  });

  // Color Slot Cards Selection
  slotCards.forEach(card => {
    card.addEventListener('click', () => {
      activeSlot = parseInt(card.dataset.slot, 10);
      activePaletteSlot = card.dataset.slotName;
      updateColorSlotsUI();
    });
  });

  // Mode Buttons
  btnHires.addEventListener('click', () => {
    if (sprite.mode !== 'hires') {
      saveHistoryState();
      sprite.setMode('hires');
      if (activeSlot > 1) activeSlot = 1;
      updateUI();
      showToast('Switched to Hires Mode (24x21, 2 Colors)');
    }
  });

  btnLores.addEventListener('click', () => {
    if (sprite.mode !== 'lores') {
      saveHistoryState();
      sprite.setMode('lores');
      if (activeSlot === 1) activeSlot = 2; // Sprite foreground color in Lores is slot 2 (%10)
      updateUI();
      showToast('Switched to Lores Multicolor Mode (12x21, 4 Colors)');
    }
  });

  // Preset Selection
  presetSelect.addEventListener('change', (e) => {
    const selectedIdx = parseInt(e.target.value, 10);
    if (selectedIdx === -1) {
      // Clear
      saveHistoryState();
      sprite.clear();
      updateUI();
      showToast('Canvas Cleared');
      return;
    }
    const preset = SPRITE_PRESETS[selectedIdx];
    if (preset) {
      saveHistoryState();
      sprite.loadBytes(preset.bytes);
      sprite.setMode(preset.mode);
      sprite.colors = { ...preset.colors };
      sprite.expandX = preset.expandX;
      sprite.expandY = preset.expandY;
      sprite.name = preset.name;
      updateUI();
      showToast(`Loaded Preset: ${preset.name}`);
    }
  });

  // Transform Actions
  document.getElementById('btnInvert')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.invert();
    updateUI();
    showToast('Inverted Pixels');
  });

  document.getElementById('btnClear')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.clear();
    updateUI();
    showToast('Cleared Sprite');
  });

  document.getElementById('btnFlipH')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.flipHorizontal();
    updateUI();
    showToast('Flipped Horizontally');
  });

  document.getElementById('btnFlipV')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.flipVertical();
    updateUI();
    showToast('Flipped Vertically');
  });

  document.getElementById('btnShiftUp')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.shift(0, -1);
    updateUI();
  });

  document.getElementById('btnShiftDown')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.shift(0, 1);
    updateUI();
  });

  document.getElementById('btnShiftLeft')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.shift(-1, 0);
    updateUI();
  });

  document.getElementById('btnShiftRight')?.addEventListener('click', () => {
    saveHistoryState();
    sprite.shift(1, 0);
    updateUI();
  });

  // Checkbox & Select Listeners
  chkExpandX.addEventListener('change', (e) => {
    saveHistoryState();
    sprite.expandX = e.target.checked;
    updateUI();
  });

  chkExpandY.addEventListener('change', (e) => {
    saveHistoryState();
    sprite.expandY = e.target.checked;
    updateUI();
  });

  chkShowGrid.addEventListener('change', (e) => {
    showGrid = e.target.checked;
    renderEditorCanvas();
  });

  chkShowGuides.addEventListener('change', (e) => {
    showByteGuides = e.target.checked;
    renderEditorCanvas();
  });

  selPreviewBg.addEventListener('change', (e) => {
    previewBgMode = e.target.value;
    renderPreviews();
  });

  selDataFormat.addEventListener('change', (e) => {
    dataFormat = e.target.value;
    updateBasicCode();
  });

  selSpriteNum.addEventListener('change', (e) => {
    spriteNumber = parseInt(e.target.value, 10);
    updateBasicCode();
  });

  // Undo / Redo Buttons
  document.getElementById('btnUndo')?.addEventListener('click', undo);
  document.getElementById('btnRedo')?.addEventListener('click', redo);

  // Copy BASIC Code
  document.getElementById('btnCopyBasic')?.addEventListener('click', () => {
    navigator.clipboard.writeText(basicOutput.value).then(() => {
      showToast('C64 BASIC Code copied to clipboard!');
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
      basicOutput.select();
      document.execCommand('copy');
      showToast('BASIC Code copied!');
    });
  });

  // --- Save / Download Handlers ---
  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Save Project as JSON
  function saveProjectJSON() {
    const jsonStr = JSON.stringify(sprite.toJSON(), null, 2);
    downloadFile(jsonStr, 'c64-sprite.json', 'application/json');
    showToast('Saved Project (c64-sprite.json)');
  }

  // Export .BAS file
  function exportBASFile() {
    const code = basicOutput.value;
    downloadFile(code, 'sprite.bas', 'text/plain');
    showToast('Exported C64 BASIC File (sprite.bas)');
  }

  // Export Binary (.BIN / .SPR) - 63 bytes VIC-II data
  function exportBINFile() {
    const bytes = sprite.getBytes();
    downloadFile(bytes, 'sprite.bin', 'application/octet-stream');
    showToast('Exported Binary 63 Bytes (sprite.bin)');
  }

  // Export PNG image
  function exportPNGFile() {
    const link = document.createElement('a');
    link.download = 'sprite.png';
    link.href = thumb4xCanvas.toDataURL('image/png');
    link.click();
    showToast('Exported PNG Image (sprite.png)');
  }

  // Main Save Button
  document.getElementById('btnSave')?.addEventListener('click', () => {
    document.getElementById('saveModal').classList.add('open');
  });

  document.getElementById('btnModalSaveJSON')?.addEventListener('click', () => {
    saveProjectJSON();
    document.getElementById('saveModal').classList.remove('open');
  });

  document.getElementById('btnModalExportBAS')?.addEventListener('click', () => {
    exportBASFile();
    document.getElementById('saveModal').classList.remove('open');
  });

  document.getElementById('btnModalExportBIN')?.addEventListener('click', () => {
    exportBINFile();
    document.getElementById('saveModal').classList.remove('open');
  });

  document.getElementById('btnModalExportPNG')?.addEventListener('click', () => {
    exportPNGFile();
    document.getElementById('saveModal').classList.remove('open');
  });

  // Download BAS directly from code box header
  document.getElementById('btnDownloadBasic')?.addEventListener('click', exportBASFile);

  // --- Load Handlers ---
  document.getElementById('btnLoad')?.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadFile(file);
    }
  });

  // Unified File Loader (JSON, BAS, BIN/SPR)
  function loadFile(file) {
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          saveHistoryState();
          sprite.fromJSON(json);
          updateUI();
          showToast(`Loaded ${file.name}`);
        } catch (err) {
          alert('Failed to parse JSON sprite file: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.bas') || fileName.endsWith('.txt')) {
      reader.onload = (event) => {
        try {
          const parsed = BasicGenerator.parse(event.target.result);
          saveHistoryState();
          sprite.loadBytes(parsed.bytes);
          if (parsed.mode) sprite.setMode(parsed.mode);
          if (parsed.colors.bg !== null) sprite.colors.bg = parsed.colors.bg;
          if (parsed.colors.sprite !== null) sprite.colors.sprite = parsed.colors.sprite;
          if (parsed.colors.mc1 !== null) sprite.colors.mc1 = parsed.colors.mc1;
          if (parsed.colors.mc2 !== null) sprite.colors.mc2 = parsed.colors.mc2;
          if (parsed.expandX !== null) sprite.expandX = parsed.expandX;
          if (parsed.expandY !== null) sprite.expandY = parsed.expandY;
          updateUI();
          showToast(`Imported ${file.name} successfully!`);
        } catch (err) {
          alert('Failed to parse BASIC program: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      // Treat as binary (.bin, .spr, .prg, etc.)
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target.result;
          const u8 = new Uint8Array(arrayBuffer);
          let offset = 0;
          // If PRG file (2-byte load address at start), skip first 2 bytes
          if (fileName.endsWith('.prg') && u8.length >= 65) {
            offset = 2;
          }
          if (u8.length - offset < 63) {
            throw new Error(`File is too small (${u8.length} bytes). Need at least 63 bytes.`);
          }
          saveHistoryState();
          const spriteData = u8.subarray(offset, offset + 63);
          sprite.loadBytes(spriteData);
          updateUI();
          showToast(`Imported binary ${file.name}`);
        } catch (err) {
          alert('Failed to import binary file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // Drag and Drop Support onto Window
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0]);
    }
  });

  // Modal Close buttons
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
      }
    });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Check if user is typing in textarea
    if (document.activeElement === basicOutput) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if (e.key === '1') {
      activeSlot = 0;
      activePaletteSlot = 'bg';
      updateColorSlotsUI();
    } else if (e.key === '2') {
      activeSlot = 1;
      activePaletteSlot = sprite.mode === 'hires' ? 'sprite' : 'mc1';
      updateColorSlotsUI();
    } else if (e.key === '3' && sprite.mode === 'lores') {
      activeSlot = 2;
      activePaletteSlot = 'sprite';
      updateColorSlotsUI();
    } else if (e.key === '4' && sprite.mode === 'lores') {
      activeSlot = 3;
      activePaletteSlot = 'mc2';
      updateColorSlotsUI();
    } else if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'd') {
      setTool('pencil');
    } else if (e.key.toLowerCase() === 'e') {
      setTool('eraser');
    } else if (e.key.toLowerCase() === 'b') {
      setTool('bucket');
    } else if (e.key.toLowerCase() === 'i') {
      setTool('picker');
    }
  });

  // Toast Helper
  let toastTimeout;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // --- Initial Setup ---
  initPaletteGrid();
  // Load initial preset (User's Guide Balloon) so editor opens with an iconic C64 sprite!
  const initialPreset = SPRITE_PRESETS[0];
  sprite.loadBytes(initialPreset.bytes);
  sprite.setMode(initialPreset.mode);
  sprite.colors = { ...initialPreset.colors };
  presetSelect.value = '0';
  updateUI();
  updateHistoryButtons();
});
