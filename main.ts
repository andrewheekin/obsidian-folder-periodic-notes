import { Plugin, TFile, TFolder, moment, Setting, App, PluginSettingTab } from "obsidian";

interface BetterPeriodicNotesSettings {
	noteFolder: string;
}

const DEFAULT_SETTINGS: BetterPeriodicNotesSettings = {
	noteFolder: "/",
};

enum PeriodType {
	Daily = "daily",
	Monthly = "monthly",
	Yearly = "yearly",
}

export default class BetterPeriodicNotesPlugin extends Plugin {
	settings: BetterPeriodicNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "open-daily-note",
			name: "Open daily note",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Daily),
		});

		this.addCommand({
			id: "open-monthly-note",
			name: "Open monthly",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Monthly),
		});

		this.addCommand({
			id: "open-yearly-note",
			name: "Open yearly note",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Yearly),
		});

		this.addSettingTab(new BetterPeriodicNotesSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	/**
	 * Ensure that all the folders and folder notes in the path exist
	 *
	 * Example 1, "Periodic Notes/2024/2024-01/2024-01-01" will create:
	 * - Periodic Notes/2024/2024.md
	 * - Periodic Notes/2024/2024-01/2024-01.md
	 * - Periodic Notes/2024/2024-01/2024-01-01.md
	 * Then will open the note Periodic Notes/2024/2024-01/2024-01-01.md
	 *
	 * Example 2, "Periodic Notes/2024/2024-01" will create:
	 * - Periodic Notes/2024/2024.md
	 * - Periodic Notes/2024/2024-01/2024-01.md
	 * Then will open the note Periodic Notes/2024/2024-01/2024-01.md
	 *
	 * Example 3, "Periodic Notes/2024" will create:
	 * - Periodic Notes/2024/2024.md
	 * Then will open the note Periodic Notes/2024/2024.md
	 */

	async createOrOpenPeriodicNote(periodType: PeriodType) {
		const date = moment();
		const year = date.format("YYYY");
		const month = date.format("YYYY-MM");
		const day = date.format("YYYY-MM-DD");

		let noteFolderPath = this.settings.noteFolder;

		if (periodType === PeriodType.Yearly) {
			await this.createYearFolderNote(year);
			return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${year}.md`, "", true);
		}

		if (periodType === PeriodType.Monthly) {
			await this.createYearFolderNote(year);
			await this.createMonthFolderNote(year, month);
			return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${month}/${month}.md`, "", true);
		}

		if (periodType === PeriodType.Daily) {
			await this.createYearFolderNote(year);
			await this.createMonthFolderNote(year, month);
			await this.createDayNote(year, month, day);
			return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${month}/${day}.md`, "", true);
		}

	}

	async createYearFolderNote(year: string) {
		const yearFolderPath = `${this.settings.noteFolder}/${year}`;
		const yearFilePath = `${yearFolderPath}/${year}.md`;

		// Check whether the year folder exists, if not create it
		let existingYearFolder = this.app.vault.getAbstractFileByPath(yearFolderPath);
		if (!existingYearFolder) {
			await this.app.vault.createFolder(yearFolderPath);
		}

		// Check whether the year note exists, if not create it
		let existingYearFile = this.app.vault.getAbstractFileByPath(yearFilePath);
		if (!existingYearFile) {
			// Second parameter is the content of the note
			await this.app.vault.create(yearFilePath, "");
		}
	}

	async createMonthFolderNote(year: string, month: string) {
		const monthFolderPath = `${this.settings.noteFolder}/${year}/${month}`;
		const monthFilePath = `${monthFolderPath}/${month}.md`;

		// Check whether the month folder exists, if not create it
		let existingMonthFolder = this.app.vault.getAbstractFileByPath(monthFolderPath);
		if (!existingMonthFolder) {
			await this.app.vault.createFolder(monthFolderPath);
		}

		// Check whether the month note exists, if not create it
		let existingMonthFile = this.app.vault.getAbstractFileByPath(monthFilePath);
		if (!existingMonthFile) {
			// Second parameter is the content of the note
			await this.app.vault.create(monthFilePath, "");
		}
	}

	async createDayNote(year: string, month: string, day: string) {
		// Only create the note, not the folder
		const dayFolderPath = `${this.settings.noteFolder}/${year}/${month}`;
		const dayFilePath = `${dayFolderPath}/${day}.md`;

		// Check whether the month folder folder exists for the day, if not create it
		let existingMonthFolder = this.app.vault.getAbstractFileByPath(dayFolderPath);
		if (!existingMonthFolder) {
			await this.app.vault.createFolder(dayFolderPath);
		}

		// Check whether the day note exists, if not create it
		let existingDayFile = this.app.vault.getAbstractFileByPath(dayFilePath);
		if (!existingDayFile) {
			// Second parameter is the content of the note
			await this.app.vault.create(dayFilePath, "");
		}
	}
}

class BetterPeriodicNotesSettingTab extends PluginSettingTab {
	plugin: BetterPeriodicNotesPlugin;

	constructor(app: App, plugin: BetterPeriodicNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Settings for Better Periodic Notes",
		});

		new Setting(containerEl)
			.setName("Note Folder")
			.setDesc("Specify the folder where the periodic notes will be created")
			.addText((text) =>
				text
					.setPlaceholder("/")
					.setValue(this.plugin.settings.noteFolder)
					.onChange(async (value) => {
						this.plugin.settings.noteFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
