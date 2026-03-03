import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, Settings, SettingsTab } from "./settings";
import { Clogger } from "clogger";
import { PlacementManager } from "./placement";

export default class AttachmentPlacementPlugin extends Plugin {
	settings: Settings;
	placementManager: PlacementManager;

	onload(): void {
		Clogger.debug("Starting AttachmentPlacementPlugin...", true);
		void this.loadSettings().then(() => {
			this.placementManager = new PlacementManager(this);
			this.addSettingTab(new SettingsTab(this.app, this));

			this.registerEvent(
				this.app.vault.on("create", (file) => {
					Clogger.debug(`File created: ${file.path}`, true);
					void this.placementManager.handleNewFile(file.path);
				}),
			);

			Clogger.debug("AttachmentPlacementPlugin loaded successfully.", true);
		});
	}

	onunload(): void {
		Clogger.debug("Unloading AttachmentPlacementPlugin...", true);
		Clogger.debug("AttachmentPlacementPlugin unloaded successfully.", true);
	}

	async loadSettings(): Promise<void> {
		Clogger.debug("Loading settings...");
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<Settings>,
		);
		Clogger.debug("Settings loaded: " + JSON.stringify(this.settings));
	}

	async saveSettings(): Promise<void> {
		Clogger.debug("Saving settings...");
		await this.saveData(this.settings);
		Clogger.debug("Settings saved: " + JSON.stringify(this.settings));
	}
}