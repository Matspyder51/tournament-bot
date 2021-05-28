import { GuildEmoji } from 'discord.js';
import { Bot } from '../main';

const ranks: Rank[] = [
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
		seed: 2150
	}
];

export const Ranks = [...ranks];

export interface Rank {
	name: string;
	label: string;
	aliases: string[];
	emoji?: GuildEmoji;
	seed: number;
}

export function GetAllRanks(): Rank[] {
	return ranks;
}

export function LoadRanksEmojis(): void {
	const guild = Bot.guild;
	ranks.forEach((rank) => {
		const emote = guild.emojis.cache.find(x => x.name === rank.name);
		rank.emoji = emote;
	});
}

export function GetRankByName(name: string): Rank | undefined {
	return ranks.find(x => x.name == name);
}