/**
 * Layout definitions and position calculations.
 * Pure functions only — all Chrome API interaction happens in the service worker.
 */

export const LAYOUT_TYPES = ['1x2', '2x1', '2x2', '3x2'];

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
