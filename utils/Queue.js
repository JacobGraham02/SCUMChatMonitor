/**
 * Because JavaScript lacks a standard library implementation of a Queue data structure, this class mimicks the operation of a typical Queue or FIFO data structure
 * operations include:
 *   enqueue(element): Add an element to the Queue
 *   dequeue(): Remove an element from the Queue
 *   front(): Return, but do not remove, the first element in the Queue
 *   isEmpty(): Return if the Queue contains any elements
 *   size(): Return the total number of elements in the Queue
 */
export default class Queue {
    
    constructor() {
        this.items = [];
    }

    /**
     * Add an element to the back of the queue. This uses .push() to push an element onto the Queue class array
     * @param {Object} element 
     */
    enqueue(element) {
        this.items.push(element);
    }

    /**
     * Remove an element from the front of the Queue class array, and shift all other elements forwards one position
     * @returns The first Object in the Queue class array
     */
    dequeue() {
        if (this.isEmpty()) {
            return "There are no more elements in the Queue"; 
        }
        return this.items.shift();
    }

    /**
     * Return the first element in the Queue class array without removing it from the array
     * @returns The first element in the Queue class array 
     */
    front() {
        if (this.isEmpty()) {
            return "There are no elements in the Queue";
        }
        return this.items[0];
    }

    /**
     * Returns whether or not there are currently-existing Objects in the Queue class array
     * @returns a boolean value indicating whether any Objects exist in the Queue class array
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Returns the total number of objects in the class array
     * @returns The total number of objects that exist in the Queue class array
     */
    size() {
        return this.items.length;
    }
}
