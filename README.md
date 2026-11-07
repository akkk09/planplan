# planplan

A small, installable daily planner built around a fixed study routine. The app is a static PWA with Cloudflare Pages middleware for server-side password protection. No framework, database or build step is required.

## Features

- Live view of the current and next schedule block.
- Daily check-offs and a progress summary.
- Focus timer with 25, 50 and 90 minute presets, plus a custom duration.
- Per-block focus notes and a note for planning tomorrow.
- Weak-topic tracker for Physics, Chemistry, Mathematics and other subjects, with progress status.
- Dated daily journal with editable past entries.
- Editable routine, including adding and removing blocks.
- Local-first storage. Your routine, notes, check-offs and journal entries stay in this browser.

## Password protection

The app must be hosted on **Cloudflare Pages** for password protection to work. The global Pages Function in `functions/_middleware.js` checks every request, including HTML, JavaScript, CSS, icons and the manifest, before Cloudflare serves the file. It uses HTTP Basic Authentication over HTTPS.

The middleware fails closed: if its password hash is missing or invalid, the site returns an error instead of exposing the app.

### Deploy on Cloudflare Pages

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Choose **Create application → Pages → Connect to Git**.
3. Connect GitHub and select `akkk09/planplan`.
4. Set the production branch to `main`. Leave the build command blank and set the build output directory to `.` (the repository root).
5. Create the project and wait for its first deployment.

Cloudflare Pages detects the `functions/` directory automatically. See the [Cloudflare Pages Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Pages middleware guide](https://developers.cloudflare.com/pages/functions/middleware/).

### Set the password

Choose a strong, unique password. On your computer, generate its SHA-256 hash without a trailing newline:

```sh
read -rsp "Planplan password: " PLANPLAN_PASSWORD
printf '\\n'
printf %s "$PLANPLAN_PASSWORD" | sha256sum
unset PLANPLAN_PASSWORD
```

Copy the 64-character hex digest. In Cloudflare, open your Pages project → **Settings → Variables and Secrets → Add**. Add this variable:

- Name: `PLANPLAN_PASSWORD_SHA256`
- Value: the 64-character hash
- Environment: **Production** (also set it for Preview if you want preview URLs protected)

Save the setting and trigger a new deployment. Do not put the password or its hash in this repository. Use a long passphrase; a weak password can be guessed from its hash.

When you open the site, your browser will show a username/password prompt. The username can be any value; enter your chosen password in the password field.

### Important: turn off the old GitHub Pages site

GitHub Pages cannot enforce this password check. The old public deployment may remain reachable even after Cloudflare is set up.

After confirming that the Cloudflare Pages URL works and prompts for a password, open [Repository Settings → Pages](https://github.com/akkk09/planplan/settings/pages) and disable GitHub Pages (set the source to **Deploy from a branch** only if you intend to keep a public branch site; otherwise disable/remove the Pages deployment source). Also check that the old `https://akkk09.github.io/planplan/` URL no longer serves the app.

The old GitHub Pages deployment workflow has been removed so future pushes will not republish an unprotected copy.

## Run locally

Serve this folder over HTTP. For example:

```sh
python -m http.server 4173
```

The local development server does not enforce the Cloudflare password check.

## Storage and offline use

Routine data, notes, check-offs, weak topics, journal entries and timer state stay in browser local storage. They do not sync between devices. The service worker and offline cache have been retired so cached app files cannot bypass the server-side password check.

## License

MIT. See [LICENSE](LICENSE).
