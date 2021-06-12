/* eslint-disable no-mixed-spaces-and-tabs */

import { Metrics } from '../types/Metrics';
import { Player } from './Player';
import { Team } from './Team';

export class Tab {
    public readonly teams: Set<Team> = new Set();

    public get size(): number {
    	return this.teams.size;
    }

    constructor(teams ?: Set<Team>) {
    	if (teams) {
    		teams.forEach(team => {
    			this.add(team);
    		});
    	}
    }

    public add(team: Team): Set<Team> | void{
    	if (team.healthCheck()) {
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

    public healthCheck(players: Set<Player>): boolean {
    	const playersInTeam: Set<Player> = new Set<Player>();
    	this.teams.forEach(team => {
    		team.players.forEach(player => {
    			if (playersInTeam.has(player)) {
    				console.error('TEAMS : ', this.toString());
    				console.error('PARTICIPANTS : ', JSON.stringify(players, null, 2), '\n');
    				console.error('ERROR ENCOUNTERED ON PLAYER : ', JSON.stringify(player, null, 2), player, '\n');
    				throw new Error('Player duplication error encountered');
    			}
    			playersInTeam.add(player);
    		});
    	});
    	if (playersInTeam.size !== players.size) {
    		console.error('TEAMS : ', this.toString());
    		console.error('PARTICIPANTS : ', JSON.stringify(Array.from(players), null, 2), '\n');
    		throw new Error(`Team generation failed to add all players in teams, ${players.size} participants vs ${playersInTeam.size} players in teams`);
    	}

    	return true;
    }

    public toString(): string {
    	const teams: Player[][] = [];
    	this.teams.forEach(team => {
    		teams.push(Array.from(team.players));
    	});
    	return JSON.stringify(teams, null, 2);
    }
}
