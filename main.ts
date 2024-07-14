import { Plugin, TFile, TFolder, moment, Setting, App, PluginSettingTab } from "obsidian";

interface FolderPeriodicNotesSettings {
	noteFolder: string;
}

const DEFAULT_SETTINGS: FolderPeriodicNotesSettings = {
	noteFolder: "/",
};

enum PeriodType {
	Daily = "daily",
	Weekly = "weekly",
	Monthly = "monthly",
	Yearly = "yearly",
}

export default class FolderPeriodicNotesPlugin extends Plugin {
	settings: FolderPeriodicNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "open-daily-note",
			name: "Open daily note",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Daily),
		});

		this.addCommand({
			id: "open-weekly-note",
			name: "Open weekly note",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Weekly),
		});

		this.addCommand({
			id: "open-monthly-note",
			name: "Open monthly note",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Monthly),
		});

		this.addCommand({
			id: "open-yearly-note",
			name: "Open yearly note",
			callback: () => this.createOrOpenPeriodicNote(PeriodType.Yearly),
		});

		this.addCommand({
			id: "open-yesterday",
			name: "Yesterday",
			callback: () => this.createOrOpenYesterdaysDailyNote(),
		});

		this.addCommand({
			id: "open-tomorrow",
			name: "Tomorrow",
			callback: () => this.createOrOpenTomorrowsDailyNote(),
		});

		this.addCommand({
			id: "open-last-5-days-notes",
			name: "Last 5 days",
			callback: () => this.createOrOpenLast5DaysNotes(),
		});

		this.addCommand({
			id: "generate-all-daily-notes-for-current-year",
			name: "Generate all daily notes for current calendar year",
			callback: () => this.generateAllDailyNotesForCurrentYear(),
		});

		this.addSettingTab(new FolderPeriodicNotesSettingTab(this.app, this));
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
		const week = date.format("YYYY-[W]WW"); // ISO Week Number

		let noteFolderPath = this.settings.noteFolder;

		if (periodType === PeriodType.Yearly) {
			await this.createYearFolderNote(year);
			return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${year}.md`, "", true);
		}

		if (periodType === PeriodType.Weekly) {
			await this.createYearFolderNote(year);
			const weekStart = moment().startOf("isoWeek");
			const weekMonth = weekStart.format("YYYY-MM");
			await this.createMonthFolderNote(year, weekMonth); // Ensure the month folder for the week's start month exists
			await this.createWeekNote(year, weekMonth, week);
			return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${weekMonth}/${week}.md`, "", true);
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

	async createWeekNote(year: string, month: string, week: string) {
		const weekFolderPath = `${this.settings.noteFolder}/${year}/${month}`;
		const weekFilePath = `${weekFolderPath}/${week}.md`;

		let existingWeekFolder = this.app.vault.getAbstractFileByPath(weekFolderPath);
		if (!existingWeekFolder) {
			await this.app.vault.createFolder(weekFolderPath);
		}

		let existingWeekFile = this.app.vault.getAbstractFileByPath(weekFilePath);
		if (!existingWeekFile) {
			await this.app.vault.create(weekFilePath, ""); // Second parameter is the content of the note
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

	async createOrOpenYesterdaysDailyNote() {
		const date = moment().subtract(1, "days");
		const year = date.format("YYYY");
		const month = date.format("YYYY-MM");
		const day = date.format("YYYY-MM-DD");

		let noteFolderPath = this.settings.noteFolder;

		await this.createYearFolderNote(year);
		await this.createMonthFolderNote(year, month);
		await this.createDayNote(year, month, day);
		return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${month}/${day}.md`, "", true);
	}

	async createOrOpenTomorrowsDailyNote() {
		const date = moment().add(1, "days");
		const year = date.format("YYYY");
		const month = date.format("YYYY-MM");
		const day = date.format("YYYY-MM-DD");

		let noteFolderPath = this.settings.noteFolder;

		await this.createYearFolderNote(year);
		await this.createMonthFolderNote(year, month);
		await this.createDayNote(year, month, day);
		return this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${month}/${day}.md`, "", true);
	}

	async createOrOpenLast5DaysNotes() {
		const noteFolderPath = this.settings.noteFolder;

		for (let i = 4; i >= 0; i--) {
			const date = moment().subtract(i, "days");
			const year = date.format("YYYY");
			const month = date.format("YYYY-MM");
			const day = date.format("YYYY-MM-DD");

			await this.createYearFolderNote(year);
			await this.createMonthFolderNote(year, month);
			await this.createDayNote(year, month, day);
			await this.app.workspace.openLinkText(`${noteFolderPath}/${year}/${month}/${day}.md`, "", true);
		}
	}

	async generateAllDailyNotesForCurrentYear() {
		const noteFolderPath = this.settings.noteFolder;
		const today = moment();
		const endOfYear = moment().endOf("year");

		for (let date = today.clone(); date.isBefore(endOfYear); date.add(1, "days")) {
			const year = date.format("YYYY");
			const month = date.format("YYYY-MM");
			const day = date.format("YYYY-MM-DD");

			await this.createYearFolderNote(year);
			await this.createMonthFolderNote(year, month);
			await this.createDayNote(year, month, day);
		}
	}
}

class FolderPeriodicNotesSettingTab extends PluginSettingTab {
	plugin: FolderPeriodicNotesPlugin;

	constructor(app: App, plugin: FolderPeriodicNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Note folder")
			.setDesc("The folder where your periodic notes will be stored")
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
