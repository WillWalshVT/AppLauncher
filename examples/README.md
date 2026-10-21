# App examples

- [counter/index.html](counter/index.html): one self-contained HTML file; local persistent counter, no build step.
- [starter/](starter/): a small multi-file notes app with modules, local styles/icon, supported `launcher.json`, persistence and JSON backup/import. Copy the five files to your own app folder, customize, and select that folder in AppLauncher. No package installation or build is required.

From the AppLauncher checkout:

```sh
node scripts/validate-app.mjs examples/starter --id pocket-notes
node scripts/validate-app.mjs examples/counter --id counter
```

The starter's initial suggested ID is `pocket-notes`, derived from its name. Change it in **App settings** if creating a different app. After renaming, update the title, `launcher.json`, icon, visible heading and backup filename as appropriate. Do not copy another app's ID unless deliberately updating it in that storage container.

These apps deliberately have no custom service worker or install code. AppLauncher provides that. See [the full development guide](../APP_GUIDE.md) and [agent workflow](../AGENT_GUIDE.md) for runtime limits, testing and QR delivery.
