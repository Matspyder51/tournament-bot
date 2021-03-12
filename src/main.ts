import * as Config from './config.json';
import * as Discord from 'discord.js';
import { GetCommand } from './commands';
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

	constructor() {
		this._client = new Discord.Client();
		this.ListenEvents();
		this._client.login(Config.BotToken);
	}

	private ListenEvents() {
		this._client.on('ready', async () => {
			console.log("Bot is ready");

			this._guild = await this._client.guilds.fetch(Config.GuildId);

			LoadRanksEmojis();
		});

		this._client.on('message', this.OnMessage.bind(this));
	}

	private OnMessage(message: Discord.Message) {
		if (message.author.bot || !message.guild || message.guild.id != Config.GuildId)
			return;
		const isCommand = message.content.startsWith('!');
		if (isCommand) {

			const cmd: string = message.content.split(' ')[0].substr(1);
			const args: Array<string> = message.content.split(' ').slice(1);

			const command = GetCommand(cmd);
			if (!command)
				return;

			if (command.isAdmin || !message.member) {
				if (!message.member?.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR))
					return;
			}

			if (command.isParent && command.subCommands != null && command.subCommands.length > 0 && args.length > 0) {
				const sub = command.subCommands.find(x => x.name === args[0]);

				if (!sub)
					return;

				sub.onExec(message.member, args.slice(1), message);

				return;
			}

			if (command.onExec != null)
				command.onExec(message.member, args, message);

			return;
		}
	}

}

const BotInstance = new Bot();
export { BotInstance as Bot };