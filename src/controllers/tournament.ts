import { Participant } from '../models/participant';
import * as Discord from 'discord.js';
import { Rank, Ranks } from '../models/rank';
import { Command } from '../commands';
import { Bot, DEBUG_MODE } from '../main';
import { Team } from '../models/team';
import { BracketController } from './bracket';
import { GetRandomNumber } from '../utils';
import * as Config from '../config.json';
import { GenerateTeams } from '../services/generateTeamsNext';
import { main } from '../services/generateTeams';


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

	public static memberSince: number = 10800000;

	public static AddTeam(membersIndexes: number[]): Team | undefined {
		if (membersIndexes.length === 0 ) {
			return;
		}

		for (const member of membersIndexes) {
			let isOk = true;
			if (member == NaN)
				isOk = false;

			const part = this.participants[member];
			if (!part || part.inTeam)
				isOk = false;

			if (!isOk) {
				console.error(`Error on member N°${member}`);
				return;
			}
		}

		const teamMembers: Participant[] = [];
		
		for (const member of membersIndexes) {
			const part = this.participants[member];
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

	public static ClearTeams() {
		this._teams.forEach((team) => {
			team.players.forEach(x => x.removeFromTeam());
		});

		this.participants.forEach(x => x.removeFromTeam());

		this._teams = [];
	}

	public static IsPlayerInTournament(player: Discord.GuildMember): boolean {
		return this._participants.find(a => a.discord == player) != null;
	}

	public static AddParticipant(discord: Discord.GuildMember, rank: Rank, force = false): string | true {
		if (!force) {
			if (this._state != TournamentState.REGISTERING)
				return 'Aucun tournoi sur lequel vous inscrire actuellement';
		}

		if (!DEBUG_MODE && this.IsPlayerInTournament(discord))
			return 'Vous êtes déjà inscrit dans le tournoi';

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
		if (!force && this._state != TournamentState.REGISTERING)
			return false;

		if (!this.IsPlayerInTournament(discord))
			return false;

		const removed = this._participants.splice(this._participants.findIndex(x => x.discord == discord), 1);
		if (!removed)
			return false;

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
		msgs[currIndex].setTitle(`Liste des participants (${this._participants.length} participants) :`);

		let isFirst = true;
		let desc = '';

		this.participants.forEach((player, index) => {
			let toAdd = '';
			toAdd += `${!isFirst ? '\n': ''}${player.inTeam ? '~~' : ''}${index + 1} : ${player.discord} - ${player.rank.emoji} ${player.rank.label}${player.inTeam ? '~~' : ''}`;
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
			if (forceRefresh || this.participantsMsg == null || this.participantsMsg.length == 0) {
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

	public static RefrestTeamsListToDiscord(channel?: Discord.TextChannel, force?: boolean): Discord.MessageEmbed[] {
		let currentMsgIndex = 0;
		const messages: Discord.MessageEmbed[] = [];
		messages[0] = new Discord.MessageEmbed();
		messages[currentMsgIndex].setTitle(`Liste des équipes (${this._teams.length} équipes) :`);

		let isFirst = true;
		let desc = '';

		this._teams.forEach((team, index) => {
			let toAdd = ``;
			toAdd += `${!isFirst ? '\n': ''}${index + 1} :`;
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

		if (channel || force) {
			if (!force && this.teamMsg) {
				messages.forEach(async (msg, index) => {
					if (this.teamMsg[index]) {
						this.teamMsg[index].edit(msg);
						this.FormatParticipantsToDiscord(channel, true, force);
					} else {
						if (this.participantsMsg) {
							this.participantsMsg.forEach(async (msg) => {
								await msg.delete();
							});
							this.participantsMsg.splice(0);
						}
						channel?.send(msg).then((msg) => {
							this.teamMsg[index] = msg;
							this.FormatParticipantsToDiscord(channel, true, force);
						});
					}
				});
			} else {
				this.teamMsg = [];
				messages.forEach((msg, index) => {
						channel?.send(msg).then((msg) => {
							this.teamMsg[index] = msg;
						});
				});

				if (force || !this.participantsMsg)
					this.FormatParticipantsToDiscord(channel, true, force);
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

new Command('participants', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	interaction.reply('Traitement en cours');
	if (TournamentController.participants.length <= 0)
		return interaction.reply('Personne n\'est inscrit pour le moment', {ephemeral: true});
	TournamentController.RefrestTeamsListToDiscord(interaction.channel as Discord.TextChannel, (<boolean>args[0]?.value));
	interaction.deleteReply();
}, {
	isAdmin: true,
	description: 'Affiche la liste des participants'
}, [
	{
		name: 'force',
		description: 'Force l\'utilisation de ce channel pour la liste des participants',
		type: 5
	}
]);

new Command('open', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	if (TournamentController.state != TournamentState.CLOSED)
		return interaction.reply('Un tournoi est déjà en cours', {ephemeral: true})

	TournamentController.ResetTournament();

	if (DEBUG_MODE)
		SetDebugParticipants(interaction.member);

	if (TournamentController.OpenRegistrations()) {
		interaction.reply("Ouverture des inscriptions");
	}
}, {
	isAdmin: true,
	description: 'Ouvre les inscriptions pour un tournoi'
});

new Command('reopen', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	if (TournamentController.state != TournamentState.WAITING)
		return interaction.reply("Impossible, les matchs on déjà commencés", {ephemeral: true});

	if (TournamentController.OpenRegistrations(true))
		interaction.reply("Réouverture des inscriptions pour le tournoi");
}, {
	isAdmin: true,
	description: 'Réouvre les inscriptions au tournoi'
});

new Command('close', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	if (TournamentController.state != TournamentState.REGISTERING)
		return interaction.reply('Aucun tournoi en attente d\'inscriptions', {ephemeral: true});

	if (TournamentController.CloseRegistrations())
		interaction.reply('Fermeture des inscriptions pour le tournoi');
}, {
	isAdmin: true,
	description: 'Fermer les inscriptions au tournoi'
});

new Command('register', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {

	const accountAge = Date.now() - interaction.user.createdTimestamp;
	if (accountAge < 259200000) {
		return interaction.reply(`Votre compte Discord est trop réçent pour participer au tournoi (Date de création: ${interaction.user.createdAt.toLocaleDateString('fr-FR')} ${interaction.user.createdAt.toLocaleTimeString('fr-FR')})`);
	}

	const memberSince = Date.now() - interaction.member.joinedTimestamp;
	if (memberSince < TournamentController.memberSince) {
		return interaction.reply(`Vous avez rejoint le serveur Discord depuis moins de 3h, vous ne pouvez pas encore vous inscrire au tournoi`);
	}

	const rank = Ranks.find(x => x.name === (<string>args[0].value!).toLowerCase() || x.aliases.includes((<string>args[0].value!).toLowerCase()));
	if (!rank)
		return interaction.reply('Votre rank ne correspond a aucun rank connu, veuillez rééssayer', {ephemeral: true});

	const isRegistered = TournamentController.AddParticipant(interaction.member, rank);
	if (isRegistered === true) {
		interaction.defer(true);
		interaction.member.createDM().then((chan: Discord.TextChannel) => {
			interaction.editReply('Inscription en cours');
			chan.send("Vous avez été inscrit au tournoi").then(() => {
				interaction.editReply('Inscription validée');
			}).catch((reason) => {
				interaction.editReply('Je ne peut pas vous envoyer de message privé, vérifiez vos paramètres de confidentialité et réessayez');
				TournamentController.RemoveParticipant(interaction.member);
			});
		});
	} else {
		interaction.reply('Erreur: ' + isRegistered);
	}
}, {
	isAdmin: false,
	description: 'S\'inscrire au tournoi en cours'
}, [
	{
		name: 'max_rank',
		description: 'Le rang maximum que vous ayez atteint (exemple: champion1, ssl, gc3 ...)',
		type: 3,
		required: true,
		choices: Ranks.map(x => {
			return {
				name: x.label,
				value: x.name
			}
		})
	}
]);

new Command('quit', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	if (TournamentController.RemoveParticipant(interaction.member))
		interaction.reply('Vous vous êtes désinscrit du tournoi', {ephemeral: true});
	else
		interaction.reply('Une erreur est survenue, réessayez et vérifiez que vous êtes bien inscrit a un tournoi');
}, {
	isAdmin: false,
	description: 'Se désinscrire du tournoi en cours'
});

new Command('kick', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	if (TournamentController.RemoveParticipant(args[0].member, true))
		interaction.reply(`${args[0].member} à été kick du tournoi`);
	else
		interaction.reply('Une erreur est survenue', {ephemeral: true});
}, {
	isAdmin: true,
	description: 'Expulser un joueur du tournoi'
}, [
	{
		name: 'player',
		description: 'Le joueur a expulser',
		type: 6,
		required: true
	}
]);

new Command('team', async (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {

	interaction.defer(true);
	interaction.editReply('Traitement en cours');

	if (TournamentController.state != TournamentState.WAITING)
		return interaction.editReply("Veuillez fermer les inscriptions au tournoi avant de modifier des équipes");

	switch (args[0].name) {
		case 'create':
			const players = (<string>args[0].options![0].value).split(' ').map(x => Number(x) - 1);

			if (!players.every(x => x != NaN))
				return interaction.editReply('Erreur: Vérifiez le N° des joueurs');

			const newTeam = TournamentController.AddTeam(players);
			if (!newTeam)
				return interaction.editReply('Une erreur est survenue');

			TournamentController.RefrestTeamsListToDiscord(interaction.channel as Discord.TextChannel);
			interaction.editReply('Équipe ajoutée');
			break;

		case 'delete':
			const teamId = (<number>args[0].options![0].value) - 1;
			TournamentController.DeleteTeam(teamId);

			TournamentController.RefrestTeamsListToDiscord(interaction.channel as Discord.TextChannel);
			interaction.editReply('Équipe supprimée');
			break;

		case 'clear':
			TournamentController.ClearTeams();
			TournamentController.RefrestTeamsListToDiscord(interaction.channel as Discord.TextChannel);
			interaction.editReply('Toutes les équipes on été supprimées');
			break;

		case 'roll':
			const maxTeamSize = Number(args[0].options![0].value);
			const version = String(args[0].options![1]?.value) || "next_gen";
			const rankingModifier = Number(args[0].options![2]?.value);

			// reset teams
			TournamentController.ClearTeams();

			// generate teams
			let teams;
			if (version === "legacy" ) {
				teams = main(TournamentController.participants, Ranks, maxTeamSize, rankingModifier);
			}
			else if (version === "next_gen") {
				teams = new GenerateTeams(TournamentController.participants, Ranks, maxTeamSize, rankingModifier).getTab().teams;
			}
			else break;

			if (!!teams) {
				(<Discord.TextChannel>Bot.guild.channels.resolve("840702261008400406")).send(JSON.stringify(teams, null, 2));
				for (const team of teams) {
					const playersIndex: number[] = [];
					for (const player of team) {
						const a = TournamentController.participants.findIndex(p => {
							return p.discord?.id === player.discord?.id
						})
						if (a !== -1) playersIndex.push(a);
					}
					const newTeam = TournamentController.AddTeam(playersIndex);
							
					if (!newTeam) {
						TournamentController.RefrestTeamsListToDiscord(interaction.channel as Discord.TextChannel);
						return interaction.editReply(`Impossible de créer une des équipes (${playersIndex.join(', ')})`);
					}
				}
				TournamentController.RefrestTeamsListToDiscord(interaction.channel as Discord.TextChannel);
				return interaction.editReply('Equipes générées');
			}
			else {
				return interaction.editReply(`Une erreur est survenue lors de la creation des equipes`);
			}
			break;
	}
}, {
	isAdmin: true,
	description: 'Gestion des équipes'
}, [
	{
		name: 'create',
		description: 'Créer une équipe',
		type: 1,
		options: [
			{
				name: 'players',
				description: 'Le numéro de chaque joueur à ajouté dans l\'équipe',
				type: 3,
				required: true
			}
		]
	}, {
		name: 'delete',
		description: 'Supprimer une équipe',
		type: 1,
		options: [
			{
				name: 'team_index',
				description: 'Le numéro de l\'équipe à supprimée',
				type: 4,
				required: true
			}
		]
	}, {
		name: 'clear',
		description: 'Vide la liste des équipes',
		type: 1
	}, {
		name: 'roll',
		description: 'Génère les équipes',
		type: 1,
		options: [
			{
				name: 'max_team_size',
				description: 'La taille maximum d\'une équipe',
				type: 4,
				required: true,
				choices: [
					{
						name: '2',
						value: 2
					}, {
						name: '3',
						value: 3
					}, {
						name: '4',
						value: 4
					}
				]
			}, {
				name: 'teams_generation_version',
				description: 'L\'algorythme de generation a utiliser',
				type: 3,
				choices: [
					{
						name: 'legacy',
						value: 'legacy'
					}, {
						name: 'next_gen',
						value: 'next_gen'
					},
				]
			}, {
				name: 'ranking_modifier',
				description: 'La valeur de base pour calculer l\'équilibrage',
				type: 4
			}
		]
	}
]);


// RegisterSubCommand("team", "roll", (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
// 	if (TournamentController.state != TournamentState.WAITING)
// 		return message.reply("Veuillez fermer les inscriptions au tournoi avant de modifier des équipes");
// 	else {

// 		const maxTeamSize = Number(args[0]);
// 		const rankingModifier = Number(args[1]);

// 		if (maxTeamSize == NaN)
// 			return message.reply("Veuillez preciser la taille maximum des equipes");

// 		if (maxTeamSize > 4)
// 			return message.reply("La taille des equipes ne peut pas depasser 4 joueurs");
			
// 		// reset teams

// 		TournamentController.teams.forEach((team, index) => {
// 			TournamentController.DeleteTeam(index);
// 		})

// 		// generate teams
// 		const teams = main(TournamentController.participants, Ranks, maxTeamSize, rankingModifier || 60);
		
// 		for (const team of teams) {
// 			const playersIndex: number[] = [];
// 			for (const player of team) {
// 				const a = TournamentController.participants.findIndex(p => {
// 					return p.discord?.id === player.discord?.id
// 				})
// 				if (a !== -1) playersIndex.push(a);
// 			}
// 			const newTeam = TournamentController.AddTeam(playersIndex);
			
// 			if (!newTeam) return message.reply('Une erreur est survenue');
// 		}

// 		TournamentController.RefrestTeamsListToDiscord(message.channel as Discord.TextChannel);
// 	}
// }, true);

new Command('start', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	BracketController.Initialize();

	interaction.reply('Démarage du tournoi', {ephemeral: true});
}, {
	isAdmin: true,
	description: 'Commence les matchs d\'un tournoi'
});

new Command('setrank', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	const rank = Ranks.find(x => x.name === (<string>args[1].value!).toLowerCase() || x.aliases.includes((<string>args[1].value!).toLowerCase()));
	if (!rank)
		return interaction.reply('Rang introuvable', {ephemeral: true});

	const participant = TournamentController.participants.find(x => x.discord == args[0].member);
	if (!participant)
		return interaction.reply('Ce joueur n\'est pas dans le tournoi', {ephemeral: true});

	participant.setRank(rank);
	interaction.reply('Rang du joueur modifié', {ephemeral: true});

}, {
	isAdmin: true,
	description: 'Changer le rank d\'un joueur'
}, [
	{
		name: 'player',
		description: 'Le joueur en question',
		type: 6,
		required: true
	}, {
		name: 'rank',
		description: 'Le nouveau rang du joueur',
		type: 3,
		required: true,
		choices: Ranks.map(x => {
			return {
				name: x.label,
				value: x.name
			}
		})
	}
]);

new Command('addplayer', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	const rank = Ranks.find(x => x.name === (<string>args[1].value!).toLowerCase() || x.aliases.includes((<string>args[1].value!).toLowerCase()));
	if (!rank)
		return interaction.reply('Rang introuvable', {ephemeral: true});

	const added = TournamentController.AddParticipant(args[0].member, rank, true);
	if (typeof added == 'string')
		return interaction.reply(added);

	interaction.reply('Joueur ajouté', {ephemeral: true});
}, {
	isAdmin: true,
	description: 'Ajouter manuellement un joueur au tournoi'
}, [
	{
		name: 'player',
		description: 'Le joueur à ajouté',
		type: 6,
		required: true
	}, {
		name: 'rank',
		description: 'Le rang du joueur',
		type: 3,
		choices: Ranks.map(x => {
			return {
				name: x.label,
				value: x.name
			}
		}),
		required: true
	}
]);

new Command('wait_duration', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {

	if (args.length == 0) {
		const amountOfHours = TournamentController.memberSince / 3600000;
		interaction.reply(`Le temps d'attente avant de pouvoir rejoindre un tournoi est définit sur ${amountOfHours} heure${amountOfHours > 1 ? 's' : ''}`);
		return;
	}

	const hours = <number>args[0].value;
	if (hours == null || Number(hours) == NaN)
		return interaction.reply('Durée invalide', {ephemeral: true});

	TournamentController.memberSince = hours * (3600000);
	interaction.reply(`Le temps d'attente avant de pouvoir rejoindre un tournoi a été définit sur ${TournamentController.memberSince / 3600000} heure${hours > 1 ? 's' : ''}`, {ephemeral: true});
}, {
	isAdmin: true,
	description: 'Change le temps avant de pouvoir faire un tournoi quand un joueur viens de rejoindre le Discord'
}, [
	{
		name: 'hours',
		description: 'Le nombre d\'heures',
		type: 4
	}
]);