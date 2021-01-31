import * as Discord from 'discord.js';
import { RegisterCommand } from './commands';
import { Bot, DEBUG_MODE, GetRandomNumber, GUILD_ID } from './main';
import * as seeding from 'seeding';

enum TournamentState {
	NONE = 0,
	REGISTERING = 1,
	CLOSED,
	STARTED
}

interface Rank {
	name: string;
	label: string;
	aliases: string[];
	emoji?: Discord.GuildEmoji;
	seed: number;
}

class Team {
	public players: Participant[];

	constructor() {
		this.players = [];
	}
}

// interface Team {
// 	teamNumber: number;
// 	players: Participant[];
// }

interface Match {
	team1: Team;
	team2: Team;
}

const Ranks: Rank[] = [
	{
		name: "bronze1",
		label: "Bronze 1",
		aliases: ["b1"],
		seed: 0,
	},
	{
		name: "bronze2",
		label: "Bronze 2",
		aliases: ["b2"],
		seed: 186,
	},
	{
		name: "bronze3",
		label: "Bronze 3",
		aliases: ["b3"],
		seed: 245,
	},
	{
		name: "silver1",
		label: "Argent 1",
		aliases: ["s1", "a1", "argent1"],
		seed: 305,
	},
	{
		name: "silver2",
		label: "Argent 2",
		aliases: ["s2", "a2", "argent2"],
		seed: 370,
	},
	{
		name: "silver3",
		label: "Argent 3",
		aliases: ["s3", "a3", "argent3"],
		seed: 429,
	},
	{
		name: "gold1",
		label: "Or 1",
		aliases: ["g1", "o1", "or1"],
		seed: 491,
	},
	{
		name: "gold2",
		label: "Or 2",
		aliases: ["g2", "o2", "or2"],
		seed: 550,
	},
	{
		name: "gold3",
		label: "Or 3",
		aliases: ["g3", "o3", "or3"],
		seed: 614,
	},
	{
		name: "platinum1",
		label: "Platine 1",
		aliases: ["p1", "plat1", "platine1"],
		seed: 695,
	},
	{
		name: "platinum2",
		label: "Platine 2",
		aliases: ["p2", "plat2", "platine2"],
		seed: 772,
	},
	{
		name: "platinum3",
		label: "Platine 3",
		aliases: ["p3", "plat3", "platine3"],
		seed: 853,
	},
	{
		name: "diamond1",
		label: "Diamant 1",
		aliases: ["d1", "diam1", "diamant1"],
		seed: 935,
	},
	{
		name: "diamond2",
		label: "Diamant 2",
		aliases: ["d2", "diam2", "diamant2"],
		seed: 1015,
	},
	{
		name: "diamond3",
		label: "Diamant 3",
		aliases: ["d3", "diam3", "diamant3"],
		seed: 1113,
	},
	{
		name: "champion1",
		label: "Champion 1",
		aliases: ["c1", "champ1"],
		seed: 1214,
	},
	{
		name: "champion2",
		label: "Champion 2",
		aliases: ["c2", "champ2"],
		seed: 1313,
	},
	{
		name: "champion3",
		label: "Champion 3",
		aliases: ["c3", "champ3"],
		seed: 1414,
	},
	{
		name: "gc1",
		label: "Grand Champion 1",
		aliases: ["grandchampion1"],
		seed: 1515,
	},
	{
		name: "gc2",
		label: "Grand Champion 2",
		aliases: ["grandchampion2"],
		seed: 1631,
	},
	{
		name: "gc3",
		label: "Grand Champion 3",
		aliases: ["grandchampion3"],
		seed: 1750,
	},
	{
		name: "ssl",
		label: "Légende Supersonique",
		aliases: ["supersoniclegend", "legendesupersonique"],
		seed: 1866,
	},
]

interface Participant {
	discord: Discord.GuildMember;
	rank: Rank;
	placed?: boolean;
}

let _tournamentState = TournamentState.NONE;
const participants: Participant[] = [];
const teams: Team[] = [];
const nextTeams: Team[] = [];
const inCourseTeams: Array<Participant[]> = [];
let inProgressMatchs: Array<Match> = [];

function GetParticipantByDiscord(discord: Discord.GuildMember): Participant | undefined {
	return participants.find(x => x.discord === discord);
}

function formatParticipantsToDiscord() {
	const msg = new Discord.MessageEmbed();
	msg.setTitle('Participants');
	let description = `Liste des participants (${participants.length}) :`;
	
	participants.sort((a, b) => b.rank.seed - a.rank.seed).forEach((participant, index) => {
		const striked = participant.placed == true;
		description += `\n${striked ? '~~' : ''}${index} - ${participant.discord} - ${participant.rank.emoji} ${participant.rank.label}${striked ? '~~' : ''}`;
	});

	msg.setDescription(description);
	return msg;
}

function formatTeamsToDiscord() {
	const msg = new Discord.MessageEmbed();
	msg.setTitle('Équipes');
	let description = `Liste des équipes (${teams.length}) :`;
	
	teams.forEach((team, index) => {
		description += `\n${index} `;
		let isFirst = true;
		team.players.forEach((participant) => {
			description += ` ${isFirst ? '- ' : '/ '}${participant.discord} ${participant.rank.emoji}`;
			isFirst = false;
		});
	});

	msg.setDescription(description);
	return msg;
}

export async function LoadRanksEmojis() {
	const guild = await Bot.Client.guilds.fetch(GUILD_ID);
	Ranks.forEach((rank) => {
		const emote = guild.emojis.cache.find(x => x.name === rank.name);
		rank.emoji = emote;
	});
}

export function GetParticipants(): Participant[] {
	return participants;
}

let participantsMessage: Discord.Message;
let teamsMessage: Discord.Message;
async function RefreshDataOnDiscord(channel?: Discord.TextChannel, force = false) {
	const nPartMsg = formatParticipantsToDiscord();
	const nTeamsMsg = formatTeamsToDiscord();
	if ((participantsMessage && teamsMessage) || force) {
		participantsMessage = await participantsMessage.edit(nPartMsg);
		teamsMessage = await teamsMessage.edit(nTeamsMsg);
	} else {
		if (!channel)
			return;

		participantsMessage = await channel.send(nPartMsg);
		teamsMessage = await channel.send(nTeamsMsg);
	}
}

function StartTournament(msg: Discord.Message, size: number = 2): void {
	_tournamentState = TournamentState.CLOSED;

	RefreshDataOnDiscord(msg.channel as Discord.TextChannel);
}

function SetDebugParticipants(from: Discord.GuildMember) {
	for (let i = 0; i < Math.floor(GetRandomNumber(15, 50)); i++) {
		const nbr = Math.floor(GetRandomNumber(0, Ranks.length - 1));
		const rank = Ranks[nbr];
		participants.push({discord: from, rank: rank});
	}
}

RegisterCommand('participants', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	message.reply(formatParticipantsToDiscord());
});

RegisterCommand('open', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (_tournamentState != TournamentState.NONE)
		return message.reply("Un tournoi est déjà en cours");

	if (DEBUG_MODE)
		SetDebugParticipants(from);

	_tournamentState = TournamentState.REGISTERING;
	message.reply("Ouverture des inscriptions pour le tournoi");
}, true);

RegisterCommand('register', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (GetParticipantByDiscord(from) != null)
		return message.reply('Vous êtes déjà inscrit au tournoi, si vous souhaitez vous désinscrire, tapez la commande !leave');
	if (args.length === 0)
		return message.reply('Veuillez préciser votre rank, example :\n**!register gold1**\n**!register gc1**');

	const rank = Ranks.find(x => x.name === args[0] || x.aliases.includes(args[0]));
	if (!rank)
		return message.reply('Votre rank ne correspond a aucun rank connu, veuillez rééssayer');

	participants.push({
		discord: from,
		rank: rank
	});

	message.reply("Vous avez été inscrit au tournoi");
});

RegisterCommand('leave', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	const u = GetParticipantByDiscord(from)
	if (u == null)
		return message.reply('Vous n\'êtes pas inscrit au tournoi, tapez !register pour vous inscrire');

	participants.splice(participants.indexOf(u), 1);

	message.reply("Vous vous êtes désinscrit du tournoi");
});

// RegisterCommand('kick', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
// 	const kicked = message.mentions.users.first();
	
// 	if (!kicked)
// 		return message.reply(`Veuillez @ le discord de la personne que vous voulez kick du tournoi, ex : !kick <@${Bot.Client.user?.id}>`);

// 	const u = GetParticipantByDiscord(kicked)
// }, true);

RegisterCommand('close', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (_tournamentState !== TournamentState.REGISTERING)
		return message.reply('Aucun tournoi en cours, tapez !open pour ouvrir les inscriptions');

	const size = args[0] != null && Number(args[0]) != NaN ? Number(args[0]) : undefined;

	StartTournament(message, size);
}, true);

RegisterCommand('start', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (_tournamentState !== TournamentState.CLOSED || teams.length < 2)
		return message.reply('Veuillez fermer les inscriptions au tournoi et faire les équipes avant de le démaré');

	const matchs: [[Team, Team | null]] = GenerateMatchs();
	const embed = new Discord.MessageEmbed();
	let desc = '';
	const _inProgress: Match[] = [];
	for (const match of matchs) {
		if (match[1] == null) {
			nextTeams.push(match[0]);
			continue;
		}
		desc += `\nEquipe N°${teams.indexOf(match[0])} `;
		let isFirst = true;
		for (const participant of match[0].players) {
			desc += `${!isFirst ? ' / ': ''}${participant.discord} ${participant.rank.emoji}`;
			isFirst = false;
		}
		desc += ` VS Equipe N°${teams.indexOf(match[1])} `;
		isFirst = true;
		for (const participant of match[1].players) {
			desc += `${!isFirst ? ' / ': ''}${participant.discord} ${participant.rank.emoji}`;
			isFirst = false;
		}
		_inProgress.push({
			team1: match[0],
			team2: match[1]
		});
	}
	if (nextTeams.length > 0) {
		let preDesc = `**Equipes préqualifiées :**`;
		for (const team of nextTeams) {
			preDesc += `\nN°${teams.indexOf(team)} :`;
			let isFirst = true;
			team.players.forEach((ply) => {
				preDesc += `${!isFirst ? ' / ' : ''}${ply.discord}`;
				isFirst = false;
			});
		}
		desc = preDesc + '\n' + desc;
	}

	inProgressMatchs = _inProgress;
	embed.setDescription(desc);
	message.channel.send(embed);
});

function CreateTeam(players: number[]): Team | undefined {
	let team: Team = new Team();
	for (const i of players) {
		const ply = participants[i];
		if (ply.placed)
			return;

		ply.placed = true;

		team.players.push(ply);
	}
	return team;
}

RegisterCommand('team', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	const sub = args.length > 0 ? args[0] : '';

	switch(sub) {
		case 'create':
			const players = args.slice(1).map(x => Number(x));
			const team = CreateTeam(players);
			if (team != undefined) {
				teams.push(team);
				RefreshDataOnDiscord()
			} else {
				message.reply('Une erreur est survenue');
			}
			message.delete();
			break;

		case 'remove':
			const index = Number(args[1]);
			if (index === NaN || !teams[index])
				return message.reply('Cette équipe n\'éxiste pas');
			for (const ply of teams[index].players) {
				ply.placed = false;
			}
			teams.splice(index, 1);
			RefreshDataOnDiscord();
			message.delete();
			break;
	}
}, true)

function GenerateMatchs() {
	
	const _tempTeams = [...teams];
	
	const matchs = seeding.randomized(_tempTeams);

	return matchs;
}

RegisterCommand('win', (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (args.length < 1)
		return message.reply('Veuillez préciser le N° de l\'équipe gagnante');

	const _teams = args.map(x => Number(x));

	for (const team of _teams) {
		if (team == NaN)
			continue;

		if (!inCourseTeams[team])
			continue;
	}
}, true);

//Todo: Command to set a match as win/loss
//Todo: When all planed matchs are ended, generate new ones