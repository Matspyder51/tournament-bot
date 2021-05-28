import { Participant } from "./participant";

export class Team {
	constructor(public players: Participant[]) {}

	public AddParticipant(participant: Participant): boolean {
		if (this.players.indexOf(participant) != -1)
			return false;

		this.players.push(participant);

		return true;
	}

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