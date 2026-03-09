/**
 * Tilr Service Worker
 * Manages window creation, positioning, group tracking, and restore.
 */

import { computeLayout, isValidLayout } from '../lib/layouts.js';

// --- Session management ---

/**
 * Saves the active layout session to storage.
 * @param {string} layoutType
 * @param {number[]} windowIds
 */
export async function saveSession(layoutType, windowIds) {
  await chrome.storage.local.set({
    tabbySession: { layoutType, windowIds },
  });
}

/**
 * Loads the active layout session from storage.
 * @returns {Promise<{ layoutType: string, windowIds: number[] }|null>}
 */
export async function loadSession() {
  const data = await chrome.storage.local.get('tabbySession');
  return data.tabbySession || null;
}

/**
 * Clears the active layout session from storage.
 */
export async function clearSession() {
  await chrome.storage.local.remove('tabbySession');
}

// --- Layout operations ---

/**
 * Gets display info for the specified window and computes layout positions.
 * @param {string} layoutType
 * @param {number} windowId - The window ID from the popup (the actual user window)
 * @returns {Promise<{ positions: Array, sourceWindow: object }|null>}
 */
export async function resolveLayout(layoutType, windowId) {
  if (!isValidLayout(layoutType)) return null;

  const [displays, sourceWindow] = await Promise.all([
    chrome.system.display.getInfo(),
    chrome.windows.get(windowId),
  ]);

  const windowPosition = { left: sourceWindow.left, top: sourceWindow.top };
  const positions = computeLayout(displays, windowPosition, layoutType);

  if (!positions) return null;
  return { positions, sourceWindow };
}

/**
 * Distributes tabs from the source window across layout windows.
 * The first tab stays in the source window; remaining tabs are moved
 * one per window in order. Extra tabs stay in the source window.
 * After moving, removes the initial blank tabs created by chrome.windows.create()
 * and activates the moved tab in each window.
 * @param {number} sourceWindowId
 * @param {number[]} windowIds - All window IDs in the layout (including source)
 * @param {number[]} initialTabIds - Tab IDs of blank tabs created with each new window
 */
export async function distributeTabs(sourceWindowId, windowIds, initialTabIds) {
  const tabs = await chrome.tabs.query({ windowId: sourceWindowId });
  if (tabs.length <= 1) return;

  // Skip the first tab (stays in source window), distribute the rest
  let windowIndex = 1;
  for (let i = 1; i < tabs.length && windowIndex < windowIds.length; i++, windowIndex++) {
    await chrome.tabs.move(tabs[i].id, { windowId: windowIds[windowIndex], index: -1 });
    await chrome.tabs.update(tabs[i].id, { active: true });
  }

  // Remove initial blank tabs from windows that received a real tab
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
 * Optionally distributes existing tabs across the layout windows.
 * @param {string} layoutType
 * @param {number} windowId - The window ID sent from the popup
 * @param {boolean} useCurrentTabs - Whether to distribute existing tabs
 * @returns {Promise<{ success: boolean, windowIds?: number[], error?: string }>}
 */
export async function applyLayout(layoutType, windowId, useCurrentTabs = false) {
  // If there's an existing session, restore first
  const existing = await loadSession();
  if (existing) {
    await restoreLayout();
  }

  const resolved = await resolveLayout(layoutType, windowId);
  if (!resolved) {
    return { success: false, error: `Invalid layout: ${layoutType}` };
  }

  const { positions, sourceWindow } = resolved;
  const windowIds = [];
  const initialTabIds = [];

  // Reposition source window to the first slot
  await chrome.windows.update(sourceWindow.id, {
    left: positions[0].left,
    top: positions[0].top,
    width: positions[0].width,
    height: positions[0].height,
    state: 'normal',
  });
  windowIds.push(sourceWindow.id);

  // Create new windows for remaining slots
  for (let i = 1; i < positions.length; i++) {
    const newWindow = await chrome.windows.create({
      left: positions[i].left,
      top: positions[i].top,
      width: positions[i].width,
      height: positions[i].height,
      focused: false,
    });
    windowIds.push(newWindow.id);
    // Track the blank tab created with each new window
    if (newWindow.tabs && newWindow.tabs.length > 0) {
      initialTabIds.push(newWindow.tabs[0].id);
    }
  }

  // Distribute tabs if requested
  if (useCurrentTabs) {
    await distributeTabs(sourceWindow.id, windowIds, initialTabIds);
  }

  await saveSession(layoutType, windowIds);
  await saveLastLayout(layoutType);
  return { success: true, windowIds };
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
 * Restores layout: moves real tabs back to the first window, closes empty tabs and extras.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function restoreLayout() {
  const session = await loadSession();
  if (!session) {
    return { success: false, error: 'No active layout' };
  }

  const { windowIds } = session;
  const primaryId = windowIds[0];

  // Move tabs from secondary windows to the primary window
  for (let i = 1; i < windowIds.length; i++) {
    try {
      const tabs = await chrome.tabs.query({ windowId: windowIds[i] });
      for (const tab of tabs) {
        if (isEmptyTab(tab)) {
          // Close empty/newtab tabs instead of moving them
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

  await clearSession();
  return { success: true };
}

/**
 * Saves the last used layout type to storage.
 * @param {string} layoutType
 */
export async function saveLastLayout(layoutType) {
  await chrome.storage.local.set({ tabbyLastLayout: layoutType });
}

/**
 * Loads the last used layout type from storage.
 * @returns {Promise<string|null>}
 */
export async function loadLastLayout() {
  const data = await chrome.storage.local.get('tabbyLastLayout');
  return data.tabbyLastLayout || null;
}

/**
 * Returns the current session status and last used layout.
 * @returns {Promise<{ active: boolean, layoutType?: string, windowIds?: number[], lastLayout?: string }>}
 */
export async function getStatus() {
  const [session, lastLayout] = await Promise.all([loadSession(), loadLastLayout()]);
  if (!session) return { active: false, lastLayout };
  return { active: true, layoutType: session.layoutType, windowIds: session.windowIds, lastLayout };
}

/**
 * Removes a closed window from the active session.
 * Clears session if all secondary windows are gone.
 * @param {number} closedWindowId
 */
export async function handleWindowClosed(closedWindowId) {
  const session = await loadSession();
  if (!session) return;

  const idx = session.windowIds.indexOf(closedWindowId);
  if (idx === -1) return;

  session.windowIds.splice(idx, 1);

  // If only one window left (or none), clear the session
  if (session.windowIds.length <= 1) {
    await clearSession();
  } else {
    await saveSession(session.layoutType, session.windowIds);
  }
}

// --- Event listeners ---

chrome.windows.onRemoved.addListener((windowId) => {
  handleWindowClosed(windowId);
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
      restoreLayout()
        .then(sendResponse)
        .catch((err) => sendResponse({ success: false, error: err.message }));
      break;

    case 'getStatus':
      getStatus()
        .then(sendResponse)
        .catch(() => sendResponse({ active: false }));
      break;

    default:
      sendResponse({ success: false, error: `Unknown action: ${action}` });
      break;
  }

  return true;
});
