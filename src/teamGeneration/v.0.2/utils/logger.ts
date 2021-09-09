/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-mixed-spaces-and-tabs */
import * as fs from 'fs';

export class Logger {

    private logs: Map<string, boolean | number | string | any[]> = new Map();

    private name: string = new Date().toISOString();

    private save(): void {
    	fs.writeFile(`teamGeneration-${this.name}`, JSON.stringify(this.logs.entries()), (err) => {
    		if (err) throw err;
    	});
    }

    public add(key: string, value: boolean | number | string | any[]): void {
    	this.logs.set(key, value);
    	this.save();
    }
}