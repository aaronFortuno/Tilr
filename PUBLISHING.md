# Publishing — Chrome Web Store

Prepared texts and justifications for Chrome Web Store submission.

## Extension Listing

### Name
Tilr

### Short Description (132 chars max)
Split your browser into layouts (columns, rows, grid) for comfortable multi-window webapp testing. No data collection.

### Detailed Description
Tilr lets you organize your browser windows into predefined screen layouts with a single click. Choose between two columns (1x2), two rows (2x1), a 2x2 grid, or a 3x2 grid (6 windows), and Tilr will automatically position your windows to fill the screen.

Each panel is a real browser window with full capabilities — no iframes, no limitations.

Designed for web developers and QA testers who need to view multiple webapps side by side without manually resizing and dragging windows.

Features:
- Four layout modes: two columns, two rows, 2x2 grid, and 3x2 grid (6 windows)
- Windows managed as a group with automatic cleanup
- One-click restore to regroup all tabs into one window
- Multi-monitor support (uses the screen where your current window is)
- Multilingual: English and Spanish (auto-detected from browser settings)
- No data collection, no analytics, no external connections

### Category
Developer Tools

### Language
English (default), Spanish

## Permission Justifications

These texts are ready to paste into the "Justify permissions" field during Chrome Web Store review.

### `system.display`
> Used to retrieve the dimensions and position of the user's active display (work area, excluding taskbar/dock). This information is required to calculate the exact pixel coordinates for positioning browser windows in the selected layout (columns, rows, or grid). No display information is stored, transmitted, or used for any purpose other than window positioning.

### `storage`
> Used to persist the IDs of windows created by the extension during a layout session. This allows the "Restore" feature to regroup all layout windows back into a single window, and enables automatic cleanup when windows are closed. Only internal window IDs and the layout type are stored locally. No user data, browsing history, or personal information is stored.

### `tabs`
> Used to query the user's open tabs in layout windows and move them back to the primary window during restore. The extension does not read tab URLs, titles, or page content. Tab access is limited to moving tabs between windows managed by the extension.

## Privacy Practices

For the Chrome Web Store privacy tab:

### Single Purpose Description
> Tilr positions browser windows in predefined screen layouts (two columns, two rows, or 2x2 grid) to help users work with multiple windows side by side.

### Data Usage Disclosure
- **Does not collect any user data**
- **Does not transmit any data to external servers**
- **Does not use analytics or tracking**
- **Does not access page content, URLs, or browsing history**
- **All data (window IDs for group management) is stored locally and cleared when the layout is restored**

### Remote Code
- **Does not use remote code** — all code is bundled in the extension package
