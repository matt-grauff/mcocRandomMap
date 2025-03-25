interface PQueueEntry<T> {
    data: T,
    priority: number,
}

export class PriorityQueue<T> {

    private readonly queue: PQueueEntry<T>[];
    public length: number;

    /**
     * Creates a new empty Priority Queue
     */
    constructor() {
        this.queue = [];
        this.length = 0;
    }

    /**
     * Inserts the provided data into the queue with the given priority
     * @param data the data to be stored
     * @param priority the associated priority
     */
    insert(data: T, priority: number) {

        let insertIdx: number= 0;
        for(let i: number = 0; i < this.queue.length; i++) {

            let obj: PQueueEntry<T> = this.queue[i];

            if(obj.priority > priority) {
                insertIdx = i;
                break;
            }
        }

        this.queue.splice(insertIdx, 0,
            {
                data: data,
                priority: priority
            }
        );

        this.length = this.queue.length;
    }

    /**
     * Removes and returns the next element, based on priority.
     * @returns the removed element from the Queue, or undefined if the Queue is empty
     */
    dequeue(): T | undefined {

        let elem = this.queue.shift()?.data;
        this.length = this.queue.length;
        return elem;
    }

    /**
     * Returns the next element based on priority without removing.
     * @returns the next element in the Queue, or undefined if the Queue is empty
     */
    peek(): T {
        return this.queue[0]?.data;
    }
}