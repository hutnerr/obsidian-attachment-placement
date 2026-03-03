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

			const vault = this.app.vault as any;
			const original = vault.getAvailablePathForAttachments.bind(vault);

			vault.getAvailablePathForAttachments = async (filename: string, extension: string, activeFile: TFile | null): Promise<string> => {
				const destinationFolder = await this.placementManager.getDestinationFolder(activeFile?.path);

				if (destinationFolder) {
					const base = destinationFolder ? `${destinationFolder}/${filename}` : filename;
					let candidate = `${base}.${extension}`;

					let i = 1;
					while (this.app.vault.getAbstractFileByPath(candidate) !== null) {
						candidate = `${base} ${i}.${extension}`;
						i++;
					}

					Clogger.debug(`Redirecting attachment to: ${candidate}`, true);
					return candidate;
				}

				return original(filename, extension, activeFile);
			};

			Clogger.debug("AttachmentPlacementPlugin loaded successfully.", true);
		});
	}

	onunload(): void {
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
		this.placementManager?.rebuildRuleMap();
		Clogger.debug("Settings saved: " + JSON.stringify(this.settings));
	}
}