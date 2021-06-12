export {};
declare global {
    interface Set<T> {
        find(callbackfn: (element: T, index?: number, set?: Set<T>) => boolean): T | undefined ; 
        first(): T;
        rand(): T;
        filter(callbackfn: (element: T, index?: number, set?: Set<T>) => boolean): this;
        map<D>(callbackfn: (element: T, index?: number, set?: Set<T>) => D): this;
        clone(): this;
    }
}

// The find() method returns the value of the first element in the provided set that satisfies the provided testing function.
// If no values satisfy the testing function, undefined is returned.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.find = function (this: Set<any>, callbackfn: (element: any, index?: number, set?: Set<any>) => boolean): any | undefined {
	let i = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let e: any;
	this.forEach(element => {
		if (callbackfn(element, i, this) === true) e = element;
		i++;
	});
	return e;
};

// The first() method returns the first element from the provided set.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.first = function (this: Set<any>): any {
	return this.entries().next().value[0];
};

// The rand() method returns a random element from the provided set.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.rand = function (this: Set<any>): any {
	return Array.from(this)[Math.floor(Math.random() * this.size)];
};

// filter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.filter = function (this: Set<any>, callbackfn: (element: any, index?: number, set?: Set<any>) => boolean): Set<any> {
	let i = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newSet: Set<any> = new Set();
	this.forEach(element => {
		if (callbackfn(element, i, this) === true) newSet.add(element);
		i++;
	});
	return newSet;
};

// map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.map = function (this: Set<any>, callbackfn: (element: any, index?: number, set?: Set<any>) => any): Set<any> {
	let i = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newSet: Set<any> = new Set();
	this.forEach(element => {
		const e = callbackfn(element, i, this);
		if (e) newSet.add(e);
		i++;
	});
	return newSet;
};

// clone
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Set.prototype.clone = function (this: Set<any>): Set<any> {
	return new Set(this);
};