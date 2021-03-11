import { Match, WinnerTeam } from '../models/matchs';
import { TournamentController } from './tournament';
import { Team } from '../models/team';
import { Bot } from '../main';
import * as Discord from 'discord.js';
import { GetRandomWord, GetRandomNumber } from '../utils';
import { RegisterCommand } from '../commands';
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
	private static matchesListMsg: Discord.Message;

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
		
		const embed = new Discord.MessageEmbed();
		embed.setTitle(`Liste des matchs du tour ${this._bracket.current_round + 1} :`);
		let desc = '';

		let isFirst = true;
		for (let i = 0; i < this._bracket.matchs[this._bracket.current_round].length; i++) {
			const match = this._bracket.matchs[this._bracket.current_round][i];
			if (!match.upTeam || !match.downTeam)
				continue;
			desc += `${!isFirst ? '\n' : ''}${i} : ${match.winnedBy != undefined && match.winnedBy == WinnerTeam.DOWN ? '~~' : ''}`;
			let isFirst2 = true;
			for (const player of match.upTeam.players) {
				desc += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
			}
			desc += `${match.winnedBy != undefined && match.winnedBy == WinnerTeam.DOWN ? '~~' : ''} **VS** `;
			isFirst2 = true;
			desc += `${!isFirst ? '\n' : ''}${match.winnedBy != undefined && match.winnedBy == WinnerTeam.UP ? '~~' : ''}`;
			for (const player of match.downTeam.players) {
				desc += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
			}
			desc += `${match.winnedBy != undefined && match.winnedBy == WinnerTeam.UP ? '~~' : ''}`;
			isFirst = false;
		}
		embed.setDescription(desc);

		if (!forceNew && this.matchesListMsg)
			this.matchesListMsg.edit(embed);
		else {
			this.matchesListMsg = await chan.send(embed);

			if (this._bracket.qualified_teams.length > 0) {
				embed.setTitle('Équipes qualifiées :');
				let desc = '';
				let isFirst = true;
				for (const team of this._bracket.qualified_teams) {
					desc += `${!isFirst ? '\n' : ''}${team.toString()}`;
					isFirst = false;
				}

				embed.setDescription(desc);

				chan.send(embed);
			}
		}
	}

	public static async SendMatchesInformations() {
		let isFirst = true;
		let desc = '';

		const guild = Bot.guild;
		const chan = await guild.channels.resolve(Config.Admin.MatchesLogsChannel);

		for (const match of this._bracket.matchs[this._bracket.current_round]) {
			if (!match.upTeam || !match.downTeam)
				continue;

			const roomName = `${GetRandomWord()}-${GetRandomWord()}`;
			const roomPassword = GetRandomWord();
			desc += `${!isFirst ? '\n' : ''}`;
			let isFirst2 = true;
			for (const player of match.upTeam.players) {
				if (isFirst2) {
					(await player.discord?.createDM())?.send("En tant que Capitaine de ton équipe, c'est a toi de créer la partie privée");
				}
				desc += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
				(await player.discord?.createDM())?.send(`Identifiants de la partie :\n**Nom: **${roomName}\n**Mot de passe: **${roomPassword}`);
			}
			desc += ' **VS** ';
			isFirst2 = true;
			for (const player of match.downTeam.players) {
				desc += `${!isFirst2 ? ' - ' : ''}${player.toString()}`;
				isFirst2 = false;
				(await player.discord?.createDM())?.send(`Identifiants de la partie :\n**Nom: **${roomName}\n**Mot de passe: **${roomPassword}`);
			}
			isFirst = false;
			desc += `||${roomName}|| ||${roomPassword}||`;

			if (chan && chan.isText()) {
				chan.send(desc);
			}
		}
	}

	public static SetMatchResult(matchId: number, winnedBy: number): boolean {
		const match = this._bracket.matchs[this._bracket.current_round][matchId];
		if (!match)
			return false;

		if (!match.downTeam || !match.upTeam)
			return false;

		if (match.winnedBy != undefined)
			return false;

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
			if (this._bracket.matchs[this._bracket.current_round].length == 1) {
				const lastMatch = this._bracket.matchs[this._bracket.current_round][0];
				const winner = lastMatch.winnedBy == WinnerTeam.UP ? lastMatch.upTeam?.players : lastMatch.downTeam?.players;
				(Bot.guild.channels.resolve(Config.MatchListChannel) as Discord.TextChannel).send(`Les gagnants du tournoi sont ${winner?.map(x => x.discord).join(', ')}`);
			} else {
				(Bot.guild.channels.resolve(Config.MatchListChannel) as Discord.TextChannel).send('Tous les matchs du tour sont terminés, en attente de la commande pour démarer le prochain tour');
			}
		}

		return true;
	}

}

RegisterCommand('set_win', async (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	if (args.length < 2)
		return;

	const team = (args[0] == '1' ? WinnerTeam.UP : WinnerTeam.DOWN);
	const matchId = Number(args[1]);

	if (!BracketController.bracket.matchs[BracketController.bracket.current_round][matchId])
		return;

	BracketController.SetMatchResult(matchId, team);

	message.delete();
}, true);

RegisterCommand('win', async (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	const match = BracketController.bracket.matchs[BracketController.bracket.current_round].find(x => x.upTeam?.players.findIndex(y => y.discord == from) != -1 || x.downTeam?.players.findIndex(y => y.discord == from) != -1);

	if (!match)
		return;

	const isUpTeam = match.upTeam?.players.findIndex(x => x.discord == from) != -1 ? true : false;

	if (!BracketController.SetMatchResult(BracketController.bracket.matchs[BracketController.bracket.current_round].indexOf(match), isUpTeam ? WinnerTeam.UP : WinnerTeam.DOWN)) {
		message.reply('Une erreur est survenue');
	}
});

RegisterCommand('next_round', async (from: Discord.GuildMember, args: string[], message: Discord.Message) => {
	const isAllMatchesEnded = BracketController.bracket.matchs[BracketController.bracket.current_round].find(x => x.winnedBy == undefined) == null;

	if (!isAllMatchesEnded)
		return message.reply('Tous les matchs du tour actuel ne sont pas encore terminés');

	BracketController.InitNewRound();
	BracketController.GenerateRoundMatchs();

	BracketController.SendMatchesList(true);
	BracketController.SendMatchesInformations();
}, true);