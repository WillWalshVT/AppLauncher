# AppLauncher

A static, browser-only launcher for locally developed web apps. This repository is independent of [PhoneCalculator](https://github.com/WillWalshVT/PhoneCalculator); no calculator is bundled here.

Intended Pages URL: **https://willwalshvt.github.io/AppLauncher/**

## Use

The fixed-height home screen has three actions:

- **Add an app → From this device:** choose app files or a built folder. Review its name, entry page and icon, then **Add to this device**. No signaling or external file transfer is used.
- **Add an app → From another device:** scan the sender's QR with the built-in camera scanner, or paste its link. Review the app and choose **Add to this device**.
- **Share an app:** choose files, review the icon and generate one QR/link. Keep the source page open through the other device's first installed launch.
- **My apps:** select a cached app to install, run, reshare without selecting its files again, or remove its cached package.

The document does not scroll. Long file forms and app lists scroll only inside their bounded panels. A running app controls its own viewport and scrolling.

Icons are read from an included web manifest, `apple-touch-icon` / favicon link, or `icon.png`. A generated letter icon is used otherwise. **Add new icon** replaces it with an uploaded image. Images are rasterized locally into a 512 px PNG and travel with the package. The receiver can replace an offered icon before adding the app.

## Each app installs separately

After adding an app, its install screen provides its own name, icon, manifest `id`, and direct launch URL:

```
launch.html?app=your-app-id
```

Use **Share → Add to Home Screen** on iPhone/iPad (enable **Open as Web App** when offered), **File → Add to Dock** in Mac Safari, or the browser's **Install app** control in desktop Chrome/Edge. A native install button appears where the browser supplies an install prompt. Web pages cannot silently install PWAs.

The installed icon opens that specific app in a full-size frame, with no launcher navigation. The root AppLauncher URL remains the library. Different IDs create different app installs; reusing an ID updates the package and retains that app's existing data. Native browser installation UI and duplicate-install behavior vary by OS/browser.

### Safari's separate PWA storage: important first launch

Safari **does not copy IndexedDB, Cache Storage or localStorage into a newly installed web app**. Cookies alone may be copied. There is no static-site API to bypass this. [WebKit explanation](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).

AppLauncher handles the two workflows explicitly:

1. **Received from another device:** the app's install URL retains a temporary, fragment-only bootstrap invitation and the accepted package hash. Open the installed icon once while online, within ten minutes, while the original source page stays open. The installed app receives the same package from that source automatically, without another QR scan. It checks the app ID/hash, saves its own files, and opens the app. The sender supports both the initial receive and this second transfer over the same QR room. Do not close the source after the first saved confirmation.
2. **Added from local files:** use **Save setup file** on the install screen. Open the installed icon, choose **Choose app files / setup file**, and select that `.applauncher` file (or choose the original files again). This copies files locally with no signaling service, network upload or external transfer. Browsers sharing the original storage need no second import.

Wait for **Offline ready** on first open before disconnecting. Later launches go straight to the cached app, even if the original invitation expires. If first setup fails or the source closes, the installed app offers file selection and QR/link reconnection. On iPhone a background Safari source tab can be suspended: prefer the original laptop source for first-launch transfer, or use the local setup-file fallback.

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
- Invitations use random 192-bit room and password values, expire after ten minutes, and remain valid for first-launch handoff. Keep links private. Credentials are in the URL fragment; fragments are not sent in HTTP requests.
- Payloads include a SHA-256 integrity check. Receivers explicitly consent to the app before saving; first-launch auto-receive is pinned to the app/hash already accepted.
- Limits: 250 files / 20 MB of file content per package, plus a bounded icon. Hidden files are excluded. ZIP import is not included. A failed transfer leaves the prior package intact.
- IndexedDB updates replace the package atomically. Browser storage and native app data survive shell cache updates. Cache cleanup removes only old AppLauncher shell caches in this scope.
- Browser storage can be cleared/evicted, or lost when an app is removed. Persistent storage is requested when available. Keep source files and setup-file backups.

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

Browser tests use real RTCDataChannels between separate browser contexts. CI substitutes a Nostr-compatible WebSocket signaling relay; production transport is unchanged. Tests cover local setup-file import into empty storage, a second transfer into an empty PWA context, unique manifests, custom icons, modules, dynamic imports, workers, streaming WASM, native IndexedDB, COOP/COEP, cached resharing and offline launch. Physical iPhone camera permission, OS installation UI and actual GPU rendering still need device verification.
