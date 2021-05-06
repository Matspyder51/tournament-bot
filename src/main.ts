import * as Config from './config.json';
import * as Discord from 'discord.js';
import { GetCommand, LoadAllCommands } from './commands';
import { LoadRanksEmojis } from './models/rank';
import "./controllers/tournament";

export const DEBUG_MODE = Config.DebugMode;

class Bot {

	private _client: Discord.Client;
	public get Client(): Discord.Client {
		return this._client;
	}

	private _guild!: Discord.Guild;
	public get guild(): Discord.Guild {
		return this._guild;
	}

	private _ready: boolean = false;
	public get Ready(): boolean {
		return this._ready;
	}

	constructor() {
		this._client = new Discord.Client({
			intents: 'GUILDS'
		});
		this.ListenEvents();
		this._client.login(Config.BotToken);
	}

	private ListenEvents() {
		this._client.on('ready', async () => {
			this._guild = await this._client.guilds.fetch(Config.GuildId);

			LoadRanksEmojis();

			// await this._guild.commands.set([]);

			this._ready = true;
			LoadAllCommands();

			this._client.on('interaction', (interaction: Discord.Interaction) => {
				if (!interaction.isCommand())
					return;

				const cmd = GetCommand(interaction.commandName);
				if (!cmd || !cmd.onExec)
					return;

				const member = (<Discord.GuildMember>interaction.member);
				if (cmd.isAdmin && (!member.permissions.has('ADMINISTRATOR') && !member.roles.cache.has(Config.Admin.AdminCommandsRoleId)))
					return interaction.reply('Vous n\'avez pas la permission');

				cmd.onExec(interaction, interaction.options);
			});

			console.log("Bot is ready");
		});
	}

}

const BotInstance = new Bot();
export { BotInstance as Bot };