/* eslint-disable no-mixed-spaces-and-tabs */
/* TEAM GENRERATION V0.2a by Danaen

todos :
- combinatorial search for players to team (instead of looking for 1 mate at a time, include in the potential mates array of players combination that could fill the team)
- mates comparison between teams (when creating a team look for other team with similar size players rank to improve equity between teams)
- gc1 breakdown for solo teams (if maxTeamSize is over 1)
- exponantial regression to find best equation for rank calculation
- enforce team's size to be as close as possible to maxTeamSize
- json file logger
- replace the use of best player as a targeted mmr
- send back errors to user
*/

import { Player } from './models/Player';
import { Tab } from './models/Tab';
import { Team } from './models/Team';
import { Metrics } from './types/Metrics';
import { Rank } from './types/Rank';
import { Logger } from './utils/logger';

require('./global/Math');
require('./global/Set');

export class GenerateTeams {

    public readonly maxTeamSize!: number;
    public readonly rankingModifier!: number;
    public readonly players!: Set<Player>;

	private debug: boolean;
	private logger: Logger = new Logger();

	constructor(players: Set<Player>, maxTeamSize = 3, rankingModifier = 80, debug = false) { 
		if (!maxTeamSize) throw Error('Max team size must be defined');
		if (typeof maxTeamSize !== 'number') throw Error('Max team size must be a number');
		if (maxTeamSize <= 0) throw Error('Max team size must be greater than 0');
		if (maxTeamSize > 4) throw Error('Max team size must be less than 4');
		this.maxTeamSize = maxTeamSize;
      
		if (!rankingModifier) throw Error('Ranks modifier must be defined');
		if (typeof rankingModifier !== 'number') throw Error('Ranks modifier must be a number');
		if (rankingModifier < 0) throw Error('Ranks modifier must be greater or equal to 0');
		this.rankingModifier = rankingModifier;

		this.debug = debug;
		this.players = players;

		// if (debug) {
		// 	console.log('Logger will be used');
		// 	this.logger.add('debug', debug);
		// 	this.logger.add('maxTeamSize', maxTeamSize);
		// 	this.logger.add('rankingModifier', rankingModifier);
		// 	this.logger.add('players', Array.from(players));
		// }
	}

	public generateTab(limit: number): Tab | null{
    	const tabs: {tab: Tab, tolerance: number}[] = [];
    	for(let i = 0; i < limit; i++) {
    		const result = this.generateTeams();
    		try {
    			if (result.tab.healthCheck(this.players)) {
    				tabs.push(result);
    			}
    		}
    		catch(error) {
				 console.error(result.tolerance);
				 console.error(error);
    		}
    	}
    	tabs.sort((a, b) => a.tolerance - b.tolerance);
    	return tabs[0].tab;
	}

	private generateTeams(): {tab: Tab, tolerance: number} {
    	const highestRank = this.findHighestRank(this.players);
        
    	if (!highestRank){
    		console.error(JSON.stringify(Array.from(this.players), null, 2));
    		throw Error('Can\'t find the highest ranked player.');
    	}
        
    	const tab = new Tab();

    	let players = this.players.clone();

    	if (highestRank !== null) {
    		players = this.players.filter(player => {
    			if (player.rank.name === highestRank.name) {
    				tab.add(new Team(this.maxTeamSize, new Set([player])));
    			}
    			return player.rank.name !== highestRank.name;
    		});
    	}

    	let unassignedPlayers = players.clone();
    	let tempTeams = tab.teams.clone();
    	let tolerance = 0;

    	const tabMetrics = tab.metrics();
    
    	while(unassignedPlayers.size > 0 && tolerance <= 50 && tempTeams.size > 0) {
    		const team = this.generateTeam(unassignedPlayers.clone(), tabMetrics, tolerance);
    		if (team !== null && team.players.size > 0) {
    			if (team.metrics().combined * 100 / tabMetrics.median < (100 + tolerance) &&
                team.metrics().combined * 100 / tabMetrics.median > (100 - tolerance)) {

    				team.players.forEach(player => {
    					if (unassignedPlayers.has(player)) unassignedPlayers.delete(player);
    					else {
    						console.error(player);
    						console.error(JSON.stringify(Array.from(unassignedPlayers)));
    						throw new Error('TEAMS GENERATION UNEXPECTED ERROR : player doesn\'t exist or has already been assigned to a team');
    					}
    				});
    				tempTeams.add(team);
    			}
    			else {
    				console.error(team.toString());
    				console.error(team.metrics());
    				console.error(tab.metrics());
    				throw new Error('TEAMS GENERATION UNEXPECTED ERROR : team not valid');
    			}
    		}
    		else {
    			tolerance+= 5;
    			unassignedPlayers = players.clone();
    			tempTeams = tab.teams.clone();
    		}
    	}

    	if (tolerance > 50) throw new Error('TEAM GENERATION FAILED TO BALANCE TEAMS (TOLERANCE OVER 50%)');
    	else if (tolerance > 20) console.info('WARNING TOLERANCE FOR TEAM GENERATION OVER 20%, TEAMS MAYBE UNBALANCED');

    	tempTeams.forEach(team => {
    		tab.add(team);
    	});

    	return {
    		tab,
    		tolerance
    	};
	}

	private generateTeam(players: Set<Player>, tabMetrics: Metrics, tolerance: number): Team | null{
    	const team: Team = new Team(this.maxTeamSize);
    	const p1: Player = players.first();
    	team.add(p1);
    	players.delete(p1);
    	while (
    		(team.metrics().combined * 100 / tabMetrics.median > (100 + tolerance) ||
            team.metrics().combined * 100 / tabMetrics.median < (100 - tolerance)) &&
            players.size > 0
    	)
    	{
    		if (team.size === this.maxTeamSize) return null;
    		const p2 = this.findMates(team, players, tabMetrics, tolerance);
    		if (!p2) return null;
    		team.add(p2);
    		players.delete(p2);
    	}
    	return team;
	}

	private findMates(team: Team, players: Set<Player>, tabMetrics: Metrics, tolerance: number): Player | null {

    	players = players.filter(p2 => {
    		return (p2.mmr + team.metrics().combined) * 100 / tabMetrics.median < (100 + tolerance);
    	});
    	if (players.size > 0) {
    		const potPlayers = players.map<Player & { deviation: number; }>(player => ({
    			...player,
    			deviation: Math.abs(((player.mmr + team.metrics().combined) * 100 / tabMetrics.median) - 100)
    		})) as Set<Player & {deviation: number}>;
    		let playerWithSmallestDeviation: Player & {deviation: number} = potPlayers.first();
    		potPlayers.forEach(player => {
    			if (player.deviation < playerWithSmallestDeviation.deviation) playerWithSmallestDeviation = player;
    		});
    		const p2 = players.find(player => player.id === playerWithSmallestDeviation.id);
    		return p2 || null;
    	}
    	else {
    		return null;
    	}
	}

	private findHighestRank(players: Set<Player>): Rank | null {
    	let highest = {
    		rank : players.first().rank,
    		mmr : players.first().mmr
    	};

    	players.forEach(player => {
    		if (player.mmr > highest.mmr) {
    			highest = {
    				rank : player.rank, 
    				mmr : player.mmr,
    			};
    		}
    	});

    	return highest.rank;
	}
}