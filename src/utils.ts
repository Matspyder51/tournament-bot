import { words } from './words.json';

export function GetRandomWord(): string {
	return words[GetRandomNumber(0, words.length - 1, true)];
}

export function GetRandomNumber(min: number, max: number, round?: boolean): number {
	let value = Math.random() * (max - min) + min;
	value = round ? Math.round(value) : value;
  return value;
}