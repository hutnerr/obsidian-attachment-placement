import { App, AbstractInputSuggest, TAbstractFile, PluginSettingTab, Setting, TFolder } from "obsidian";
import AttachmentPlacementPlugin from "./main";
import { Clogger } from "clogger";

export interface PlacementRule {
	id: string;
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

export class PathSuggest extends AbstractInputSuggest<TAbstractFile> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement,
		private foldersOnly = false
	) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TAbstractFile[] {
		const lower = query.toLowerCase();

		return this.app.vault.getAllLoadedFiles()
			.filter(file => {
				if (this.foldersOnly && !(file instanceof TFolder)) return false;
				return file.path.toLowerCase().includes(lower);
			})
			.slice(0, 50);
	}

	renderSuggestion(file: TAbstractFile, el: HTMLElement) {
		el.createEl("div", { text: file.path });
	}

	selectSuggestion(file: TAbstractFile) {
		const value = file instanceof TFolder ? file.path + "/" : file.path;
		this.inputEl.value = value;
		this.inputEl.trigger("input");
		this.close();
	}
}

export class SettingsTab extends PluginSettingTab {
	plugin: AttachmentPlacementPlugin;
	private cleanups: Array<() => void> = [];

	constructor(app: App, plugin: AttachmentPlacementPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		Clogger.debug("Initializing settings tab...", true);
	}

	hide() {
		this.cleanups.forEach(fn => fn());
		this.cleanups = [];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.cleanups.forEach(fn => fn());
		this.cleanups = [];

		containerEl.createEl("h2", { text: "Attachment Placement" });

		new Setting(containerEl)
			.setName("Fallback destination")
			.setDesc("Used when no rule matches. Leave empty to use Obsidian's default.")
			.addText(text => {
				text
					.setPlaceholder("e.g. assets/")
					.setValue(this.plugin.settings.fallbackPath)
					.onChange(async value => {
						this.plugin.settings.fallbackPath = value;
						await this.plugin.saveSettings();
					});
				new PathSuggest(this.app, text.inputEl, true);
			});

		new Setting(containerEl)
			.setName("Fallback Depth Limit")
			.setDesc(
				"How many levels it will go up before giving up and using the fallback destination. " +
				"Likely only useful if experiencing lag or for extremely nested folder structures. " +
				"Leave empty for no limit."
			)
			.addText(text => {
				text
					.setPlaceholder("e.g. 5")
					.setValue(this.plugin.settings.fallbackDepthLimit?.toString() ?? "")
					.onChange(async value => {
						const num = parseInt(value);
						this.plugin.settings.fallbackDepthLimit = isNaN(num) ? undefined : num;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Notifications")
			.setDesc("Enable or disable notifications for attachment placement actions.")
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.notificationsEnabled).onChange(async value => {
					this.plugin.settings.notificationsEnabled = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Include MD files in suggestions")
			.setDesc(
				"When enabled, MD files will be included in the suggestions for attachment placement. " +
				"When disabled, only folders will be suggested. " +
				"This only affects the suggestions and does not prevent you from manually entering a file path."
			)
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.includeMdFilesInSuggestions).onChange(async value => {
					this.plugin.settings.includeMdFilesInSuggestions = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Reset Settings")
			.setDesc("Reset all settings to their default values. This cannot be undone.")
			.addButton(btn =>
				btn
					.setButtonText("Reset Defaults")
					.setWarning()
					.onClick(async () => {
						if (confirm("Are you sure you want to reset all settings?")) {
							this.plugin.settings = DEFAULT_SETTINGS;
							await this.plugin.saveSettings();
							this.display();
						}
					})
			);

		new Setting(containerEl)
			.setName("Clear All Rules")
			.setDesc("Delete all placement rules. This cannot be undone.")
			.addButton(btn =>
				btn
					.setButtonText("Clear Rules")
					.setWarning()
					.onClick(async () => {
						if (confirm("Are you sure you want to delete all placement rules?")) {
							this.plugin.settings.rules = [];
							await this.plugin.saveSettings();
							this.display();
						}
					})
			);

		// ── Rules ────────────────────────────────────────────────────────────────
		containerEl.createEl("h3", { text: "Placement Rules" });

		this.plugin.settings.rules.forEach((rule, i) => {
			new Setting(containerEl)
				.setName(`Rule ${i + 1}`)
				.addText(text => {
					text.inputEl.style.width = "180px";
					text
						.setPlaceholder("Source (file or folder)")
						.setValue(rule.sourcePath)
						.onChange(async value => {
							rule.sourcePath = value;
							await this.plugin.saveSettings();
						});
					new PathSuggest(this.app, text.inputEl, true);
				})
				.addText(text => {
					text.inputEl.style.width = "180px";
					text
						.setPlaceholder("Destination folder")
						.setValue(rule.destinationPath)
						.onChange(async value => {
							rule.destinationPath = value;
							await this.plugin.saveSettings();
						});
					new PathSuggest(this.app, text.inputEl, true);
				})
				.addButton(btn =>
					btn
						.setIcon("trash")
						.setTooltip("Delete rule")
						.onClick(async () => {
							this.plugin.settings.rules.splice(i, 1);
							await this.plugin.saveSettings();
							this.display();
						})
				);
		});

		new Setting(containerEl)
			.addButton(btn =>
				btn
					.setButtonText("+ Add Rule")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.rules.push({ id: generateId(), sourcePath: "", destinationPath: "" });
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}