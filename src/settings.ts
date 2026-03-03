import {
	App,
	AbstractInputSuggest,
	TAbstractFile,
	TFile,
	PluginSettingTab,
	Setting,
	TFolder,
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

		// GENERAL SETTINGS
		containerEl.createEl("h2", { text: "Attachment Placement" });

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
			.setName("Fallback Depth Limit")
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
			.setName("Include MD files in suggestions")
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
			.setName("Reset Settings")
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
							async () => {
								this.plugin.settings = { ...DEFAULT_SETTINGS };
								await this.plugin.saveSettings();
								this.display();
							},
						).open();
					}),
			);

		new Setting(containerEl)
			.setName("Clear All Rules")
			.setDesc("Delete all placement rules. This cannot be undone.")
			.addButton((btn) =>
				btn
					.setButtonText("Clear")
					.setWarning()
					.onClick(() => {
						new ConfirmModal(
							this.app,
							"Are you sure you want to delete all placement rules?",
							async () => {
								this.plugin.settings.rules = [];
								await this.plugin.saveSettings();
								this.display();
							},
						).open();
					}),
			);

		// PLACEMENT RULES
		containerEl.createEl("h3", { text: "Placement Rules" });

		this.plugin.settings.rules.forEach((rule, i) => {
			const rules = this.plugin.settings.rules;

			const setting = new Setting(containerEl)
				.addText((text) => {
					text.inputEl.style.width = "150px";
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
					text.inputEl.style.width = "150px";
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
						.onClick(async () => {
							rules.splice(i, 1);
							await this.plugin.saveSettings();
							this.display();
						}),
				);

			const handle = setting.settingEl.createEl("span", { text: "⠿" });
			handle.style.cursor = "grab";
			handle.style.color = "var(--text-muted)";
			handle.style.padding = "0 8px";
			handle.style.fontSize = "1.2em";
			handle.style.flexShrink = "0";
			setting.settingEl.draggable = true;

			setting.nameEl.empty();
			const nameInput = setting.nameEl.createEl("input", {
				type: "text",
				placeholder: `Rule ${i + 1}`,
			});
			nameInput.value = rule.name;
			nameInput.style.background = "var(--background-secondary)";
			nameInput.style.border =
				"1px solid var(--background-modifier-border-hover)";
			nameInput.style.borderRadius = "var(--radius-s)";
			nameInput.style.padding = "2px 6px";
			nameInput.style.fontWeight = "var(--font-semibold)";
			nameInput.style.fontSize = "var(--font-ui-medium)";
			nameInput.style.color = "var(--text-normal)";
			nameInput.style.width = "100%";
			nameInput.addEventListener("change", async () => {
				rule.name = nameInput.value;
				await this.plugin.saveSettings();
			});

			setting.settingEl.addEventListener("dragstart", (e) => {
				e.dataTransfer?.setData("text/plain", String(i));
				setting.settingEl.style.opacity = "0.4";
			});

			setting.settingEl.addEventListener("dragend", () => {
				setting.settingEl.style.opacity = "1";
			});

			setting.settingEl.addEventListener("dragover", (e) => {
				e.preventDefault();
			});

			setting.settingEl.addEventListener("drop", async (e) => {
				e.preventDefault();
				const fromIndex = parseInt(
					e.dataTransfer?.getData("text/plain") ?? "-1",
				);
				if (fromIndex === -1 || fromIndex === i) return;
				const moved = rules.splice(fromIndex, 1)[0]!;
				rules.splice(i, 0, moved);
				await this.plugin.saveSettings();
				this.display();
			});
		});

		const addButtonContainer = containerEl.createDiv();
		addButtonContainer.style.display = "flex";
		addButtonContainer.style.justifyContent = "flex-start";
		addButtonContainer.style.padding = "6px 0";
		new ButtonComponent(addButtonContainer)
			.setButtonText("+ Add Rule")
			.setCta()
			.onClick(async () => {
				this.plugin.settings.rules.push({
					id: generateId(),
					name: "",
					sourcePath: "",
					destinationPath: "",
				});
				await this.plugin.saveSettings();
				this.display();
			});
	}
}
