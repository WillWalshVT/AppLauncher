# Develop an app for AppLauncher

AppLauncher turns a folder of static web files into an independently installed phone app. Build your application with ordinary HTML, JavaScript, CSS and assets. AppLauncher handles the app's installation name/icon, QR pairing, WebRTC transfer and offline asset serving. The app itself does not need to know how sharing works.

This guide describes the **implemented contract**, not a proposed SDK. Start with the laptop → iPhone workflow. For a ready-to-paste ChatGPT/Codex request and agent handoff rules, use [AGENT_GUIDE.md](AGENT_GUIDE.md). For transport internals, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. The shortest route from idea to phone

1. Copy [examples/starter](examples/starter) into your own project folder. It is a complete, dependency-free notes app with an icon, persistent storage and JSON backup/import. [examples/counter/index.html](examples/counter/index.html) is the smallest single-file example.
2. Change the application, its HTML title, `launcher.json` name and icon. Keep asset paths relative.
3. Run the [static preflight](#7-validate-the-output) against the actual folder you will share. Test the app's behavior in a browser.
4. Open [AppLauncher](https://willwalshvt.github.io/AppLauncher/) on the laptop. Choose **Share an app → Choose folder**. Select the app folder, or a framework's built output folder. Review name, entry page, icon and **App settings → App ID**. Choose **Generate QR**.
5. Scan the QR with the phone's normal camera. The phone receives only installation metadata and shows the shared app's name/icon and installation instructions.
6. In Safari, choose **Share → Add to Home Screen**, leave **Open as Web App** enabled when offered, and confirm Add. Open the new app icon while the laptop's sharing page remains open.
7. The installed app receives its files automatically, verifies them, saves them, and opens your application. The laptop confirms saving; the phone's transfer screen disappears. Close the laptop source after that confirmation, then verify the app reopens offline.

No local hosting server is required for sharing. GitHub Pages hosts the generic launcher; your app files are selected locally and travel directly over WebRTC. Internet is needed for initial loading/signaling. Same Wi-Fi is preferred. No TURN service is configured, so some restrictive networks cannot establish a connection.

**What can be automated:** an agent with filesystem and browser upload access can build, validate, upload the output, choose settings and generate the QR. Keep that sender page open. The phone owner must scan and confirm the OS installation. AppLauncher currently has no headless publishing API, CLI that creates a live sharing session, or persistent public app-hosting endpoint. CI cannot leave a useful QR behind after its sender process exits. See [the automation contract](AGENT_GUIDE.md#automation-contract).

## 2. Deliverable format

### A single-file app

A self-contained `index.html` with inline CSS/JavaScript is valid. Include a `<title>` and viewport metadata. You can choose a custom icon in AppLauncher's upload form.

### A folder app

```text
my-app/                  ← select this folder in AppLauncher
  index.html             ← default entry page
  main.js
  style.css
  launcher.json           ← optional metadata; not executable
  icon.svg                ← optional icon; converted to PNG by the launcher
  assets/
    photo.webp
  workers/
    compute.js
  data/
    defaults.json
  program.wasm
```

Only include files the browser needs. Framework source projects, `node_modules`, tests, Git folders, credentials and development tooling belong outside the deliverable. For a compiled application, select `dist/` (or the equivalent completed static output), not the source project.

| Property | Contract |
| --- | --- |
| Entry | An included `.html` or `.htm` file; choose it in the upload form. `index.html` is the recommended default. |
| Files | 1–250 non-hidden files, including icons/configuration and all nested assets. |
| Total file content | At most 20 × 1024 × 1024 bytes (20 MiB). Transfer size is larger because packaging adds encoding and metadata. |
| Paths | Relative paths, at most 300 characters; no traversal, absolute paths, backslashes, control characters, `?`, `#`, `%` or `:` in file names. Ordinary spaces in names are allowed but simple names are easier. |
| Folder selection | The selected top directory is stripped; nested paths are preserved. Use **Choose folder** for nested assets. Selecting separate files does not reconstruct their original directory tree. |
| Hidden files | Files/directories whose names begin with `.` are omitted. Do not depend on them. |
| Archives | ZIP files are not unpacked. Select an extracted app folder. |
| Backend | No server-side code, Node runtime, database server, framework SSR server or private API route is provided. |

## 3. Name, icon, identity and settings

Minimal metadata:

```html
<title>Field Notebook</title>
<link rel="icon" href="./icon.svg" type="image/svg+xml">
```

Optional `launcher.json` at the selected folder root:

```json
{
  "name": "Field Notebook",
  "isolation": false
}
```

These are the only recognized `launcher.json` settings. In particular, `id`, `entry`, `start_url`, `scope` and `version` in that file do **not** configure the launcher. Set the app ID and entry in the upload form. An optional linked web manifest can supply a name and local icon candidates, but its installation/start URL settings are not copied into the installed app's launcher manifest.

Current name discovery starts with the entry's title, then an optional `launcher.json` name, then a linked web manifest's `name` / `short_name` if supplied. Avoid conflicting names. The upload form remains the final review point.

For icons, the launcher tries included linked manifest icons, then `apple-touch-icon` / favicon links, then root `icon.png` / `favicon.png`. It generates a letter tile if none is found. Referenced image files must be included; metadata discovery does not download remote icons. PNG, JPEG, WebP and supported SVG input can be normalized locally to a 512 × 512 PNG. A square icon with a clear central design works well. **Add new icon** replaces the discovered image before QR generation.

The app ID must match `[a-z0-9][a-z0-9-]{0,47}`. AppLauncher initially derives it from the discovered name. Record the chosen ID in the app's delivery instructions and explicitly set it in **App settings** when necessary. Two different apps need different IDs. The ID influences package identity, install URL and ordinary window-storage namespacing; the display name is not a substitute for it.

For laptop → phone installs, AppLauncher performs a real navigation to an install document whose initial HTML includes that app's name, Apple Home Screen title, unique manifest and icon URLs. Do not implement a separate install prompt, QR protocol or PWA identity inside your app.

## 4. Paths, modules and frameworks

The running app is a same-origin frame with asset URLs similar to:

```text
https://willwalshvt.github.io/AppLauncher/apps/field-notebook/index.html
```

Write files as if the folder were served at an arbitrary nested URL:

```html
<link rel="stylesheet" href="./style.css">
<script type="module" src="./main.js"></script>
<img src="./assets/photo.webp" alt="Mountain overlook">
```

```js
import {calculate} from './math.js';
const defaults = await fetch('./data/defaults.json').then(r => r.json());
const worker = new Worker(new URL('./workers/compute.js', import.meta.url), {
  type: 'module'
});
```

`import.meta.url`, relative module imports, dynamic imports and import maps use native browser behavior. Bare package imports such as `import x from 'some-package'` need a local bundle or an import map that resolves to included files. npm packages are not installed on the receiving phone.

Avoid `/assets/main.js`, `<base href="/">`, hard-coded development-host URLs, `localhost` API calls, and absolute links back to a source project's domain. Root-relative paths address the GitHub hosting origin, not your package. A relative URL in a module is resolved according to the particular API: use `new URL('./asset', import.meta.url)` when you want a URL relative to that module rather than the HTML document.

React, Vue, Svelte and similar client frameworks are usable when built to static files with a relative asset base. Choose hash routing, or navigate among actual included HTML pages. A path such as `./tasks/42` will not be rewritten to `index.html`; there is no general history-router fallback. Framework SSR, server actions and development servers are not part of the runtime. Inspect the final output rather than assuming a successful framework build implies compatibility.

Do not register your own service worker or add a framework PWA plugin that takes over the launcher's scope. AppLauncher already supplies offline serving and installation. A normal web worker for app computation is different and is supported.

## 5. Browser capabilities

| Technology | How to use it |
| --- | --- |
| HTML/CSS/JavaScript | Ordinary static files, modules, forms, Canvas and browser rendering. Use current Safari-compatible syntax or transpile to your chosen target. |
| Images, fonts, audio/video | Include them locally. Normal browser decoding rules apply. The host supports single byte-range responses for media. |
| JSON, computed imports, workers | Relative assets are served with native URLs. Include every file that can be requested. |
| WebAssembly | Include `.wasm` files; the host supplies `application/wasm` for streaming instantiation. |
| WebGL / WebGPU | Feature-detect and handle missing/lost contexts, missing adapters and request failures. The launcher does not supply GPU support or a polyfill. |
| SharedArrayBuffer / threaded WASM | Enable `isolation:true` only when required; check `crossOriginIsolated`. External resources then need compatible CORS/CORP behavior. |
| Camera, microphone, clipboard, fullscreen, sharing, downloads | Subject to the target browser, frame policy, permissions and user-gesture requirements. Test on the real phone; do not assume desktop behavior. |
| External network APIs | Require connectivity, HTTPS, CORS and any necessary credentials. The launcher is not a backend proxy. |

Example feature checks:

```js
const {instance} = await WebAssembly.instantiateStreaming(fetch('./program.wasm'));

if (navigator.gpu) {
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter) {
    const device = await adapter.requestDevice();
    // Use device, and handle device.lost in a real application.
  }
} else {
  // Offer a CPU/WebGL fallback or explain the unavailable feature.
}

if (!crossOriginIsolated) {
  // Fall back to unthreaded processing rather than waiting forever.
}
```

Static app files are visible to the recipient. Never embed a secret API key, private token or credential in them. Network-dependent features should have explicit loading, failure and offline states.

## 6. Data, offline behavior and mobile design

### App data is separate from app files

Your app owns its data model. Use browser storage and provide migrations when that model changes. The launcher prefixes ordinary **window** localStorage/sessionStorage and IndexedDB database names by app ID to reduce accidental collisions. You can use normal `localStorage.getItem('settings')` in window code. Worker-owned storage, Cache Storage, BroadcastChannel and other native APIs should use explicit app-specific names. This namespacing is not a security boundary.

Sharing transfers code/assets, not the sender's localStorage or user databases. Include default data in a JSON asset when appropriate. Implement an explicit export/import flow for personal data that users should move or back up. Catch storage failures and validate imported data before replacing existing records; the starter demonstrates these patterns.

The launcher serves included files offline after the first transfer finishes. It does not automatically cache remote APIs, CDN libraries, Google Fonts or external media. Bundle offline dependencies and test with connectivity disabled, not just with the sender page closed. Browser storage can be evicted or removed; it is not a permanent backup.

Safari can give an installed PWA its own storage container. The main launcher's **My apps** lists apps available in the current container, not every separately installed app on the device. A cached app's data should not be assumed to exist in a different browser or PWA.

All apps use normal same-origin browser access. A manifest ID, frame, or different PWA icon does not isolate malicious code from other same-origin storage. Run only trusted apps; use a separate origin if you need a security boundary.

### Design for a phone first

Include viewport metadata; use responsive layouts, readable type, touch-friendly controls and safe-area insets. `100dvh` can help fit the dynamic browser viewport. The launcher fills the installed window and then hides its controls; your application controls its own scrolling. Avoid depending on a desktop keyboard, hover or browser chrome.

Make interactive controls labeled and keyboard-accessible. Use visible focus, semantic HTML, useful empty/error states and polite status announcements. Long calculations should use a worker or yield so the interface stays responsive. Do not leave a spinner running indefinitely when a capability, network call or database operation fails.

## 7. Validate the output

The repository includes a dependency-free Node preflight. Run it from an AppLauncher checkout, against your separate app's completed output:

```sh
node scripts/validate-app.mjs /path/to/my-app/dist --entry index.html --id field-notebook
# Machine-readable result for an agent or CI:
node scripts/validate-app.mjs /path/to/my-app/dist --id field-notebook --json
# Validate the supplied starter directly:
node scripts/validate-app.mjs examples/starter --id pocket-notes
```

Use Node.js 22 or later, consistent with this repo's development environment. The checker reports file count/bytes, package path/entry problems, unsupported configuration fields, missing quoted HTML resource references, root-relative resource paths, and CSS `url()` references. Symlinks must be copied into the output rather than depending on external targets. Exit status is 0 for a passing static check, 1 for compatibility errors, and 2 for CLI/filesystem failures. Warnings do not fail the check. `--id` validates the proposed ID; it does not set the upload form.

This is a static preflight, not a full HTML/CSS/JavaScript parser or execution test. It does not prove that dynamic imports, fetch calls, CSS imports, permissions, GPU code, relative navigation, business logic, or every unquoted/source-set URL works. Review warnings, then perform the runtime checks below. Do not package `node_modules` just because the checker can enumerate a folder.

### Acceptance checklist

- [ ] Output is standalone static files, with no required dev server or secret credentials.
- [ ] Entry, display name, ID, icon and isolation choice are recorded.
- [ ] Actual output passes the preflight; warnings are reviewed.
- [ ] Core application behavior has appropriate tests and no uncaught browser errors.
- [ ] Assets, modules, dynamic imports, workers and navigation work under a nested URL.
- [ ] Phone layout, touch interaction, accessibility and error states are checked.
- [ ] The laptop can select the output and show the intended icon/settings before QR generation.
- [ ] Scanning one QR leads to the **shared app's** installation identity.
- [ ] A fresh installed context receives all files, reports progress, and then shows only the app.
- [ ] Data survives reload; closed-source/offline relaunch works as intended.
- [ ] Unsupported capabilities and denied permissions have a usable outcome.
- [ ] Backup/import and data migrations are tested when the app stores valuable user data.

A desktop WebKit test helps catch Safari-engine issues but does not replace confirming the physical iPhone Home Screen sheet, permissions and hardware behavior. Say which checks were actually performed.

## 8. QR delivery and automation boundaries

A sharing QR is a temporary connection to a live sender page, not an uploaded application release. Its invitation lasts ten minutes; opening it and preparing installation creates a separate one-hour transfer ticket. Keep the original laptop source open until saving is confirmed. Restart sharing to make a fresh QR if the source closed or a ticket expired.

A browser agent may use the launcher's existing UI and set a file input from local output when its tools support that operation. It should leave the sender tab visible/open and hand off the generated QR or link. It must not claim to have delivered a working QR by embedding local app files in an arbitrary URL, making an expired screenshot, or closing its sender after testing. There is no special AppLauncher JavaScript SDK to call from the app itself.

If browser/file-upload automation is unavailable, deliver the output folder and the exact **Share an app → Choose folder → Generate QR** instructions. That is a complete build handoff, but it is not a completed live sharing session. A chat without a filesystem/browser connection cannot operate the user's laptop merely from a repository link.

Uploading app code to GitHub or hosting each app separately is optional and distinct from this workflow. Do not change the AppLauncher engine repository or publish personal app source there just to transfer an app to a phone.

## 9. Versions, app updates and engine updates

Keep your app source under version control and record its release/version in your own delivery notes. AppLauncher computes a package digest for integrity and pins a prepared transfer to those exact bytes. It does not use a custom app `version` field to discover new releases.

A same-ID import replaces the package in the container that receives it, while ordinary existing app data is retained. This is **not** automatic synchronization into separately installed PWAs. Existing installed contexts prefer their cached app; a new QR does not promise an in-place upgrade of every installed copy. Plan and verify an upgrade/data-migration path for your app. A separate versioned ID plus explicit data export/import is an option when independent version installs are needed. Do not promise silent cross-container app updates.

The **engine** is different. Use **Update AppLauncher** in its footer to load the current generic launcher without clearing saved apps/data. The footer shows its eight-character engine version. For an older cached launcher without that action, open [the recovery page](https://willwalshvt.github.io/AppLauncher/update.html) in the same browser. Generate a fresh sharing QR after reloading a source page. Engine updates do not publish a new version of your app's code.

## 10. Troubleshooting

| Symptom | Check |
| --- | --- |
| Home Screen sheet says AppLauncher | Update the engine, generate a fresh QR, and wait for the intended app's install page. Do not install the generic home page. An existing incorrect shortcut is a different installation; install the shared app again. |
| Old launcher UI persists | Use the recovery link above; do not start by clearing site data or browser history. |
| Connection never succeeds | Keep the original sender page open, check connectivity, try the same Wi-Fi, and use the retry action. Restrictive networks may need a different network. |
| QR/session expired | Generate a fresh QR from the laptop and prepare installation again. A QR cannot retrieve files after its source disappears. |
| Scripts/CSS/assets are missing | Select the built folder, preserve nested files, remove root-relative paths and verify letter case. Inspect fetch failures and run preflight. |
| SPA route returns a missing-file response | Use hash routing or include the actual HTML file. There is no general server rewrite. |
| Works online but fails offline | Include external libraries/fonts/data locally, and test after initial transfer with networking disabled. |
| Data is missing on another device | Sharing moves app files, not user databases. Use the app's data export/import. |
| WASM threading or GPU fails | Feature-detect, verify isolation where needed, test the target hardware, and provide a fallback. |
| Backend feature fails | Move it to browser-side logic or explicitly supply an external API with appropriate connectivity/CORS. The launcher does not run servers. |

## 11. If you are developing the engine itself

This is a different task from building an app. See [README.md](README.md#develop-and-publish) for engine dependencies, tests, building and branch-root Pages deployment. Sources live in `src/` and `public/`; published generated assets also live at the repository root. Rebuild/publish those assets when changing the engine. App authors do not need to fork or redeploy AppLauncher to use it.
