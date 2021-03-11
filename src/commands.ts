import * as Discord from 'discord.js';

interface Command {
	name: string;
	onExec?: (from: Discord.GuildMember, args: string[], message: Discord.Message) => void;
	isAdmin: boolean;
	isParent?: boolean;
	subCommands?: Array<SubCommand>;
}

interface SubCommand {
	name: string;
	onExec: (from: Discord.GuildMember, args: string[], message: Discord.Message) => void;
	isAdmin: boolean;
}

const commands: Command[] = []

export function RegisterCommand(commandName: string, callback?: (from: Discord.GuildMember, args: string[], message: Discord.Message) => void, isAdmin: boolean = false) {
	if (GetCommand(commandName))
		return;

	commands.push({name: commandName, onExec: callback, isAdmin});
}

export function RegisterSubCommand(parent: string, name: string, callback: (from: Discord.GuildMember, args: string[], message: Discord.Message) => void, isAdmin: boolean = false) {
	const baseCommand = GetCommand(parent);
	if (!baseCommand)
		return;

	if (baseCommand.subCommands && baseCommand.subCommands.findIndex(x => x.name === name) != -1)
		return;

	baseCommand.isParent = true;
	baseCommand.subCommands = baseCommand.subCommands || [];
	baseCommand.subCommands.push({
		name,
		onExec: callback,
		isAdmin
	});
}

export function GetCommand(name: string): Command | undefined {
	const cmd = commands.find(x => x.name === name);

	return cmd;
}