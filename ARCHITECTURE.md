# Architecture and design decisions

## Static boundaries

GitHub Pages serves the shell, bundled libraries and a static `launch.html`. No laptop process or certificate is needed. Branch publishing uses compiled root assets. `src/` remains editable source. The calculator project remains untouched in its own repository.

All paths are based on the deployment directory, not `/`, so project Pages subpaths work. Browser IndexedDB name and shell cache prefix include the project path; AppLauncher cache cleanup cannot accidentally delete PhoneCalculator caches. This path separation is not same-origin security isolation.

## Source modules

- `launcher.js`: fixed-viewport screens, import/share/receive/library, icons and install flow.
- `package.js`: bounded relative paths, MIME types, base64 transport, icon metadata, SHA-256 and validation.
- `icons.js`: inert HTML/manifest metadata discovery and local image rasterization.
- `pairing.js`: expiring credentials, public Nostr discovery, WebRTC actions, per-peer transfer and acknowledgements.
- `scanner.js`: camera stream, local jsQR decoding, cancellation and track cleanup.
- `store.js`: atomic IndexedDB package records, scoped by project path.
- `manifest.js`: stable app IDs, direct launch URLs, generated install manifests.
- `sw.js`: atomic shell caching, package-backed virtual file responses, manifests/icons, range requests and isolation headers.
- `public/runtime.js`: ordinary window storage namespacing injected before app scripts.

The UI uses text escaping for package metadata; app scripts never execute during metadata discovery. They execute only after the user accepts and opens a trusted app.

## Protocol

The QR holds a random room/password and ten-minute expiry in the fragment. Trystero uses public Nostr relays only for peer discovery / WebRTC SDP. Its encrypted RTCDataChannel sends:

1. `hello`: sender vs receiver role.
2. `offer`: app ID, name, entry, bounded file/byte count, normalized PNG icon and digest.
3. `accept`: selected digest, after user consent or a pinned installed-app bootstrap.
4. `payload`: chunked bytes of a JSON/base64 package.
5. `receipt`: digest, after validation and committed IndexedDB save.

The sender keeps the room open through expiry/cancel, because a separately installed Safari PWA needs a second transfer. Multiple peers can fetch the same accepted package; receipt does not shut the source down. The receiver closes its connection after receipt. Progress and disconnect errors are surfaced. No TURN relay is included.

A digest detects corruption and pins an automatic handoff to the offered package. It does not prove a publisher's identity. Anyone possessing the secret invitation can join its room until expiry, so keep the invitation private.

## Installed-app bootstrap

A generated manifest uses a stable ID (`launch.html?app=id`) and a start URL targeting the same static file, optionally with an accepted hash and fragment-only invitation. The static entry point is important: a new PWA container has no controlling service worker or package database yet and cannot open a purely virtual app URL.

First load registers the shell worker. With an accepted bootstrap invitation, the PWA checks offered app ID/hash, receives the package, saves, then opens `apps/id/entry.html`. After this it removes temporary credentials from the visible URL. Later launches find local files first; an expired bootstrap does not affect them. A visible recovery screen handles absent files, stale invitation, source closure and local setup-file import.

Pure local imports do not join signaling at all. A setup-file download exports the original package including metadata and icon. A fresh Safari PWA can import it without any external transfer. Browsers that share the original storage can run immediately.

No browser API can force PWA installation, copy Safari IndexedDB into a new web-app container, enumerate another container's apps, or keep a suspended iPhone Safari tab alive. These limits must remain explicit in UX/docs rather than being hidden behind a successful initial transfer.

## Native app execution

Opaque iframes/data-URL source rewriting were removed because they prevent normal native storage, workers and many web APIs. The shell embeds a trusted, same-origin app frame whose real URLs are served from package bytes by the worker. Original JavaScript and CSS are not rewritten. Fetch, modules, computed imports, workers and `import.meta.url` use native browser behavior. Correct WASM MIME enables streaming instantiation. Byte-range requests support bundled media.

App-owned workers are supported, but app-owned service workers cannot register from virtual responses and must not replace launcher offline behavior. Optional COOP/COEP on top-level and app HTML enable cross-origin isolation; the shell reloads after a fresh import when needed. WebGPU is exposed when the browser/device permits it; there is no GPU polyfill.

No security sandbox is claimed. Manifest ID/scope do not make new origins. Prefixes prevent accidental ordinary storage name collisions; malicious code could bypass them. Trusted apps may use normal networking and permissions. Full untrusted-origin isolation would require separate hosting origins or a more restrictive runner with reduced browser capability.

## Persistence and tests

Package files replace in one IndexedDB transaction; saved app data uses native browser stores and is not reset by updates. The shell installs atomically, waits until every shell asset is cached before reporting offline readiness, and deletes only earlier shell caches with the exact AppLauncher scope prefix. Package records live outside shell caches.

Tests exercise real RTCDataChannels across isolated browser contexts, with a deterministic Nostr-compatible WebSocket relay in CI. Live mode tests the public relays. Separate fresh contexts model Safari PWA storage, not just two tabs sharing one database. Offline tests reload direct app URLs with source closed and connectivity disabled, or shut down the local preview server for WebKit. Native fixtures verify module imports, worker responses, streaming WASM, JSON fetch, IndexedDB, CSS, HTML navigation and isolation. OS-level install UI, iPhone camera hardware and actual GPU rendering remain physical-device checks.
