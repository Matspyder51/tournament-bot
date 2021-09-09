import { Player } from './models/Player';
import { Tab } from './models/Tab';
import { GenerateTeams } from './generateTeams';

const ranks = [
	{
		name: 'bronze1',
		label: 'Bronze 1',
		aliases: ['b1'],
		seed: 116,
	},
	{
		name: 'bronze2',
		label: 'Bronze 2',
		aliases: ['b2'],
		seed: 176,
	},
	{
		name: 'bronze3',
		label: 'Bronze 3',
		aliases: ['b3'],
		seed: 238,
	},
	{
		name: 'silver1',
		label: 'Argent 1',
		aliases: ['s1', 'a1', 'argent1'],
		seed: 298,
	},
	{
		name: 'silver2',
		label: 'Argent 2',
		aliases: ['s2', 'a2', 'argent2'],
		seed: 358,
	},
	{
		name: 'silver3',
		label: 'Argent 3',
		aliases: ['s3', 'a3', 'argent3'],
		seed: 418,
	},
	{
		name: 'gold1',
		label: 'Or 1',
		aliases: ['g1', 'o1', 'or1'],
		seed: 478,
	},
	{
		name: 'gold2',
		label: 'Or 2',
		aliases: ['g2', 'o2', 'or2'],
		seed: 538,
	},
	{
		name: 'gold3',
		label: 'Or 3',
		aliases: ['g3', 'o3', 'or3'],
		seed: 598,
	},
	{
		name: 'platinum1',
		label: 'Platine 1',
		aliases: ['p1', 'plat1', 'platine1'],
		seed: 658,
	},
	{
		name: 'platinum2',
		label: 'Platine 2',
		aliases: ['p2', 'plat2', 'platine2'],
		seed: 718,
	},
	{
		name: 'platinum3',
		label: 'Platine 3',
		aliases: ['p3', 'plat3', 'platine3'],
		seed: 778,
	},
	{
		name: 'diamond1',
		label: 'Diamant 1',
		aliases: ['d1', 'diam1', 'diamant1'],
		seed: 843,
	},
	{
		name: 'diamond2',
		label: 'Diamant 2',
		aliases: ['d2', 'diam2', 'diamant2'],
		seed: 923,
	},
	{
		name: 'diamond3',
		label: 'Diamant 3',
		aliases: ['d3', 'diam3', 'diamant3'],
		seed: 1003,
	},
	{
		name: 'champion1',
		label: 'Champion 1',
		aliases: ['c1', 'champ1'],
		seed: 1093,
	},
	{
		name: 'champion2',
		label: 'Champion 2',
		aliases: ['c2', 'champ2'],
		seed: 1213,
	},
	{
		name: 'champion3',
		label: 'Champion 3',
		aliases: ['c3', 'champ3'],
		seed: 1333,
	},
	{
		name: 'gc1',
		label: 'Grand Champion 1',
		aliases: ['grandchampion1'],
		seed: 1457,
	},
	{
		name: 'gc2',
		label: 'Grand Champion 2',
		aliases: ['grandchampion2'],
		seed: 1597,
	},
	{
		name: 'gc3',
		label: 'Grand Champion 3',
		aliases: ['grandchampion3'],
		seed: 1741,
	},
	{
		name: 'ssl',
		label: 'Légende Supersonique',
		aliases: ['supersoniclegend', 'legendesupersonique'],
		seed: 1950,
	},
	{
		name: 'pro',
		label: 'Joueur Professionel / Top 100',
		aliases: ['rlcs', 'top100'],
		seed: 2150,
	}
];

const participants = {
	1 : ['@Inspecteur Danaen', 'gc2'],
	2 : ['@Iwon NoXt-', 'gc2'],
	3 : ['@RafaS', 'gc2'],
	4 : ['@malo ^^', 'gc1'],
	5 : ['@ArèsTeed', 'gc1'],
	6 : ['@SeigneurPercevalTV', 'champion3'],
	7 : ['@CorleoneXV', 'champion3'],
	8 : ['@Stax', 'champion3'],
	9 : ['<@737025875219841124>', 'champion3'],
	10: ['@Kern', 'champion3'],
	11: ['@Ero', 'champion2'],
	12: ['@hugowsk7', 'champion2'],
	13: ['<@399916661789949962>', 'champion2'],
	14: ['@Matspyder', 'champion2'],
	15: ['@Toms931', 'champion2'],
	16: ['@Raptor La méduse', 'champion2'],
	17: ['@lemss', 'champion1'],
	18: ['<@842751079367180339>', 'champion1'],
	19: ['@Mrik', 'champion1'],
	20: ['@Zanck\'', 'champion1'],
	21: ['@InnoD3', 'champion1'],
	22: ['@FireStorm', 'champion1'],
	23: ['<@240435670668017666>', 'champion1'],
	24: ['@Esperanzo', 'champion1'],
	25: ['<@505003525827461142>', 'champion1'],
	26: ['@GhostAerial', 'champion1'],
	27: ['@GergeSeinsbourg', 'champion1'],
	28: ['@Neezox', 'diamond3'],
	29: ['@Kagami', 'diamond3'],
	30: ['@Cristal Raven', 'diamond2'],
	31: ['@>Saï', 'diamond2'],
	32: ['@Pap\'s', 'diamond1'],
	33: ['@JeSuisMarzo', 'diamond1'],
	34: ['<@408603224199659521>', 'diamond1'],
	35: ['@SN7 FairyTruite', 'platinum3'],
	36: ['@chucknorris44340', 'platinum3'],
	37: ['@SNR_YAMAH', 'platinum3'],
	38: ['<@799380567690313729>', 'platinum3']
};

export function test(): void {
	const players: Set<Player> = new Set();

	for (const participant in participants) {
		players.add(new Player(participant[0], participant[0], ranks[ranks.findIndex(r => r.name === participant[0])], 80));
	}
    
	const tab: Tab | null= new GenerateTeams(players, 3, 80).generateTab(10);
    
	console.log(tab);
}