import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingsTab } from "./settings";
import { Clogger } from 'clogger';
import { PlacementManager } from './placement';

export default class AttachmentPlacementPlugin extends Plugin {
	settings: Settings;
	placementManager: PlacementManager;

	async onload() {
		Clogger.debug('Starting AttachmentPlacementPlugin...', true);
		await this.loadSettings();

		this.placementManager = new PlacementManager();
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				Clogger.debug(`File created: ${file.path}`, true);
				this.placementManager.handleNewFile(file.path);
			})
		);

		// TODO: I should also add like a "resort" command that can be triggered manually
		// that will go through all files and move them to the right place. 
		// useful for testing and also for users who want to fix what they already have.

		// maybe I can have a resort folder button that appears when you right click on a folder. 
		// for the todo button above, it can just take in the root folder to use 
		// the same function for both.

		Clogger.debug('AttachmentPlacementPlugin loaded successfully.', true);
	}

	async onunload() {
		Clogger.debug('Unloading AttachmentPlacementPlugin...', true);
		Clogger.debug('AttachmentPlacementPlugin unloaded successfully.', true);
	}

	async loadSettings() {
		Clogger.debug('Loading settings...');
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<Settings>);
		Clogger.debug('Settings loaded: ' + JSON.stringify(this.settings));
	}

	async saveSettings() {
		Clogger.debug('Saving settings...');
		await this.saveData(this.settings);
		Clogger.debug('Settings saved: ' + JSON.stringify(this.settings));
	}
}

