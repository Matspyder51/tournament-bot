import { words } from './words.json';

export function GetRandomWord(): string {
	const index = GetRandomNumber(0, words.length - 1, true);
	return words[index < words.length ? index : index - 1];
}

export function GetRandomNumber(min: number, max: number, round?: boolean): number {
	let value = Math.random() * (max - min) + min;
	value = round ? Math.round(value) : value;
  return value;
}