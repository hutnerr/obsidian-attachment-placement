import { Notice, Plugin, TFile, Vault } from "obsidian";
import { DEFAULT_SETTINGS, Settings, SettingsTab } from "./settings";
import { Clogger } from "clogger";
import { PlacementManager } from "./placement";

type AttachmentPathFn = (
	filename: string,
	extension: string,
	activeFile: TFile | null,
) => Promise<string>;

interface VaultWithAttachmentPath extends Vault {
	getAvailablePathForAttachments?: AttachmentPathFn;
}

export default class AttachmentPlacementPlugin extends Plugin {
	settings: Settings;
	placementManager: PlacementManager;
	private originalGetAvailablePath: AttachmentPathFn | undefined;

	async onload(): Promise<void> {
		Clogger.debug("Starting AttachmentPlacementPlugin...");
		await this.loadSettings();

		this.placementManager = new PlacementManager(this);
		this.addSettingTab(new SettingsTab(this.app, this));

		const vault = this.app.vault as VaultWithAttachmentPath;
		this.originalGetAvailablePath =
			vault.getAvailablePathForAttachments!.bind(vault);

		vault.getAvailablePathForAttachments = async (
			filename: string,
			extension: string,
			activeFile: TFile | null,
		): Promise<string> => {
			const destinationFolder =
				this.placementManager.getDestinationFolder(activeFile?.path);

			if (destinationFolder !== null) {
				const prefix =
					destinationFolder !== "" ? `${destinationFolder}/` : "";
				let candidate = `${prefix}${filename}.${extension}`;

				let i = 1;
				while (
					this.app.vault.getAbstractFileByPath(candidate) !== null
				) {
					candidate = `${prefix}${filename} ${i}.${extension}`;
					i++;
				}

				Clogger.debug(`Redirecting attachment to: ${candidate}`);
				if (this.settings.notificationsEnabled) {
					const location = destinationFolder !== "" ? destinationFolder : "vault root";
					new Notice(`Attachment placed in: ${location}`);
				}
				return candidate;
			}

			return this.originalGetAvailablePath!(filename, extension, activeFile);
		};

		Clogger.debug("AttachmentPlacementPlugin loaded successfully.");
	}

	onunload(): void {
		Clogger.debug("Unloading AttachmentPlacementPlugin...");
		const vault = this.app.vault as VaultWithAttachmentPath;
		if (this.originalGetAvailablePath) {
			vault.getAvailablePathForAttachments = this.originalGetAvailablePath;
		} else {
			delete vault.getAvailablePathForAttachments;
		}
		Clogger.debug("AttachmentPlacementPlugin unloaded successfully.");
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
		this.placementManager?.rebuildRuleMap();
		Clogger.debug("Settings saved: " + JSON.stringify(this.settings));
	}
}
