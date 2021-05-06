import * as Discord from 'discord.js';
import * as Config from './config.json';
import { Bot } from './main';
const load = true;

const commands: Command[] = [];
let toAdd: Command[] = [];
export async function LoadAllCommands() {
	Bot.guild.commands.set(toAdd.map(x => x.toDiscordFormat())).then((commands) => {
		commands.forEach((cmd) => {
			const com = GetCommand(cmd.name);
			if (!com)
				return;

			if (com.isAdmin) {
				cmd.setPermissions([
					{
						id: Config.Admin.AdminCommandsRoleId,
						type: 1,
						permission: true
					}
				])
			}
		});
	});

	toAdd = [];
}

interface CommandOptions {
	isAdmin?: boolean;
	description?: string;
}

type onExecCallbackType = (((interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => void) | undefined);

export class Command {

	private _isParent: boolean = false;
	public get isParent(): boolean {
		return this._isParent;
	}

	public get name(): string {
		return this._name;
	}

	public get isAdmin(): boolean {
		return this._settings!.isAdmin || false;
	}

	public get onExec(): onExecCallbackType {
		return this._onExec;
	}

	constructor(private _name: string, private _onExec: onExecCallbackType, private _settings?: CommandOptions, private _args?: Discord.ApplicationCommandOptionData[]) {
		this._settings = this._settings || {};

		if (load) {
			if (!Bot || !Bot.Ready) {
				toAdd.push(this);
			} else {
				Bot.guild.commands.create(this.toDiscordFormat()).then(cmd => {
					if (this._settings!.isAdmin) {
						cmd.setPermissions([
							{
								id: Config.Admin.AdminCommandsRoleId,
								type: 1,
								permission: true
							}
						]);
					}
				});
			}
		}

		commands.push(this);
	}

	public toDiscordFormat(): Discord.ApplicationCommandData {
		return {
			name: this._name,
			description: this._settings!.description || 'Pas de description',
			options: this._args
		}
	}

}

export function GetCommand(name: string): Command | undefined {
	const cmd = commands.find(x => x.name === name.toLowerCase());

	return cmd;
}