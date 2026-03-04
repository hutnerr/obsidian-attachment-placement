import { Clogger } from "clogger";
import AttachmentPlacementPlugin from "main";
import { Notice } from "obsidian";

export class PlacementManager {
	plugin: AttachmentPlacementPlugin;
	private ruleMap: Map<string, string> = new Map();
	private destinationCache: Map<string, string | null> = new Map();

	constructor(plugin: AttachmentPlacementPlugin) {
		this.plugin = plugin;
		Clogger.debug("Initializing PlacementManager...", true);
		this.rebuildRuleMap();

		// clear cache when folders are created/deleted
		this.plugin.registerEvent(
			this.plugin.app.vault.on("create", () => this.destinationCache.clear())
		);
		this.plugin.registerEvent(
			this.plugin.app.vault.on("delete", () => this.destinationCache.clear())
		);
		this.plugin.registerEvent(
			this.plugin.app.vault.on("rename", () => this.destinationCache.clear())
		);
	}

	rebuildRuleMap(): void {
		this.ruleMap = new Map(
			this.plugin.settings.rules.map((rule) => [
				rule.sourcePath.replace(/\/$/, ""),
				rule.destinationPath,
			]),
		);
		this.destinationCache.clear();
		Clogger.debug(`Rule map rebuilt with ${this.ruleMap.size} entries, cache cleared.`, true);
	}

	async getDestinationFolder(activePath: string | undefined): Promise<string | null> {
		const cacheKey = activePath ?? "__fallback__";

		if (this.destinationCache.has(cacheKey)) {
			Clogger.debug(`Cache hit for: ${cacheKey}`, true);
			return this.destinationCache.get(cacheKey)!;
		}

		const result = this._resolveDestination(activePath);
		this.destinationCache.set(cacheKey, result);
		return result;
	}

	private _resolveDestination(activePath: string | undefined): string | null {
		if (!activePath) {
			Clogger.debug("No active path provided.", true);
			return this._validateFolder(this.plugin.settings.fallbackPath ?? null);
		}

		let limit = this.plugin.settings.fallbackDepthLimit ?? 99;
		let parentFolder = this._goUpOneLevel(activePath);

		while (parentFolder !== "" && limit > 0) {
			const placementPath = this._findPlacementRule(parentFolder);
			if (placementPath) {
				Clogger.debug(`Found placement path: ${placementPath}`, true);
				return this._validateFolder(placementPath);
			}
			limit--;
			parentFolder = this._goUpOneLevel(parentFolder);
		}

		return this._validateFolder(this.plugin.settings.fallbackPath ?? null);
	}

	_goUpOneLevel(path: string): string {
		const parts = path.replace(/\/$/, "").split("/");
		parts.pop();
		return parts.join("/");
	}

	_findPlacementRule(folderPath: string): string | null {
		const normalized = folderPath.replace(/\/$/, "");
		const destination = this.ruleMap.get(normalized);
		if (destination !== undefined) {
			Clogger.debug(`Found matching rule: ${normalized} -> ${destination}`, true);
			return destination;
		}
		return null;
	}

	_validateFolder(folderPath: string | null): string | null {
		if (folderPath === null || folderPath === undefined) return null;

		const normalized = folderPath.replace(/^\/+|\/+$/g, "");
		
		if (normalized === "") return ""; // root is always valid

		const exists = this.plugin.app.vault.getAbstractFileByPath(normalized) !== null;

		if (!exists) {
			Clogger.error(`Destination folder does not exist: ${normalized}`, false);
			// if (this.plugin.settings.notificationsEnabled) {}
			new Notice(`⚠️ Attachment Placement: folder "${normalized}" does not exist. Please check your settings.`);
			return null;
		}
		return normalized;
	}

	_folderExists(folderPath: string): boolean {
		return this.plugin.app.vault.getAbstractFileByPath(folderPath) !== null;
	}
}