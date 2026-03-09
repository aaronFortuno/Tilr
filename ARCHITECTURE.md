# Architecture — Tilr

## Overview

Tilr is a Manifest V3 Chrome extension that uses `chrome.windows` to position real browser windows in predefined layouts (1x2, 2x1, 2x2). Windows are managed as a group: the extension tracks them in `chrome.storage.local`, detects when the user closes one, and can restore all tabs back into a single window.

## File Responsibilities

| File | Role |
|------|------|
| `manifest.json` | Extension metadata, permissions (`system.display`, `storage`, `tabs`), entry points. Uses i18n for name/description. |
| `popup/popup.html` | Popup UI structure. Layout selector with visual previews, status indicator, restore button. |
| `popup/popup.css` | Popup styles. Minimalist, 280px wide. |
| `popup/popup.js` | Popup logic. Applies i18n, queries status on open, triggers layout/restore via messages, updates UI state. |
| `background/service-worker.js` | Core logic. `applyLayout()` creates/positions windows. `restoreLayout()` regroups tabs. `handleWindowClosed()` updates group on window close. Session management via `chrome.storage.local`. |
| `lib/layouts.js` | Pure functions: layout validation, window count, position calculation, display bounds extraction, multi-monitor display matching. No side effects. |
| `_locales/*/messages.json` | i18n strings (English default, Spanish). |
| `tests/*.test.js` | Unit tests mirroring source files. |

## Data Flow

```
User clicks layout button in popup
    → popup.js sends { action: 'applyLayout', layoutType }
    → service-worker.js receives message
    → if existing session: restoreLayout() first (regroup + close extras)
    → resolveLayout(): gets display info + current window position
      → computeLayout(): finds display → extracts workArea → calculates positions
    → chrome.windows.update() repositions current window to slot 0
    → chrome.windows.create() creates new windows for slots 1..N
    → saveSession(): stores { layoutType, windowIds } in chrome.storage.local
    → responds { success: true, windowIds } to popup
    → popup.js updates status text + enables restore button

User clicks Restore
    → popup.js sends { action: 'restoreLayout' }
    → service-worker.js loads session
    → moves all tabs from secondary windows to primary via chrome.tabs.move()
    → removes secondary windows via chrome.windows.remove()
    → clears session from storage
    → popup.js updates status to inactive

User closes a layout window manually
    → chrome.windows.onRemoved fires
    → handleWindowClosed() removes window from session
    → if ≤1 window remains: clears session entirely
```

## Key Design Decisions

1. **Real browser windows**: Each panel is a full browser window — no iframe limitations, full browser capabilities.
2. **Group management via storage**: `chrome.storage.local` tracks which windows belong to the active layout. This survives service worker restarts.
3. **Auto-cleanup on window close**: `chrome.windows.onRemoved` listener detects when the user closes a layout window and updates the group. Session clears when only one window remains.
4. **Restore before apply**: Applying a new layout automatically restores the previous one first, preventing orphaned windows.
5. **Pure layout engine**: `layouts.js` has zero dependencies and no side effects — easy to test with any display configuration.
6. **Dependency injection**: `popup.js` functions accept `document`, `sendMessage`, and `getMessage` as parameters for testability.
7. **Native i18n**: Chrome's built-in `chrome.i18n` API. No external libraries.

## Permissions

| Permission | Reason |
|------------|--------|
| `system.display` | Get screen dimensions (workArea) for accurate window positioning |
| `storage` | Persist active layout session (window group IDs) |
| `tabs` | Query and move tabs between windows during restore |

## Testing Strategy

- **Runner**: Vitest (ESM-native, zero-config)
- **DOM mocking**: jsdom for popup tests
- **Chrome API mocking**: `vi.stubGlobal('chrome', ...)` with in-memory storage mock
- **Coverage**: Every exported function has unit tests (73 tests total)

## Architecture History

- **v1 (Phases 1-2)**: Multi-window positioning. Worked but lacked group management.
- **v2 (Phases 3-4, reverted)**: Single container tab with iframes. Abandoned due to X-Frame-Options, CSP, OAuth issues.
- **v3 (current, Phase 3)**: Multi-window with group management. Combines v1's robustness with session tracking and restore.

## Current State

- Phase 3 complete: full window management with group tracking, restore, window close detection, popup integration. Bugfix: popup sends windowId. 74 tests.
- Phase 4 complete: tab distribution via `distributeTabs()`. Popup sends `useCurrentTabs` flag. Bugfix: tracks initial blank tabs from `chrome.windows.create()`, removes them after moving real tabs, and activates moved tabs.
- Phase 5 complete: `isEmptyTab()` filters empty/newtab tabs on restore (closes them instead of moving). `saveLastLayout()`/`loadLastLayout()` persist last used layout. `getStatus()` returns `lastLayout`. Popup shows `last-used` CSS class on the button matching the last layout.
- New layout `3x2` added (3 columns, 2 rows, 6 windows).
- Phase 6 complete: proper icons (4-tile grid design generated programmatically), version bumped to 1.0.0. 119 tests.
