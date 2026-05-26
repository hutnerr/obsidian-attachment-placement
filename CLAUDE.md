# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Watch mode — rebuilds on change, outputs main.js with inline sourcemaps
npm run build     # Production build — type-checks first, then bundles minified main.js
npm run lint      # Run ESLint
npm run version   # Bump version in manifest.json + versions.json and stage both files
```

To test the plugin, reload Obsidian (or use the "Reload app without saving" command) after each build. The plugin lives directly inside the vault's `.obsidian/plugins/` folder, so `main.js` is picked up immediately.

## Architecture

The plugin intercepts Obsidian's internal `vault.getAvailablePathForAttachments` method at load time and restores it on unload. This is the single hook point — no events are registered for file creation.

**Core flow:**

1. `main.ts` — patches `vault.getAvailablePathForAttachments` on load. Delegates path resolution to `PlacementManager`, falling back to the original method if no rule matches.
2. `placement.ts` — `PlacementManager` holds two maps:
   - `ruleMap`: `sourceFolderPath → destinationFolderPath`, rebuilt from settings whenever settings save.
   - `destinationCache`: memoizes resolved destinations per active file path; cleared on vault `create`/`delete`/`rename` events.
   - `getDestinationFolder(activePath)` walks up the directory tree from the active file, checking each ancestor folder against `ruleMap`, up to `fallbackDepthLimit` levels. Returns the matching destination, the fallback path, or `null` if the destination folder doesn't exist in the vault.
3. `settings.ts` — `PlacementRule` has `id`, `name`, `sourcePath`, `destinationPath`. `SettingsTab` renders the rules UI with drag-and-drop reordering. Calls `plugin.saveSettings()` on every field change, which triggers `placementManager.rebuildRuleMap()`.
4. `clogger.ts` — `Clogger` is a static logger class. `Clogger.disabled = true` by default, silencing all output in production. Toggle `Clogger.debugEnabled` to enable debug logging.
5. `src/components/` — `PathSuggest` (autocomplete for vault paths in text inputs) and `ConfirmModal` (two-button confirmation dialog).

**Key constraint:** `_validateFolder` shows a Notice and returns `null` if the destination folder doesn't exist in the vault. When `null` is returned, the plugin falls back to Obsidian's default attachment path rather than throwing.

## Build output

esbuild bundles `src/main.ts` → `main.js` (CJS format, ES2018 target). The `obsidian` package and all CodeMirror/Lezer packages are marked external. TypeScript paths (`clogger`, `main`) resolve through `tsconfig.json`.

## Releasing

Update `minAppVersion` in `manifest.json` manually first, then run `npm run version patch/minor/major` to bump and stage. Upload `manifest.json`, `main.js`, and `styles.css` (if present) as release assets on GitHub.
