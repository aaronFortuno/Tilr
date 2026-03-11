/**
 * Tilr Service Worker
 * Manages window creation, positioning, group tracking, and restore.
 * Supports independent layouts per display (multi-monitor).
 */

import { computeLayout, isValidLayout, recalculateLayout, getDisplayBounds, findDisplayForWindow, compensatePositions, decompensateBounds, SHADOW_INSET } from '../lib/layouts.js';

/**
 * Returns the shadow inset to use for the current platform.
 * Windows 10/11 has 7px invisible DWM borders; macOS/Linux have none.
 */
export function getShadowInset() {
  try {
    if (navigator.userAgentData?.platform) {
      return navigator.userAgentData.platform === 'Windows' ? SHADOW_INSET : 0;
    }
    return (navigator.platform?.startsWith('Win')) ? SHADOW_INSET : 0;
  } catch (_e) {
    return 0;
  }
}

// --- Session management (multi-monitor) ---

/**
 * Saves a layout session for a specific display.
 * @param {string} displayId
 * @param {string} layoutType
 * @param {number[]} windowIds
 * @param {{ left: number, top: number, width: number, height: number }} [displayBounds]
 */
export async function saveSession(displayId, layoutType, windowIds, displayBounds) {
  const all = await loadAllSessions();
  all[displayId] = { layoutType, windowIds };
  if (displayBounds) all[displayId].displayBounds = displayBounds;
  await chrome.storage.local.set({ tilrSessions: all });
}

/**
 * Loads the layout session for a specific display.
 * @param {string} displayId
 * @returns {Promise<{ layoutType: string, windowIds: number[], displayBounds?: object }|null>}
 */
export async function loadSession(displayId) {
  const all = await loadAllSessions();
  return all[displayId] || null;
}

/**
 * Loads all layout sessions (all displays).
 * @returns {Promise<Object>}
 */
export async function loadAllSessions() {
  const data = await chrome.storage.local.get('tilrSessions');
  return data.tilrSessions || {};
}

/**
 * Clears the layout session for a specific display.
 * @param {string} displayId
 */
export async function clearSession(displayId) {
  const all = await loadAllSessions();
  delete all[displayId];
  await chrome.storage.local.set({ tilrSessions: all });
}

/**
 * Resolves the display ID for a given window.
 * @param {number} windowId
 * @returns {Promise<{ displayId: string, displayBounds: object }|null>}
 */
export async function resolveDisplay(windowId) {
  const [displays, win] = await Promise.all([
    chrome.system.display.getInfo(),
    chrome.windows.get(windowId),
  ]);
  // Decompensate: Chrome-reported position may include our shadow offset
  // (left=-7 instead of 0). Adding inset back ensures correct display matching.
  const inset = getShadowInset();
  const position = { left: win.left + inset, top: win.top };
  const display = findDisplayForWindow(displays, position);
  return { displayId: display.id, displayBounds: getDisplayBounds(display) };
}

// --- Layout operations ---

/**
 * Gets display info for the specified window and computes layout positions.
 * @param {string} layoutType
 * @param {number} windowId
 * @returns {Promise<{ positions: Array, sourceWindow: object, displayId: string, displayBounds: object }|null>}
 */
export async function resolveLayout(layoutType, windowId) {
  if (!isValidLayout(layoutType)) return null;

  const [displays, sourceWindow] = await Promise.all([
    chrome.system.display.getInfo(),
    chrome.windows.get(windowId),
  ]);

  // Decompensate: if a previous layout was applied, the window may be at
  // a compensated position (e.g. left=-7). Adjust for correct display matching.
  const inset = getShadowInset();
  const windowPosition = { left: sourceWindow.left + inset, top: sourceWindow.top };
  const positions = computeLayout(displays, windowPosition, layoutType);

  if (!positions) return null;

  const display = findDisplayForWindow(displays, windowPosition);
  const displayBounds = getDisplayBounds(display);
  return { positions, sourceWindow, displayId: display.id, displayBounds };
}

/**
 * Distributes tabs from the source window across layout windows.
 * @param {number} sourceWindowId
 * @param {number[]} windowIds
 * @param {number[]} initialTabIds
 */
export async function distributeTabs(sourceWindowId, windowIds, initialTabIds) {
  const tabs = await chrome.tabs.query({ windowId: sourceWindowId });
  if (tabs.length <= 1) return;

  let windowIndex = 1;
  for (let i = 1; i < tabs.length && windowIndex < windowIds.length; i++, windowIndex++) {
    await chrome.tabs.move(tabs[i].id, { windowId: windowIds[windowIndex], index: -1 });
    await chrome.tabs.update(tabs[i].id, { active: true });
  }

  for (const tabId of initialTabIds) {
    try {
      await chrome.tabs.remove(tabId);
    } catch (_e) {
      // Tab may already be gone
    }
  }
}

/**
 * Applies a layout: repositions the source window, creates new ones, saves session.
 * Only restores a previous layout on the same display.
 * @param {string} layoutType
 * @param {number} windowId
 * @param {boolean} useCurrentTabs
 * @returns {Promise<{ success: boolean, windowIds?: number[], error?: string }>}
 */
export async function applyLayout(layoutType, windowId, useCurrentTabs = false) {
  const resolved = await resolveLayout(layoutType, windowId);
  if (!resolved) {
    return { success: false, error: `Invalid layout: ${layoutType}` };
  }

  const { positions, sourceWindow, displayId, displayBounds } = resolved;

  // Compensate for invisible DWM shadows on Windows
  const inset = getShadowInset();
  const adjusted = compensatePositions(positions, inset);

  // Suppress dynamic resize during layout application.
  // Window creation, tab moves, and Chrome settling can fire onBoundsChanged
  // events that would recalculate positions before the layout is complete.
  isAdjusting = true;

  try {
    // If there's an existing session on this display, restore it first
    const existing = await loadSession(displayId);
    if (existing) {
      await restoreSessionWindows(existing);
      await clearSession(displayId);
    }

    const windowIds = [];
    const initialTabIds = [];

    // Reposition source window to the first slot
    await chrome.windows.update(sourceWindow.id, {
      left: adjusted[0].left,
      top: adjusted[0].top,
      width: adjusted[0].width,
      height: adjusted[0].height,
      state: 'normal',
    });
    windowIds.push(sourceWindow.id);

    // Create new windows for remaining slots
    for (let i = 1; i < adjusted.length; i++) {
      const newWindow = await chrome.windows.create({
        left: adjusted[i].left,
        top: adjusted[i].top,
        width: adjusted[i].width,
        height: adjusted[i].height,
        focused: false,
      });
      windowIds.push(newWindow.id);
      if (newWindow.tabs && newWindow.tabs.length > 0) {
        initialTabIds.push(newWindow.tabs[0].id);
      }
    }

    if (useCurrentTabs) {
      await distributeTabs(sourceWindow.id, windowIds, initialTabIds);
    }

    await saveSession(displayId, layoutType, windowIds, displayBounds);
    await saveLastLayout(layoutType);
    return { success: true, windowIds };
  } finally {
    // Keep suppression active briefly after layout completes so any
    // pending onBoundsChanged events (debounced at 100ms) are ignored.
    setTimeout(() => { isAdjusting = false; }, DEBOUNCE_MS + 50);
  }
}

/**
 * Checks if a tab is empty (new tab page or about:blank).
 * @param {object} tab
 * @returns {boolean}
 */
export function isEmptyTab(tab) {
  const url = tab.url || tab.pendingUrl || '';
  return url === '' || url === 'chrome://newtab/' || url === 'about:blank';
}

/**
 * Restores windows from a session object (moves tabs, closes windows).
 * Internal helper — does not clear the session from storage.
 * @param {{ windowIds: number[] }} session
 */
async function restoreSessionWindows(session) {
  const { windowIds } = session;
  const primaryId = windowIds[0];

  for (let i = 1; i < windowIds.length; i++) {
    try {
      const tabs = await chrome.tabs.query({ windowId: windowIds[i] });
      for (const tab of tabs) {
        if (isEmptyTab(tab)) {
          try { await chrome.tabs.remove(tab.id); } catch (_e) { /* tab may be gone */ }
        } else {
          await chrome.tabs.move(tab.id, { windowId: primaryId, index: -1 });
        }
      }
      await chrome.windows.remove(windowIds[i]);
    } catch (_e) {
      // Window may have been closed by user already
    }
  }
}

/**
 * Restores layout for the display where the given window resides.
 * @param {number} windowId - The window ID to determine which display to restore
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function restoreLayout(windowId) {
  const { displayId } = await resolveDisplay(windowId);
  const session = await loadSession(displayId);
  if (!session) {
    return { success: false, error: 'No active layout' };
  }

  await restoreSessionWindows(session);
  await clearSession(displayId);
  return { success: true };
}

/**
 * Saves the last used layout type to storage.
 * @param {string} layoutType
 */
export async function saveLastLayout(layoutType) {
  await chrome.storage.local.set({ tilrLastLayout: layoutType });
}

/**
 * Loads the last used layout type from storage.
 * @returns {Promise<string|null>}
 */
export async function loadLastLayout() {
  const data = await chrome.storage.local.get('tilrLastLayout');
  return data.tilrLastLayout || null;
}

/**
 * Returns the current session status for the display where the given window resides.
 * @param {number} windowId
 * @returns {Promise<{ active: boolean, layoutType?: string, windowIds?: number[], lastLayout?: string }>}
 */
export async function getStatus(windowId) {
  const [{ displayId }, lastLayout] = await Promise.all([
    resolveDisplay(windowId),
    loadLastLayout(),
  ]);
  const session = await loadSession(displayId);
  if (!session) return { active: false, lastLayout };
  return { active: true, layoutType: session.layoutType, windowIds: session.windowIds, lastLayout };
}

/**
 * Removes a closed window from any active session.
 * Clears that session if all secondary windows are gone.
 * @param {number} closedWindowId
 */
export async function handleWindowClosed(closedWindowId) {
  const all = await loadAllSessions();

  for (const [displayId, session] of Object.entries(all)) {
    const idx = session.windowIds.indexOf(closedWindowId);
    if (idx === -1) continue;

    session.windowIds.splice(idx, 1);

    if (session.windowIds.length <= 1) {
      await clearSession(displayId);
    } else {
      await saveSession(displayId, session.layoutType, session.windowIds, session.displayBounds);
    }
    return;
  }
}

// --- Dynamic resize ---

let isAdjusting = false;
let boundsChangeTimer = null;

/** @internal — resets the adjusting lock; exposed for testing only. */
export function _resetAdjusting() { isAdjusting = false; }
const DEBOUNCE_MS = 100;

/**
 * Handles a window bounds change by recalculating and adjusting adjacent windows.
 * Searches all sessions to find which layout the window belongs to.
 * @param {object} chromeWindow
 */
export async function handleBoundsChanged(chromeWindow) {
  if (isAdjusting) return;

  const all = await loadAllSessions();
  let foundSession = null;
  let changedIndex = -1;

  for (const session of Object.values(all)) {
    const idx = session.windowIds.indexOf(chromeWindow.id);
    if (idx !== -1) {
      foundSession = session;
      changedIndex = idx;
      break;
    }
  }

  if (!foundSession || !foundSession.displayBounds) return;

  const { layoutType, windowIds, displayBounds } = foundSession;

  // Decompensate Chrome-reported bounds back to logical space
  const inset = getShadowInset();
  const changedBounds = decompensateBounds({
    left: chromeWindow.left,
    top: chromeWindow.top,
    width: chromeWindow.width,
    height: chromeWindow.height,
  }, inset);

  const newPositions = recalculateLayout(changedIndex, changedBounds, displayBounds, layoutType);
  if (!newPositions) return;

  // Compensate output positions for DWM shadows
  const adjusted = compensatePositions(newPositions, inset);

  isAdjusting = true;
  try {
    for (let i = 0; i < windowIds.length; i++) {
      if (i === changedIndex) continue;
      const pos = adjusted[i];
      await chrome.windows.update(windowIds[i], {
        left: pos.left,
        top: pos.top,
        width: pos.width,
        height: pos.height,
      });
    }
  } catch (_e) {
    // Window may have been closed
  } finally {
    isAdjusting = false;
  }
}

// --- Event listeners ---

chrome.windows.onRemoved.addListener((windowId) => {
  handleWindowClosed(windowId);
});

chrome.windows.onBoundsChanged.addListener((chromeWindow) => {
  if (isAdjusting) return;
  clearTimeout(boundsChangeTimer);
  boundsChangeTimer = setTimeout(() => handleBoundsChanged(chromeWindow), DEBOUNCE_MS);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action } = message;

  switch (action) {
    case 'applyLayout':
      applyLayout(message.layoutType, message.windowId, message.useCurrentTabs)
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
      break;

    case 'restoreLayout':
      restoreLayout(message.windowId)
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
      break;

    case 'getStatus':
      getStatus(message.windowId)
        .then(sendResponse)
        .catch(() => sendResponse({ active: false }));
      break;

    default:
      sendResponse({ success: false, error: `Unknown action: ${action}` });
      break;
  }

  return true;
});
