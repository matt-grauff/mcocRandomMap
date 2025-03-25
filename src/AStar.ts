import {Point} from "./helpers";
import {PriorityQueue} from "./PriorityQueue";

class Vertex extends Point {

    cost: number

    constructor(x: number, y: number, cost: number) {
        super(x, y);

        this.cost = cost;
    }
}
export class AStar {

    private readonly adjacencies: Record<string, Vertex[]>;
    private readonly grid: Vertex[][];

    constructor(width: number, height: number) {
        this.grid = [];

        for(let x = 0; x < width; x++) {
            this.grid[x] = [];

            for(let y = 0; y < height; y++) {
                this.grid[x][y] = new Vertex(x, y,Math.random() * (width + height) / 10)
            }
        }

        this.adjacencies = {};

        for(let x = 0; x < width; x += 2) {
            for(let y = 0; y < height; y += 2) {
                this.adjacencies[this.grid[x][y].key()] = this.generateAdjacencies(this.grid[x][y], width, height);
            }
        }
        for(let x = 1; x < width; x += 2) {
            for(let y = 1; y < height; y += 2) {
                this.adjacencies[this.grid[x][y].key()] = this.generateAdjacencies(this.grid[x][y], width, height);
            }
        }
    }

    private generateAdjacencies(n: Vertex, width: number, height: number) {
        let connections = [];

        //nodes should only go diagonally
        for(let offsets of [[1,1], [-1,1], [-1,-1], [1,-1]]) {
            let newX = n.x + offsets[0];
            let newY = n.y + offsets[1];
            if(newX >= 0 && newX < width && newY >= 0 && newY < height) {
                connections.push(this.grid[newX][newY]);
            }
        }

        return connections;
    }

    find(start: Point, end: Point): Point[] {

        let startV = this.getVertex(start.x, start.y);
        let endV = this.getVertex(end.x, end.y);

        let frontier: PriorityQueue<Vertex> = new PriorityQueue();
        frontier.insert(startV, 0);
        let costs: Record<string, number> = {
            [startV.key()]: 0
        }
        let origin: Record<string, Vertex|null> = {
            [startV.key()]: null,
        }

        while(frontier.length > 0) {
            let current = frontier.dequeue();

            if(current === endV || current == null) {
                break;
            }

            for(let v of this.adjacencies[current.key()]) {
                let newCost = costs[current.key()] + v.cost;

                if(!(v.key() in costs) || newCost < costs[v.key()]) {
                    costs[v.key()] = newCost;
                    let prio = newCost + (this.manhattanDistance(v, endV) / Math.sqrt(2));
                    frontier.insert(v, prio);
                    origin[v.key()] = current;
                }
            }
        }

        let path: Point[] = [];

        let current: Vertex|null = endV;
        while(current != null) {
            path.push(current);
            current = origin[current.key()];
        }

        return path.reverse();
    }

    private getVertex(x: number, y: number): Vertex {
        return this.grid[x][y];
    }

    private manhattanDistance(a: Vertex, b: Vertex) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}