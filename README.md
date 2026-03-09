# Tilr

Browser extension for Chrome/Chromium/Brave that splits your screen into predefined layouts using real browser windows. Designed for comfortable webapp testing without juggling multiple browsers manually.

## Features

- **Split layouts**: 1x2 (two columns), 2x1 (two rows), 2x2 (grid), 3x2 (6 panels)
- **Real windows**: Each panel is a full browser window — no iframe limitations
- **Group management**: Windows are tracked as a group with automatic cleanup
- **One-click restore**: Regroup all tabs back into a single window
- **Tab distribution**: Optionally spread existing tabs across layout windows (no leftover blank tabs)
- **Multi-monitor**: Detects which screen you're on and positions windows accordingly
- **Internationalization**: English and Spanish (auto-detected from browser settings)

## Installation (Development)

1. Clone this repository
2. Run `npm install` for test dependencies
3. Open `chrome://extensions/` in your browser
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `tilr/` directory

## Usage

1. Click the Tilr icon in the toolbar
2. Select a layout (two columns, two rows, or 2x2 grid)
3. Windows are created and positioned automatically
4. Click "Restore" to regroup all tabs back into one window

## Development

```bash
npm install
npm test
```

## Supported Layouts

| Layout | Description |
|--------|-------------|
| 1x2 | Two columns, side by side |
| 2x1 | Two rows, stacked |
| 2x2 | Four quadrants |
| 3x2 | Six panels (3 columns, 2 rows) |

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for Chrome Web Store listing texts, permission justifications, and privacy disclosures.

## Project Status

- [x] Phase 1: Scaffold (manifest, popup, service worker, i18n, tests)
- [x] Phase 2: Layout engine (position calculations, multi-monitor)
- [x] Phase 3: Window management + group tracking + popup integration
- [x] Phase 4: Tab distribution (with blank tab cleanup)
- [x] Phase 5: Persistence and UI polish (empty tab cleanup, last layout memory)
- [x] Phase 6: Icons and final packaging (v1.0.0)
