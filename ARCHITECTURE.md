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
- `store.js`: separate package and pending-install stores, scoped by project path; schema v2 upgrades retain existing packages.
- `install.js`: bounded metadata offers and metadata-only pending install records.
- `manifest.js`: stable app IDs, direct launch URLs, generated install manifests.
- `sw.js`: atomic shell caching, package-backed virtual file responses, manifests/icons, range requests and isolation headers.
- `public/runtime.js`: ordinary window storage namespacing injected before app scripts.

The UI uses text escaping for package metadata; app scripts never execute during metadata discovery. They execute only after the user accepts and opens a trusted app.

## Protocol

The QR holds a random room/password and ten-minute expiry in the fragment. Trystero uses three explicit public Nostr relays (`nos.lol`, `bucket.coracle.social`, `relay.primal.net`) in parallel only for peer discovery / WebRTC SDP. Using the same verified set on both devices avoids rotating onto a broken default endpoint. Relay availability is external; a failed endpoint does not block the others. Its encrypted RTCDataChannel sends:

1. `hello`: sender vs receiver role.
2. `offer`: app ID, name, entry, bounded file/byte count, normalized PNG icon and digest.
3. `prepare`: the browser accepts installation metadata and optionally selects a replacement icon; it does **not** accept the file payload yet.
4. `prepared`: source creates a personalized package if the icon changed, a separate one-hour sending room, and a pinned metadata/ticket response. The initial receiver saves only metadata in the `installs` store and displays installation controls.
5. The new installed PWA joins that prepared room using its start URL ticket. Its `accept` message requests the pinned full package.
6. `payload`: chunked bytes of the JSON/base64 package, sent only after that installed-app accept.
7. `receipt`: digest, after validation and committed package save. The source reports completion.

The original QR room expires in ten minutes. Its child installation sessions can survive that expiry for up to one hour. Explicitly leaving/cancelling the source closes all its sessions. Prepared rooms do not recursively create more prepared rooms; the source bounds the number of child sessions. The receiver closes its metadata connection after the prepared response. Automatic reconnect reuses the saved installation ticket without requiring another QR.

A digest detects corruption and pins an automatic handoff to the offered package. It does not prove a publisher's identity. Anyone possessing the secret invitation can join its room until expiry, so keep the invitation private.

## Installed-app bootstrap

A generated manifest uses a stable ID (`launch.html?app=id`) and a start URL targeting the same static file, optionally with an accepted hash and fragment-only invitation. The static entry point is important: a new PWA container has no controlling service worker or package database yet and cannot open a purely virtual app URL.

The receiving browser creates an install manifest as soon as metadata is accepted; the full payload is deferred. Schema v2 keeps pending records in `installs` separately from runnable `apps`, so staging an update does not destroy the prior package. Manifest/icon endpoints can read pending records. Saving the received full package atomically replaces `apps` and deletes its pending install record.

First installed load registers the shell worker, joins the ticket room, checks offered app ID/hash, receives and saves files, then opens `apps/id/entry.html`. After this it removes temporary credentials from the visible URL. Later launches use local files first; expired bootstrap credentials do not affect cached apps. A receiver-selected icon is packaged at the source before it issues the installation ticket, so the installed container also gets the intended icon.

Local imports use the same automatic first-launch handoff. The source tab retains its files and hosts a prepared sending room; it changes its visible URL/manifest in place so preparing installation does not navigate away and kill its source connection. No setup-file download or import is required. Browsers already sharing local source storage can run immediately after installation.

QR links opened with the phone camera automatically prepare installation; no additional accept screen is required. Peers send the app offer as soon as the data channel opens. Offline setup has an explicit deadline. Transfers show package bytes and percentage from RTCDataChannel progress. The inactivity watchdog retries up to three times, without interrupting a progressing transfer, then shows an actionable Retry connection button. Waiting-status polling does not reset the watchdog. Completed apps open without transfer controls or toasts; cached launches skip signaling entirely. A bounded isolation-policy reload prevents unsupported configurations from navigating forever. QR validity is ten minutes; prepared install sessions last one hour.

No browser API can silently install a PWA, open Safari's Add to Home Screen sheet, copy Safari IndexedDB into a new PWA, enumerate another container's apps, or force a suspended iPhone Safari tab to execute. A same-device source may need to be foregrounded briefly; an independent laptop source avoids that constraint. Expired/closed sessions need a new preparation at the source. Do not promise arbitrary delayed setup after the source has disappeared.

## Native app execution

Opaque iframes/data-URL source rewriting were removed because they prevent normal native storage, workers and many web APIs. The shell embeds a trusted, same-origin app frame whose real URLs are served from package bytes by the worker. Original JavaScript and CSS are not rewritten. Fetch, modules, computed imports, workers and `import.meta.url` use native browser behavior. Correct WASM MIME enables streaming instantiation. Byte-range requests support bundled media.

App-owned workers are supported, but app-owned service workers cannot register from virtual responses and must not replace launcher offline behavior. Optional COOP/COEP on top-level and app HTML enable cross-origin isolation; the shell reloads after a fresh import when needed. WebGPU is exposed when the browser/device permits it; there is no GPU polyfill.

No security sandbox is claimed. Manifest ID/scope do not make new origins. Prefixes prevent accidental ordinary storage name collisions; malicious code could bypass them. Trusted apps may use normal networking and permissions. Full untrusted-origin isolation would require separate hosting origins or a more restrictive runner with reduced browser capability.

## Persistence and tests

Package files replace in one IndexedDB transaction; saved app data uses native browser stores and is not reset by updates. The shell installs atomically, waits until every shell asset is cached before reporting offline readiness, and deletes only earlier shell caches with the exact AppLauncher scope prefix. Package records live outside shell caches.

Tests exercise real RTCDataChannels across isolated browser contexts, with a deterministic Nostr-compatible WebSocket relay in CI. Live mode tests the public relays. Separate fresh contexts model Safari PWA storage. Tests assert zero code files in the initial metadata-only receiver, the browser-parsed unique manifest, sender-selected icon retention, and automatic code transfer on first PWA launch from both remote and local sources. Offline tests reload direct app URLs with source closed and connectivity disabled, or shut down the local preview server for WebKit. Native fixtures verify module imports, worker responses, streaming WASM, JSON fetch, IndexedDB, CSS, HTML navigation and isolation. OS-level install UI, iPhone camera hardware and actual GPU rendering remain physical-device checks.
