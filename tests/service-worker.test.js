import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Chrome API mocks ---

const listeners = {};
let nextWindowId = 100;
let storage = {};

const mockDisplays = [
  {
    id: 'display-1',
    bounds: { left: 0, top: 0, width: 1920, height: 1080 },
    workArea: { left: 0, top: 0, width: 1920, height: 1040 },
  },
];

const mockSourceWindow = {
  id: 1,
  left: 100,
  top: 100,
  width: 800,
  height: 600,
  state: 'normal',
};

const mockChrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn((cb) => { listeners.onMessage = cb; }),
    },
  },
  system: {
    display: {
      getInfo: vi.fn(() => Promise.resolve(mockDisplays)),
    },
  },
  windows: {
    get: vi.fn((id) => Promise.resolve({ ...mockSourceWindow, id })),
    create: vi.fn(() => Promise.resolve({ id: ++nextWindowId })),
    update: vi.fn(() => Promise.resolve({})),
    remove: vi.fn(() => Promise.resolve()),
    onRemoved: {
      addListener: vi.fn((cb) => { listeners.onWindowRemoved = cb; }),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([
      { id: 10, windowId: 101 },
    ])),
    move: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  },
  storage: {
    local: {
      get: vi.fn((key) => Promise.resolve(storage[key] ? { [key]: storage[key] } : {})),
      set: vi.fn((obj) => { Object.assign(storage, obj); return Promise.resolve(); }),
      remove: vi.fn((key) => { delete storage[key]; return Promise.resolve(); }),
    },
  },
};

vi.stubGlobal('chrome', mockChrome);

const {
  saveSession,
  loadSession,
  clearSession,
  resolveLayout,
  applyLayout,
  distributeTabs,
  isEmptyTab,
  restoreLayout,
  getStatus,
  saveLastLayout,
  loadLastLayout,
  handleWindowClosed,
} = await import('../background/service-worker.js');

// --- Tests ---

describe('Session management', () => {
  beforeEach(() => {
    storage = {};
    vi.clearAllMocks();
  });

  it('saveSession should store layout type and window IDs', async () => {
    await saveSession('1x2', [1, 101]);
    expect(storage.tabbySession).toEqual({ layoutType: '1x2', windowIds: [1, 101] });
  });

  it('loadSession should return stored session', async () => {
    storage.tabbySession = { layoutType: '2x2', windowIds: [1, 2, 3, 4] };
    const session = await loadSession();
    expect(session).toEqual({ layoutType: '2x2', windowIds: [1, 2, 3, 4] });
  });

  it('loadSession should return null when no session', async () => {
    expect(await loadSession()).toBeNull();
  });

  it('clearSession should remove session from storage', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 2] };
    await clearSession();
    expect(storage.tabbySession).toBeUndefined();
  });
});

describe('resolveLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.system.display.getInfo.mockResolvedValue(mockDisplays);
    mockChrome.windows.get.mockImplementation((id) =>
      Promise.resolve({ ...mockSourceWindow, id })
    );
  });

  it('should return null for invalid layout', async () => {
    expect(await resolveLayout('invalid', 1)).toBeNull();
  });

  it('should not call Chrome APIs for invalid layout', async () => {
    await resolveLayout('invalid', 1);
    expect(mockChrome.system.display.getInfo).not.toHaveBeenCalled();
  });

  it('should use chrome.windows.get with the provided windowId', async () => {
    await resolveLayout('1x2', 42);
    expect(mockChrome.windows.get).toHaveBeenCalledWith(42);
  });

  it('should return positions and sourceWindow for valid layout', async () => {
    const result = await resolveLayout('1x2', 1);
    expect(result.positions).toHaveLength(2);
    expect(result.sourceWindow.id).toBe(1);
  });

  it('should use workArea height (1040 not 1080)', async () => {
    const result = await resolveLayout('2x1', 1);
    expect(result.positions[0].height + result.positions[1].height).toBe(1040);
  });
});

describe('applyLayout', () => {
  beforeEach(() => {
    storage = {};
    nextWindowId = 100;
    vi.clearAllMocks();
    mockChrome.system.display.getInfo.mockResolvedValue(mockDisplays);
    mockChrome.windows.get.mockImplementation((id) =>
      Promise.resolve({ ...mockSourceWindow, id })
    );
    let nextTabId = 500;
    mockChrome.windows.create.mockImplementation(() => Promise.resolve({ id: ++nextWindowId, tabs: [{ id: ++nextTabId }] }));
    mockChrome.windows.update.mockResolvedValue({});
    mockChrome.windows.remove.mockResolvedValue();
    mockChrome.tabs.query.mockResolvedValue([]);
    mockChrome.tabs.move.mockResolvedValue();
    mockChrome.tabs.update.mockResolvedValue();
    mockChrome.tabs.remove.mockResolvedValue();
  });

  it('should return error for invalid layout', async () => {
    const result = await applyLayout('invalid', 1);
    expect(result).toEqual({ success: false, error: 'Invalid layout: invalid' });
  });

  it('should update source window to first position', async () => {
    await applyLayout('1x2', 1);
    expect(mockChrome.windows.update).toHaveBeenCalledWith(1, {
      left: 0, top: 0, width: 960, height: 1040, state: 'normal',
    });
  });

  it('should pass the windowId through to resolveLayout', async () => {
    await applyLayout('1x2', 42);
    expect(mockChrome.windows.get).toHaveBeenCalledWith(42);
    expect(mockChrome.windows.update).toHaveBeenCalledWith(42, expect.any(Object));
  });

  it('should create one new window for 1x2', async () => {
    await applyLayout('1x2', 1);
    expect(mockChrome.windows.create).toHaveBeenCalledOnce();
  });

  it('should create three new windows for 2x2', async () => {
    await applyLayout('2x2', 1);
    expect(mockChrome.windows.create).toHaveBeenCalledTimes(3);
  });

  it('should return success with all window IDs', async () => {
    const result = await applyLayout('1x2', 1);
    expect(result.success).toBe(true);
    expect(result.windowIds).toEqual([1, 101]);
  });

  it('should save session after applying layout', async () => {
    await applyLayout('1x2', 1);
    expect(storage.tabbySession).toEqual({ layoutType: '1x2', windowIds: [1, 101] });
  });

  it('should restore existing layout before applying new one', async () => {
    storage.tabbySession = { layoutType: '2x1', windowIds: [1, 50] };
    mockChrome.tabs.query.mockResolvedValue([{ id: 20, windowId: 50, url: 'https://example.com' }]);
    await applyLayout('1x2', 1);
    expect(mockChrome.tabs.move).toHaveBeenCalled();
    expect(mockChrome.windows.remove).toHaveBeenCalledWith(50);
  });

  it('should set focused to false for new windows', async () => {
    await applyLayout('2x2', 1);
    for (const call of mockChrome.windows.create.mock.calls) {
      expect(call[0].focused).toBe(false);
    }
  });
});

describe('distributeTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.tabs.move.mockResolvedValue();
    mockChrome.tabs.update.mockResolvedValue();
    mockChrome.tabs.remove.mockResolvedValue();
  });

  it('should do nothing if source window has only one tab', async () => {
    mockChrome.tabs.query.mockResolvedValue([{ id: 10, windowId: 1 }]);
    await distributeTabs(1, [1, 101], []);
    expect(mockChrome.tabs.move).not.toHaveBeenCalled();
  });

  it('should do nothing if source window has no tabs', async () => {
    mockChrome.tabs.query.mockResolvedValue([]);
    await distributeTabs(1, [1, 101], []);
    expect(mockChrome.tabs.move).not.toHaveBeenCalled();
  });

  it('should move second tab to second window in 1x2', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101], [500]);
    expect(mockChrome.tabs.move).toHaveBeenCalledOnce();
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(11, { windowId: 101, index: -1 });
  });

  it('should activate moved tabs', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101], [500]);
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(11, { active: true });
  });

  it('should remove initial blank tabs', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101], [500]);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(500);
  });

  it('should distribute tabs across all windows in 2x2', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
      { id: 12, windowId: 1 },
      { id: 13, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101, 102, 103], [500, 501, 502]);
    expect(mockChrome.tabs.move).toHaveBeenCalledTimes(3);
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(11, { windowId: 101, index: -1 });
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(12, { windowId: 102, index: -1 });
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(13, { windowId: 103, index: -1 });
  });

  it('should remove all initial blank tabs in 2x2', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
      { id: 12, windowId: 1 },
      { id: 13, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101, 102, 103], [500, 501, 502]);
    expect(mockChrome.tabs.remove).toHaveBeenCalledTimes(3);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(500);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(501);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(502);
  });

  it('should activate all moved tabs in 2x2', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
      { id: 12, windowId: 1 },
      { id: 13, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101, 102, 103], [500, 501, 502]);
    expect(mockChrome.tabs.update).toHaveBeenCalledTimes(3);
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(11, { active: true });
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(12, { active: true });
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(13, { active: true });
  });

  it('should keep first tab in source window', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101], [500]);
    const movedTabIds = mockChrome.tabs.move.mock.calls.map(c => c[0]);
    expect(movedTabIds).not.toContain(10);
  });

  it('should handle more tabs than windows (extras stay in source)', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
      { id: 12, windowId: 1 },
      { id: 13, windowId: 1 },
      { id: 14, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101], [500]);
    expect(mockChrome.tabs.move).toHaveBeenCalledOnce();
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(11, { windowId: 101, index: -1 });
  });

  it('should handle fewer tabs than windows', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await distributeTabs(1, [1, 101, 102, 103], [500, 501, 502]);
    expect(mockChrome.tabs.move).toHaveBeenCalledOnce();
  });

  it('should handle blank tab removal failure gracefully', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    mockChrome.tabs.remove.mockRejectedValueOnce(new Error('Tab not found'));
    const result = await distributeTabs(1, [1, 101], [500]);
    // Should not throw
    expect(result).toBeUndefined();
  });
});

describe('applyLayout with useCurrentTabs', () => {
  let nextTabId;

  beforeEach(() => {
    storage = {};
    nextWindowId = 100;
    nextTabId = 500;
    vi.clearAllMocks();
    mockChrome.system.display.getInfo.mockResolvedValue(mockDisplays);
    mockChrome.windows.get.mockImplementation((id) =>
      Promise.resolve({ ...mockSourceWindow, id })
    );
    mockChrome.windows.create.mockImplementation(() =>
      Promise.resolve({ id: ++nextWindowId, tabs: [{ id: ++nextTabId }] })
    );
    mockChrome.windows.update.mockResolvedValue({});
    mockChrome.windows.remove.mockResolvedValue();
    mockChrome.tabs.move.mockResolvedValue();
    mockChrome.tabs.update.mockResolvedValue();
    mockChrome.tabs.remove.mockResolvedValue();
  });

  it('should not distribute tabs when useCurrentTabs is false', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await applyLayout('1x2', 1, false);
    expect(mockChrome.tabs.move).not.toHaveBeenCalled();
  });

  it('should distribute tabs when useCurrentTabs is true', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await applyLayout('1x2', 1, true);
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(11, { windowId: 101, index: -1 });
  });

  it('should remove blank tabs when distributing', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await applyLayout('1x2', 1, true);
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(501);
  });

  it('should activate moved tabs when distributing', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await applyLayout('1x2', 1, true);
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(11, { active: true });
  });

  it('should not distribute tabs by default', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
    ]);
    await applyLayout('1x2', 1);
    expect(mockChrome.tabs.move).not.toHaveBeenCalled();
  });

  it('should track blank tabs from all created windows in 2x2', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 1 },
      { id: 11, windowId: 1 },
      { id: 12, windowId: 1 },
      { id: 13, windowId: 1 },
    ]);
    await applyLayout('2x2', 1, true);
    // 3 new windows created, each with a blank tab (501, 502, 503)
    expect(mockChrome.tabs.remove).toHaveBeenCalledTimes(3);
  });
});

describe('isEmptyTab', () => {
  it('should return true for chrome://newtab/', () => {
    expect(isEmptyTab({ url: 'chrome://newtab/' })).toBe(true);
  });

  it('should return true for about:blank', () => {
    expect(isEmptyTab({ url: 'about:blank' })).toBe(true);
  });

  it('should return true for empty url', () => {
    expect(isEmptyTab({ url: '' })).toBe(true);
  });

  it('should return true for tab with no url', () => {
    expect(isEmptyTab({})).toBe(true);
  });

  it('should return true for pendingUrl newtab', () => {
    expect(isEmptyTab({ pendingUrl: 'chrome://newtab/' })).toBe(true);
  });

  it('should return false for real URLs', () => {
    expect(isEmptyTab({ url: 'https://google.com' })).toBe(false);
  });

  it('should return false for chrome settings', () => {
    expect(isEmptyTab({ url: 'chrome://settings/' })).toBe(false);
  });
});

describe('restoreLayout', () => {
  beforeEach(() => {
    storage = {};
    vi.clearAllMocks();
    mockChrome.windows.remove.mockResolvedValue();
    mockChrome.tabs.query.mockResolvedValue([{ id: 10, windowId: 101, url: 'https://example.com' }]);
    mockChrome.tabs.move.mockResolvedValue();
    mockChrome.tabs.remove.mockResolvedValue();
  });

  it('should return error if no active session', async () => {
    const result = await restoreLayout();
    expect(result).toEqual({ success: false, error: 'No active layout' });
  });

  it('should move real tabs from secondary windows to primary', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    await restoreLayout();
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ windowId: 101 });
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(10, { windowId: 1, index: -1 });
  });

  it('should close empty tabs instead of moving them', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 101, url: 'chrome://newtab/' },
    ]);
    await restoreLayout();
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(10);
    expect(mockChrome.tabs.move).not.toHaveBeenCalled();
  });

  it('should move real tabs and close empty tabs in same window', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 101, url: 'https://example.com' },
      { id: 11, windowId: 101, url: 'chrome://newtab/' },
    ]);
    await restoreLayout();
    expect(mockChrome.tabs.move).toHaveBeenCalledWith(10, { windowId: 1, index: -1 });
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(11);
  });

  it('should close about:blank tabs on restore', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    mockChrome.tabs.query.mockResolvedValue([
      { id: 10, windowId: 101, url: 'about:blank' },
    ]);
    await restoreLayout();
    expect(mockChrome.tabs.remove).toHaveBeenCalledWith(10);
    expect(mockChrome.tabs.move).not.toHaveBeenCalled();
  });

  it('should remove secondary windows', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    await restoreLayout();
    expect(mockChrome.windows.remove).toHaveBeenCalledWith(101);
  });

  it('should clear session after restore', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    await restoreLayout();
    expect(storage.tabbySession).toBeUndefined();
  });

  it('should handle already-closed windows gracefully', async () => {
    storage.tabbySession = { layoutType: '2x2', windowIds: [1, 101, 102, 103] };
    mockChrome.tabs.query.mockRejectedValueOnce(new Error('Window not found'));
    mockChrome.tabs.query.mockResolvedValue([{ id: 20, url: 'https://example.com' }]);
    const result = await restoreLayout();
    expect(result.success).toBe(true);
  });
});

describe('lastLayout persistence', () => {
  beforeEach(() => { storage = {}; });

  it('saveLastLayout should store the layout type', async () => {
    await saveLastLayout('2x2');
    expect(storage.tabbyLastLayout).toBe('2x2');
  });

  it('loadLastLayout should return stored layout', async () => {
    storage.tabbyLastLayout = '1x2';
    expect(await loadLastLayout()).toBe('1x2');
  });

  it('loadLastLayout should return null when no stored layout', async () => {
    expect(await loadLastLayout()).toBeNull();
  });

  it('applyLayout should save last layout', async () => {
    vi.clearAllMocks();
    mockChrome.system.display.getInfo.mockResolvedValue(mockDisplays);
    mockChrome.windows.get.mockImplementation((id) =>
      Promise.resolve({ ...mockSourceWindow, id })
    );
    mockChrome.windows.create.mockImplementation(() =>
      Promise.resolve({ id: 200, tabs: [{ id: 600 }] })
    );
    mockChrome.windows.update.mockResolvedValue({});
    mockChrome.tabs.query.mockResolvedValue([]);
    mockChrome.tabs.move.mockResolvedValue();
    await applyLayout('2x1', 1);
    expect(storage.tabbyLastLayout).toBe('2x1');
  });
});

describe('getStatus', () => {
  beforeEach(() => { storage = {}; });

  it('should return inactive when no session', async () => {
    const status = await getStatus();
    expect(status.active).toBe(false);
    expect(status.lastLayout).toBeNull();
  });

  it('should return active with layout info when session exists', async () => {
    storage.tabbySession = { layoutType: '2x2', windowIds: [1, 2, 3, 4] };
    const status = await getStatus();
    expect(status.active).toBe(true);
    expect(status.layoutType).toBe('2x2');
    expect(status.windowIds).toEqual([1, 2, 3, 4]);
  });

  it('should include lastLayout when inactive', async () => {
    storage.tabbyLastLayout = '1x2';
    const status = await getStatus();
    expect(status.active).toBe(false);
    expect(status.lastLayout).toBe('1x2');
  });

  it('should include lastLayout when active', async () => {
    storage.tabbySession = { layoutType: '2x2', windowIds: [1, 2, 3, 4] };
    storage.tabbyLastLayout = '2x2';
    const status = await getStatus();
    expect(status.lastLayout).toBe('2x2');
  });
});

describe('handleWindowClosed', () => {
  beforeEach(() => {
    storage = {};
    vi.clearAllMocks();
  });

  it('should do nothing if no active session', async () => {
    await handleWindowClosed(999);
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should do nothing if closed window is not in session', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    await handleWindowClosed(999);
    expect(storage.tabbySession.windowIds).toEqual([1, 101]);
  });

  it('should remove closed window from session', async () => {
    storage.tabbySession = { layoutType: '2x2', windowIds: [1, 101, 102, 103] };
    await handleWindowClosed(102);
    expect(storage.tabbySession.windowIds).toEqual([1, 101, 103]);
  });

  it('should clear session if only one window remains', async () => {
    storage.tabbySession = { layoutType: '1x2', windowIds: [1, 101] };
    await handleWindowClosed(101);
    expect(storage.tabbySession).toBeUndefined();
  });
});

describe('Message handler', () => {
  let sendResponse;

  beforeEach(() => {
    sendResponse = vi.fn();
  });

  it('should register message listener', () => {
    expect(typeof listeners.onMessage).toBe('function');
  });

  it('should register window close listener', () => {
    expect(typeof listeners.onWindowRemoved).toBe('function');
  });

  it('should pass windowId to applyLayout from message', async () => {
    storage = {};
    mockChrome.system.display.getInfo.mockResolvedValue(mockDisplays);
    mockChrome.windows.get.mockImplementation((id) =>
      Promise.resolve({ ...mockSourceWindow, id })
    );
    mockChrome.windows.create.mockImplementation(() => Promise.resolve({ id: ++nextWindowId }));
    mockChrome.windows.update.mockResolvedValue({});

    listeners.onMessage({ action: 'applyLayout', layoutType: '1x2', windowId: 42 }, {}, sendResponse);
    // Wait for async chain to complete
    await vi.waitFor(() => {
      expect(mockChrome.windows.get).toHaveBeenCalledWith(42);
    });
  });

  it('should respond with error for unknown actions', () => {
    listeners.onMessage({ action: 'unknown' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown action: unknown' });
  });

  it('should return true for async response support', () => {
    const result = listeners.onMessage({ action: 'getStatus' }, {}, sendResponse);
    expect(result).toBe(true);
  });
});
