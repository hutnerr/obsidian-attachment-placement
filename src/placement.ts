import { Clogger } from "clogger";
import AttachmentPlacementPlugin from "main";
import { Notice } from "obsidian";

export class PlacementManager {
	plugin: AttachmentPlacementPlugin;

	constructor(plugin: AttachmentPlacementPlugin) {
		this.plugin = plugin;
		Clogger.debug("Initializing PlacementManager...", true);
	}

	async getDestinationFolder(activePath: string | undefined): Promise<string | null> {
		if (!activePath) {
			Clogger.debug("No active path provided.", true);
			return await this._validateFolder(this.plugin.settings.fallbackPath ?? null);
		}

		let limit = this.plugin.settings.fallbackDepthLimit ?? 99;
		let parentFolder = await this._goUpOneLevel(activePath);

		while (parentFolder !== "" && limit > 0) {
			const placementPath = await this._findPlacementRule(parentFolder);
			if (placementPath) {
				Clogger.debug(`Found placement path: ${placementPath}`, true);
				return await this._validateFolder(placementPath);
			}
			limit--;
			parentFolder = await this._goUpOneLevel(parentFolder);
		}

		return await this._validateFolder(this.plugin.settings.fallbackPath ?? null);
	}

	async _goUpOneLevel(path: string): Promise<string> {
		const trimmed = path.replace(/\/$/, "");
		const parts = trimmed.split("/");
		parts.pop();
		return parts.join("/");
	}

	async _findPlacementRule(folderPath: string): Promise<string | null> {
		Clogger.debug(`Finding placement rule for folder: ${folderPath}`, true);
		const rules = this.plugin.settings.rules;
		for (const rule of rules) {
			const normalizedRule = rule.sourcePath.replace(/\/$/, "");
			const normalizedFolder = folderPath.replace(/\/$/, "");
			if (normalizedFolder === normalizedRule) {
				Clogger.debug(
					`Found matching rule: ${rule.sourcePath} -> ${rule.destinationPath}`,
					true,
				);
				return rule.destinationPath; // return as-is, _validateFolder will strip it
			}
		}
		return null;
	}

	async _validateFolder(folderPath: string | null): Promise<string | null> {
		if (!folderPath) return null;
		
		const normalized = folderPath.replace(/\/$/, "");
		const exists = this.plugin.app.vault.getAbstractFileByPath(normalized) !== null;
		
		if (!exists) {
			Clogger.error(`Destination folder does not exist: ${normalized}`, false);
			if (this.plugin.settings.notificationsEnabled) {
				new Notice(`⚠️ Attachment Placement: folder "${normalized}" does not exist. Please check your settings.`);
			}
			return null;
		}
		return normalized;
	}

	async _folderExists(folderPath: string): Promise<boolean> {
    	const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);
    	return folder !== null;
	}
}