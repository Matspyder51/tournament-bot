import * as Discord from 'discord.js';

interface Command {
	name: string;
	onExec: (from: Discord.GuildMember, args: string[], message: Discord.Message) => void;
	isAdmin: boolean;
}

const commands: Command[] = []

export function RegisterCommand(commandName: string, callback: (from: Discord.GuildMember, args: string[], message: Discord.Message) => void, isAdmin: boolean = false) {
	if (GetCommand(commandName))
		return;

	commands.push({name: commandName, onExec: callback, isAdmin});
}

export function GetCommand(name: string): Command | undefined {
	const cmd = commands.find(x => x.name === name);

	return cmd;
}