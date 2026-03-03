import { Plugin, TFile } from "obsidian";
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

			// override the built-in attachment path placmeent
			const vault = this.app.vault as any;
			const original = vault.getAvailablePathForAttachments.bind(vault);

			vault.getAvailablePathForAttachments = async (filename: string, extension: string, activeFile: TFile | null): Promise<string> => {
				Clogger.debug(`getAvailablePathForAttachments called for: ${filename}.${extension}`, true);

				const destinationFolder = await this.placementManager.getDestinationFolder(activeFile?.path);

				if (destinationFolder) {
					const folder = destinationFolder.endsWith("/") ? destinationFolder : `${destinationFolder}/`;
					const fullPath = `${destinationFolder}/${filename}.${extension}`;
					Clogger.debug(`Redirecting attachment to: ${fullPath}`,true);
					return fullPath;
				}

				Clogger.debug("No destination found, using Obsidian default.", true);
				return original(filename, extension, activeFile);
			};

			Clogger.debug("AttachmentPlacementPlugin loaded successfully.", true);
		});
	}

	onunload(): void {
		// to clean up we want to restore the original method
		Clogger.debug("Unloading AttachmentPlacementPlugin...", true);
		delete (this.app.vault as any).getAvailablePathForAttachments;
		
		Clogger.debug("AttachmentPlacementPlugin unloaded successfully.", true);
	}

	async loadSettings(): Promise<void> {
		Clogger.debug("Loading settings...");
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<Settings>);
		Clogger.debug("Settings loaded: " + JSON.stringify(this.settings));
	}

	async saveSettings(): Promise<void> {
		Clogger.debug("Saving settings...");
		await this.saveData(this.settings);
		Clogger.debug("Settings saved: " + JSON.stringify(this.settings));
	}
}
