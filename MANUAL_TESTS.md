# Manual Test Plan — Tilr (Phase 4)

**Instructions**: Remove the old extension from `chrome://extensions/`, then "Load unpacked" again. Run each test and mark PASS/FAIL. Write feedback in the notes section.

---

## Test 1: Apply 1x2 layout (two columns)

1. Open a single browser window
2. Click the Tilr icon → Select "Two columns" (1x2)

**Expected:**

- Current window resizes to left half of the screen
- A new empty window appears on the right half
- Status shows "Active layout: 1x2"
- Restore button becomes enabled

| Result      |                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PASS / FAIL | FAIL                                                                                                                                                                  |
| Notes       | OTHER window resizes on the left half of the screen. A new empty window appears on the right half. Status shows "Active layout: 1x2". Restore button becommes enabled |

---

## Test 2: Apply 2x1 layout (two rows)

1. Click Tilr icon → Select "Two rows" (2x1)

**Expected:**

- Previous layout restores first (windows regroup)
- Current window resizes to top half
- New window appears on bottom half
- Status shows "Active layout: 2x1"

| Result      |                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PASS / FAIL | FAIL                                                                                                                                                     |
| Notes       | Previous layout restores first (windows regroup). OTHER window resizes to top half. New window appears on bottom half. Status shows "Active layout: 2x1" |

---

## Test 3: Apply 2x2 layout (grid)

1. Click Tilr icon → Select "Grid 2x2"

**Expected:**

- 4 windows: top-left, top-right, bottom-left, bottom-right
- Each occupies approximately one quarter of the screen
- Status shows "Active layout: 2x2"

| Result      |                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| PASS / FAIL | PASS (but on unexpected windows)                                                                                       |
| Notes       | Efectively pass but doesn't apply on current window, it gets other browser window as a primary and open 3 new windows. |

---

## Test 4: Restore layout

1. With a layout active, click Tilr icon → Click "Restore"

**Expected:**

- All tabs from secondary windows move to the primary window
- Secondary windows close
- Status shows "No active layout" / "Sin layout activo"
- Restore button becomes disabled

| Result      |                                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PASS / FAIL | FAIL (with one case PASS)                                                                                                                                                                                                                                                                                                                                           |
| Notes       | It works only on some specific window, not the main window from we are trying to create the layout. Any other tab is considered as not the main one, acting on the considered main. All tabs from secondary windows move to the primary window (not the working window). Secondary windows close. Status shows "No active layout". Restore button becomes disabled. |

---

## Test 5: Switch layout without manual restore

1. Apply 1x2 layout
2. Without clicking Restore, apply 2x2 layout

**Expected:**

- Old layout windows close (tabs regrouped)
- New 2x2 layout applied cleanly
- No orphaned windows

| Result      |                                                                                        |
| ----------- | -------------------------------------------------------------------------------------- |
| PASS / FAIL | PASS (considering the missworking of the main/primary/active window)                   |
| Notes       | Old layout windows close. New layout applied cleanly. No orphaned windows, apparently. |

---

## Test 6: Close a layout window manually

1. Apply 1x2 layout (two windows)
2. Manually close the secondary window (right side) using the X button

**Expected:**

- Extension detects the window was closed
- Next time you open the popup, status should show "No active layout" (because only 1 window remains → session cleared)

| Result      |                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| PASS / FAIL | PASS                                                                                                                    |
| Notes       | It acts only over the considered main window, not the actual working window from where we are activating the extension. |

---

## Test 7: Close a window in 2x2 (partial close)

1. Apply 2x2 layout (four windows)
2. Close ONE of the secondary windows manually

**Expected:**

- Session updates: the closed window is removed from the group
- Remaining 3 windows are still tracked
- Popup still shows "Active layout: 2x2"
3. Close another secondary window

**Expected:**

- Now only 1 window remains → session clears
- Popup shows "No active layout"

| Result      |                                                       |
| ----------- | ----------------------------------------------------- |
| PASS / FAIL | PASS                                                  |
| Notes       | It detects when only remains the original/main window |

---

## Test 8: Navigate in layout windows

1. Apply any layout
2. In each window, open different websites (e.g., google.com, github.com, stackoverflow.com)

**Expected:**

- Each window works as a full, independent browser
- Tabs, extensions, bookmarks, devtools — all work normally
- No restrictions on what sites can be loaded (unlike iframes)

| Result      |                                                           |
| ----------- | --------------------------------------------------------- |
| PASS / FAIL | PASS                                                      |
| Notes       | All windows are independent browsers so it works properly |

---

## Test 9: Restore with tabs

1. Apply 1x2 layout
2. Open 2-3 tabs in the secondary window
3. Click Restore

**Expected:**

- All tabs from the secondary window move to the primary window
- No tabs are lost
- Secondary window closes

| Result      |                                                                                 |
| ----------- | ------------------------------------------------------------------------------- |
| PASS / FAIL | PASS                                                                            |
| Notes       | All tabs move to the primary window. No tabs are lost. Secondary window closes. |

---

## Test 10: Popup status on reopen

1. Apply a layout
2. Close the popup (click elsewhere)
3. Open the popup again

**Expected:**

- Status correctly shows the active layout (e.g., "Active layout: 1x2")
- The correct layout button is highlighted
- Restore button is enabled

| Result      |      |
| ----------- | ---- |
| PASS / FAIL | PASS |
| Notes       |      |

---

## Test 11: Window positioning accuracy

1. Apply 1x2 layout

**Expected:**

- Windows should fill the screen without gaps (accounting for taskbar)
- On Windows: bottom edge should respect the taskbar height
- Windows should not overlap

| Result      |                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------- |
| PASS / FAIL | PASS                                                                                              |
| Notes       | All sizes are respected. Windows not overlap. There are no gaps. Respected bottom edge on windows |

---

## Test 12: Maximized window behavior

1. Maximize the browser window
2. Apply any layout

**Expected:**

- Window un-maximizes and repositions correctly
- Layout applies to the full work area

| Result      |      |
| ----------- | ---- |
| PASS / FAIL | PASS |
| Notes       |      |

---

## Test 13: i18n (Spanish)

1. Change browser language to Spanish (Settings > Languages > move Spanish to top)
2. Restart browser
3. Open Tilr popup

**Expected:**

- Layout labels in Spanish: "Dos columnas", "Dos filas", "Cuadrícula 2x2"
- "Usar pestañas actuales" toggle
- "Restaurar" button
- Status messages in Spanish

| Result      |                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| PASS / FAIL | NOT TESTED                                                                                                        |
| Notes       | The extension works automatically in spanish (because the browser is in spanish), we'll test in future iterations |

---

## General Feedback

| Area               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI/UX              | Proper UI/UX of the extension popup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Performance        | Some things work properly, some other not. The selector useCurrentTabs doesn't do anything. The extension always open  new empty tabs.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Bugs found         | When multiple windows are open the extension don't consider the tab from where we are activating the extension as the main window. It looks for other window (is always the same, maybe some pid processes lookfor) and uses it as the main primary window. It creates a strange behavior.                                                                                                                                                                                                                                                  |
| Feature ideas      | When restoring a layout, if the tabs are empty/fresh close instead of putting them on the main window. The logic is that if we are returning to the 1-window layout, the new empty tabs are not needed so we can close them. I don't know if it's a bug or a expected feature that we have'nt considered: when we resize a window on a layout, automatically resize the other windows accordingly. For instance, on a 2x2 layout, if we make wider the bottom right window, shrink the bottom left window. I don't know if this is possible |
| Overall impression | It works partially well. If we solve the main/active tab bug it seems a great extension.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
