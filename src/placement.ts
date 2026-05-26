import { normalizePath, Notice } from "obsidian";
import { Clogger } from "clogger";
import AttachmentPlacementPlugin from "main";

export class PlacementManager {
	plugin: AttachmentPlacementPlugin;
	private ruleMap: Map<string, string> = new Map();
	private destinationCache: Map<string, string | null> = new Map();

	constructor(plugin: AttachmentPlacementPlugin) {
		this.plugin = plugin;
		Clogger.debug("Initializing PlacementManager...");
		this.rebuildRuleMap();

		// clear cache when folders are created/deleted
		this.plugin.registerEvent(
			this.plugin.app.vault.on("create", () =>
				this.destinationCache.clear(),
			),
		);
		this.plugin.registerEvent(
			this.plugin.app.vault.on("delete", () =>
				this.destinationCache.clear(),
			),
		);
		this.plugin.registerEvent(
			this.plugin.app.vault.on("rename", () =>
				this.destinationCache.clear(),
			),
		);
	}

	rebuildRuleMap(): void {
		this.ruleMap = new Map(
			this.plugin.settings.rules.map((rule) => [
				normalizePath(rule.sourcePath),
				rule.destinationPath,
			]),
		);
		this.destinationCache.clear();
		Clogger.debug(
			`Rule map rebuilt with ${this.ruleMap.size} entries, cache cleared.`,
		);
	}

	getDestinationFolder(activePath: string | undefined): string | null {
		const cacheKey = activePath ?? "__fallback__";

		if (this.destinationCache.has(cacheKey)) {
			Clogger.debug(`Cache hit for: ${cacheKey}`);
			return this.destinationCache.get(cacheKey)!;
		}

		const result = this._resolveDestination(activePath);
		this.destinationCache.set(cacheKey, result);
		return result;
	}

	private _resolveDestination(activePath: string | undefined): string | null {
		if (!activePath) {
			Clogger.debug("No active path provided.");
			return this._validateFolder(
				this.plugin.settings.fallbackPath || null,
			);
		}

		const fileRule = this._findPlacementRule(activePath);
		if (fileRule !== null) {
			Clogger.debug(`Found file-level rule for: ${activePath}`);
			return this._validateFolder(fileRule);
		}

		let limit = this.plugin.settings.fallbackDepthLimit ?? 99;
		let parentFolder = this._goUpOneLevel(activePath);

		while (parentFolder !== "" && limit > 0) {
			const placementPath = this._findPlacementRule(parentFolder);
			if (placementPath !== null) {
				Clogger.debug(`Found placement path: ${placementPath}`);
				return this._validateFolder(placementPath);
			}
			limit--;
			parentFolder = this._goUpOneLevel(parentFolder);
		}

		return this._validateFolder(this.plugin.settings.fallbackPath || null);
	}

	private _goUpOneLevel(path: string): string {
		const parts = normalizePath(path).split("/");
		parts.pop();
		return parts.join("/");
	}

	private _findPlacementRule(folderPath: string): string | null {
		const normalized = normalizePath(folderPath);
		const destination = this.ruleMap.get(normalized);
		if (destination !== undefined) {
			Clogger.debug(
				`Found matching rule: ${normalized} -> ${destination}`,
			);
			return destination;
		}
		return null;
	}

	private _validateFolder(folderPath: string | null): string | null {
		if (folderPath === null || folderPath === undefined) return null;

		const normalized = normalizePath(folderPath);

		if (normalized === "." || normalized === "/") return "";

		const exists =
			this.plugin.app.vault.getAbstractFileByPath(normalized) !== null;

		if (!exists) {
			Clogger.error(
				`Destination folder does not exist: ${normalized}`,
			);
			if (this.plugin.settings.notificationsEnabled) {
				new Notice(
					`⚠️ Attachment Placement: folder "${normalized}" does not exist. Please check your settings.`,
				);
			}
			return null;
		}
		return normalized;
	}
}
