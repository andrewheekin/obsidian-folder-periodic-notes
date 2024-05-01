import {
	Plugin,
	Notice,
	TFile,
	moment,
	Setting,
	App,
	PluginSettingTab,
} from "obsidian";

interface BetterPeriodicNotesSettings {
	noteFolder: string;
}

const DEFAULT_SETTINGS: BetterPeriodicNotesSettings = {
	noteFolder: "/",
};

export default class BetterPeriodicNotesPlugin extends Plugin {
	settings: BetterPeriodicNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "create-daily-note",
			name: "Create today's daily note",
			callback: () => this.createPeriodicNote("daily"),
		});

		this.addCommand({
			id: "create-monthly-note",
			name: "Create this month's note",
			callback: () => this.createPeriodicNote("monthly"),
		});

		this.addCommand({
			id: "create-yearly-note",
			name: "Create this year's note",
			callback: () => this.createPeriodicNote("yearly"),
		});

		this.addSettingTab(new BetterPeriodicNotesSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createPeriodicNote(periodType: "daily" | "monthly" | "yearly") {
		const date = moment();
		const year = date.format("YYYY");
		const month = date.format("YYYY-MM");
		const day = date.format("YYYY-MM-DD");

		let path = this.settings.noteFolder;
		if (periodType === "daily" || periodType === "monthly") {
			path += `/${year}/${month}`;
			await this.ensureFolderExists(path);
			if (periodType === "daily") {
				path += `/${day}.md`;
			} else {
				path += `/${month}.md`;
			}
		} else if (periodType === "yearly") {
			path += `/${year}`;
			await this.ensureFolderExists(path);
			path += `/${year}.md`;
		}

		this.createOrShowNote(path);
	}

	async ensureFolderExists(path: string) {
		const folders = path.split("/");
		let currentPath = "";
		for (const folder of folders) {
			if (folder) {
				currentPath += `/${folder}`;
				const exist = this.app.vault.getAbstractFileByPath(currentPath);
				if (!exist) {
					await this.app.vault.createFolder(currentPath);
				}
			}
		}
	}

	async createOrShowNote(path: string) {
		let file = this.app.vault.getAbstractFileByPath(path) as TFile;
		if (!file) {
			file = await this.app.vault.create(path, "");
		}
		this.app.workspace.openLinkText(file.path, "/", false);
		new Notice(`Note ${file.basename} is opened.`);
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
			.setDesc(
				"Specify the folder where the periodic notes will be created"
			)
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
