import { App, PluginSettingTab, Setting, ButtonComponent } from "obsidian";
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
}

export const DEFAULT_SETTINGS: Settings = {
	rules: [],
	fallbackPath: "",
	fallbackDepthLimit: undefined,
	notificationsEnabled: true,
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

		new Setting(containerEl)
			.setName("Fallback destination")
			.setDesc("Used when no rule matches.")
			.addText((text) => {
				text.setPlaceholder("e.g. assets/")
					.setValue(this.plugin.settings.fallbackPath)
					.onChange(async (value) => {
						this.plugin.settings.fallbackPath = value;
						await this.plugin.saveSettings();
					});
				new PathSuggest(this.app, text.inputEl, {foldersOnly: true, includeMdFiles: () => false,});
			});

		new Setting(containerEl)
			.setName("Fallback depth limit")
			.setDesc("How many levels it will go up before giving up and using the fallback destination. Likely only useful if experiencing lag or for extremely nested folder structures. Leave empty for no limit.",)
			.addText((text) => {
				text.setPlaceholder("E.g. 5")
					.setValue(
						this.plugin.settings.fallbackDepthLimit?.toString() ??
							"",
					)
					.onChange(async (value) => {
						const cleaned = value.replace(/[^0-9]/g, "");
						if (cleaned !== value) text.setValue(cleaned);
						this.plugin.settings.fallbackDepthLimit =
							cleaned === "" ? undefined : parseInt(cleaned);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Notifications")
			.setDesc("Enable or disable notifications for attachment placement actions.",)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.notificationsEnabled)
					.onChange(async (value) => {
						this.plugin.settings.notificationsEnabled = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Reset settings")
			.setDesc("Reset all settings to their default values. This cannot be undone.",)
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
								void this.plugin
									.saveSettings()
									.then(() => this.display());
							},
						).open();
					}),
			);

		new Setting(containerEl)
			.setName("Clear all rules")
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
								void this.plugin
									.saveSettings()
									.then(() => this.display());
							},
						).open();
					}),
			);

		// PLACEMENT RULES
		new Setting(containerEl).setName("Placement rules").setHeading();

		this.plugin.settings.rules.forEach((rule, i) => {
			const rules = this.plugin.settings.rules;

			const setting = new Setting(containerEl)
				.setName(`${i + 1}.`)
				.addText((text) => {
					text.inputEl.setCssProps({ width: "40%" });
					text.setPlaceholder("Name")
						.setValue(rule.name)
						.onChange(async (value) => {
							rule.name = value;
							await this.plugin.saveSettings();
						});
				})
				.addText((text) => {
					text.inputEl.setCssProps({ width: "25%" });
					text.setPlaceholder("Source")
						.setValue(rule.sourcePath)
						.onChange(async (value) => {
							rule.sourcePath = value;
							await this.plugin.saveSettings();
						});
					new PathSuggest(this.app, text.inputEl, { foldersOnly: false, includeMdFiles: () => false,});
				})
				.addText((text) => {
					text.inputEl.setCssProps({ width: "25%" });
					text.setPlaceholder("Destination")
						.setValue(rule.destinationPath)
						.onChange(async (value) => {
							rule.destinationPath = value;
							await this.plugin.saveSettings();
						});
					new PathSuggest(this.app, text.inputEl, { foldersOnly: true, includeMdFiles: () => false, });
				})
				.addButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Delete rule")
						.onClick(() => {
							rules.splice(i, 1);
							void this.plugin
								.saveSettings()
								.then(() => this.display());
						}),
				);

			// drag handle
			const handle = setting.settingEl.createEl("span", { text: "⠿" });
			handle.setCssProps({
				cursor: "grab",
				color: "var(--text-muted)",
				padding: "0 8px",
				"font-size": "1.2em",
				"flex-shrink": "0",
			});
			setting.settingEl.draggable = true;

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

		// add rule button
		const addButtonContainer = containerEl.createDiv();
		addButtonContainer.setCssProps({
			display: "flex",
			"justify-content": "flex-start",
			padding: "6px 0",
		});
		new ButtonComponent(addButtonContainer)
			.setButtonText("Add new rule")
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

		// ---- Support Section ----
		containerEl.createEl("hr");

		const supportContainer = containerEl.createDiv();
		supportContainer.setCssProps({
			display: "flex",
			"flex-direction": "column",
			"align-items": "center",
			"margin-top": "20px",
			"padding-bottom": "10px",
			gap: "8px",
		});

		supportContainer.createEl("div", {
			text: "If you find this plugin helpful, consider supporting development",
		}).setCssProps({
			"font-size": "0.9em",
			color: "var(--text-muted)",
			"text-align": "center",
		});

		const link = supportContainer.createEl("a", {
			text: "Support me on ko-fi",
			href: "https://ko-fi.com/hutner",
		});

		link.setCssProps({
			"font-weight": "600",
			"text-decoration": "none",
		});

		link.target = "_blank";
	}
}
