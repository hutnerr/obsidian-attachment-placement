import { Clogger } from "clogger";
import AttachmentPlacementPlugin from "main";
import { Notice } from "obsidian";

export class PlacementManager {
	plugin: AttachmentPlacementPlugin;

	constructor(plugin: AttachmentPlacementPlugin) {
		this.plugin = plugin;
		Clogger.debug("Initializing PlacementManager...", true);
	}

	async handleNewFile(path: string): Promise<void> {
		Clogger.debug(`Handling new file: ${path}`, true);
		if (await this._isMarkdownFile(path)) {
			Clogger.debug(`Markdown file. No special handling required.`, true);
			return;
		}

		let limit = this.plugin.settings.fallbackDepthLimit ?? 99;
		let parentFolder = await this._goUpOneLevel(path); // direct parent of the file

		while (parentFolder !== "/" && parentFolder !== "" && limit > 0) {
			const placementPath = await this._findPlacementRule(parentFolder);
			if (placementPath) {
				Clogger.debug(`Found placement path: ${placementPath}`, true);
				await this._moveFile(path, placementPath);
				if (this.plugin.settings.notificationsEnabled) {
					new Notice(`File moved to ${placementPath}`);
				}
				Clogger.info("File placed successfully.", true);
				return;
			}
			Clogger.debug(`No rule for ${parentFolder}. Going up...`, true);
			limit--;
			parentFolder = await this._goUpOneLevel(parentFolder);
		}

		Clogger.debug(`No placement rule found. Using fallback if set.`, true);
		if (this.plugin.settings.fallbackPath) {
			await this._moveFile(path, this.plugin.settings.fallbackPath);
			if (this.plugin.settings.notificationsEnabled) {
				new Notice(
					`File moved to fallback: ${this.plugin.settings.fallbackPath}`,
				);
			}
		}
	}

	async _isMarkdownFile(path: string): Promise<boolean> {
		return path.endsWith(".md");
	}

	async _goUpOneLevel(path: string): Promise<string> {
		const trimmed = path.replace(/\/$/, "");
		const parts = trimmed.split("/");
		parts.pop();
		return parts.length ? parts.join("/") + "/" : "/";
	}

	async _findPlacementRule(folderPath: string): Promise<string | null> {
		// export interface PlacementRule {
		//     id: string;
		//     name: string;
		//     sourcePath: string;
		//     destinationPath: string;
		// }

		// export interface Settings {
		//     rules: PlacementRule[];
		//     fallbackPath: string;
		//     fallbackDepthLimit?: number;
		//     notificationsEnabled: boolean;
		//     includeMdFilesInSuggestions: boolean;
		// }

		Clogger.debug(`Finding placement rule for folder: ${folderPath}`, true);
		const settings = this.plugin.settings;
		const rules = settings.rules;
		for (const rule of rules) {
			// Clogger.debug(`Checking rule: ${rule.sourcePath} -> ${rule.destinationPath}`, true);
			if (folderPath === rule.sourcePath) {
				Clogger.debug(
					`Found matching rule: ${rule.sourcePath} -> ${rule.destinationPath}`,
					true,
				);
				return rule.destinationPath;
			}
		}
		return null;
	}

	async _moveFile(
		filePath: string,
		destinationFolder: string,
	): Promise<void> {
		const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
		if (!file) {
			Clogger.error(`File not found: ${filePath}`, true);
			return;
		}

		const fileName = filePath.split("/").pop();
		const newPath = destinationFolder.endsWith("/")
			? `${destinationFolder}${fileName}`
			: `${destinationFolder}/${fileName}`;

		Clogger.debug(`Moving file from ${filePath} to ${newPath}`, true);
		try {
			await this.plugin.app.fileManager.renameFile(file, newPath);
			Clogger.debug(`File moved successfully to ${newPath}`, true);
		} catch (error) {
			Clogger.error(
				`Error moving file: ${error instanceof Error ? error.message : String(error)}`,
				true,
			);
		}
	}
}
