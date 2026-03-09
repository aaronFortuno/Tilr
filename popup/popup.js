/**
 * Tilr Popup Script
 * Handles UI interactions and communicates with the service worker.
 */

/**
 * Applies i18n strings to all elements with data-i18n attribute.
 * @param {Document} document
 * @param {function} getMessage
 */
export function applyI18n(document, getMessage) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = getMessage(key);
    if (text) {
      if (el.tagName === 'INPUT') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });
}

/**
 * Updates the popup UI to reflect the current layout status.
 * @param {Document} document
 * @param {{ active: boolean, layoutType?: string, lastLayout?: string }} status
 * @param {function} getMessage
 */
export function updateStatus(document, status, getMessage) {
  const statusText = document.getElementById('statusText');
  const restoreBtn = document.getElementById('restoreBtn');
  const layoutButtons = document.querySelectorAll('.layout-btn');

  if (status.active) {
    statusText.textContent = getMessage('activeLayout') + ': ' + status.layoutType;
    restoreBtn.disabled = false;
    layoutButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.layout === status.layoutType);
    });
  } else {
    statusText.textContent = getMessage('noActiveLayout');
    restoreBtn.disabled = true;
    layoutButtons.forEach((btn) => {
      btn.classList.toggle('last-used', btn.dataset.layout === status.lastLayout);
      btn.classList.remove('active');
    });
  }
}

/**
 * Initializes popup event listeners and UI state.
 * @param {Document} document
 * @param {function} sendMessage
 * @param {function} getMessage
 * @param {number|null} currentWindowId - The window ID where the popup was opened
 */
export function initPopup(document, sendMessage, getMessage, currentWindowId) {
  applyI18n(document, getMessage);

  // Query current status on open
  sendMessage({ action: 'getStatus' }, (status) => {
    if (status) updateStatus(document, status, getMessage);
  });

  const layoutButtons = document.querySelectorAll('.layout-btn');

  layoutButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const layoutType = btn.dataset.layout;

      const useCurrentTabs = document.getElementById('useCurrentTabs').checked;

      sendMessage({ action: 'applyLayout', layoutType, windowId: currentWindowId, useCurrentTabs }, (response) => {
        if (response && response.success) {
          updateStatus(document, { active: true, layoutType }, getMessage);
        }
      });
    });
  });

  const restoreBtn = document.getElementById('restoreBtn');
  restoreBtn.addEventListener('click', () => {
    sendMessage({ action: 'restoreLayout' }, (response) => {
      if (response && response.success) {
        updateStatus(document, { active: false }, getMessage);
      }
    });
  });
}

// Bootstrap when running in the browser (not in tests)
if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
  document.addEventListener('DOMContentLoaded', async () => {
    // Get the window ID from the popup's context — this IS the correct window
    const currentWindow = await chrome.windows.getCurrent();
    initPopup(
      document,
      (msg, cb) => chrome.runtime.sendMessage(msg, cb),
      (key) => chrome.i18n.getMessage(key),
      currentWindow.id
    );
  });
}
