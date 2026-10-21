# Instructions for coding agents

This repository has two distinct uses. Determine which task the user requested.

## Build an app that runs in AppLauncher

- Start with [AGENT_GUIDE.md](AGENT_GUIDE.md) and [APP_GUIDE.md](APP_GUIDE.md).
- Produce a separate static app project/output folder. Use [examples/starter](examples/starter) when helpful.
- Do not modify the launcher engine, its published root assets or hosting settings merely to create a compatible app.
- Use relative assets, a real HTML entry, an included icon and supported metadata. AppLauncher supplies transfer, install identity and offline serving; do not add an app-owned service worker.
- Validate the actual output with `node scripts/validate-app.mjs <folder> --id <app-id>`, then perform appropriate runtime tests. Preflight is not proof of a successful install.
- Generate a live QR through the existing browser UI only if local-upload/browser tools are available and authorized. Keep its sender open. Otherwise hand off the folder and clear manual sharing steps.
- Never invent a deployment API, claim silent phone installation, or imply that a QR remains valid after its sender disappears. Distinguish verified results from device checks the user still needs to perform.

## Change AppLauncher itself

- Read [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and relevant sources before editing.
- Application examples and documentation can change without rebuilding the engine. For `src/` or `public/` engine changes, run the appropriate checks and `pnpm run publish:prepare`; commit refreshed published root assets with source changes.
- Unit/preflight tests: `pnpm test`. Engine browser regression: `pnpm run build` then `pnpm run test:browser` after installing Playwright Chromium. Use the documented WebKit/live-signaling checks when the change needs them.
- Preserve existing app packages and user data during engine updates. Keep PhoneCalculator separate.
- Use the user's authorized GitHub workflow. Do not treat documentation requests as authorization to alter the running product's transfer/install behavior.
