// TEAM GENRERATION V0.1.2a by Danaen

import { Player } from "./models/Player";
import { Team } from "./models/Team";
import { Rank } from "./types/Rank";
import { Metrics } from "./types/Metrics";
import { Tab } from "./models/Tab";

import "./global/Set";
import "./global/Math";

export function main(
  players: Set<Player>,
  ranks: Rank[],
  maxTeamSize: number = 3,
  modifier: number = 80
): Tab {
  const tabs: Tab[] = [];

  for (let i = 0; i < 100; i++) {
    console.log(i);
    const tab$ = new Promise(async (res) => res(await generateTeams(players, new Tab(), ranks, maxTeamSize, modifier)));
    const timeout$ = new Promise((res) => setTimeout(() => res(null), 200));
    Promise.race([
      tab$,
      timeout$
    ]).then(res => {
      if (res) {
        tabs.push(res as Tab);
      }
    })
  }

  let best: Tab = tabs[0];
  tabs.forEach((tab) => {
    if (tab && teamsHealthCheck(tab.teams, players)) {
      if (best === null) {
        best = tab;
      } else {
        const m = teamsMetrics(tab.teams);
        const mB = teamsMetrics(best.teams);
        if (
          (m.highest as Team).metrics().combined -
            (m.lowest as Team).metrics().combined <
          (mB.highest as Team).metrics().combined -
            (mB.lowest as Team).metrics().combined
        ) {
          best = tab;
        }
      }
    }
  });
  console.log(best)
  return best;
}

function teamsHealthCheck(teams: Set<Team>, players: Set<Player>): boolean {
  const playersInTeam = new Set<string>();
  teams.forEach((team) => {
    team.players.forEach((player) => {
      if (playersInTeam.has(player.id)) return false;
      playersInTeam.add(player.id);
    });
  });
  if (playersInTeam.size !== players.size) return false;
  return true;
}

async function generateTeams(
  players: Set<Player>,
  tab: Tab,
  ranks: Rank[],
  maxTeamSize: number,
  modifier: number
): Promise<Tab> {
  const highestRank = findHighestRank(players, ranks, modifier);

  if (highestRank !== null) {
    players
      .filter((player) => player.rank === highestRank)
      .map((player) => {
        tab.add(new Team(maxTeamSize, new Set([player])));
        return player;
      });
    players = players.filter((player) => player.rank !== highestRank);
  }

  for (let nbTeams = 0; players.size > 0 && nbTeams < 1000; nbTeams++) {

    const metrics = teamsMetrics(tab.teams);
    const team = generateTeam(players, metrics, maxTeamSize);
    if (team.size > 0) {
      tab.add(team);
      players = players.filter(
        (player) => team.players.find((p) => p.id === player.id) === undefined
      );
    }
  }

  return tab;
}

function generateTeam(
  players: Set<Player>,
  metrics: Metrics,
  maxTeamSize: number
): Team {
  let p = players;
  const p1 = players.rand();
  // const p1 = players[getRandomInt(p.length)];
  const team = new Team(maxTeamSize, new Set([p1]));
  players.delete(p1);
  let tMetrics = team.metrics();
  while (
    ((tMetrics.combined * 100) / metrics.average > 110 ||
      (tMetrics.combined * 100) / metrics.average < 90) &&
    p.size > 0 &&
    team.size < maxTeamSize
  ) {
    p = p.filter((p2) => {
      return ((p2.mmr + tMetrics.combined) * 100) / metrics.average < 110;
    });
    if (p.size > 0) {
      const p2 = p.rand();
      team.add(p2);
      players.delete(p2);
    }
    tMetrics = team.metrics();
  }
  return team;
}

function teamsMetrics(teams: Set<Team>): Metrics {
  let highest: Team | undefined = undefined;
  let lowest: Team | undefined = undefined;
  const teamsMmr: number[] = [];

  teams.forEach((team) => {
    teamsMmr.push(team.metrics().combined);
    if (!highest || team.metrics().combined > highest.metrics().combined)
      highest = team;
    if (!lowest || team.metrics().combined < lowest.metrics().combined)
      lowest = team;
  });

  return {
    highest: highest!,
    lowest: lowest!,
    average: getAverage(teamsMmr),
    median: getMedian(teamsMmr),
    combined: 0,
  };
}

function getMedian(numbers: number[]): number {
  if (numbers.length % 2 === 0) {
    return (
      (numbers[Math.floor((numbers.length + 1) / 2)] +
        numbers[Math.ceil((numbers.length + 1) / 2)]) /
      2
    );
  } else {
    return numbers[(numbers.length + 1) / 2];
  }
}

function getAverage(numbers: number[]): number {
  let total = 0;
  numbers.forEach((number) => (total += number));
  return Math.floor(total / numbers.length);
}

function findHighestRank(
  players: Set<Player>,
  ranks: Rank[],
  modifier: number
): Rank | null {
  let highest: { rank: Rank; mmr: number } = {
    rank: ranks[0],
    mmr: 0,
  };
  players.forEach((player) => {
    if (player.mmr! > highest.mmr) {
      highest = {
        rank: player.rank,
        mmr: player.mmr!,
      };
    }
  });

  if (highest.mmr < computeMmr("gc1", ranks, modifier)) return null;
  else return highest.rank;
}

function computeMmr(rank: string, ranks: Rank[], modifier: number): number {
  const seed = ranks.find((r) => r.name === rank);
  if (!!seed) return Math.floor(Math.pow(seed.seed, 1 + modifier / 100));
  else throw new Error("Can't find rank");
}
