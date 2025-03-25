import {Point} from "./helpers";

/**
 * Represents a quest node on the randomly generated map.
 * Contains its location, fight details, and metadata for map generation
 */
export class MapNode extends Point {

    public distSinceFight: number;      //how far past the last fight is this node
    public portrait?: HTMLImageElement; //the champ portrait to display for this node
    public isBoss: boolean;             //is this node a boss node (changes how portrait should be displayed)

    private readonly parents: MapNode[];  //the immediate predecessors of this node
    private readonly children: MapNode[]; //the immediate descendents of this node

    /**
     * Creates a new MapNode from a given point
     * @param x the x coordinate of the node
     * @param y the y coordinate of the node
     */
    constructor(x: number, y: number) {
        super(x, y);

        this.isBoss = false;
        this.distSinceFight = -1;

        this.parents = [];
        this.children = [];
    }

    /**
     * Check if a given Point key is present anywhere in the ancestry of this MapNode
     * @param key the Point key to search for
     * @returns true if any ancestor matches the key, otherwise false
     */
    public hasAncestor(key: string): boolean {
        for(let p of this.parents) {
            if(p.key() == key || p.hasAncestor(key)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Adds a MapNode as a direct parent of this node
     * @param parent the MapNode to add
     */
    public addParent(parent: MapNode) {
        //verify no duplicates are added
        if(this.parents.find((mn) => mn.equals(parent)) == null) {
            this.parents.push(parent);
        }
    }

    /**
     * Get all ancestor keys in an array
     * @returns an array containing every ancestor key
     */
    public getAncestors(): string[] {
        let ancestorKeys: string[] = [];
        for(let p of this.parents) {
            ancestorKeys.push(p.key(), ...p.getAncestors());
        }
        return ancestorKeys;
    }

    /**
     * Add a MapNode as a direct child of this one
     * @param child the MapNode to add
     */
    public addChild(child: MapNode) {
        if(this.children.find((mn) => mn.equals(child)) == null) {
            this.children.push(child);
        }
    }

    /**
     * Get all direct children of this MapNode
     */
    public getChildren(): MapNode[] {
        return this.children;
    }
}