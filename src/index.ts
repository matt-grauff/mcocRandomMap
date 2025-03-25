import {AStar} from "./AStar";
import {portraitPaths} from "./portraits";
import {dist, evensInRange, lerp, Point, unique} from "./helpers";
import {MapNode} from "./MapNode";


/////////////////////////
//  CONFIG VARIABLES  //
///////////////////////

const msPerStep: number        = 1000; //how many ms does the animation take between nodes
const nodeFadeTime: number     = 250;  //how early should a node fade in
const nodeSpacing: number      = 75;   //how many pixels apart are nodes rendered
const nodeWidth: number        = 25;   //how wide are the nodes drawn (this determines scale of all images)
const delayBetweenMaps: number = 5000; //how long to wait before animating a new map

const numBgs        = 11;           //how many different background images are there




////////////////
//   TYPES   //
//////////////

//represents a path from n1 to n2
export interface PathSegment {
    n1: MapNode,
    n2: MapNode,
}

//each entry represents all elements that should be animated concurrently
export interface AnimationSteps {
    paths: PathSegment[][],
    nodes: MapNode[][],
}

//map from a node's key to all its neighbors
export type Transitions = Record<string, Point[]>;


/////////////////////////
//  GLOBAL VARIABLES  //
///////////////////////

//pathCanvas is where the background and completed paths are drawn
const pathCanvas: HTMLCanvasElement = document.getElementById('pathCanvas') as HTMLCanvasElement;
const pathContext = pathCanvas.getContext('2d') as CanvasRenderingContext2D;

//nodeCanvas is where completed nodes and portraits are drawn
const nodeCanvas: HTMLCanvasElement = document.getElementById('nodeCanvas')as HTMLCanvasElement;
const nodeContext = nodeCanvas.getContext('2d') as CanvasRenderingContext2D;

//animCanvas holds only the elements that are currently animating
const animCanvas: HTMLCanvasElement = document.getElementById('animCanvas')as HTMLCanvasElement;
const animContext = animCanvas.getContext('2d') as CanvasRenderingContext2D;

//the proportion that all images need to be scaled by
let imgScale: number;

const bgs: HTMLImageElement[] = [];         //all valid background images

const portraits: HTMLImageElement[] = [];   //holds portrait images as they are loaded

const fightFrame = new Image();     //the gray frame that surrounds a fight
const fightFrameBoss = new Image(); //the frame for boss fight (has red icon on it)

const pathImg = new Image();        //the image for paths between nodes

const nodeImg = new Image();        //the image for an empty node
const nodeFightImg = new Image();   //the image for a node that has a fight on it



//////////////////
//  FUNCTIONS  //
////////////////

/**
 * Reset all canvases
 */
function clearCanvases() {
    pathContext.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
    nodeContext.clearRect(0, 0, nodeCanvas.width, nodeCanvas.height);
    animContext.clearRect(0, 0, animCanvas.width, animCanvas.height);
}

/**
 * Draw a random background image
 */
function drawBackground() {

    let bgImg = bgs[Math.floor(Math.random() * bgs.length)];

    //scale to fit width
    let bgScale = pathCanvas.width / bgImg.width
    pathContext.drawImage(
        bgImg,
        0,
        pathCanvas.height/2 - bgImg.height*bgScale/2,   //vertically center image
        pathCanvas.width,
        bgImg.height * bgScale
    );
}

/**
 * Draw a path from (x1, y1) to (x2, y2) by tiling the path image
 * @param x1 starting x coordinate in pixels
 * @param y1 starting y coordinate in pixels
 * @param x2 ending x coordinate in pixels
 * @param y2 ending y coordinate in pixels
 * @param context the rendering context to draw the path on
 */
function drawPath(x1: number, y1: number, x2: number, y2: number, context=pathContext) {

    context.save();
    context.translate(x1, y1);
    context.rotate(Math.atan2(y2-y1, x2-x1));   //rotate canvas so individual path drawing is easier

    //how many times will we need to tile the path image
    let numSegments = dist(x1, y1, x2, y2) / (pathImg.width * imgScale);

    //draw whole numbers of segments first
    for(let i = 0; i < Math.floor(numSegments); i++) {

        //draw at (0,0) then offset the canvas
        context.drawImage(
            pathImg,
            0,
            0 - pathImg.height*imgScale/2,
            pathImg.width*imgScale,
            pathImg.height*imgScale
        );

        context.translate(pathImg.width*imgScale, 0);
    }

    //draw final partial path
    let imgPrc = numSegments % 1;
    context.drawImage(pathImg,
        0,
        0,
        pathImg.width * imgPrc, //scale width to the requested amount
        pathImg.height,
        0,
        0-pathImg.height*imgScale/2,
        pathImg.width*imgScale*imgPrc,
        pathImg.height*imgScale
    );

    context.restore();
}

/**
 * Draw a node centered on (x, y)
 * @param x the center x coordinate, in pixels
 * @param y the center y coordinate, in pixels
 * @param isFight should this node be drawn as a fight
 * @param context the rendering context to draw the node on
 * @param alpha transparency of the node
 */
function drawNode(x: number, y: number, isFight: boolean, context:CanvasRenderingContext2D=nodeContext, alpha=1) {

    context.save();
    context.globalAlpha = alpha;

    let img = isFight ? nodeFightImg : nodeImg;
    context.drawImage(img, x-nodeWidth/2, y-nodeWidth/2, nodeWidth, nodeWidth);

    context.restore();
}

/**
 * Draw a fight portrait for a node centered at (x, y)
 * @param portrait the fight portrait to use
 * @param x the center x coordinate in pixels of the node housing the fight
 * @param y the center y coordinate in pixels of the node housing the fight
 * @param isBoss should this fight be drawn as a boss
 * @param context the rendering context to draw the portrait on
 * @param alpha transparency of the portrait
 */
function drawPortrait(portrait: HTMLImageElement, x: number, y: number, isBoss: boolean, context=nodeContext, alpha=1) {
    context.save();
    context.globalAlpha = alpha;

    let img = isBoss ? fightFrameBoss : fightFrame;
    context.drawImage(
        img,
        x - img.width*imgScale/2,    //center fight frame on x
        y - img.height*imgScale,     //portrait bottom should intersect node center
        img.width * imgScale,
        img.height * imgScale
    );

    context.drawImage(
        portrait,
        x - portrait.width*imgScale/2,                                  //center portrait on x
        y - fightFrame.height*imgScale/2 - portrait.height*imgScale/2,  //center portrait y within frame
        portrait.width * imgScale,
        portrait.height * imgScale
    )

    context.restore();
}


/**
 * Get and load a random portrait and save to global portraits array
 * @param cb callback once portrait is loaded
 */
function getPortrait(cb: (portrait: HTMLImageElement) => void): void {
    let idx = Math.floor(Math.random() * portraitPaths.length);

    if(portraits[idx] != null) {
        cb(portraits[idx]);
    }
    else {
        let p = new Image();
        p.src = portraitPaths[idx];
        p.onload = () => {
            portraits[idx] = p;
            cb(p);
        }
    }
}

/**
 * Check if provided paths array contains a path or its reverse
 * @param paths the array to check within
 * @param path the path to search for
 * @returns true if the path is found, otherwise false
 */
function containsPath(paths: PathSegment[], path: PathSegment): boolean {
    return paths.filter((p) =>
        (p.n1.equals(path.n1) && p.n2.equals(path.n2)) ||
        (p.n2.equals(path.n1) && p.n1.equals(path.n2))
    ).length !== 0;
}


/**
 * Run through an entire map animation once
 */
function run() {

    clearCanvases();

    drawBackground();

    let nodesWide = Math.floor(nodeCanvas.width / nodeSpacing);

    //height needs to account for drawing the portraits
    let nodesHigh = Math.floor((nodeCanvas.height - fightFrame.height*imgScale) / nodeSpacing);

    let as = new AStar(nodesWide, nodesHigh);

    /*
    Note: nodes can only be connected diagonally
    How paths work:
    A starting node is picked that must be on the left side, and an even coordinate in the bottom half of the map.
    An ending node is picked on the right side that is in the top half, and either an even or odd coordinate based on what the width dictates
    That ensures that it is possible with diagonal connections, and lets the path flow generally to the top right.

    Next, two random nodes on the path are selected, and a new path is generated between them.
    This allows for anywhere between 1-3 distinct paths on the final map, based on how it generates
     */

    //main path generation
    //x: 0 -> width-1
    //y: even in bottom half -> top half
    let path: Point[] = as.find(
        new Point(
            0,
            //random even number in bottom half
            Math.ceil(Math.ceil(nodesHigh/2) / 2) * 2 +     //first even below halfway
            Math.floor(Math.random() *
                evensInRange(Math.ceil(nodesHigh/2), nodesHigh-1)) * 2     //random shift based on number of evens in bottom half
        ),
        new Point(
            nodesWide - 1,
            //random even number in top half
            Math.floor(Math.random() * evensInRange(0, Math.floor((nodesHigh-1)/2))) * 2
            + ((nodesWide % 2 === 0) ? 1 : 0)    //shift down 1 if there are an even number of nodes
        )
    );

    //subpath:
    //get random starting index, end is random offset from that, looping if needed
    let subStartIdx = Math.floor(Math.random() * path.length);
    let subStart = path[subStartIdx];

    let offset = Math.floor(Math.random() * (path.length - 30)) + 15;   //cant go closer than 15
    let subEndIdx = (subStartIdx + offset) % path.length;
    let subEnd = path[subEndIdx];

    let subPath: Point[] = as.find(subStart, subEnd);
    // drawPath(subPath);

    //record all possible node transitions
    let transitions: Transitions = {};
    populateTransitions(path, transitions);
    populateTransitions(subPath, transitions);

    //convert to AnimationSteps
    let steps: AnimationSteps = buildAnimationSteps(path[0], path[path.length-1], transitions);

    //run animation, wait, then start another
    runAnimation(steps, () => setTimeout(run, delayBetweenMaps));
}

/**
 * Converts a path to the requisite transitions and stores in provided array
 * @param pathNodes an ordered array of nodes making up the desired path
 * @param transitions object storing all transitions to and from each node
 */
function populateTransitions(pathNodes: Point[], transitions: Transitions) {

    //iterate through each node in path and populate its transitions
    for(let i = 0; i < pathNodes.length; i++) {

        transitions[pathNodes[i].key()] ??= [];

        let transAry = transitions[pathNodes[i].key()];

        //add previous and next nodes as transitions
        if(i-1 >= 0 && transAry.find((p) => p.equals(pathNodes[i-1])) == null) {
            transAry.push(pathNodes[i-1]);
        }
        if(i+1 < pathNodes.length && transAry.find((p) => p.equals(pathNodes[i+1])) == null) {
            transAry.push(pathNodes[i+1]);
        }
    }
}

/**
 * Create AnimationSteps for a given start point, end point, and transition matrix
 * @param start the node to start on
 * @param end the node to end on
 * @param transitions all valid node transitions
 * @returns AnimationSteps for the created map
 */
function buildAnimationSteps(start: Point, end: Point, transitions: Transitions): AnimationSteps {

    //get all node references needed for this map
    let nodes: Record<string, MapNode> = nodesFromTransitions(start, end, transitions);

    let startNode = nodes[start.key()];
    startNode.distSinceFight = 1;

    let endNode = nodes[end.key()];
    endNode.distSinceFight = 0;
    endNode.isBoss = true;
    getPortrait((p) => endNode.portrait = p);

    //each entry in node and path arrays represents all elements that should be animated at the same time
    //ie, nodes[0] will contain only the starting node, and paths[0] will be empty
    //or when travelling to a new node, nodes[i] will include the new node, and paths[i] will include the path to that node
    let steps: AnimationSteps = {
        nodes: [],
        paths: []
    };

    //the nodes and paths needed for the current step
    let currentNodes: MapNode[] = [startNode];
    let currentPaths: PathSegment[] = [];

    //go until there are no more nodes and paths to resolve
    while (currentNodes.length > 0 || currentPaths.length > 0) {

        //commit nodes and paths as a new step
        steps.nodes.push(currentNodes);
        steps.paths.push(currentPaths);

        //empty out paths
        currentPaths = [];

        //map current nodes to next nodes
        //to get next nodes, first get all valid transitions for current nodes
        //add paths from current nodes to next nodes if they're new
        //randomly add fights to nodes
        currentNodes = currentNodes.map((currentNode) => {

            let childNodes: MapNode[] = [];

            for(let childNode of currentNode.getChildren()) {

                //if child isn't already added anywhere, add it to this step
                if(!steps.nodes.flat().find((mn) => mn.equals(childNode)) && !childNodes.includes(childNode)) {
                    childNodes.push(childNode);
                }

                //if a path from currentNode to childNode isn't already added, add it to this step
                let p: PathSegment = {
                    n1: currentNode,
                    n2: childNode
                };

                if(!containsPath(steps.paths.flat(), p) && !containsPath(currentPaths, p)) {
                    currentPaths.push(p)
                }

                //only try to add a fight if testNode hasn't been initialized yet or approaching from a shorter path
                if(childNode.distSinceFight === -1 || childNode.distSinceFight > currentNode.distSinceFight + 1) {

                    //10% chance of adding a fight, plus 10% per empty node before it
                    if (Math.random() < 0.1*currentNode.distSinceFight + 0.1) {

                        //fight added, set distance and load portrait
                        childNode.distSinceFight = 0;
                        getPortrait((p) => {
                            childNode.portrait = p;
                        });
                    }
                    else {

                        //fight not added, increment distance
                        childNode.distSinceFight = Math.max(currentNode.distSinceFight + 1, 1);
                    }
                }
            }

            return childNodes;
        }).flat()  //flatten into single depth array

        currentNodes = unique<MapNode>(currentNodes, (a, b) => a.equals(b));
    }

    return steps
}

/**
 * Builds all requisite MapNodes from a provided Transition matrix.
 * This deduplicates any location that appears multiple times and ensures a consistent reference for Paths to use
 * @param start the start node location
 * @param end the end node location
 * @param transitions all valid node transitions
 * @returns a map from point keys to MapNode objects
 */
function nodesFromTransitions(start: Point, end: Point, transitions: Transitions): Record<string, MapNode> {

    //initialize the reference map with the start and end
    let nodeRefs: Record<string, MapNode> = {
        [start.key()]: new MapNode(start.x, start.y),
        [end.key()]:   new MapNode(end.x,   end.y),
    };

    //currPoints holds all points that still need to be resolved
    let currPoints: Point[] = [start];
    while(currPoints.length > 0) {

        let currPoint = currPoints.shift();
        if(currPoint != null) {

            //get the node reference for the current point
            //this should have already been initialized, either by being the start node or being transitioned to from a previous node
            let currNode = nodeRefs[currPoint.key()];
            if(currNode == null) {
                console.error(`nodesFromTransitions: Node reference for ${currPoint.key()} is uninitialized`, start, end, transitions);
                break;
            }

            //get all transitions for the current node
            let transPoints: Point[] = transitions[currNode.key()];
            for(let testPoint of transPoints) {

                //if the transition node hasn't been initialized, create it and save
                nodeRefs[testPoint.key()] ??= new MapNode(testPoint.x, testPoint.y);
                let testNode = nodeRefs[testPoint.key()];

                //if this transition is not an ancestor and is able to reach the end, create parent/child relationship
                if(!currNode.hasAncestor(testNode.key()) && canReachEnd(testNode.key(), end.key(), transitions, [...currNode.getAncestors(), currNode.key()])) {

                    testNode.addParent(currNode);
                    currNode.addChild(testNode);

                    //if the node isn't the ending node, add as a point to resolve
                    if(!testNode.equals(end)) {
                        currPoints.push(testPoint);
                    }
                }
            }
        }
    }

    return nodeRefs;
}

/**
 * Check if the provided start node is able to reach the provided end node based on the supplied transitions.
 * @param startKey the key of the starting node
 * @param endKey the key of the desired ending node
 * @param transitions matrix of all possible transitions
 * @param history array of already traversed nodes to be ignored
 * @returns true if there is a valid path from start to end, false otherwise
 */
function canReachEnd(startKey: string, endKey: string, transitions: Transitions, history: string[] = []) {
    //recursive base case
    if(startKey == endKey) {
        return true;
    }

    //add this node to the history
    history.push(startKey);

    //check each possible transition for a path to the end
    for(let p of transitions[startKey]) {

        //only check nodes that haven't been traversed yet
        if(!history.includes(p.key()) && canReachEnd(p.key(), endKey, transitions, history)) {
            return true;
        }
    }

    //none of this node's transitions reach the end. Remove start and backtrack
    history.pop();
    return false;
}

/**
 * Run through an entire map animation based on the provided AnimationSteps
 * @param steps all AnimationSteps to animate
 * @param onComplete callback for once the animation is complete
 */
function runAnimation(steps: AnimationSteps, onComplete: () => void) {

    let animStart: number|null;          //the time the animation started
    let lastStepCommitted = -1; //which step was last commited to the permanent canvases

    //logic to be called once per step
    let animStep = function(time: number) {

        animStart ??= time;

        //reset animation canvas
        animContext.clearRect(0,0,animCanvas.width,animCanvas.height);

        //which step should we be in the middle of
        let stepNum = Math.min(Math.floor((time - animStart) / msPerStep), steps.nodes.length);

        //how far through the current step are we
        let prcComplete = (time - animStart - stepNum*msPerStep) / msPerStep;

        //if step has increased, commit previous steps to permanent canvases
        if(stepNum !== lastStepCommitted+1) {

            for(let step = lastStepCommitted+1; step < stepNum; step++) {

                //draw paths on permanent canvas
                for(let p of steps.paths[step]) {
                    drawPath(
                        p.n1.x * nodeSpacing + (nodeSpacing / 2),
                        p.n1.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale,
                        p.n2.x * nodeSpacing + (nodeSpacing / 2),
                        p.n2.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale);
                }

                //draw nodes and fights on permanent canvas
                for (let n of steps.nodes[step]) {
                    drawNode(
                        n.x * nodeSpacing + (nodeSpacing / 2),
                        n.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale,
                        n.distSinceFight == 0);

                    if(n.distSinceFight === 0 && n.portrait != null) {
                        drawPortrait(
                            n.portrait,
                            n.x * nodeSpacing + (nodeSpacing / 2),
                            n.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale,
                            n.isBoss)
                    }
                }
            }

            //update lastStepCommited
            lastStepCommitted = stepNum - 1;
        }

        //if we are still animating, run animations
        if(stepNum < steps.nodes.length) {

            //animate paths
            for(let p of steps.paths[stepNum]) {

                //x and y start at node, ends partway between based on percentage complete
                let startX = p.n1.x * nodeSpacing + (nodeSpacing / 2);
                let endX = lerp(
                    startX,
                    p.n2.x * nodeSpacing + (nodeSpacing / 2),
                    prcComplete);

                let startY = p.n1.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale;
                let endY = lerp(
                    startY,
                    p.n2.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale,
                    prcComplete)

                drawPath(startX, startY, endX, endY, animContext);
            }

            //use ms remaining in this step to fade nodes and portraits in
            let remainingMs = (stepNum+1)*msPerStep - (time-animStart);
            let alpha = lerp(0, 1, (nodeFadeTime - Math.min(remainingMs, nodeFadeTime))/nodeFadeTime);

            //animate nodes
            for (let n of steps.nodes[stepNum]) {
                drawNode(
                    n.x * nodeSpacing + (nodeSpacing / 2),
                    n.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale,
                    n.distSinceFight == 0,
                    animContext,
                    alpha);

                if(n.distSinceFight === 0 && n.portrait != null) {
                    drawPortrait(
                        n.portrait,
                        n.x * nodeSpacing + (nodeSpacing / 2),
                        n.y * nodeSpacing + (nodeSpacing / 2) + fightFrame.height*imgScale,
                        n.isBoss,
                        animContext,
                        alpha);
                }
            }

            //schedule next animation frame
            window.requestAnimationFrame(animStep);
        }
        else {
            //stepNum reached end, call onComplete
            onComplete();
        }
    }

    //begin animation
    window.requestAnimationFrame(animStep);
}



  ///////////////////
 //  MAIN SCRIPT  //
///////////////////

//make canvases fill screen
pathCanvas.width = window.innerWidth;
pathCanvas.height = window.innerHeight;
nodeCanvas.width = window.innerWidth;
nodeCanvas.height = window.innerHeight;
animCanvas.width = window.innerWidth;
animCanvas.height = window.innerHeight;

//load background images
for(let i = 0; i < numBgs; i++) {
    let img = new Image();
    img.src = "./bg/bg" + Math.floor(Math.random() * numBgs) + ".png";
    bgs.push(img);
}

//load images
fightFrame.src = "./questAssets/fight_frame.png";
fightFrameBoss.src = "./questAssets/fight_frame_boss.png";

pathImg.src = "./questAssets/line_off.png";

nodeFightImg.src = "./questAssets/node_fight.png";
nodeImg.src = "./questAssets/node.png";
nodeImg.onload = () => {
    //once node image is loaded, calculate imgScale and begin animating maps
    imgScale = nodeWidth / nodeImg.width
    run();
}

