import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
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

function addPathAutocomplete(app: App, inputEl: HTMLInputElement, foldersOnly = false): () => void {
	let dropdown: HTMLDivElement | null = null;

	const remove = () => { dropdown?.remove(); dropdown = null; };

	const show = (query: string) => {
		remove();
		const q = query.toLowerCase();
		const matches = app.vault.getAllLoadedFiles()
			.filter(f => (!foldersOnly || f instanceof TFolder) && f.path.toLowerCase().includes(q))
			.map(f => f instanceof TFolder ? f.path + "/" : f.path)
			.slice(0, 15);

		if (!matches.length) return;

		dropdown = inputEl.ownerDocument.createElement("div");
		Object.assign(dropdown.style, {
			position: "fixed", zIndex: "9999",
			background: "var(--background-primary)",
			border: "1px solid var(--background-modifier-border)",
			borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
			maxHeight: "180px", overflowY: "auto", fontSize: "12px",
			fontFamily: "var(--font-monospace)",
		});

		const rect = inputEl.getBoundingClientRect();
		dropdown.style.top = `${rect.bottom + 2}px`;
		dropdown.style.left = `${rect.left}px`;
		dropdown.style.width = `${rect.width}px`;

		matches.forEach(m => {
			const item = dropdown!.createEl("div", { text: m });
			Object.assign(item.style, {
				padding: "5px 10px", cursor: "pointer", color: "var(--text-normal)",
			});
			item.addEventListener("mouseenter", () => item.style.background = "var(--background-modifier-hover)");
			item.addEventListener("mouseleave", () => item.style.background = "");
			item.addEventListener("mousedown", e => {
				e.preventDefault();
				inputEl.value = m;
				inputEl.dispatchEvent(new Event("input"));
				remove();
			});
			dropdown!.appendChild(item);
		});

		inputEl.ownerDocument.body.appendChild(dropdown);
	};

	const onInput = () => show(inputEl.value.trim());
	const onBlur = () => setTimeout(remove, 150);

	inputEl.addEventListener("input", onInput);
	inputEl.addEventListener("focus", onInput);
	inputEl.addEventListener("blur", onBlur);

	return () => {
		inputEl.removeEventListener("input", onInput);
		inputEl.removeEventListener("focus", onInput);
		inputEl.removeEventListener("blur", onBlur);
		remove();
	};
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
				this.cleanups.push(addPathAutocomplete(this.app, text.inputEl, true));
			});

		new Setting(containerEl)
			.setName("Fallback Depth Limit")
			.setDesc(
				"When searching upwards for a folder to place attachments, " +
				"this limits how many levels it will go up before giving up and using the fallback " +
				"destination. Likely only useful if experiencing lag or for extremely nested folder structures. " +
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
			.setName("Reset Settings")
			.setDesc("Reset all settings to their default values. This cannot be undone.")
			.addButton(btn =>
				btn
					.setButtonText("Reset")
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
					this.cleanups.push(addPathAutocomplete(this.app, text.inputEl, false));
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
					this.cleanups.push(addPathAutocomplete(this.app, text.inputEl, true));
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