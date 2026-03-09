# Privacy Policy — Tilr

**Last updated:** March 9, 2026

## Overview

Tilr is a browser extension that positions browser windows in predefined screen layouts. It is designed with privacy as a core principle: **Tilr does not collect, store, or transmit any personal data.**

## Data Collection

Tilr does **not** collect any of the following:

- Personal information (name, email, address, etc.)
- Browsing history or visited URLs
- Page content or form data
- Cookies or authentication tokens
- IP addresses or location data
- Analytics, telemetry, or usage statistics

## Data Storage

Tilr stores only the following data **locally** on your device using Chrome's `storage.local` API:

- **Window IDs**: Internal numeric identifiers for the windows created during a layout session, used to manage the window group and enable the restore feature.
- **Layout type**: The name of the active layout (e.g., "1x2", "2x2"), used to display the current status in the popup.
- **Last used layout**: The most recently used layout type, used to highlight the corresponding button in the popup.

This data is:
- Stored exclusively on your device
- Never transmitted to any external server
- Automatically cleared when you restore a layout
- Contains no personal or identifiable information

## Permissions

Tilr requests the following browser permissions, used solely for window management:

| Permission | Purpose |
|-----------|---------|
| `system.display` | Read screen dimensions to calculate window positions. No display data is stored or transmitted. |
| `storage` | Save window IDs locally to manage layout groups and enable restore. |
| `tabs` | Move tabs between windows during layout operations and restore. Tab URLs and content are never read. |

## External Connections

Tilr makes **no network requests**. It does not connect to any external servers, APIs, or services. All functionality runs entirely on your device.

## Remote Code

Tilr does **not** load or execute any remote code. All code is bundled within the extension package.

## Third-Party Services

Tilr does **not** use any third-party services, SDKs, analytics platforms, or advertising networks.

## Changes to This Policy

If this privacy policy is updated, changes will be reflected in this document with an updated date. As Tilr does not collect any data, significant changes are unlikely.

## Contact

For questions about this privacy policy or the extension, please open an issue at:
https://github.com/aaronFortuno/Tilr/issues

## Source Code

Tilr is open source under the GNU GPL v3 license. The full source code is available at:
https://github.com/aaronFortuno/Tilr
