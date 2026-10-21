# AppLauncher

A static, browser-only launcher for locally developed web apps. This repository is independent of [PhoneCalculator](https://github.com/WillWalshVT/PhoneCalculator); no calculator is bundled here.

Live Pages URL: **https://willwalshvt.github.io/AppLauncher/**

## Build an app from an idea

Give ChatGPT/Codex this repository link and your app description. Start with the [complete developer guide](APP_GUIDE.md), [ready-to-paste agent prompt and delivery workflow](AGENT_GUIDE.md), and [working starter app](examples/starter). [AGENTS.md](AGENTS.md) directs coding agents to the implemented contract.

```text
Build a complete static web app for AppLauncher using
https://github.com/WillWalshVT/AppLauncher.
Read AGENT_GUIDE.md and APP_GUIDE.md first.
My app should: [describe the app].
Build and test a ready-to-share output folder. If you have browser upload
access, generate a live QR through AppLauncher and keep the sender open.
I will scan it and confirm the phone's Home Screen installation.
```

The supported route is **describe → build → validate → share from laptop → scan → confirm install → open → automatic transfer → offline app**. No per-app hosting is required. Full browser sharing automation depends on the agent's local file-upload/browser access; there is no publishing API or permanent QR service. The guides distinguish those limits from steps that are automatic today.

Preflight the included starter, or your own completed output, with no dependency installation:

```sh
node scripts/validate-app.mjs examples/starter --id pocket-notes
node scripts/validate-app.mjs /path/to/your-app/dist --id your-app-id --json
```

The checker validates static packaging conventions; it does not replace runtime/device tests. For engine development and hosting, use [Develop and publish](#develop-and-publish) below.

## Use

The fixed-height home screen has three actions:

- **Add an app → From this device:** choose app files or a built folder. Review its name, entry page and icon, then **Add to this device**. The selected files stay in that source tab until the installed app opens; its new storage receives them automatically.
- **Add an app → From another device:** scan the sender's QR with the built-in camera scanner, or paste its link. Review its name/icon and choose **Add to this device**. Only metadata is received at this point; the full files transfer after installation.
- **Share an app:** choose files, review the icon and generate one QR/link. Keep the source page open through the other device's first installed launch.
- **My apps:** select a cached app to install, run, reshare without selecting its files again, or remove its cached package.

The document does not scroll. Long file forms and app lists scroll only inside their bounded panels. A running app controls its own viewport and scrolling.

Icons are read from an included web manifest, `apple-touch-icon` / favicon link, or `icon.png`. A generated letter icon is used otherwise. **Add new icon** replaces it with an uploaded image. Images are rasterized locally into a 512 px PNG and travel with the package. The receiver can replace an offered icon before adding the app.

## Updating the engine

Choose **Update AppLauncher** in the launcher footer. It fetches the current GitHub Pages release, downloads and activates its engine, verifies the version and offline shell, and reloads the page. The footer shows the running engine version. Cached packages, pending installation tickets, IndexedDB, localStorage and app data are retained; only obsolete launcher shell caches are replaced. Source transfers may need a fresh QR after an explicit reload.

If an older cached engine has no update action, open [the recovery page](https://willwalshvt.github.io/AppLauncher/update.html) once in that browser. It is a separate network-first page that can replace old cache-first workers without clearing browser history or storage. It only manages this project's service worker. Retry and Go back remain available if an update cannot complete.

The launcher checks for newer releases on startup. It automatically reloads an idle launcher when the new worker takes over, but does not interrupt uploads, sharing, transfers or a running app. Those pages can use the update link or load the new engine next time they open. Separately stored installed PWAs check for engine updates in their own browser container when opened.

## Each app installs separately

After receiving shared metadata, the phone navigates to an actual app-specific document. Its initial HTML response contains the app name, Apple Home Screen title, unique manifest URL and icon URL before any JavaScript runs. This avoids installing with the identity of the original AppLauncher document. Its install screen provides its own name, icon, manifest `id`, and direct launch URL:

```
launch.html?app=your-app-id
```

Use **Share → Add to Home Screen** on iPhone/iPad (enable **Open as Web App** when offered), **File → Add to Dock** in Mac Safari, or the browser's **Install app** control in desktop Chrome/Edge. Clicking **Add to this device** immediately starts the app-specific installation step. A native install prompt is requested automatically when the browser exposes one and the user gesture is still active; otherwise an **Install** button or precise OS instructions are shown. Web pages cannot silently install PWAs or open the iPhone Add to Home Screen sheet programmatically.

The installed icon opens that specific app in a full-size frame, with no launcher navigation. The root AppLauncher URL remains the library. Different IDs create different app installs. A same-ID import replaces the package in the receiving storage container while retaining its existing app data; it does not automatically update separately installed PWA containers. Native browser installation UI and duplicate-install behavior vary by OS/browser.

### Install first, transfer on first open

Safari does not copy IndexedDB, Cache Storage or localStorage into a newly installed web app. [WebKit explanation](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/). AppLauncher therefore prepares installation **before** sending app files:

1. On the laptop, choose **Share an app**, upload files, choose the name/icon/settings, then **Generate QR**. Scan it once with the phone camera; the phone automatically receives the name/icon and opens installation instructions. Local import and the manual receiver remain available.
2. AppLauncher automatically prepares the shared app's unique manifest, name, icon and direct launch URL. Confirm **Install / Add to Home Screen** using the browser/OS control. Manual local imports use **Add to this device** first.
3. Open the new app icon. Its temporary installation ticket reconnects to the original source automatically and fetches the pinned package. A receiver-selected icon is included in this package.
4. Once the laptop confirms saving and the phone opens the intended application, the source may close. Transfer controls disappear; later launches open the app directly offline.

There are no setup-file downloads, repeated file selections, or second QR scans. For a local import, the original browser tab is the source; for a shared app, the original sharing device stays the source. Public signaling is used to connect a fresh PWA storage container even when source and destination are on the same device. Files remain peer-to-peer.

The share QR expires after ten minutes. Preparing installation creates a separate installation session valid for one hour, so the QR may expire while the already prepared app finishes setup. Keep the source page open and online through the first installed launch. Idle connections retry up to three times using the saved ticket, then show a clear Retry connection action. A progressing transfer is never restarted by a fixed timer. Both devices show transfer bytes and percentage; cached launches hide the transfer interface entirely. A phone may suspend its own background Safari source tab: briefly return to that source tab to let it resume; no file upload or QR scan is required. AppLauncher cannot force a suspended iOS tab to run in the background. A source on another device avoids that same-device suspension issue.

Pending install metadata is stored separately from runnable app packages. An incomplete install does not overwrite an existing cached package. Expired or closed source sessions cannot provide files; the UI explains that installation must be prepared again at the source.

Each Safari PWA can have its own storage container. The main library lists packages available in the **current browser/container**; it cannot enumerate another PWA's private storage. Add apps in the main browser library to keep that browser's collection together. Removing a cached app from that library does not remove a separately installed PWA's copy, and vice versa. There is no cloud catalog or background synchronization.

## Supported web technologies

App files are stored in IndexedDB and served by the launcher's service worker under `apps/<id>/…`, using normal HTTP-style same-origin URLs and correct MIME types. This replaces the earlier opaque `srcdoc` / data-URL runner, which prevented normal workers, IndexedDB and many web APIs.

Supported by the host when available in the browser:

- HTML, CSS, images, SVG, fonts, audio/video (including byte-range responses).
- Classic JavaScript, ES modules, computed dynamic imports, import maps and relative navigation.
- Native fetch/XHR of included files, module/classic web workers, IndexedDB, Cache Storage, Canvas/WebGL.
- WebAssembly, including streaming instantiation with `application/wasm`.
- WebGPU on compatible browser/device/hardware. AppLauncher does not emulate unavailable APIs; apps should feature-detect `navigator.gpu` and handle adapter failures.
- Optional cross-origin isolation for `SharedArrayBuffer` / threaded WebAssembly: include `{"isolation":true}` in `launcher.json` or select it in App settings. AppLauncher applies COOP/COEP to the controlling app shell and app documents. External embedded resources then require compatible CORS/CORP headers.
- Permission-gated APIs such as camera/microphone where the browser supports them; users must grant permission.

Use relative asset URLs and build framework apps with base `./`. Root-relative `/assets/…` URLs target the real hosting origin, not a package. Include all files required offline. External APIs/CDNs can work online subject to normal CORS and browser policies; they are not cached automatically. Backend servers, Node/Python executables, private server routes, history-router fallbacks, and arbitrary custom response headers are not provided. Hash routing works. App-owned service workers are not supported: their registration scripts cannot be installed from a virtual file, and the launcher owns offline serving. Prefer native workers for app computation.

### Trust model

Only load code you trust. Apps run with normal same-origin access, not in a security sandbox. PWA manifest IDs/scopes are installation metadata, **not separate security origins**. App code can access shared-origin storage or network and, if malicious, interfere with the launcher or other apps. Use a dedicated hosting origin for untrusted apps. Separate GitHub Pages project repos on `willwalshvt.github.io` are still the same origin.

The runtime prefixes ordinary window `localStorage`, `sessionStorage` and IndexedDB names with the app ID to avoid accidental collisions. This is compatibility namespacing, not a security boundary. Code in workers and other native APIs should use app-specific database/cache names. All browser APIs retain normal browser restrictions.

## Transfer, storage and deployment lessons

- No local server, certificate workaround, account, API key, or paid backend is needed for use.
- Public Nostr relays through Trystero handle discovery/signaling. Files travel over an encrypted WebRTC data channel; no file-hosting upload or GitHub write occurs when sharing.
- Both devices need internet for discovery; same Wi-Fi is preferred. No TURN relay is configured, so some restrictive networks/NAT combinations will fail. Public relay availability varies.
- Invitations use random 192-bit room and password values. Share QR invitations expire after ten minutes; per-install tickets expire after one hour. Keep links private. Credentials are in the URL fragment; fragments are not sent in HTTP requests.
- Payloads include a SHA-256 integrity check. Scanning a share QR opens installation instructions; the user confirms OS installation before first launch; first-launch auto-receive is pinned to the app/hash in the prepared installation ticket.
- Limits: 250 files / 20 MB of file content per package, plus a bounded icon. Hidden files are excluded. ZIP import is not included. A failed transfer leaves the prior package intact.
- IndexedDB updates replace the package atomically. Browser storage and native app data survive shell cache updates. Cache cleanup removes only old AppLauncher shell caches in this scope.
- Browser storage can be cleared/evicted, or lost when an app is removed. Persistent storage is requested when available. Keep source files as backups.

See [APP_GUIDE.md](APP_GUIDE.md) for app conventions and [ARCHITECTURE.md](ARCHITECTURE.md) for implementation details.

## Develop and publish

Node.js 22+, pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:browser
pnpm run publish:prepare
```

Commit sources and refreshed **root** assets together. Enable **GitHub Settings → Pages → Deploy from a branch → main → / (root)**. `.nojekyll` is included. CI tests the build; Pages itself deploys from the branch.

Optional foreground development preview: `pnpm start` at localhost:8080. This is never required on the user's laptop for sharing.

Additional verification:

```sh
# Real public relays instead of the deterministic test relay:
LIVE_SIGNALING=1 node tests/browser.mjs
# Safari engine (real signaling; test stops the server to check offline):
pnpm exec playwright install webkit
LIVE_SIGNALING=1 TEST_BROWSER=webkit node tests/browser.mjs
# Deployed site:
BASE_URL=https://willwalshvt.github.io/AppLauncher/ node tests/browser.mjs
```

Browser tests use real RTCDataChannels between separate browser contexts. CI substitutes a Nostr-compatible WebSocket signaling relay; production transport is unchanged. Tests cover metadata-only staging, deferred transfers from both local and remote sources into empty PWA storage, unique manifests, custom icons, modules, dynamic imports, workers, streaming WASM, native IndexedDB, COOP/COEP, cached resharing and offline launch. Physical iPhone camera permission, OS installation UI and actual GPU rendering still need device verification.
