import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { applyI18n, updateStatus, initPopup } from '../popup/popup.js';

function createPopupDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <body>
      <div class="layouts">
        <button class="layout-btn" data-layout="1x2">
          <span class="layout-label" data-i18n="layoutColumns"></span>
        </button>
        <button class="layout-btn" data-layout="2x1">
          <span class="layout-label" data-i18n="layoutRows"></span>
        </button>
        <button class="layout-btn" data-layout="2x2">
          <span class="layout-label" data-i18n="layoutGrid"></span>
        </button>
        <button class="layout-btn" data-layout="3x2">
          <span class="layout-label" data-i18n="layout3x2"></span>
        </button>
      </div>
      <label class="toggle">
        <input type="checkbox" id="useCurrentTabs">
        <span data-i18n="useCurrentTabs"></span>
      </label>
      <span id="statusText" data-i18n="noActiveLayout"></span>
      <button class="restore-btn" id="restoreBtn" disabled data-i18n="restore"></button>
    </body>
    </html>
  `);
  return dom.window.document;
}

function mockGetMessage(key) {
  const messages = {
    layoutColumns: 'Two columns',
    layoutRows: 'Two rows',
    layoutGrid: 'Grid 2x2',
    layout3x2: 'Grid 3x2',
    useCurrentTabs: 'Use current tabs',
    noActiveLayout: 'No active layout',
    activeLayout: 'Active layout',
    restore: 'Restore',
  };
  return messages[key] || '';
}

describe('applyI18n', () => {
  it('should set text content for elements with data-i18n', () => {
    const doc = createPopupDOM();
    applyI18n(doc, mockGetMessage);

    const labels = doc.querySelectorAll('.layout-label');
    expect(labels[0].textContent).toBe('Two columns');
    expect(labels[1].textContent).toBe('Two rows');
    expect(labels[2].textContent).toBe('Grid 2x2');
  });

  it('should set text for restore button', () => {
    const doc = createPopupDOM();
    applyI18n(doc, mockGetMessage);
    expect(doc.getElementById('restoreBtn').textContent).toBe('Restore');
  });

  it('should set text for status', () => {
    const doc = createPopupDOM();
    applyI18n(doc, mockGetMessage);
    expect(doc.getElementById('statusText').textContent).toBe('No active layout');
  });
});

describe('updateStatus', () => {
  it('should show active layout and enable restore', () => {
    const doc = createPopupDOM();
    updateStatus(doc, { active: true, layoutType: '1x2' }, mockGetMessage);

    expect(doc.getElementById('statusText').textContent).toBe('Active layout: 1x2');
    expect(doc.getElementById('restoreBtn').disabled).toBe(false);
  });

  it('should mark the active layout button', () => {
    const doc = createPopupDOM();
    updateStatus(doc, { active: true, layoutType: '2x1' }, mockGetMessage);

    const btn2x1 = doc.querySelector('[data-layout="2x1"]');
    const btn1x2 = doc.querySelector('[data-layout="1x2"]');
    expect(btn2x1.classList.contains('active')).toBe(true);
    expect(btn1x2.classList.contains('active')).toBe(false);
  });

  it('should show inactive state and disable restore', () => {
    const doc = createPopupDOM();
    updateStatus(doc, { active: false }, mockGetMessage);

    expect(doc.getElementById('statusText').textContent).toBe('No active layout');
    expect(doc.getElementById('restoreBtn').disabled).toBe(true);
  });

  it('should clear active class from all buttons when inactive', () => {
    const doc = createPopupDOM();
    // First set active
    updateStatus(doc, { active: true, layoutType: '1x2' }, mockGetMessage);
    // Then set inactive
    updateStatus(doc, { active: false }, mockGetMessage);

    const buttons = doc.querySelectorAll('.layout-btn');
    buttons.forEach((btn) => expect(btn.classList.contains('active')).toBe(false));
  });

  it('should mark last-used button when inactive with lastLayout', () => {
    const doc = createPopupDOM();
    updateStatus(doc, { active: false, lastLayout: '2x1' }, mockGetMessage);

    const btn2x1 = doc.querySelector('[data-layout="2x1"]');
    const btn1x2 = doc.querySelector('[data-layout="1x2"]');
    expect(btn2x1.classList.contains('last-used')).toBe(true);
    expect(btn1x2.classList.contains('last-used')).toBe(false);
  });

  it('should not mark last-used when no lastLayout', () => {
    const doc = createPopupDOM();
    updateStatus(doc, { active: false }, mockGetMessage);

    const buttons = doc.querySelectorAll('.layout-btn');
    buttons.forEach((btn) => expect(btn.classList.contains('last-used')).toBe(false));
  });
});

describe('initPopup', () => {
  let doc;
  let sendMessage;

  beforeEach(() => {
    doc = createPopupDOM();
    sendMessage = vi.fn((msg, cb) => {
      if (msg.action === 'getStatus') cb({ active: false });
      if (msg.action === 'applyLayout') cb({ success: true });
      if (msg.action === 'restoreLayout') cb({ success: true });
    });
    initPopup(doc, sendMessage, mockGetMessage, 42);
  });

  it('should apply i18n on init', () => {
    expect(doc.querySelector('[data-i18n="layoutColumns"]').textContent).toBe('Two columns');
  });

  it('should query status on init with windowId', () => {
    expect(sendMessage).toHaveBeenCalledWith(
      { action: 'getStatus', windowId: 42 },
      expect.any(Function),
    );
  });

  it('should send applyLayout with windowId and useCurrentTabs=false', () => {
    const btn = doc.querySelector('[data-layout="1x2"]');
    btn.click();

    expect(sendMessage).toHaveBeenCalledWith(
      { action: 'applyLayout', layoutType: '1x2', windowId: 42, useCurrentTabs: false },
      expect.any(Function),
    );
  });

  it('should send useCurrentTabs=true when checkbox is checked', () => {
    doc.getElementById('useCurrentTabs').checked = true;
    const btn = doc.querySelector('[data-layout="2x2"]');
    btn.click();

    expect(sendMessage).toHaveBeenCalledWith(
      { action: 'applyLayout', layoutType: '2x2', windowId: 42, useCurrentTabs: true },
      expect.any(Function),
    );
  });

  it('should update status after successful applyLayout', () => {
    const btn = doc.querySelector('[data-layout="2x2"]');
    btn.click();

    expect(doc.getElementById('statusText').textContent).toBe('Active layout: 2x2');
    expect(doc.getElementById('restoreBtn').disabled).toBe(false);
  });

  it('should mark clicked button as active', () => {
    const btn1x2 = doc.querySelector('[data-layout="1x2"]');
    const btn2x1 = doc.querySelector('[data-layout="2x1"]');

    btn1x2.click();
    expect(btn1x2.classList.contains('active')).toBe(true);

    btn2x1.click();
    expect(btn1x2.classList.contains('active')).toBe(false);
    expect(btn2x1.classList.contains('active')).toBe(true);
  });

  it('should send restoreLayout when restore button is clicked', () => {
    // First activate a layout so restore is enabled
    doc.querySelector('[data-layout="1x2"]').click();
    const restoreBtn = doc.getElementById('restoreBtn');
    restoreBtn.click();

    expect(sendMessage).toHaveBeenCalledWith(
      { action: 'restoreLayout', windowId: 42 },
      expect.any(Function),
    );
  });

  it('should update status after successful restore', () => {
    doc.querySelector('[data-layout="1x2"]').click();
    doc.getElementById('restoreBtn').click();

    expect(doc.getElementById('statusText').textContent).toBe('No active layout');
    expect(doc.getElementById('restoreBtn').disabled).toBe(true);
  });
});
