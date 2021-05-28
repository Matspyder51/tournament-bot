import * as Discord from 'discord.js';
import { Rank } from './rank';

export class Participant {

	private _discord!: Discord.GuildMember;
	public get discord(): Discord.GuildMember | null {
		return this._discord || null;
	}

	private _rank: Rank;
	public get rank(): Rank {
		return this._rank;
	}

	public set rank(value: Rank) {
		this._rank = value;
	}

	private _inTeam: boolean = false;
	public get inTeam(): boolean {
		return this._inTeam;
	}

	constructor(discord: Discord.GuildMember, rank: Rank) {
		this._discord = discord;
		this._rank = rank;
	}

	public addToTeam() {
		this._inTeam = true;
	}

	public removeFromTeam() {
		this._inTeam = false;
	}

	public toString(checkIfFree = false, long = false) {
		return `${checkIfFree && this._inTeam ? '~~' : ''}${this._discord} - ${this._rank.emoji}${long ? ' ' + this._rank.label : ''}${checkIfFree && this._inTeam ? '~~' : ''}`;
	}

}