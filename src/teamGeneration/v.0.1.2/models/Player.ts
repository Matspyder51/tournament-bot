import { Rank } from "../types/Rank";

export class Player {
  public readonly id!: string;
  public readonly name!: string;
  public readonly rank!: Rank;
  public readonly mmr!: number;

  constructor(id: string, name: string, rank: Rank, rankingModifier: number) {
    if (id === undefined) throw new Error("A player id can't be undefined");
    if (id === null) throw new Error("A player id can't be null");
    if (typeof id !== "string") throw new Error("A player id must be a string");
    this.id = id;
    if (name === undefined) throw new Error("A player name can't be undefined");
    if (name === null) throw new Error("A player name can't be null");
    if (typeof name !== "string")
      throw new Error("A player name must be a string");
    this.name = name;

    if (rank === undefined) throw new Error("A player rank can't be undefined");
    if (rank === null) throw new Error("A player rank can't be null");
    if (rank.name === undefined)
      throw new Error("A rank name can't be undefined");
    if (rank.name === null) throw new Error("A rank name can't be null");
    if (typeof rank.name !== "string")
      throw new Error("A rank name must be a string");
    if (rank.seed === undefined)
      throw new Error("A rank seed can't be undefined");
    if (rank.seed === null) throw new Error("A rank seed can't be null");
    if (isNaN(rank.seed)) throw new Error("A rank seed must be a number");
    this.rank = rank;

    if (rankingModifier === undefined)
      throw new Error("The ranking modifier can't be undefined");
    if (rankingModifier === null)
      throw new Error("The ranking modifier can't be null");
    if (isNaN(rankingModifier))
      throw new Error("The ranking modifier must be a number");
    this.mmr = Math.floor(Math.pow(this.rank.seed, 1 + rankingModifier / 100));
  }
}
