# planplan

A small, installable daily planner built around a fixed study routine. It is a static PWA: no framework, server, account, database, API key or build step is required.

## Features

- Live view of the current and next schedule block.
- Daily check-offs and a progress summary.
- Focus timer with 25, 50 and 90 minute presets, plus a custom duration.
- Per-block focus notes and a note for planning tomorrow.
- Editable routine, including adding and removing blocks.
- Local-first storage with offline support after the first visit.
- Responsive layout for phones, tablets and desktop browsers.

All routine data, notes, check-offs and timer state stay in the browser's local storage. They do not sync between devices.

## Default routine

| Time | Block |
| --- | --- |
| 23:00–06:00 | Sleep / wake up |
| 07:00–08:00 | Revise |
| 09:00–12:00 | 3-hour test |
| 12:00–13:00 | Analyze test |
| 15:00–17:00 | Weak areas |
| 18:00–19:30 | Continue weak areas |
| 21:30–22:30 | Allen tests |
| 22:30–23:00 | Plan tomorrow |

The overnight block is shown first. Times are interpreted in the device's local timezone. The gaps between listed blocks stay open.

## Run locally

Serve this folder over HTTP. For example:

```sh
python -m http.server 4173
```

Then open <http://localhost:4173>.

## Deploy to Vercel

1. Import `akkk09/planplan` from GitHub in Vercel.
2. Keep the Framework Preset as **Other**.
3. Leave Build Command and Output Directory empty; the app is served from the repository root.
4. Deploy.

The included `vercel.json` sets the service worker headers. HTTPS is required for PWA installation outside localhost.

## Install

- **Android / Chromium:** use the browser's Install app option.
- **iOS / iPadOS:** use Share → Add to Home Screen in Safari.
- **Desktop:** use the install icon in a supported browser's address bar or menu.

## Privacy and storage

This app does not send your data to a server. Clearing the browser's site data removes saved routine edits, notes and check-offs. There is no automatic cross-device sync or backup.

## License

MIT. See [LICENSE](LICENSE).
