import { Match, WinnerTeam } from '../models/matchs';
import { TournamentController } from './tournament';
import { Team } from '../models/team';
import { Bot, DEBUG_MODE } from '../main';
import * as Discord from 'discord.js';
import { GetRandomWord, GetRandomNumber } from '../utils';
import { Command } from '../commands';
import * as Config from '../config.json';

interface Bracket {
	current_round: number;
	matchs: Array<Match[]>;
	qualified_teams: Team[];
}

export abstract class BracketController {

	private static _bracket: Bracket = {
		current_round: -1,
		matchs: [],
		qualified_teams: []
	};
	public static get bracket(): Bracket {
		return this._bracket;
	}

	private static current_teams: Team[] = [];
	private static matchesListMsg: Discord.Message[] = [];

	public static Initialize() {
		this.current_teams = [...TournamentController.teams];

		this.InitNewRound(true);
		this.GenerateRoundMatchs();

		this.SendMatchesList();
		this.SendMatchesInformations();
	}

	public static InitNewRound(first?: boolean) {
		this._bracket.current_round++;

		if (!first)
			this.current_teams = [...this._bracket.qualified_teams];

		this._bracket.qualified_teams = [];

		if (!this._bracket.matchs[this._bracket.current_round])
			this._bracket.matchs[this._bracket.current_round] = [];
	}

	public static GenerateRoundMatchs() {
		let _temp_teams = [...this.current_teams];

		const firstRoundsTeams = [];
		while (Math.log2(_temp_teams.length) % 1 != 0) {
			firstRoundsTeams.push(_temp_teams.splice(GetRandomNumber(0, _temp_teams.length - 1, true), 1)[0]);
		}

		if (firstRoundsTeams.length > 0) {
			for (let team of firstRoundsTeams) {
				this._bracket.matchs[this._bracket.current_round].push(new Match(team, _temp_teams.splice(GetRandomNumber(0, _temp_teams.length - 1, true), 1)[0]));
			}

			this._bracket.qualified_teams = _temp_teams;
		} else {
			while (_temp_teams.length > 1) {
				this._bracket.matchs[this._bracket.current_round].push(new Match(_temp_teams.splice(GetRandomNumber(0, _temp_teams.length - 1, true), 1)[0], _temp_teams.splice(GetRandomNumber(0, _temp_teams.length - 1), 1)[0]));
			}
		}
	}

	public static async SendMatchesList(forceNew?: boolean) {
		const guild = await Bot.Client.guilds.fetch(Config.GuildId);
		const chan = await guild.channels.resolve(Config.MatchListChannel);
		
		if (!chan || !chan.isText())
			return;
		
		let messages = []
		let desc = `Liste des matchs du tour ${this._bracket.current_round + 1} :\n`;

		let isFirst = true;
		for (let i = 0; i < this._bracket.matchs[this._bracket.current_round].length; i++) {
			const match = this._bracket.matchs[this._bracket.current_round][i];
			let toAdd = `${!isFirst ? '\n' : ''}`;
			toAdd += `${i + 1} : `;
			if (!match.upTeam || !match.downTeam)
				continue;
			toAdd += `${match.winnedBy != undefined && match.winnedBy == WinnerTeam.DOWN ? '~~' : ''}`;
			let isFirst2 = true;
			for (const player of match.upTeam.players) {
				toAdd += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
			}
			toAdd += `${match.winnedBy != undefined && match.winnedBy == WinnerTeam.DOWN ? '~~' : ''}\t:crossed_swords:\t`;
			isFirst2 = true;
			toAdd += `${match.winnedBy != undefined && match.winnedBy == WinnerTeam.UP ? '~~' : ''}`;
			for (const player of match.downTeam.players) {
				toAdd += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
			}
			toAdd += `${match.winnedBy != undefined && match.winnedBy == WinnerTeam.UP ? '~~' : ''}`;
			isFirst = false;

			if (desc.length + toAdd.length > 2000) {
				messages.push(desc);
				desc = '';
			}
			desc += toAdd;
		}

		messages.push(desc);

		if (!forceNew && this.matchesListMsg.length > 0) {
			messages.forEach(async (msg, index) => {
				if (this.matchesListMsg[index] == null) {
					this.matchesListMsg[index] = await chan.send(msg);
				} else {
					this.matchesListMsg[index].edit(msg);
				}
			});
		} else {
			messages.forEach(async (msg, index) => {
				this.matchesListMsg[index] = await chan.send(msg);
			});

			if (this._bracket.qualified_teams.length > 0) {
				const embed = new Discord.MessageEmbed();
				embed.setTitle('Équipes qualifiées :');
				let desc = '';
				let isFirst = true;
				for (const team of this._bracket.qualified_teams) {
					desc += `${!isFirst ? '\n' : ''}- ${team.toString()}`;
					isFirst = false;
				}

				embed.setDescription(desc);

				chan.send(embed);
			}
		}
	}

	public static async SendMatchesInformations() {
		let isFirst = true;
		const guild = Bot.guild;
		const chan = await guild.channels.resolve(Config.Admin.MatchesLogsChannel);

		if (chan && chan.isText()) {
			chan.send(`Identifiants des matchs du tour N°${this._bracket.current_round + 1}`);
		}

		for (const match of this._bracket.matchs[this._bracket.current_round]) {
			let desc = '';
			if (!match.upTeam || !match.downTeam)
				continue;

			const roomName = `${GetRandomWord()}`;
			const roomPassword = GetRandomWord();
			desc += `${!isFirst ? '\n' : ''}`;
			let isFirst2 = true;
			for (const player of match.upTeam.players) {
				if (isFirst2) {
					if (!DEBUG_MODE)
						(await player.discord?.createDM())?.send("En tant que Capitaine de ton équipe, c'est a toi de créer la partie privée");
				}
				desc += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
				if (!DEBUG_MODE)
					(await player.discord?.createDM())?.send(`Identifiants de la partie :\n**Nom: **||${roomName}||\n**Mot de passe: **||${roomPassword}||`);
			}
			desc += ' **VS** ';
			isFirst2 = true;
			for (const player of match.downTeam.players) {
				desc += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
				if (!DEBUG_MODE)
					(await player.discord?.createDM())?.send(`Identifiants de la partie :\n**Nom: **||${roomName}||\n**Mot de passe: **||${roomPassword}||`);
			}
			isFirst = false;
			desc += ` ||${roomName}|| ||${roomPassword}||`;

			if (chan && chan.isText()) {
				chan.send(desc);
			}
		}
	}

	public static SetMatchResult(matchId: number, winnedBy: number, force?: boolean): boolean {
		const match = this._bracket.matchs[this._bracket.current_round][matchId];
		if (!match)
			return false;

		if (!match.downTeam || !match.upTeam)
			return false;

		if (match.winnedBy != undefined) {
			if (!force)
				return false;

			else {
				this._bracket.qualified_teams.splice(this._bracket.qualified_teams.findIndex(x => x == (match.winnedBy == WinnerTeam.UP ? match.upTeam : match.downTeam)), 1);
				match.winnedBy = undefined;
			}
		}

		if (winnedBy == 0) {
			match.winnedBy = WinnerTeam.UP;
			this._bracket.qualified_teams.push(match.upTeam);
		} else {
			match.winnedBy = WinnerTeam.DOWN;
			this._bracket.qualified_teams.push(match.downTeam);
		}

		this.SendMatchesList();

		const isAllMatchsEnded = this._bracket.matchs[this._bracket.current_round].find(x => x.winnedBy == undefined) == null;

		if (isAllMatchsEnded) {
			if (this._bracket.matchs[this._bracket.current_round].length == 1 && this._bracket.qualified_teams.length < 2) {
				const lastMatch = this._bracket.matchs[this._bracket.current_round][0];
				const winner = lastMatch.winnedBy == WinnerTeam.UP ? lastMatch.upTeam?.players : lastMatch.downTeam?.players;
				(Bot.guild.channels.resolve(Config.MatchListChannel) as Discord.TextChannel).send(`Les gagnants du tournoi sont ${winner?.map(x => x.discord).join(', ')}`);

				TournamentController.EndTournament();
			} else {
				(Bot.guild.channels.resolve(Config.MatchListChannel) as Discord.TextChannel).send('Tous les matchs du tour sont terminés, en attente de la commande pour démarer le prochain tour');
			}
		}

		return true;
	}

}

new Command('set_win', (interaction: Discord.CommandInteraction, args: Discord.CommandInteractionOption[]) => {
	if (BracketController.bracket.current_round == -1)
		return interaction.reply('Le tournoi n\'a pas encore commencé', {ephemeral: true});
	const matchId = (<number>args[0].value) - 1;
	if (!BracketController.bracket.matchs[BracketController.bracket.current_round][matchId])
		return interaction.reply('Match introuvable', {ephemeral: true});

	const team = args[1].value == 0 ? WinnerTeam.UP : WinnerTeam.DOWN;

	BracketController.SetMatchResult(matchId, team, true);

	interaction.reply('Résultat du match modifié', {ephemeral: true});
}, {
	isAdmin: true,
	description: 'Permet de changer le résultat d\'un match'
}, [
	{
		name: 'match_id',
		description: 'N° du match dans la liste',
		type: 4,
		required: true
	}, {
		name: 'winner_team',
		description: 'Équipe gagnante',
		type: 4,
		required: true,
		choices: [
			{
				name: 'Gauche',
				value: 0
			},
			{
				name: 'Droite',
				value: 1
			}
		]
	}
]);

new Command('win', (interaction: Discord.CommandInteraction) => {
	if (BracketController.bracket.current_round == -1)
		return interaction.reply('Le tournoi n\'a pas encore commencé', {ephemeral: true});
	const match = BracketController.bracket.matchs[BracketController.bracket.current_round].find(x => x.upTeam?.players.findIndex(y => y.discord == interaction.member) != -1 || x.downTeam?.players.findIndex(y => y.discord == interaction.member) != -1);

	if (!match)
		return;

	const isUpTeam = match.upTeam?.players.findIndex(x => x.discord == interaction.member) != -1 ? true : false;

	if (!BracketController.SetMatchResult(BracketController.bracket.matchs[BracketController.bracket.current_round].indexOf(match), isUpTeam ? WinnerTeam.UP : WinnerTeam.DOWN)) {
		interaction.reply('Une erreur est survenue');
	}

	interaction.reply('Votre équipe est déclarée vainqueur', {ephemeral: true});
}, {
	description: 'Déclarer votre équipe vainqueur'
});

new Command('next_round', (interaction: Discord.CommandInteraction) => {
	if (BracketController.bracket.current_round == -1)
		return interaction.reply('Le tournoi n\'a pas encore commencé', {ephemeral: true});
	const isAllMatchesEnded = BracketController.bracket.matchs[BracketController.bracket.current_round].find(x => x.winnedBy == undefined) == null;

	if (!isAllMatchesEnded)
		return interaction.reply('Tous les matchs du tour actuel ne sont pas encore terminés');

	BracketController.InitNewRound();
	BracketController.GenerateRoundMatchs();

	BracketController.SendMatchesList(true);
	BracketController.SendMatchesInformations();

	interaction.defer();
	interaction.deleteReply();
}, {
	isAdmin: true,
	description: 'Passer au tour suivant'
});