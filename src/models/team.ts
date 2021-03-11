import { Participant } from "./participant";

export class Team {
	constructor(public players: Participant[]) {}

	public toString(checkIfFree?: boolean, long?: boolean) {
		let msg = '';
		let isFirst = true;
		for (const ply of this.players) {
			msg += `${!isFirst? ' - ' : ''}${ply.toString(checkIfFree, long)}`;
			isFirst = false;
		}

		return msg;
	}
}