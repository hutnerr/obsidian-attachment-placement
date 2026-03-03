import { Modal, App, ButtonComponent } from "obsidian";

export class ConfirmModal extends Modal {
	private message: string;
	private onConfirm: () => void;

	constructor(app: App, message: string, onConfirm: () => void) {
		super(app);
		this.message = message;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: "Confirm action" }); // sentence case

		contentEl.createEl("p", { text: this.message });

		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		new ButtonComponent(buttonContainer)
			.setButtonText("Confirm")
			.setWarning()
			.onClick(() => {
				this.close();
				this.onConfirm();
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}