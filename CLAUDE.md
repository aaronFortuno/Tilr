# CLAUDE.md — Tilr Browser Extension

## Project Overview

**Tilr** is a Chrome/Chromium/Brave browser extension that splits the screen into predefined layouts (1x2, 2x1, 2x2) using real browser windows positioned programmatically via `chrome.windows` API. Windows are managed as a group: the extension tracks which windows belong to the active layout, can restore them into a single window, and detects when the user closes layout windows. Purpose: comfortable webapp testing without managing multiple small browsers manually.

## Architecture (Canonical)

```
tilr/
├── manifest.json              # Manifest V3
├── popup/
│   ├── popup.html             # Popup UI (layout selector)
│   ├── popup.css              # Popup styles
│   └── popup.js               # Popup logic — triggers layout, shows status
├── background/
│   └── service-worker.js      # Window management + group tracking
├── lib/
│   └── layouts.js             # Layout definitions & position calculations
├── _locales/
│   ├── en/messages.json       # English (default)
│   ├── es/messages.json       # Spanish
│   ├── ca/messages.json       # Catalan
│   ├── gl/messages.json       # Galician
│   ├── eu/messages.json       # Basque
│   ├── de/messages.json       # German
│   ├── fr/messages.json       # French
│   ├── it/messages.json       # Italian
│   ├── pt/messages.json       # Portuguese
│   ├── da/messages.json       # Danish
│   ├── fi/messages.json       # Finnish
│   └── nl/messages.json       # Dutch
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tests/
│   ├── layouts.test.js        # Unit tests for layouts.js
│   ├── service-worker.test.js # Unit tests for service-worker.js
│   └── popup.test.js          # Unit tests for popup.js
├── package.json               # Dev dependencies (test runner)
├── CLAUDE.md                  # This file
├── README.md                  # Project documentation
├── ARCHITECTURE.md            # Technical architecture document
├── PUBLISHING.md              # Chrome Web Store listing texts & permission justifications
└── MANUAL_TESTS.md            # Manual test checklist for browser testing
```

**DO NOT** create files outside this structure without explicit user approval.
**DO NOT** add directories, libraries, or frameworks not listed here.

## Development Phases (Strict Order)

| Phase | Scope | Files Involved | Status |
|-------|-------|----------------|--------|
| 1 | Scaffold: manifest + popup skeleton + service worker skeleton + i18n base + test setup | `manifest.json`, `popup/*`, `background/*`, `_locales/*`, `package.json`, `tests/*` | **Done** |
| 2 | Layout engine: layout definitions + validation + position calculations | `lib/layouts.js`, `tests/layouts.test.js` | **Done** |
| 3 | Window management + group tracking + popup integration: create/position windows, track group in storage, restore, detect window close, connect popup end-to-end. Bugfix: use popup's windowId instead of service worker's getCurrent(). | All source files + tests | **Done** |
| 4 | Tab distribution: distribute existing tabs across layout windows, blank tab cleanup, tab activation | `popup/*`, `background/*`, `tests/*` | **Done** |
| 5 | Persistence + UI polish: close empty/newtab tabs on restore, remember last used layout, last-used button indicator | `popup/*`, `background/*`, `tests/*` | **Done** |
| 6 | Icons and final packaging: proper icons (4-tile grid design), version 1.0.0, Chrome Web Store readiness | `icons/*`, `manifest.json` | **Done** |

**Each phase MUST pass all unit tests before proceeding to the next.**

## Rules for Claude

### Design Discipline
- **Follow the plan.** Only implement what is defined in the current phase.
- **No improvisation.** Do not add features, utilities, or abstractions not in the specs.
- **No scope creep.** If something new seems useful, propose it to the user — do not implement it silently.
- **Any structural change** (new file, removed file, new dependency, changed API) **MUST be reflected in README.md and ARCHITECTURE.md immediately** in the same phase.

### Code Standards
- Vanilla JavaScript only. No frameworks, no build step, no TypeScript.
- ES Modules where supported (Manifest V3 service workers support `import`).
- Functions must be small, single-purpose, and testable.
- Every exported function MUST have a corresponding unit test.
- Use `chrome.*` APIs only as documented in Chrome Extensions Manifest V3 docs.

### Testing
- Test runner: **Vitest** (lightweight, ESM-native, no config bloat).
- Chrome APIs must be mocked in tests (no real browser required for unit tests).
- Tests run with: `npm test`.
- All tests must pass before completing any phase.
- Test files mirror source structure: `lib/layouts.js` → `tests/layouts.test.js`.

### Documentation Sync
- `README.md` — User-facing: what the extension does, how to install/use, supported layouts.
- `ARCHITECTURE.md` — Technical: file responsibilities, data flow, API usage, design decisions.
- Both documents must be **updated in every phase** where any structural or functional change occurs.
- If the user requests a change during a conversation that modifies the plan, update this `CLAUDE.md` phase table and docs accordingly.

### Agent Workflow
- Use specialized agents when appropriate:
  - **Testing agent**: run tests, validate results, report failures.
  - **Documentation agent**: update README.md and ARCHITECTURE.md after changes.
  - **Explore agent**: investigate Chrome API behavior or codebase questions.
- Agents must not make changes outside their scope.
- Prefer parallel agent execution for independent tasks (e.g., tests + docs update).

### Permissions (manifest.json)
Approved permissions — do not add others without user approval:
- `system.display` — screen dimensions for window positioning
- `storage` — persist active layout session (window group IDs)
- `tabs` — tab management (query, move between windows)

Required manifest fields:
- `"default_locale": "en"` — required for i18n support (`chrome.i18n` API needs no permission)

### Git Workflow
- Do NOT commit unless the user explicitly asks.
- Do NOT push unless the user explicitly asks.
- Commit messages in English, concise, referencing the phase.

## Supported Layouts

| ID | Name | Windows | Description |
|----|------|---------|-------------|
| `1x2` | Two columns | 2 | Side by side, 50/50 width |
| `2x1` | Two rows | 2 | Stacked, 50/50 height |
| `2x2` | Grid | 4 | 2x2 quadrants |
| `3x2` | Grid 3x2 | 6 | 3 columns, 2 rows |

## Internationalization (i18n)

Uses Chrome's **built-in i18n system** (`chrome.i18n` API):
- Strings defined in `_locales/{lang}/messages.json` files.
- Default locale: `en`. Additional locales: `es`, `ca`, `gl`, `eu`, `de`, `fr`, `it`, `pt`, `da`, `fi`, `nl`.
- In `manifest.json`: add `"default_locale": "en"`.
- In HTML/CSS: use `__MSG_keyName__` placeholders (auto-replaced by Chrome).
- In JS: use `chrome.i18n.getMessage("keyName")`.
- The browser auto-selects the locale based on user language settings.
- All user-facing strings MUST use i18n keys — no hardcoded text in popup or UI.
- Adding a new language = adding a new folder under `_locales/` with its `messages.json`.

## Key Technical Decisions

1. **Real browser windows** — each panel is a full browser window, no iframe limitations.
2. **Group management** — the extension tracks which windows belong to the active layout via `chrome.storage.local`.
3. **`chrome.system.display`** — gets real screen bounds (workArea excludes taskbar/dock) for accurate positioning.
4. **Multi-monitor** — uses the display where the current window resides.
5. **`chrome.windows.onRemoved`** — detects when user closes a layout window and updates the group.
6. **Restore** — regroups all tabs from layout windows into one window, closes the extras.

## Architecture History

- **v1 (Phases 1-2)**: Multi-window positioning. Worked but lacked group management.
- **v2 (Phases 3-4, reverted)**: Single container tab with iframes. Abandoned due to fundamental iframe limitations (X-Frame-Options, CSP, OAuth, SSO).
- **v3 (current)**: Multi-window positioning with group management layer. Combines v1's robustness with proper session tracking and restore.

## Future Ideas

- **Dynamic window resizing**: When the user resizes one layout window, automatically adjust adjacent windows to fill the gap. Requires investigation of `chrome.windows.onBoundsChanged` (if available) or polling. High-value feature for power users.
