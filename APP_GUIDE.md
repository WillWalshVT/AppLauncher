# Build an app for AppLauncher

Start with [examples/counter/index.html](examples/counter/index.html). It runs as a single HTML file, uses per-app localStorage, and works offline.

## Files and paths

A single self-contained `.html` file is simplest. For a folder app, upload its **built output**:

```
my-app/
  index.html
  main.js
  worker.js
  style.css
  program.wasm
  data/config.json
  assets/icon.png
  manifest.webmanifest
  launcher.json
```

Choose the folder itself. AppLauncher strips the selected top directory and preserves nested paths. Select the HTML entry from the dropdown. Hidden files are omitted; include at most 250 files and 20 MB of file content. ZIP files are not extracted.

Use `./style.css`, `./main.js`, `new Worker('./worker.js')`, and `fetch('./program.wasm')`. Browser module resolution and `import.meta.url` work normally, so `new URL('./worker.js', import.meta.url)` also works. Import maps and computed dynamic imports do not need rewriting. Compilers/bundlers should produce a static build with relative base (`./`). Bundle package dependencies or include them locally.

Root-relative URLs such as `/assets/file.js` address the hosting origin, not your virtual app directory. Avoid them. Use hash routing or actual included HTML pages; AppLauncher does not invent SPA history routes or backend APIs.

## Name and icon

Set `<title>My app</title>`. Optionally include:

```html
<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" href="./assets/icon.png">
```

```json
{
  "name": "My app",
  "icons": [{"src":"./assets/icon.png","sizes":"512x512","type":"image/png"}]
}
```

AppLauncher reads these only to discover metadata, then creates its own distinct installation manifest. Name/entry/icon can be reviewed before adding or sharing. **Add new icon** accepts a replacement image and normalizes it to PNG. No icon? A letter tile is generated. The stable app ID controls updates and installation identity. Reuse it intentionally; use different IDs for different apps.

## WebAssembly and WebGPU

```js
const {instance} = await WebAssembly.instantiateStreaming(fetch('./program.wasm'));
if (navigator.gpu) {
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter) { const device = await adapter.requestDevice(); /* render / compute */ }
}
```

WebGPU depends on browser, OS, hardware and device policy; provide a fallback. For threaded WASM / SharedArrayBuffer, include `launcher.json`:

```json
{"name":"My app", "isolation":true}
```

Or enable isolation in the upload form. COOP `same-origin` and COEP `require-corp` are applied. External scripts/images/frames may need CORS/CORP; the launcher cannot alter someone else's response headers. The app shell reloads once when necessary to enter isolation. Camera and microphone still require permission; use normal browser APIs from a user gesture.

## Data and offline operation

Window localStorage/sessionStorage and IndexedDB names receive an app-ID prefix. Native app data is not sent when sharing; each receiver starts with its own data. Worker-owned IndexedDB, Cache Storage and other APIs should use app-specific names. Packages replace atomically without deleting existing app data.

The launcher service worker serves app assets offline. App-specific service-worker registration is not supported. External APIs and CDN files are available only with connectivity and normal CORS access. Everything required offline must be included in the package.

Apps are trusted code on a shared origin. They are not isolated from malicious peers. Never import unknown code expecting a PWA icon or manifest scope to provide a security boundary.

## Install and first launch

Every app gets `launch.html?app=<id>` and a separate install manifest. Use the OS/browser install action on that app's install screen. The browser decides whether/how installation is offered; a page cannot install silently.

Safari's installed PWA storage is separate. The receiving browser first obtains only the name, icon and installation metadata. Clicking Add prepares a unique PWA and temporary installation ticket. Open the new icon once while the original source remains open and online: the installed app connects automatically and receives the full package. The receiver's chosen icon travels with that package.

For locally selected files, the current tab is the source. Public signaling lets the new PWA connect back to it; files are not uploaded to a server. A same-device phone source may be suspended when switching to the installed app. Briefly return to the source tab if necessary; the installed app retries with the existing ticket. No setup file, repeat file selection or second QR scan is part of the flow. A laptop source is preferable for iPhone installation because it can remain active independently.

A QR is valid for ten minutes; a prepared installation gets its own one-hour ticket. Once files and shell are cached, the installed icon opens the app directly offline. The browser/OS still requires installation confirmation; pages cannot silently create PWA icons.

The root launcher lists apps stored in the current browser container. It cannot enumerate or synchronize the separate private stores belonging to Safari-installed PWAs. Keep app source files as backups.
