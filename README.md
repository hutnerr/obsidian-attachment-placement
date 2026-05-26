![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22attachment-placement%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

## Overview
This plugin is meant to make resource placement more flexible and context-aware.

Instead of forcing all new resources into a single hardcoded folder, it lets you define where resources should go based on the file or folder you’re currently working in. Rules can target individual `.md` files for per-note precision, or entire folders for broader coverage. The plugin checks the active file first, then walks up the directory tree until a matching rule is found.

This plugin would likely be useful for people who like to copy-paste in images and would like some further organization.

**Links**
- [Plugin Page](https://community.obsidian.md/plugins/attachment-placement)
- [Showcase](https://www.hunter-baker.com/pages/projects/obsidian-attachment-plugin.html)
- [Help Page](https://www.hunter-baker.com/pages/other/obsidian-attachment-placement-help.html)

## How To Use
Placement rules can be defined on individual files or folders.

When a new resource is created:
1. The plugin checks if the active file itself has a placement rule.
2. If not, it checks the file's parent folder.
3. If not, it checks the parent folder's parent, and so on.
4. The resource is placed according to the first matching rule found.

To get started with the plugin, open up the settings and define some rules for which attachments should be placed. 

Once there are rules set, the plugin will pay attention to new files being created and handle them according to the rules set.

## Example
Given the following structure:

```
/
├── attachments/
│   ├── school/
│   ├── journal/
│   └── videogames/
├── journal/
├── league-of-legends/
├── dragon-age-origins/
└── school/
    └── math/
        ├── factoring.md
        └── addition.md
```

If we are working within `addition.md`, we first check if there is a rule for `addition.md` itself. If not, we check its parent folder (`math/`), then `school/`, continuing upward until a rule is found or the root is reached.

If no rule is found, the plugin uses the fallback location defined in settings.

To complete the example, these are what some actual placement rules might look like:

<img width="720" height="360" alt="image" src="https://github.com/user-attachments/assets/79d44fbe-d42d-433e-81c5-577afa1c3e86" />

If you'd like another example, check out the [help page](https://www.hunter-baker.com/pages/other/obsidian-attachment-placement-help.html).

## Support
If you found this project helpful or enjoyable, and want to support future work, you can buy me a coffee on Ko-fi
<br>
Totally optional, always appreciated.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/S6S71TM9XT)

<!--
## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.
-->

