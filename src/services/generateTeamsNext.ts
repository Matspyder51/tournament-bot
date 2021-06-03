/* eslint-disable no-mixed-spaces-and-tabs */
/* TEAM GENRERATION V0.3a by Danaen

todos :
- combinatorial search for players to team (instead of looking for 1 mate at a time, include in the potential mates array of players combination that could fill the team)
- mates comparison between teams (when creating a team look for other team with similar size players rank to improve equity between teams)
- Full unit testing
- end to end test
- players and result on disk logging for statistics extract
- gc1 breakdown for solo teams
- exponantial regression to find best equation for rank calculation

*/

// INTERFACES DECLARATIONS ############################################################################################

interface Rank {
    name: string,
    seed: number
}

interface Metrics {
    average: number,
    median: number,
    combined: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    highest: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lowest: any
}

interface Health {
    isHealthy: boolean;
    status?: string
}

// NEW METHODS FOR MATH ###############################################################################################

declare global {
    interface Math {
        avg(numbers: number[]): number;
        median(numbers: number[]): number;
    }
}

Math.avg = function (numbers: number[]): number {
	let total = 0;
	numbers.forEach(number => total += number);
	return Math.floor(total / numbers.length);
};

Math.median = function (numbers: number[]): number {
	if (numbers.length === 1)
		return numbers[0];
	if (numbers.length % 2 === 0)
		return (numbers[Math.floor(numbers.length / 2)] + numbers[Math.ceil(numbers.length / 2)]) / 2;
	else
		return numbers[(numbers.length + 1) / 2];
};

// NEW METHODS FOR SET ################################################################################################

declare global {
    interface Set<T> {
        find(callbackfn: (element: T, index?: number, set?: Set<T>) => boolean): T | undefined ; 
        first(): T;
        rand(): T;
        filter(callbackfn: (element: T, index?: number, set?: Set<T>) => boolean): this;
        map<D>(callbackfn: (element: T, index?: number, set?: Set<T>) => D): this;
        clone(): this;
    }
}

// The find() method returns the value of the first element in the provided set that satisfies the provided testing function.
// If no values satisfy the testing function, undefined is returned.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.find = function (this: Set<any>, callbackfn: (element: any, index?: number, set?: Set<any>) => boolean): any | undefined {
	let i = 0;
	this.forEach(element => {
		if (callbackfn(element, i, this)) return element;
		i++;
	});
	return undefined;
};

// The first() method returns the first element from the provided set.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.first = function (this: Set<any>): any {
	return this.entries().next().value[0];
};

// The rand() method returns a random element from the provided set.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.rand = function (this: Set<any>): any {
	return Array.from(this)[Math.floor(Math.random() * this.size)];
};

// filter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.filter = function (this: Set<any>, callbackfn: (element: any, index?: number, set?: Set<any>) => boolean): Set<any> {
	let i = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newSet: Set<any> = new Set();
	this.forEach(element => {
		if (callbackfn(element, i, this) === true) newSet.add(element);
		i++;
	});
	return newSet;
};

// map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.map = function (this: Set<any>, callbackfn: (element: any, index?: number, set?: Set<any>) => any): Set<any> {
	let i = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newSet: Set<any> = new Set();
	this.forEach(element => {
		const e = callbackfn(element, i, this);
		if (e) newSet.add(e);
		i++;
	});
	return newSet;
};

// clone
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.clone = function (this: Set<any>): Set<any> {
	return new Set(this);
};

// ACTUAL TEAM GENERATION CLASS #######################################################################################
export class GenerateTeams {

    public readonly maxTeamSize!: number;
    public readonly rankingModifier!: number;
    public readonly players!: Set<Player>; 

    constructor(players: Set<Player>, maxTeamSize = 3, rankingModifier = 80) { 
    	if (!maxTeamSize) throw Error('Max team size must be defined');
    	if (typeof maxTeamSize !== 'number') throw Error('Max team size must be a number');
    	if (maxTeamSize <= 0) throw Error('Max team size must be greater than 0');
    	if (maxTeamSize > 4) throw Error('Max team size must be less than 4');
    	this.maxTeamSize = maxTeamSize;
        
    	if (!rankingModifier) throw Error('Ranks modifier must be defined');
    	if (typeof rankingModifier !== 'number') throw Error('Ranks modifier must be a number');
    	if (rankingModifier < 0) throw Error('Ranks modifier must be greater or equal to 0');
    	this.rankingModifier = rankingModifier;

    	this.players = players;
    }

    public generateTab(): Tab | null{
    	const tabs: {tab: Tab, tolerance: number}[] = [];
    	for(let i = 0; i < this.players.size * 10; i++) {
    		const result = this.generateTeams();
    		if (result.tab.healthCheck(this.players).isHealthy) {
    			tabs.push(result);
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

    	if (highestRank !== null) {
    		this.players.filter(player => {
    			if (player.rank.name === highestRank.name) {
    				tab.add(new Team(this.maxTeamSize, new Set([player])));
    			}
    			return player.rank.name !== highestRank.name;
    		});
    	}

    	let tempTeams = tab.teams.clone();
    	let unassignedPlayers = this.players.clone();
    	let tolerance = 0;
    
    	while(unassignedPlayers.size > 0 && tolerance < 100 && tempTeams.size > 0) {
    		const team = this.generateTeam(unassignedPlayers.clone(), tab.metrics(), tolerance);
    		if (team && team.size > 0) {
    			if (team.metrics().combined * 100 / tab.metrics().median < (100 + tolerance) &&
                team.metrics().combined * 100 / tab.metrics().median > (100 - tolerance)) {
    				team.players.forEach(player => {
    					if (unassignedPlayers.has(player)) unassignedPlayers.delete(player);
    					else {
    						throw new Error(''); // TODO define error
    					}
    				});
    				tempTeams.add(team);
    			}
    			else {
    				throw new Error(''); // TODO define error
    			}
    		}
    		else {
    			tolerance ++;
    			unassignedPlayers = this.players.clone();
    			tempTeams = tab.teams.clone();
    		}
    	}
    	return {
    		tab,
    		tolerance
    	};
    }

    private generateTeam(players: Set<Player>, tabMetrics: Metrics, tolerance: number): Team | null{
    	const team: Team = new Team(this.maxTeamSize, );
    	const p1: Player = players.rand();
    	team.add(p1);
    	players.delete(p1);
    	let teamMetrics: Metrics = team.metrics();
    	while (
    		(teamMetrics.combined * 100 / tabMetrics.median > (100 + tolerance) ||
            teamMetrics.combined * 100 / tabMetrics.median < (100 - tolerance)) &&
            players.size > 0
    	)
    	{
    		if (team.size === this.maxTeamSize) return null;
    		const p2 = this.findMates(team, players, tabMetrics, tolerance);
    		if (!p2) return null;
    		team.add(p2);
    		players.delete(p2);
    		teamMetrics = team.metrics();
    	}
    	return team;
    }

    private findMates(team: Team, players: Set<Player>, tabMetrics: Metrics, tolerance: number): Player | null {

    	players = players.filter(p2 => {
    		return (p2.mmr + team.metrics().combined) * 100 / tabMetrics.median < (100 + tolerance);
    	});
    	if (players.size > 0) { // TODO SEARCH WITH PLAYERS COMBINATION
    		const potPlayers = players.map<Player & { deviation: number; }>(player => ({
    			...player,
    			deviation: Math.abs(((player.mmr + team.metrics().combined) * 100 / tabMetrics.median) - 100)
    		})) as Set<Player & {deviation: number}>;
    		let playerWithSmallestDeviation: Player & {deviation: number} = potPlayers.rand();
    		potPlayers.forEach(player => {
    			if (player.deviation < playerWithSmallestDeviation.deviation) playerWithSmallestDeviation = player;
    		});
    		return playerWithSmallestDeviation;
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

    	// NOTE Could cause problems but we need some kind a breakdown below GC1    
    	// if (highest.mmr < this.computeRankMmr("gc1")) return null;

    	return highest.rank;
    }
}

export class Tab {
    public readonly teams: Set<Team> = new Set();
    public readonly size = this.teams.size;

    constructor(teams ?: Set<Team>) {
    	if (teams) {
    		teams.forEach(team => {
    			this.add(team);
    		});
    	}
    }

    public add(team: Team): Set<Team> {
    	const teamHealth = team.healthCheck();
    	if (!teamHealth.isHealthy) throw new Error('Unhealthy team can\'t be added in the tab : ' + teamHealth.status);
    	else {
    		return this.teams.add(team);
    	}
    }

    public delete(team: Team): boolean {
    	if (!this.teams.has(team)) throw new Error('This team doesn\'t belong to this tab');
    	else {
    		return this.teams.delete(team);
    	}
    }

    public metrics(): Metrics {
    	let combined = 0;
    	let highest: Team = this.teams.first();
    	let lowest: Team = this.teams.first();
    	this.teams.forEach(team => {
    		const metrics = team.metrics();
    		combined += metrics.combined;
    		if (metrics.combined > highest.metrics().combined) highest = team;
    		if (metrics.combined < lowest.metrics().combined) lowest = team;
    	});
    
    	return {
    		average : Math.avg(Array.from(this.teams.map<number>(team => team.metrics().combined) as unknown as Set<number>)),
    		median: Math.median(Array.from(this.teams.map<number>(team => team.metrics().combined) as unknown as Set<number>)),
    		combined,
    		highest,
    		lowest
    	};
    }

    public healthCheck(players: Set<Player>): Health {
    	let status: string | undefined;
    	let isHealthy = true;

    	const playersInTeam: Set<Player> = new Set<Player>();
    	this.teams.forEach(team => {
    		team.players.forEach(player => {
    			if (playersInTeam.has(player)) {
    				console.error('TEAMS : ', JSON.stringify(this.teams, null, 2), '\n');
    				console.error('PARTICIPANTS : ', JSON.stringify(players, null, 2), '\n');
    				console.error('ERROR ENCOUNTERED ON PLAYER : ', JSON.stringify(player, null, 2), player, '\n');
    				isHealthy = false;
    				status = 'Player duplication error encountered';
    			}
    			playersInTeam.add(player);
    		});
    	});
    	if (playersInTeam.size !== players.size) {
    		console.error('TEAMS : ', JSON.stringify(this.teams, null, 2), '\n');
    		console.error('PARTICIPANTS : ', JSON.stringify(players, null, 2), '\n');
    		isHealthy = false;
    		status = `Team generation failed to add all players in teams, ${players.size} participants vs ${playersInTeam.size} players in teams`;
    	}

    	return {
    		isHealthy,
    		status
    	};
    }
}

export class Team {

    public readonly players: Set<Player> = new Set();
    public readonly size = this.players.size;

    private maxTeamSize!: number;

    constructor (maxTeamSize: number, players?: Set<Player>) {
    	if (maxTeamSize === undefined) throw new Error('The team max size can\'t be undefined');
    	if (maxTeamSize === null) throw new Error('The team max size can\'t be null');
    	if (isNaN(maxTeamSize)) throw new Error('The team max size must be a number');
    	this.maxTeamSize = maxTeamSize;

    	if (players && players.size > this.maxTeamSize) throw new Error('You can\'t initialize a team with more players than max team size');
    	if (players) players.forEach(player => this.add(player));
    }

    public add(player: Player): Set<Player> {
    	if (this.players.size >= this.maxTeamSize) throw new Error('Can\'t add player to team or team size will exceed max team size');
    	else {
    		return this.players.add(player);
    	}
    }

    public delete(player: Player): boolean {
    	if (!this.players.has(player)) throw new Error('This player doesn\'t belong to this team');
    	else {
    		return this.players.delete(player);
    	}
    }

    public metrics(): Metrics {
    	let combined = 0;
    	let highest: Player = this.players.first();
    	let lowest: Player = this.players.first();
    	this.players.forEach(player => {
    		combined += player.mmr;
    		if (player.mmr > highest.mmr) highest = player;
    		if (player.mmr < lowest.mmr) lowest = player;
    	});
    
    	return {
    		average : Math.avg(Array.from(this.players.map<number>(player => player.mmr) as unknown as Set<number>)),
    		median: Math.median(Array.from(this.players.map<number>(player => player.mmr) as unknown as Set<number>)),
    		combined,
    		highest,
    		lowest
    	};
    }

    public healthCheck(): Health {
    	let status: string | undefined;
    	let isHealthy = true;

    	if (this.players.size === 0) {
    		isHealthy = false;
    		status = 'There is no players in this team';
    	}

    	if (this.players.size > this.maxTeamSize) {
    		isHealthy = false;
    		status = 'There is more players than allowed in this team';
    	}

    	return {
    		isHealthy,
    		status
    	};
    }
}

export class Player {
    public readonly id!: string;
    public readonly name!: string;
    public readonly rank!: Rank;
    public readonly mmr!: number;

    constructor(id: string, name: string, rank: Rank, rankingModifier: number) {
    	if (id === undefined) throw new Error('A player id can\'t be undefined');
    	if (id === null) throw new Error('A player id can\'t be null');
    	if (typeof id === 'string') throw new Error('A player id must be a string');
    	this.id = id;

    	if (name === undefined) throw new Error('A player name can\'t be undefined');
    	if (name === null) throw new Error('A player name can\'t be null');
    	if (typeof name === 'string') throw new Error('A player name must be a string');
    	this.name = name;
    
    	if (rank === undefined) throw new Error('A player rank can\'t be undefined');
    	if (rank === null) throw new Error('A player rank can\'t be null');
    	if (rank.name === undefined) throw new Error('A rank name can\'t be undefined');
    	if (rank.name === null) throw new Error('A rank name can\'t be null');
    	if (typeof rank.name === 'string') throw new Error('A rank name must be a string');
    	if (rank.seed === undefined) throw new Error('A rank seed can\'t be undefined');
    	if (rank.seed === null) throw new Error('A rank seed can\'t be null');
    	if (isNaN(rank.seed)) throw new Error('A rank seed must be a number');
    	this.rank = rank;
    
    	if (rankingModifier === undefined) throw new Error('The ranking modifier can\'t be undefined');
    	if (rankingModifier === null) throw new Error('The ranking modifier can\'t be null');
    	if (isNaN(rankingModifier)) throw new Error('The ranking modifier must be a number');
    	this.mmr = Math.floor(Math.pow(this.rank.seed, 1 + (rankingModifier / 100)));
    }
}