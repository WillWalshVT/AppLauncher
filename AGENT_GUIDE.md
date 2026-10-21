# Build and deliver an AppLauncher app with an AI agent

This is the agent-facing entry point for users who want to describe an app, let a coding agent build it, and install it on a phone through a QR. The application contract is in [APP_GUIDE.md](APP_GUIDE.md); implementation details are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Copy-and-paste request

Paste this into ChatGPT/Codex with your own app description. Supply a workspace or connected coding environment when you want actual files built, and browser/file access when you want the agent to generate a live QR.

```text
Build me an app compatible with AppLauncher:
https://github.com/WillWalshVT/AppLauncher

First read README.md, AGENT_GUIDE.md and APP_GUIDE.md from that repo.
Use the implemented app contract; do not invent an SDK or publishing API.

My app:
[Describe the purpose, main screens, inputs, calculations/actions,
what data should be saved, and any hardware/network requirements.]

Target: iPhone installed as a web app, with an independent name and icon.
App name: [name, or choose a suitable name]
App ID: [stable lowercase ID, or choose one and tell me]
Offline requirement: [fully offline after install / describe online features]
Deliverable location: [workspace folder, or choose a separate project folder]

Build the complete working app, not just a mockup. Prefer plain static
HTML/CSS/JavaScript unless my app benefits from a client framework.
Include an appropriate local icon and launcher.json metadata. Bundle all
assets/dependencies required offline. Use relative URLs and no app-owned
service worker, backend, CDN dependency, or embedded secret.

Run AppLauncher's static preflight against the final output and test the
important behavior, mobile layout, storage and offline behavior. Report
what you could and could not verify on a physical iPhone.

You may use browser automation to open the official AppLauncher on my
laptop, select the completed app folder, set its name/icon/entry/App ID,
and generate a live sharing QR. Keep that sender tab open for my phone's
first installed launch. If your tools cannot upload local files or keep
a browser sender open, deliver the ready-to-share folder and give me the
short manual sharing steps instead; say that no live QR was generated.
I will scan the QR and confirm Add to Home Screen on the phone myself.

Do not modify AppLauncher's engine or publish my app to its repository.
At completion, give me the output folder, entry, name/ID, file count/size,
test results, data backup notes and live QR/link if actually generated.
```

If your environment cannot retrieve the repository, ask the user for the guide contents or arrange repository access. Do not silently substitute assumptions about an imaginary AppLauncher SDK. A repository URL is context; it does not itself grant filesystem, browser, GitHub write or phone-control access.

## Agent implementation workflow

### 1. Establish the application contract

Read the guide and inspect the starter. Determine the user-facing result, essential flows, stored data, offline requirements, phone layout and any browser capability dependencies. Make reasonable implementation choices; ask only for information that materially affects the application.

Keep app work in a separate project/output directory. Building a compatible app does not require changing this engine's `src/`, service worker, pairing protocol, root published assets or GitHub Pages settings.

### 2. Build a complete static app

Use [examples/starter](examples/starter) as a dependency-free starting point, or make a static framework build. Use relative paths throughout the built output. An app normally includes an entry HTML page, app code/styles, local icon and optional `launcher.json` containing only supported `name` / `isolation` settings.

Select a distinct, stable app ID and record it for the upload form. Do not put an unsupported `id` field in `launcher.json` and assume it will be applied. Set the same intended display name in the HTML title and metadata to avoid discovery conflicts.

Implement real behavior, persistence where requested, validation, failure states, accessible controls and phone layouts. Provide data export/import when the app stores valuable information. Use feature detection and fallbacks for optional capabilities. Do not create a second PWA install system or add a framework service worker on top of AppLauncher.

### 3. Build and validate the exact deliverable

For a framework app, produce its static output first. Keep development dependencies and source-only files outside the selected output. From an AppLauncher checkout:

```sh
node scripts/validate-app.mjs /absolute/path/to/output --id your-app-id --json
```

Fix errors and review warnings. This command does not upload, set the form ID, test JavaScript execution or generate a QR. Complete appropriate runtime tests under a nested path. Check storage, navigation, error behavior and the absence of unexpected external dependencies. Test the fresh-install/offline path when the environment allows it; mark physical OS installation as unverified unless actually performed.

### 4. Create the sharing session when tools permit

Open the official [AppLauncher](https://willwalshvt.github.io/AppLauncher/) in the user's laptop browser. Update the engine if an old cached version is present. Choose **Share an app**, select the output folder, inspect the icon, set the entry/name/App ID/isolation as required, and choose **Generate QR**.

Browser APIs generally require file selection; some agent tools can set file inputs directly from authorized local paths. Use the actual capability available. There is no documented `AppLauncher.deploy()`, POST upload endpoint, GitHub Actions QR publisher or CLI session generator in this repository.

Keep the sender open. Hand off the QR shown by the launcher or its actual share link. The phone's camera opens metadata preparation and the installation screen; the user confirms the OS install and opens the new icon. Full file transfer happens then. Confirm successful saving on the laptop when you can observe it. A generated QR alone does not prove the phone installed or cached the app.

Do not send a QR/link to another person through email/chat services without the user's authorization. Showing it in the current conversation or the user's browser is sufficient for this workflow.

### 5. Hand off an accurate result

Use a compact report such as:

```text
App: Field Notebook
App ID: field-notebook (set this in App settings)
Entry: index.html
Output: /absolute/path/to/project/dist
Package: 12 files / 184,320 bytes of file content
Offline: all essential assets included; network sync requires internet
Isolation: false
Checked: static preflight, core flows, mobile viewport, storage, offline reload
Not checked: physical iPhone Home Screen confirmation / hardware permissions
Sharing: [live sender tab and actual link, OR "Ready to upload; no live QR generated"]
Data: saved locally; backup/import available in Settings
```

Use actual values. Do not confuse engine updates with app-code updates, or imply that a main-browser import automatically updates separate installed PWA containers.

## Automation contract

| Stage | Current support |
| --- | --- |
| Generate app files from a description | Coding agent with a writable workspace; no special launcher API needed. |
| Static build/preflight | Local tooling; preflight can be used in CI. |
| Automated browser tests | Possible with available browser tools; fresh contexts can model separate installed storage. |
| Select output, configure metadata, generate QR | Automatable through existing launcher UI when the agent can upload local files and keep a sender tab alive. Otherwise a short manual step. |
| Publish app source to its own repo/host | Optional separate task; not needed for peer-to-peer transfer and not implied by this workflow. |
| Scan camera QR and confirm Home Screen install | User/OS step. A web page cannot silently install or open Safari's installation sheet. |
| Transfer after the installed app opens | Automatic while the original sender is available. |
| Offline relaunch after saving | Automatic from cached app files. |
| Permanent QR, unattended cloud delivery, cross-container app-update sync | Not implemented. Do not promise these behaviors. |

The share invitation expires after ten minutes; prepared installation sessions last up to one hour. Leaving the source page, sleeping the laptop, network restrictions or closing an agent's browser can prevent delivery. A screenshot is not a durable release artifact. Preserve the source/output folder so sharing can be restarted.

## Improvements to keep separate from application delivery

If future automation needs a true upload API, persistent delivery, authenticated updates or background hosting, propose that as an engine feature with its own design and authorization. Do not quietly implement it inside an ordinary generated app or change the public launcher while fulfilling an unrelated app request.
