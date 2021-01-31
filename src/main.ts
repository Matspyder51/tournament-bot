import * as Discord from 'discord.js';
import { EventEmitter } from 'events';
import { GetCommand } from './commands';

import "./tournament";
import { LoadRanksEmojis } from './tournament';

const TOKEN = "ODA1Mjg0ODc3MDY2NTY3NzQx.YBYp_A.spDcHTqfo0YERVk1bidiAY3od04";

export const GUILD_ID = "766876060960555050";

export const DEBUG_MODE = true;

export function GetRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

class Bot extends EventEmitter {

	private _client: Discord.Client;
	public get Client(): Discord.Client {
		return this._client;
	}

	constructor() {
		super();

		this._client = new Discord.Client();
		this.ListenEvents();
		this._client.login(TOKEN);
	}

	private ListenEvents() {
		this._client.on('ready', () => {
			console.log("Bot is ready");

			LoadRanksEmojis();
		});

		this._client.on('message', this.OnMessage.bind(this));
	}

	private OnMessage(message: Discord.Message) {
		if (message.author.bot || !message.guild || message.guild.id != GUILD_ID)
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

			command.onExec(message.member, args, message)
			return;
		}
	}

}

const BotInstance = new Bot();
export { BotInstance as Bot };