import {
	App,
	AbstractInputSuggest,
	TAbstractFile,
	TFile,
	TFolder,
} from "obsidian";

export class PathSuggest extends AbstractInputSuggest<TAbstractFile> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement,
		private options: {
			foldersOnly: boolean;
			includeMdFiles: () => boolean;
		},
	) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TAbstractFile[] {
		const lower = query.toLowerCase();

		return this.app.vault
			.getAllLoadedFiles()
			.filter((file) => {
				if (!file.path.toLowerCase().includes(lower)) return false;
				if (this.options.foldersOnly) return file instanceof TFolder;
				if (file instanceof TFolder) return true;

				if (file instanceof TFile) {
					if (this.options.includeMdFiles())
						return file.extension === "md";
					return false; // if MD not included → no files allowed
				}
				return false;
			})
			.slice(0, 50);
	}

	renderSuggestion(file: TAbstractFile, el: HTMLElement) {
		el.createEl("div", { text: file.path });
	}

	selectSuggestion(file: TAbstractFile) {
		const value = file instanceof TFolder ? file.path + "/" : file.path;
		this.inputEl.value = value;
		this.inputEl.trigger("input");
		this.close();
	}
}
