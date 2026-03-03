import {
	App,
	PluginSettingTab,
	Setting,
	ButtonComponent,
} from "obsidian";
import AttachmentPlacementPlugin from "./main";
import { Clogger } from "clogger";
import { ConfirmModal } from "./components/confirm";
import { PathSuggest } from "./components/pathsuggest";

export interface PlacementRule {
	id: string;
	name: string;
	sourcePath: string;
	destinationPath: string;
}

export interface Settings {
	rules: PlacementRule[];
	fallbackPath: string;
	fallbackDepthLimit?: number;
	notificationsEnabled: boolean;
	includeMdFilesInSuggestions: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	rules: [],
	fallbackPath: "",
	fallbackDepthLimit: undefined,
	notificationsEnabled: true,
	includeMdFilesInSuggestions: false,
};

function generateId(): string {
	return Math.random().toString(36).slice(2, 10);
}

export class SettingsTab extends PluginSettingTab {
	plugin: AttachmentPlacementPlugin;

	constructor(app: App, plugin: AttachmentPlacementPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		Clogger.debug("Initializing settings tab...", true);
	}

	hide() {}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// GENERAL SETTINGS — use setHeading() instead of createEl("h2")
		new Setting(containerEl).setName("Attachment placement").setHeading();

		new Setting(containerEl)
			.setName("Fallback destination")
			.setDesc(
				"Used when no rule matches. Leave empty to use Obsidian's default.",
			)
			.addText((text) => {
				text.setPlaceholder("e.g. assets/")
					.setValue(this.plugin.settings.fallbackPath)
					.onChange(async (value) => {
						this.plugin.settings.fallbackPath = value;
						await this.plugin.saveSettings();
					});
				new PathSuggest(this.app, text.inputEl, {
					foldersOnly: true,
					includeMdFiles: () =>
						this.plugin.settings.includeMdFilesInSuggestions,
				});
			});

		new Setting(containerEl)
			.setName("Fallback depth limit") // sentence case
			.setDesc(
				"How many levels it will go up before giving up and using the fallback destination. " +
					"Likely only useful if experiencing lag or for extremely nested folder structures. " +
					"Leave empty for no limit.",
			)
			.addText((text) => {
				text.setPlaceholder("e.g. 5")
					.setValue(
						this.plugin.settings.fallbackDepthLimit?.toString() ??
							"",
					)
					.onChange(async (value) => {
						const num = parseInt(value);
						this.plugin.settings.fallbackDepthLimit = isNaN(num)
							? undefined
							: num;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Notifications")
			.setDesc(
				"Enable or disable notifications for attachment placement actions.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.notificationsEnabled)
					.onChange(async (value) => {
						this.plugin.settings.notificationsEnabled = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Include MD files in suggestions") // already sentence case
			.setDesc(
				"When enabled, MD files will be included in the suggestions for attachment placement. " +
					"When disabled, only folders will be suggested. " +
					"This only affects the suggestions and does not prevent you from manually entering a file path.",
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.includeMdFilesInSuggestions)
					.onChange(async (value) => {
						this.plugin.settings.includeMdFilesInSuggestions =
							value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Reset settings") // sentence case
			.setDesc(
				"Reset all settings to their default values. This cannot be undone.",
			)
			.addButton((btn) =>
				btn
					.setButtonText("Reset")
					.setWarning()
					.onClick(() => {
						new ConfirmModal(
							this.app,
							"Are you sure you want to reset all settings?",
							() => {
								this.plugin.settings = { ...DEFAULT_SETTINGS };
								void this.plugin.saveSettings().then(() => this.display());
							},
						).open();
					}),
			);

		new Setting(containerEl)
			.setName("Clear all rules") // sentence case
			.setDesc("Delete all placement rules. This cannot be undone.")
			.addButton((btn) =>
				btn
					.setButtonText("Clear")
					.setWarning()
					.onClick(() => {
						new ConfirmModal(
							this.app,
							"Are you sure you want to delete all placement rules?",
							() => {
								this.plugin.settings.rules = [];
								void this.plugin.saveSettings().then(() => this.display());
							},
						).open();
					}),
			);

		// PLACEMENT RULES — use setHeading() instead of createEl("h3")
		new Setting(containerEl).setName("Placement rules").setHeading();

		this.plugin.settings.rules.forEach((rule, i) => {
			const rules = this.plugin.settings.rules;

			const setting = new Setting(containerEl)
				.addText((text) => {
					text.inputEl.setCssProps({ width: "150px" });
					text.setPlaceholder("Source")
						.setValue(rule.sourcePath)
						.onChange(async (value) => {
							rule.sourcePath = value;
							await this.plugin.saveSettings();
						});
					new PathSuggest(this.app, text.inputEl, {
						foldersOnly: false,
						includeMdFiles: () =>
							this.plugin.settings.includeMdFilesInSuggestions,
					});
				})
				.addText((text) => {
					text.inputEl.setCssProps({ width: "150px" });
					text.setPlaceholder("Destination")
						.setValue(rule.destinationPath)
						.onChange(async (value) => {
							rule.destinationPath = value;
							await this.plugin.saveSettings();
						});
					new PathSuggest(this.app, text.inputEl, {
						foldersOnly: false,
						includeMdFiles: () =>
							this.plugin.settings.includeMdFilesInSuggestions,
					});
				})
				.addButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Delete rule")
						.onClick(() => {
							rules.splice(i, 1);
							void this.plugin.saveSettings().then(() => this.display());
						}),
				);

			// Drag handle — appended after controlEl so it sits rightmost
			const handle = setting.settingEl.createEl("span", { text: "⠿" });
			handle.setCssProps({
				cursor: "grab",
				color: "var(--text-muted)",
				padding: "0 8px",
				"font-size": "1.2em",
				"flex-shrink": "0",
			});
			setting.settingEl.draggable = true;

			// Editable name in place of the setting label
			setting.nameEl.empty();
			const nameInput = setting.nameEl.createEl("input", {
				type: "text",
				placeholder: `Rule ${i + 1}`,
			});
			nameInput.value = rule.name;
			nameInput.setCssProps({
				background: "var(--background-secondary)",
				border: "1px solid var(--background-modifier-border-hover)",
				"border-radius": "var(--radius-s)",
				padding: "2px 6px",
				"font-weight": "var(--font-semibold)",
				"font-size": "var(--font-ui-medium)",
				color: "var(--text-normal)",
				width: "100%",
			});
			nameInput.addEventListener("change", () => {
				rule.name = nameInput.value;
				void this.plugin.saveSettings();
			});

			setting.settingEl.addEventListener("dragstart", (e) => {
				e.dataTransfer?.setData("text/plain", String(i));
				setting.settingEl.setCssProps({ opacity: "0.4" });
			});

			setting.settingEl.addEventListener("dragend", () => {
				setting.settingEl.setCssProps({ opacity: "1" });
			});

			setting.settingEl.addEventListener("dragover", (e) => {
				e.preventDefault();
			});

			setting.settingEl.addEventListener("drop", (e) => {
				e.preventDefault();
				const fromIndex = parseInt(
					e.dataTransfer?.getData("text/plain") ?? "-1",
				);
				if (fromIndex === -1 || fromIndex === i) return;
				const moved = rules.splice(fromIndex, 1)[0]!;
				rules.splice(i, 0, moved);
				void this.plugin.saveSettings().then(() => this.display());
			});
		});

		// Add rule button — plain div so Obsidian doesn't collapse it
		const addButtonContainer = containerEl.createDiv();
		addButtonContainer.setCssProps({
			display: "flex",
			"justify-content": "flex-start",
			padding: "6px 0",
		});
		new ButtonComponent(addButtonContainer)
			.setButtonText("+ Add rule") // sentence case
			.setCta()
			.onClick(() => {
				this.plugin.settings.rules.push({
					id: generateId(),
					name: "",
					sourcePath: "",
					destinationPath: "",
				});
				void this.plugin.saveSettings().then(() => this.display());
			});
	}
}