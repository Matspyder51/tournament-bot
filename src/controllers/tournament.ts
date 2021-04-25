import { Participant } from '../models/participant';
import * as Discord from 'discord.js';
import { Rank, Ranks } from '../models/rank';
import { RegisterCommand, RegisterSubCommand } from '../commands';
import { Bot, DEBUG_MODE } from '../main';
import { Team } from '../models/team';
import { BracketController } from './bracket';
import { GetRandomNumber } from '../utils';
import * as Config from '../config.json';


enum TournamentState {
	CLOSED = 0,
	REGISTERING = 1,
	WAITING = 2,
	IN_PROGRESS = 3,
	ENDED
};

export abstract class TournamentController {

	private static _state: TournamentState = TournamentState.CLOSED;
	public static get state(): TournamentState {
		return this._state;
	}

	private static _participants: Participant[] = [];
	public static get participants(): Participant[] {
		return this._participants.sort((a, b) => b.rank.seed - a.rank.seed);
	}

	private static _teams: Team[] = [];
	public static get teams(): Team[] {
		return this._teams;
	}

	private static participantsMsg: Discord.Message[];
	private static teamMsg: Discord.Message[];

	public static AddTeam(membersIndexes: number[]): Team | undefined {
		const teamMembers: Participant[] = [];
		
		for (const member of membersIndexes) {
			if (member === NaN)
				return;

			const part = this.participants[member];
			if (!part)
				return;

			if (part.inTeam)
				return;

			part.addToTeam();
			teamMembers.push(part);
		}

		const team = new Team(teamMembers);

		this._teams.push(team);

		return team;
	}

	public static DeleteTeam(index: number): boolean {
		if (!this._teams[index])
			return false;
			
		this._teams[index].players.forEach(x => x.removeFromTeam());

		this._teams.splice(index, 1);

		return true;
	}

	public static IsPlayerInTournament(player: Discord.GuildMember): boolean {
		return this._participants.find(a => a.discord == player) != null;
	}

	public static AddParticipant(discord: Discord.GuildMember, rank: Rank, force = false): string | true {
		if (!force) {
			if (this._state != TournamentState.REGISTERING)
				return 'Aucun tournoi sur lequel vous inscrire actuellement';

			if (this.IsPlayerInTournament(discord))
				return 'Vous êtes déjà inscrit dans le tournoi';
		}

		this._participants.push(new Participant(discord, rank));

		if (!force) {
			const channel = Bot.guild.channels.resolve(Config.Admin.RegisterLogsChannel);
			if (channel != null && channel.isText()) {
				channel.send(`${discord} s'est inscrit au tournoi en tant que ${rank.emoji} (Nombre de participants: ${this._participants.length})`);
			}
		}

		return true;
	}

	public static RemoveParticipant(discord: Discord.GuildMember, force: boolean = false): boolean {
		if (force || this._state != TournamentState.REGISTERING)
			return false;

		if (!this.IsPlayerInTournament(discord))
			return false;

		this._participants.splice(this._participants.findIndex(x => x.discord == discord), 1);

		const team = this.teams.findIndex(x => x.players.find(y => y.discord == discord));
		if (team != null) {
			this.DeleteTeam(team);
		}

		const channel = Bot.guild.channels.resolve(Config.Admin.RegisterLogsChannel);
		if (channel != null && channel.isText()) {
			channel.send(`${discord} s'est retirer du tournoi (Nombre de participants: ${this._participants.length})`);
		}

		return true;
	}

	public static FormatParticipantsToDiscord(channel?: Discord.TextChannel, save = false, forceRefresh = false): Discord.MessageEmbed[] {
		let currIndex = 0;
		let msgs: Discord.MessageEmbed[] = [];
		msgs[0] = new Discord.MessageEmbed();
		msgs[currIndex].setTitle(`Liste des participants (${this._participants.length}) :`);

		let isFirst = true;
		let desc = '';

		this.participants.forEach((player, index) => {
			let toAdd = '';
			toAdd += `${!isFirst ? '\n': ''}${player.inTeam ? '~~' : ''}${index} : ${player.discord} - ${player.rank.emoji} ${player.rank.label}${player.inTeam ? '~~' : ''}`;
			isFirst = false;

			if (toAdd.length + desc.length > 2000) {
				msgs[currIndex].setDescription(desc);
				currIndex++;
				msgs[currIndex] = new Discord.MessageEmbed();
				desc = '';
			}

			desc += toAdd;
		});

		msgs[currIndex].setDescription(desc);

		if (channel || (forceRefresh && this.participantsMsg && this.participantsMsg[0] && this.participantsMsg[0].channel)) {
			channel = channel || (this.participantsMsg[0].channel as Discord.TextChannel);
			if (channel == null)
				return msgs;
			if (this.participantsMsg == null || this.participantsMsg.length == 0) {
				this.participantsMsg = [];
				msgs.forEach((msg, index) => {
					//@ts-ignore
					channel.send(msg).then((dmsg) => {
						if (save)
							this.participantsMsg[index] = dmsg;
					});
				});
			} else {
				msgs.forEach((msg, index) => {
					if (this.participantsMsg[index] == undefined) {
						//@ts-ignore
						channel.send(msg).then((dmsg) => {
							if (save)
								this.participantsMsg[index] = dmsg;
						});
					} else {
						this.participantsMsg[index].edit(msg);
					}
				});
			}
		}

		return msgs;
	}

	public static RefrestTeamsListToDiscord(channel?: Discord.TextChannel): Discord.MessageEmbed[] {
		let currentMsgIndex = 0;
		const messages: Discord.MessageEmbed[] = [];
		messages[0] = new Discord.MessageEmbed();
		messages[currentMsgIndex].setTitle(`Liste des équipes (${this._teams.length}) :`);

		let isFirst = true;
		let desc = '';

		this._teams.forEach((team, index) => {
			let toAdd = ``;
			toAdd += `${!isFirst ? '\n': ''}${index} :`;
			let firstPlayer = true;
			team.players.sort((a, b) => b.rank.seed - a.rank.seed).forEach((player) => {
				toAdd += `${!firstPlayer ? ' | ' : ''}${player.discord} (${player.rank.emoji})`;
				firstPlayer = false;
			});
			isFirst = false;
			if (desc.length + toAdd.length > 2000) {
				messages[currentMsgIndex].setDescription(desc);
				currentMsgIndex++;
				messages[currentMsgIndex] = new Discord.MessageEmbed();
				desc = '';
			}
			desc += toAdd;
		});

		messages[currentMsgIndex].setDescription(desc);

		if (channel) {
			if (this.teamMsg) {
				messages.forEach(async (msg, index) => {
					if (this.teamMsg[index]) {
						this.teamMsg[index].edit(msg);
						this.FormatParticipantsToDiscord(channel, true);
					} else {
						if (this.participantsMsg) {
							this.participantsMsg.forEach(async (msg) => {
								await msg.delete();
							});
							this.participantsMsg.splice(0);
						}
						channel.send(msg).then((msg) => {
							this.teamMsg[index] = msg;
							this.FormatParticipantsToDiscord(channel, true);
						});
					}
				});
			} else {
				this.teamMsg = [];
				messages.forEach((msg, index) => {
						channel.send(msg).then((msg) => {
							this.teamMsg[index] = msg;
						});
				});

				if (!this.participantsMsg)
					this.FormatParticipantsToDiscord(channel, true);
			}
		}

		return messages;
	}

	public static OpenRegistrations(reopen?: boolean): boolean {
		if (this._state != TournamentState.CLOSED && (!reopen || this._state != TournamentState.WAITING))
			return false;

		this._state = TournamentState.REGISTERING;
		return true;
	}

	public static CloseRegistrations(): boolean {
		if (this._state != TournamentState.REGISTERING)
			return false;

		this._state = TournamentState.WAITING;
		return true;
	}

	public static EndTournament() {
		if (this._state != TournamentState.CLOSED)
			return;

		this._state = TournamentState.CLOSED;
	}

	public static ResetTournament() {
		this._participants = [];
		this._teams = [];
		this.participantsMsg = [];
		this.teamMsg = [];
	}

}

function SetDebugParticipants(from: Discord.GuildMember) {
	for (let i = 0; i < Math.floor(GetRandomNumber(50, 100)); i++) {
		const nbr = Math.floor(GetRandomNumber(0, Ranks.length - 1));
		const rank = Ranks[nbr];
		TournamentController.AddParticipant(from, rank, true);
	}
}

RegisterCommand('participants', async (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	// TournamentController.FormatParticipantsToDiscord(message.channel as Discord.TextChannel);
	TournamentController.RefrestTeamsListToDiscord(message.channel as Discord.TextChannel);
}, true);

RegisterCommand('open', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (TournamentController.state != TournamentState.CLOSED)
		return message.reply("Un tournoi est déjà en cours");

	TournamentController.ResetTournament();

	if (DEBUG_MODE)
		SetDebugParticipants(from);

	if (TournamentController.OpenRegistrations())
		message.reply("Ouverture des inscriptions pour le tournoi");
}, true);

RegisterCommand('reopen', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (TournamentController.state != TournamentState.WAITING)
		return message.reply("Impossible, les matchs on déjà commencés");

	if (TournamentController.OpenRegistrations(true))
		message.reply("Réouverture des inscriptions pour le tournoi");
}, true);

RegisterCommand('close', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (TournamentController.state != TournamentState.REGISTERING)
		return message.reply("Aucun tournoi en attente d'inscriptions");

	if (TournamentController.CloseRegistrations())
		message.reply("Fermeture des inscriptions pour le tournoi");
}, true);

RegisterCommand('register', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (args.length === 0)
		return message.reply('Veuillez préciser votre rank, example :\n**!register gold1**\n**!register gc1**');

	const rank = Ranks.find(x => x.name === args[0].toLowerCase() || x.aliases.includes(args[0].toLowerCase()));
	if (!rank)
		return message.reply('Votre rank ne correspond a aucun rank connu, veuillez rééssayer');

	const isRegistered = TournamentController.AddParticipant(from, rank);
	if (isRegistered === true) {
		from.createDM().then((chan) => {
			chan.send("Vous avez été inscrit au tournoi").catch((reason) => {
				TournamentController.RemoveParticipant(from);
			});
		});
	} else {
		message.reply('Erreur: ' + isRegistered);
	}
});

RegisterCommand('quit', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (TournamentController.RemoveParticipant(from))
		message.reply("Vous vous êtes désinscrit du tournoi");
	else
		message.reply("Une erreur est survenue, réessayez et vérifiez que vous êtes bien inscrit a un tournoi");
});

RegisterCommand('kick', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (args.length != 1)
		return message.reply("Veuillez précisé le N° du joueur a kick");

	const index = Number(args[0])
	if (index == NaN)
		return message.reply("Ce paramètre n'est pas un chiffre");

	const participant = TournamentController.participants[index];
	if (!participant)
		return;

	if (TournamentController.RemoveParticipant((participant.discord as Discord.GuildMember), true))
		message.reply(`${participant.discord} a été kick du tournoi`);
	else
		message.reply("Une erreur est survenue");
}, true);

RegisterCommand('team');
RegisterSubCommand('team', 'create', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	const members = args.map(x => Number(x));

	message.delete();

	if (TournamentController.state != TournamentState.WAITING)
		return message.reply("Veuillez fermer les inscriptions au tournoi avant de modifier des équipes");

	const newTeam = TournamentController.AddTeam(members);
	if (!newTeam)
		return message.reply('Une erreur est survenue');

	TournamentController.RefrestTeamsListToDiscord(message.channel as Discord.TextChannel);
}, true);

RegisterSubCommand('team', 'delete', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {

	message.delete();

	if (TournamentController.state != TournamentState.WAITING)
		return message.reply("Veuillez fermer les inscriptions au tournoi avant de modifier des équipes");

	const teamIdx = Number(args[0]);
	
	if (teamIdx == NaN)
		return message.reply('Veuillez préciser l\'index de l\'équipe');

	TournamentController.DeleteTeam(teamIdx);

	TournamentController.RefrestTeamsListToDiscord(message.channel as Discord.TextChannel);
}, true);

RegisterCommand('start', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	BracketController.Initialize();
}, true);


RegisterCommand('maketeams', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (DEBUG_MODE) {
		const _temp_teams = [...TournamentController.participants];
		const _temp_teams2 = [...TournamentController.participants];
		for (let i = 0; i < Math.floor(_temp_teams.length / 2); i++) {
			TournamentController.AddTeam([i, _temp_teams2.length - 1]);
			_temp_teams2.splice(i, 1);
			_temp_teams2.splice(_temp_teams.length - 1, 1);
		}
		TournamentController.RefrestTeamsListToDiscord(message.channel as Discord.TextChannel);
	}
}, true);