import { Participant } from "../models/participant";
import { Rank } from "../models/rank";

// TEAM GENRERATION V0.1

interface Player extends Participant {
    mmr?: number
}

type Team = Player[];

interface TeamMetrics {
    teamAverageMmr: number,
    teamCombineMmr: number
};

interface TeamsMetrics {
    highestTeam: number,
    lowestTeam: number,
    average: number,
    median: number
}

export function main(players: Player[], ranks: Rank[], maxTeamSize: number = 3,  modifier: number = 40): Team[] {
    players = computePlayersMmr(players, ranks, modifier);
    
    const tabs = [];

    for (let i = 0; i < 10000; i++) {
        tabs.push(generateTeams(players, [], ranks, modifier));
    }

    let best = tabs[1];
    tabs.forEach(tab => {
        const m = teamsMetrics(tab);
        const mB = teamsMetrics(best);
        if (m.highestTeam - m.lowestTeam < mB.highestTeam - mB.lowestTeam) {
            best = tab;
        }
    })
    return best;
}

function generateTeams(players: Player[], teams: Team[], ranks: Rank[], modifier: number): Team[] {
    const highestRank = findHighestRank(players, ranks, modifier);

    if (highestRank !== null) {
        players.filter(player => player.rank.name === highestRank).map(player => {
            teams.push([player]);
            return player;
        });
        players = players.filter(player => player.rank.name !== highestRank);
    }

    for(let i = 0; players.length > 0 && i < 20; i++) {
        const metrics = teamsMetrics(teams);
        const team = generateTeam(players, metrics);
        if (team.length > 0) {
            teams.push(team);
            players = players.filter(player => team.find(p => p.discord?.user.id === player.discord?.user.id) === undefined);
        }
    }

    return teams
}

function generateTeam(players: Player[], metrics: TeamsMetrics): Team {
    const team = [];
    let p = players;
    const p1 = players[getRandomInt(p.length)];
    team.push(p1);
    players.splice(players.findIndex(f => f.discord?.user.id === p1.discord?.user.id), 1);
    let tMetrics = teamMetrics(team);
    while (
        (tMetrics.teamCombineMmr * 100 / metrics.average > 115 ||
        tMetrics.teamCombineMmr * 100 / metrics.average < 85) &&
        p.length > 0 && team.length < 3
    )
    {
        p = p.filter(p2 => {
            //@ts-ignore
            return (p2.mmr + tMetrics.teamCombineMmr) * 100 / metrics.average < 115
        })
        if (p.length > 0) {
            const p2 = p[getRandomInt(p.length)]
            team.push(p2);
            players.splice(players.findIndex(f => f.discord?.user.id === p2.discord?.user.id), 1);
        }
        tMetrics = teamMetrics(team);
    }
    return team;
}

function getRandomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

function teamsMetrics(teams: Team[]): TeamsMetrics {
    //@ts-ignore
    let highestTeam = null;
    //@ts-ignore
    let lowestTeam = null;
    //@ts-ignore
    const teamsMmr = [];

    teams.forEach(team => {
        const metrics = teamMetrics(team);
        teamsMmr.push(metrics.teamCombineMmr);
//@ts-ignore
        if (highestTeam === null || metrics.teamCombineMmr > highestTeam) highestTeam = metrics.teamCombineMmr;
        //@ts-ignore
        if (lowestTeam === null || metrics.teamCombineMmr < lowestTeam) lowestTeam = metrics.teamCombineMmr;
    });

    return {
//@ts-ignore
        highestTeam,
        //@ts-ignore
        lowestTeam,
        //@ts-ignore
        average : getAverage(teamsMmr),
        //@ts-ignore
        median : getMedian(teamsMmr)
    };
}

function teamMetrics(team: Team): TeamMetrics {
    let teamCombineMmr = 0;
    team.forEach(player => {
        //@ts-ignore
        teamCombineMmr += player.mmr;
    });

    return {
        //@ts-ignore
        teamAverageMmr : getAverage(team.map(player => player.mmr)),
        teamCombineMmr
    }
}

function getMedian(numbers: number[]): number {
    if (numbers.length % 2 === 0) {
        return (numbers[Math.floor((numbers.length + 1) / 2)] + numbers[Math.ceil((numbers.length + 1) / 2)]) / 2;
    }
    else {
        return numbers[(numbers.length + 1) / 2];
    }
}

function getAverage(numbers: number[]): number {
    let total = 0;
    numbers.forEach(number => total += number);
    return Math.floor(total / numbers.length);
}

function findHighestRank(players: Player[], ranks: Rank[], modifier: number): string | null {
    let highest = {
        rank : "",
        mmr : 0
    };
    players.forEach(player => {
        //@ts-ignore
        if (player.mmr > highest.mmr) {
            highest = {
                rank : player.rank.name, 
                //@ts-ignore
                mmr : player.mmr,
            };
        };
    });

    if (highest.mmr < computeMmr("gc1", ranks, modifier)) return null;
    else return highest.rank
}

function computePlayersMmr(players: Player[], ranks: Rank[], modifier: number): Player[] {
    return players.map(player => {
        player.mmr = computeMmr(player.rank.name, ranks, modifier);
        return player;
    });
}

function computeMmr(rank: string, ranks: Rank[], modifier: number): number {
    const seed =  ranks.find(r => r.name === rank);
    if (!!seed) return Math.floor(Math.pow(seed.seed, 1 + (modifier / 100)));
    else throw new Error("Can't find rank");
    
}