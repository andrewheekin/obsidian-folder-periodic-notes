import { Plugin, Notice, TFile, TFolder, moment, Setting, App, PluginSettingTab } from "obsidian";

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

	async createOrOpenPeriodicNote(periodType: PeriodType) {
		const date = moment();
		const year = date.format("YYYY");
		const month = date.format("YYYY-MM");
		const day = date.format("YYYY-MM-DD");

		let noteFolderPath = this.settings.noteFolder;
		if (periodType === PeriodType.Daily) {
			await this.getOrCreateNotesAndFolders(`${noteFolderPath}/${year}/${month}/${day}`, true);
		} else if (periodType === PeriodType.Monthly) {
			await this.getOrCreateNotesAndFolders(`${noteFolderPath}/${year}/${month}`, false);
		} else if (periodType === PeriodType.Yearly) {
			await this.getOrCreateNotesAndFolders(`${noteFolderPath}/${year}`, false);
		}
	}

	/**
	 * Take the path and ensure that all the folders and folder notes in the path exist
	 *
	 * @param path
	 * @param isDay - if isDay is true, create a note (not a folder note) for the day component of the path
	 */
	async getOrCreateNotesAndFolders(path: string, isDay: boolean) {
		// Create an array of folders from the path
		const folders = path.split("/");

		// Remove the root folder (noteFolder in settings)
		const periodicFolders = folders.slice(1);

		// Set the current path to the noteFolder
		let currentPath = folders[0];

		// Store the last note created
		let lastCreatedNote: TFile | null = null;

		// Loop through the year/month/day folders and create them and the corresponding markdown note of the same name if they don't exist
		for (const folder of periodicFolders) {
			if (folder) {
				currentPath += `/${folder}`;

				// AbstractFile can be either a TFile or TFolder
				const folderExists = this.app.vault.getAbstractFileByPath(currentPath);

				// If the folder doesn't exist, create it and create a markdown note with the same name inside
				if (!folderExists) {
					await this.app.vault.createFolder(currentPath);
					lastCreatedNote = await this.app.vault.create(`${currentPath}/${folder}.md`, "");
				}
				// If the folder exists, but it's a TFile, throw an error
				else if (folderExists instanceof TFile) {
					throw new Error(`A file with the name ${folder} already exists at ${currentPath}`);
				}
				// If the folder exists, but the markdown note doesn't exist, create it
				else if (folderExists instanceof TFolder) {
					// Include the extension in the path, since getAbstractFileByPath will also return folders of the same name
					const noteExists = this.app.vault.getAbstractFileByPath(`${currentPath}/${folder}.md`);
					if (!noteExists) {
						lastCreatedNote = await this.app.vault.create(`${currentPath}/${folder}.md`, "");
					}
				}
			}
		}

		// Open the note if it was created
		if (lastCreatedNote) {
			this.app.workspace.openLinkText(lastCreatedNote.path, "", true);
			new Notice(`Opened ${currentPath}`);
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
