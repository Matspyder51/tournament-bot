import { Team } from './team';

export enum WinnerTeam {
	UP = 0,
	DOWN = 1
}

export class Match {

	public winnerBracketNextMatchId?: number;

	constructor(public upTeam?: Team, public downTeam?: Team, public winnedBy?: WinnerTeam) {

	}

}