/* eslint-disable */
import { Participant } from "../models/participant";
import { Rank } from "../models/rank";

// TEAM GENRERATION V0.2.a by Danaen

interface Player extends Participant {
    mmr: number
}

type Team = Player[];

interface TeamMetrics {
    teamAverageMmr: number,
    teamCombineMmr: number
};

interface TeamsMetrics {
    highestTeam?: number,
    lowestTeam?: number,
    average: number,
    median: number
}

export class GenerateTeams {
    private ranks: Rank[];
    private players: Player[] = [];
    private maxTeamSize: number;
    private modifier: number;

    constructor(players: Participant[], ranks: Rank[], maxTeamSize: number = 3, modifier: number = 60) {
        this.ranks = ranks;

        if (maxTeamSize <= 0) throw Error("Max team size must  be greater than 0");
        else if (maxTeamSize > 4) throw Error("Max team size must be less than 4");
        else this.maxTeamSize = maxTeamSize;

        if (typeof modifier !== "number") throw Error("Ranks modifier must be a number");
        if (modifier < 0) throw Error("Ranks modifier must be greater or equal to 0");
        else this.modifier = modifier;

        try {
            this.players = this.computePlayersMmr(players);
        }
        catch (error) {
            throw error;
        }
    }

    public getTeams(): {teams: Team[], tolerance: number} {
        try {
            const tab = this.generateTeams(this.players);
            this.teamsHealthCheck(tab.teams, this.players);
            return tab;
        }
        catch (error) {
            throw Error("Team generation encountered the following  : " + error);
        }
    }

    public getTab(): {teams: Team[], tolerance: number} | null{
        const tabs = [];
        const limit = this.players.length * 10;
        let fail = 0;
        for(let i = 0; i < limit; i++) {
            console.log(i * 100 / limit + "%");
            try {
                const tab = this.getTeams();
                tabs.push(tab);
            }
            catch (error) {
                console.error(error);
                console.log(`${fail} tabs failed`);
                return null;
            }
        }
        tabs.sort((a, b) => a.tolerance - b.tolerance);
        return tabs[0];
    }

    private generateTeams(players: Player[]): {teams: Team[], tolerance: number, metrics: TeamsMetrics} {
        const highestRank = this.findHighestRank(players);
        
        if (!highestRank){
             throw Error("Can't find the highest ranked player.");
        }
        
        const teams: Team[] = [];

        if (highestRank !== null) {
            players.filter(player => player.rank.name === highestRank).map(player => {
                teams.push([player]);
                return player;
            });
            players = players.filter(player => player.rank.name !== highestRank);
        }

        let unassignedPlayers: Player[] = [...players];
        let tolerance: number = 0;
        let tempTeams: Team[] = [...teams];
    
        while(unassignedPlayers.length > 0 && tolerance < 100 && tempTeams.length > 0) {
            try {
                const metrics = this.teamsMetrics(tempTeams);
                const team = this.generateTeam([...unassignedPlayers], metrics, tolerance);
                if (team && team.length > 0) {
                    const teamMetric = this.teamMetrics(team);
                    if (teamMetric.teamCombineMmr * 100 / metrics.median < (100 + tolerance) &&
                        teamMetric.teamCombineMmr * 100 / metrics.median > (100 - tolerance)) 
                    {
                        tempTeams.push(team);
                        unassignedPlayers = unassignedPlayers.filter(player => team.find(p => p.discord?.user.id === player.discord?.user.id) === undefined);
                    }
                    else {
                        tolerance ++;
                        unassignedPlayers = [...players];
                        tempTeams = [...teams];
                    }
                }
                else {
                    tolerance ++;
                    unassignedPlayers = [...players];
                    tempTeams = [...teams];
                }
            }
            catch (error) {
                throw error
            }
        }
        return {
            teams: [...tempTeams],
            tolerance,
            metrics: this.teamsMetrics(teams)
        }
    }

    private generateTeam(players: Player[], metrics: TeamsMetrics, tolerance: number): Team | null{
        const team: Team = [];
        const p1 = players[this.getRandomInt(players.length)];
        team.push(p1);
        players.splice(players.findIndex(f => f.discord?.user.id === p1.discord?.user.id), 1);
        let tMetrics: TeamMetrics = this.teamMetrics(team);
        while (
            (tMetrics.teamCombineMmr * 100 / metrics.median > (100 + tolerance) ||
            tMetrics.teamCombineMmr * 100 / metrics.median < (100 - tolerance)) &&
            players.length > 0
        )
        {
            if (team.length === this.maxTeamSize) {
                return null;
            }

            players = players.filter(p2 => {
                return (p2.mmr + tMetrics.teamCombineMmr) * 100 / metrics.median < (100 + tolerance)
            });
            if (players.length > 0) {
                const potPlayers: any = players.map(player => ({
                    ...player,
                    deviation : Math.abs(((player.mmr + tMetrics.teamCombineMmr) * 100 / metrics.median) - 100)
                })).sort((a, b) => a.deviation - b.deviation);
                const p2 = potPlayers[0];
                team.push(p2);
                players.splice(players.findIndex(f => f.discord?.user.id === p2.discord?.user.id), 1);
            }
            else {
                return null;
            }
            tMetrics = this.teamMetrics(team);
        }
        return team;
    }

    private teamsHealthCheck(teams: Team[], players: Player[]): void {
        const playersInTeam = new Set<string>();
        teams.forEach(team => {
             team.forEach(player => {
                if (playersInTeam.has(player.discord?.user.id as string)) {
                    console.error("TEAMS : ", JSON.stringify(teams, null, 2), "\n");
                    console.error("PARTICIPANTS : ", JSON.stringify(players, null, 2), "\n");
                    console.error("PLAYERS IN TEAMS : ", JSON.stringify(Array.from(playersInTeam), null, 2), player, "\n");
                    throw Error ("Player duplication error encountered.");
                }
                playersInTeam.add(player.discord?.user.id as string);
             })
        })
        if (playersInTeam.size !== players.length) {
            console.error("TEAMS : ", JSON.stringify(teams, null, 2), "\n");
            console.error("PARTICIPANTS : ", JSON.stringify(players, null, 2), "\n");
            throw Error (`Team generation failed to add all players in teams, ${players.length} participants vs ${playersInTeam.size} players in teams`);
        }
    }

    private teamsMetrics(teams: Team[]): TeamsMetrics {
        if (teams.length > 0) {
            let highestTeam: number = this.teamMetrics(teams[0]).teamCombineMmr;
            let lowestTeam: number = this.teamMetrics(teams[0]).teamCombineMmr;
            const teamsMmr: number[] = [];
        
            teams.forEach(team => {
                const metrics = this.teamMetrics(team);
                teamsMmr.push(metrics.teamCombineMmr);
                if (!highestTeam || metrics.teamCombineMmr > highestTeam) highestTeam = metrics.teamCombineMmr;
                if (!lowestTeam || metrics.teamCombineMmr < lowestTeam) lowestTeam = metrics.teamCombineMmr;
            });
        
            return {
                highestTeam,
                lowestTeam,
                average : this.getAverage(teamsMmr),
                median : this.getMedian(teamsMmr)
            };
        }
        else {
            console.error(teams);
            throw Error("Internal error")
        }
    }
    
    private teamMetrics(team: Team): TeamMetrics {
        let teamCombineMmr: number = 0;
        team.forEach(player => {
            teamCombineMmr += player?.mmr;
        });
    
        return {
            teamAverageMmr : this.getAverage(team.map(player => player.mmr)),
            teamCombineMmr
        }
    }

    private findHighestRank(players: Player[]): string | null {
        let highest = {
            rank : "",
            mmr : 0
        };
        if (players.length === 1) {
            highest = {
                rank : players[0].rank.name, 
                mmr : players[0].mmr,
            };
        }

        else {
            players.forEach(player => {
                if (player.mmr > highest.mmr) {
                    highest = {
                        rank : player.rank.name, 
                        mmr : player.mmr,
                    };
                }
            });
        }

        // Could cause problems but we need some kind a breakdown below GC1    
        // if (highest.mmr < this.computeRankMmr("gc1")) return null;

        return highest.rank
    }

    private computePlayersMmr(players: Participant[]): Player[] {
        return players.map<Player>((player: Participant) => {
            try {
                (player as Player).mmr = this.computeRankMmr(player.rank.name);
            }
            catch {
                throw Error(`Unable to compute player ${player.discord?.nickname} MMR with rank ${player.rank.name}`);
            }
            return player as Player;
        });
    }

    private computeRankMmr(rank: string): number {
        const seed =  this.ranks.find(r => r.name === rank);
        if (!!seed) return Math.floor(Math.pow(seed.seed, 1 + (this.modifier / 100)))
        else throw new Error("Can't find rank");
    }

    private getRandomInt(max: number): number {
        return Math.floor(Math.random() * max);
    }

    private getMedian(numbers: number[]): number {
        if (numbers.length === 1)
            return numbers[0];
        if (numbers.length % 2 === 0)
            return (numbers[Math.floor(numbers.length / 2)] + numbers[Math.ceil(numbers.length / 2)]) / 2;
        else
            return numbers[(numbers.length + 1) / 2];
    }
    
    private getAverage(numbers: number[]): number {
        let total: number = 0;
        numbers.forEach(number => total += number);
        return Math.floor(total / numbers.length);
    }
}