import { Metrics } from "../types/Metrics";
import { Player } from "./Player";

export class Team {
  public readonly players: Set<Player> = new Set();

  public get size(): number {
    return this.players.size;
  }

  private maxTeamSize!: number;

  constructor(maxTeamSize: number, players?: Set<Player>) {
    if (maxTeamSize === undefined)
      throw new Error("The team max size can't be undefined");
    if (maxTeamSize === null)
      throw new Error("The team max size can't be null");
    if (isNaN(maxTeamSize))
      throw new Error("The team max size must be a number");
    this.maxTeamSize = maxTeamSize;

    if (players && players.size > this.maxTeamSize)
      throw new Error(
        "You can't initialize a team with more players than max team size"
      );
    if (players) players.forEach((player) => this.add(player));
  }

  public add(player: Player): Set<Player> {
    if (this.size >= this.maxTeamSize) {
      console.error(JSON.stringify(this.players, null, 2));
      console.error(JSON.stringify(player, null, 2));
      console.error(this.maxTeamSize, this.size);
      throw new Error(
        "Can't add player to team or team size will exceed max team size"
      );
    } else {
      return this.players.add(player);
    }
  }

  public delete(player: Player): boolean {
    if (!this.players.has(player))
      throw new Error("This player doesn't belong to this team");
    else {
      return this.players.delete(player);
    }
  }

  public metrics(): Metrics {
    let combined = 0;
    let highest: Player = this.players.first();
    let lowest: Player = this.players.first();
    this.players.forEach((player) => {
      combined += player.mmr;
      if (player.mmr > highest.mmr) highest = player;
      if (player.mmr < lowest.mmr) lowest = player;
    });

    return {
      average: Math.avg(
        Array.from(
          this.players.map<number>(
            (player) => player.mmr
          ) as unknown as Set<number>
        )
      ),
      median: Math.median(
        Array.from(
          this.players.map<number>(
            (player) => player.mmr
          ) as unknown as Set<number>
        )
      ),
      combined,
      highest,
      lowest,
    };
  }

  public healthCheck(): boolean {
    if (this.players.size === 0) {
      throw new Error("There is no players in this team");
    }

    if (this.players.size > this.maxTeamSize) {
      throw new Error("There is more players than allowed in this team");
    }

    return true;
  }

  public toString(): string {
    return JSON.stringify(Array.from(this.players), null, 2);
  }
}
