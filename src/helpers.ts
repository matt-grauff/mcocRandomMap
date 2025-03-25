import {MapNode} from "./MapNode";

export class Point {

    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    key(): string {
        return this.x + ',' + this.y;
    }

    equals(p: Point): boolean {
        return this.x == p.x && this.y == p.y;
    }
}

//how many even numbers are included in the provided range
//https://stackoverflow.com/questions/2682438/simplest-way-to-calculate-amount-of-even-numbers-in-given-range#:~:text=The%20count%20of%20even%20numbers,n%2F2%5D%20%2B%201.
export function evensInRange(start: number, end: number): number {
    return Math.floor((end - start + 2 - (start % 2)) / 2);
}

//pythagorean distance
export function dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2-x1) ** 2 + (y2-y1) ** 2);
}

//linear interpolation
export function lerp(a: number, b: number, ratio: number): number {
    return a + ratio*(b-a);
}

//reduce an array to only its unique values
export function unique<T>(ary: T[], comparison?: (a: T, b: T) => boolean): T[] {
    comparison ??= (a, b) => a == b;

    let uniqAry: T[] = [];

    for(let el of ary) {
        if(uniqAry.find((el2) => comparison(el, el2)) == null) {
            uniqAry.push(el);
        }
    }

    return uniqAry;
}
