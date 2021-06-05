import * as Config from './config.json';
import * as Discord from 'discord.js';
import { GetCommand, LoadAllCommands } from './commands';
import { LoadRanksEmojis } from './models/rank';
import './controllers/tournament';

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

	private _ready = false;
	public get Ready(): boolean {
		return this._ready;
	}

	private stickiesMessages: {id: number, channel: string, message: string, msg?: Discord.Message}[] = [];

	constructor() {
		this._client = new Discord.Client({
			intents: ['GUILDS', 'GUILD_MESSAGES']
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

			console.log('Bot is ready');
		});

		this._client.on('message', this.onMsg.bind(this));

		this._client.on('interaction', (interaction: Discord.Interaction) => {
			if (!interaction.isCommand())
				return;

			const cmd = GetCommand(interaction.commandName);
			if (!cmd || !cmd.onExec)
				return interaction.reply('Invalid command');

			const member = (<Discord.GuildMember>interaction.member);
			if (cmd.isAdmin && (!member.permissions.has('ADMINISTRATOR') && !member.roles.cache.has(Config.Admin.AdminCommandsRoleId)))
				return interaction.reply('Vous n\'avez pas la permission');

			cmd.onExec(interaction, interaction.options);
		});
	}

	private onMsg(msg: Discord.Message) {
		if (!msg.guild || !msg.channel)
			return;

		for (const stick of this.stickiesMessages) {
			if (msg.channel.id == stick.channel && msg.content != stick.message) {

				const create = () => {
					msg.channel.send(stick.message).then((msg) => {
						stick.msg = msg;
					});
				};

				if (stick.msg != null)
					stick.msg.delete().then(() => create()).catch((e) => console.error('Unable to delete sticky message: ' + e));
				else
					create();
			}
		}
	}

	public AddSticky(channel: Discord.TextChannel, message: string): number {
		const nextId = (this.stickiesMessages[this.stickiesMessages.length - 1]?.id || 0) + 1;

		this.stickiesMessages.push({
			id: nextId,
			channel: channel.id,
			message
		});

		// channel.send(message).then((msg) => {
		// 	const m = this.stickiesMessages.find(x => x.id == nextId);
		// 	if (!m)
		// 		return;
		// 	m.msg = msg;
		// });

		return nextId;
	}

	public async RemoveSticky(id: number, remove = false): Promise<boolean> {
		const index = this.stickiesMessages.findIndex(x => x.id == id);

		if (index == -1)
			return false;

		const msg = this.stickiesMessages.splice(index, 1)[0];
		if (remove && msg.msg) {
			msg.msg.delete();
		}
		return true;
	}

}

const BotInstance = new Bot();
export { BotInstance as Bot };