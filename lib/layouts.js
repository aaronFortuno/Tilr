/**
 * Layout definitions and position calculations.
 * Pure functions only — all Chrome API interaction happens in the service worker.
 */

export const LAYOUT_TYPES = ['1x2', '2x1', '2x2', '3x2'];

/**
 * DWM invisible shadow/border size in pixels (Windows 10/11 at any DPI).
 * Chrome's `chrome.windows` API includes these invisible borders in all
 * position/size values. Left, right and bottom have 7px; top has 0px.
 */
export const SHADOW_INSET = 7;

/**
 * Expands each window's bounds to compensate for invisible DWM shadows.
 * Each window is extended by `inset` pixels on left, right and bottom so
 * that the visible portions are flush against each other and screen edges.
 * @param {Array<{ left: number, top: number, width: number, height: number }>} positions
 * @param {number} inset - Shadow size in pixels (0 = no compensation)
 * @returns {Array<{ left: number, top: number, width: number, height: number }>}
 */
export function compensatePositions(positions, inset) {
  if (!inset) return positions;
  return positions.map(pos => ({
    left: pos.left - inset,
    top: pos.top,
    width: pos.width + inset * 2,
    height: pos.height + inset,
  }));
}

/**
 * Reverses shadow compensation on bounds reported by Chrome.
 * Used to convert Chrome-reported (compensated) bounds back to logical space
 * before recalculating layouts during dynamic resize.
 * @param {{ left: number, top: number, width: number, height: number }} bounds
 * @param {number} inset - Shadow size in pixels (0 = no adjustment)
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function decompensateBounds(bounds, inset) {
  if (!inset) return bounds;
  return {
    left: bounds.left + inset,
    top: bounds.top,
    width: bounds.width - inset * 2,
    height: bounds.height - inset,
  };
}

/**
 * Returns the number of windows required for a given layout.
 * @param {string} layoutType - One of '1x2', '2x1', '2x2'
 * @returns {number|null}
 */
export function getWindowCount(layoutType) {
  const counts = { '1x2': 2, '2x1': 2, '2x2': 4, '3x2': 6 };
  return counts[layoutType] ?? null;
}

/**
 * Validates whether a layout type is supported.
 * @param {string} layoutType
 * @returns {boolean}
 */
export function isValidLayout(layoutType) {
  return LAYOUT_TYPES.includes(layoutType);
}

/**
 * Extracts the work area bounds from a chrome.system.display.DisplayInfo object.
 * The workArea excludes OS elements like taskbar/dock.
 * @param {object} displayInfo
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function getDisplayBounds(displayInfo) {
  const wa = displayInfo.workArea;
  return { left: wa.left, top: wa.top, width: wa.width, height: wa.height };
}

/**
 * Finds the display that contains the given window based on its position.
 * Falls back to the first (primary) display if no match is found.
 * @param {Array<object>} displays
 * @param {{ left: number, top: number }} windowPosition
 * @returns {object}
 */
export function findDisplayForWindow(displays, windowPosition) {
  const match = displays.find((d) => {
    const b = d.bounds;
    return (
      windowPosition.left >= b.left &&
      windowPosition.left < b.left + b.width &&
      windowPosition.top >= b.top &&
      windowPosition.top < b.top + b.height
    );
  });
  return match || displays[0];
}

/**
 * Calculates window positions for a given layout and display bounds.
 * @param {{ left: number, top: number, width: number, height: number }} bounds
 * @param {string} layoutType
 * @returns {Array<{ left: number, top: number, width: number, height: number }>|null}
 */
export function getPositions(bounds, layoutType) {
  if (!isValidLayout(layoutType)) return null;

  const { left, top, width, height } = bounds;
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  const thirdW = Math.floor(width / 3);

  switch (layoutType) {
    case '1x2':
      return [
        { left, top, width: halfW, height },
        { left: left + halfW, top, width: width - halfW, height }
      ];
    case '2x1':
      return [
        { left, top, width, height: halfH },
        { left, top: top + halfH, width, height: height - halfH }
      ];
    case '2x2':
      return [
        { left, top, width: halfW, height: halfH },
        { left: left + halfW, top, width: width - halfW, height: halfH },
        { left, top: top + halfH, width: halfW, height: height - halfH },
        { left: left + halfW, top: top + halfH, width: width - halfW, height: height - halfH }
      ];
    case '3x2': {
      const col2Left = left + thirdW;
      const col3Left = left + thirdW * 2;
      const col1W = thirdW;
      const col2W = thirdW;
      const col3W = width - thirdW * 2;
      return [
        { left, top, width: col1W, height: halfH },
        { left: col2Left, top, width: col2W, height: halfH },
        { left: col3Left, top, width: col3W, height: halfH },
        { left, top: top + halfH, width: col1W, height: height - halfH },
        { left: col2Left, top: top + halfH, width: col2W, height: height - halfH },
        { left: col3Left, top: top + halfH, width: col3W, height: height - halfH }
      ];
    }
    default:
      return null;
  }
}

// --- Dynamic resize support ---

/**
 * Returns grid dimensions (columns, rows) for a layout type.
 * @param {string} layoutType
 * @returns {{ cols: number, rows: number }|null}
 */
export function getGridDimensions(layoutType) {
  const dims = { '1x2': { cols: 2, rows: 1 }, '2x1': { cols: 1, rows: 2 }, '2x2': { cols: 2, rows: 2 }, '3x2': { cols: 3, rows: 2 } };
  return dims[layoutType] ?? null;
}

/**
 * Returns the grid position (row, col) for a window by its index in the layout.
 * Windows are ordered row-major: top-left first, then left-to-right, top-to-bottom.
 * @param {number} windowIndex
 * @param {number} cols
 * @returns {{ row: number, col: number }}
 */
export function getWindowGridPosition(windowIndex, cols) {
  return { row: Math.floor(windowIndex / cols), col: windowIndex % cols };
}

/**
 * Extracts split positions from a changed window's bounds.
 * Splits are the dividing lines between columns (splitX) and rows (splitY).
 * @param {number} windowIndex - Index of the changed window in the layout
 * @param {{ left: number, top: number, width: number, height: number }} windowBounds
 * @param {{ left: number, top: number, width: number, height: number }} displayBounds
 * @param {string} layoutType
 * @returns {{ splitX: number[], splitY: number[] }|null}
 */
export function extractSplits(windowIndex, windowBounds, displayBounds, layoutType) {
  const grid = getGridDimensions(layoutType);
  if (!grid) return null;

  const { cols, rows } = grid;
  const { row, col } = getWindowGridPosition(windowIndex, cols);

  // Initialize splits at current even positions
  const splitX = [];
  const splitY = [];
  for (let c = 0; c < cols - 1; c++) {
    splitX.push(displayBounds.left + Math.floor(displayBounds.width * (c + 1) / cols));
  }
  for (let r = 0; r < rows - 1; r++) {
    splitY.push(displayBounds.top + Math.floor(displayBounds.height * (r + 1) / rows));
  }

  // Update splits based on the changed window's bounds
  // Left edge defines split to the left of this column
  if (col > 0) {
    splitX[col - 1] = windowBounds.left;
  }
  // Right edge defines split to the right of this column
  if (col < cols - 1) {
    splitX[col] = windowBounds.left + windowBounds.width;
  }
  // Top edge defines split above this row
  if (row > 0) {
    splitY[row - 1] = windowBounds.top;
  }
  // Bottom edge defines split below this row
  if (row < rows - 1) {
    splitY[row] = windowBounds.top + windowBounds.height;
  }

  return { splitX, splitY };
}

/**
 * Computes all window positions from split positions and display bounds.
 * @param {{ splitX: number[], splitY: number[] }} splits
 * @param {{ left: number, top: number, width: number, height: number }} displayBounds
 * @param {string} layoutType
 * @returns {Array<{ left: number, top: number, width: number, height: number }>|null}
 */
export function positionsFromSplits(splits, displayBounds, layoutType) {
  const grid = getGridDimensions(layoutType);
  if (!grid) return null;

  const { cols, rows } = grid;
  const { left: dL, top: dT, width: dW, height: dH } = displayBounds;
  const dR = dL + dW;
  const dB = dT + dH;

  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const winLeft = c === 0 ? dL : splits.splitX[c - 1];
      const winRight = c === cols - 1 ? dR : splits.splitX[c];
      const winTop = r === 0 ? dT : splits.splitY[r - 1];
      const winBottom = r === rows - 1 ? dB : splits.splitY[r];
      positions.push({
        left: winLeft,
        top: winTop,
        width: winRight - winLeft,
        height: winBottom - winTop,
      });
    }
  }

  return positions;
}

/**
 * Given a changed window, recalculates all window positions in the layout.
 * @param {number} changedIndex - Index of the window that changed
 * @param {{ left: number, top: number, width: number, height: number }} changedBounds
 * @param {{ left: number, top: number, width: number, height: number }} displayBounds
 * @param {string} layoutType
 * @returns {Array<{ left: number, top: number, width: number, height: number }>|null}
 */
export function recalculateLayout(changedIndex, changedBounds, displayBounds, layoutType) {
  const splits = extractSplits(changedIndex, changedBounds, displayBounds, layoutType);
  if (!splits) return null;
  return positionsFromSplits(splits, displayBounds, layoutType);
}

/**
 * High-level: given displays, window position, and layout type,
 * returns computed window positions.
 * @param {Array<object>} displays
 * @param {{ left: number, top: number }} windowPosition
 * @param {string} layoutType
 * @returns {Array<{ left: number, top: number, width: number, height: number }>|null}
 */
export function computeLayout(displays, windowPosition, layoutType) {
  if (!isValidLayout(layoutType) || !displays || displays.length === 0) return null;
  const display = findDisplayForWindow(displays, windowPosition);
  const bounds = getDisplayBounds(display);
  return getPositions(bounds, layoutType);
}
