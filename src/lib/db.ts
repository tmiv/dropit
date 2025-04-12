import { writable } from 'svelte/store';

export interface WorkoutSet {
    id: number;
    state: 'completed' | 'next' | 'due' | 'active' | 'future';
    timeLeft: number;
    startTime: number | null;  // Unix timestamp when timer started
    completionTime: string | null;  // Time when set was completed
    dueTime: number | null; // When this set is scheduled to be due
}

export interface DailyWorkout {
    date: string;  // YYYY-MM-DD format
    sets: WorkoutSet[];
}

const DB_NAME = 'workout-db';
const STORE_NAME = 'workouts';
const DB_VERSION = 1;

// Svelte store for reactive updates
export const currentWorkout = writable<DailyWorkout | null>(null);

export class WorkoutDB {
    private db: IDBDatabase | null = null;
    private startTime: number = 9; // Default to 9AM for first set

    async init() {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
    
            request.onerror = () => { console.log( "Bad db init", request.error ); reject(request.error); }
            
            request.onsuccess = () => {
                this.db = request.result;
                this.createDBStore();
                resolve();
            };
    
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if( !this.db )
                    this.db = db;
                this.createDBStore();
                console.error( "Store Exists");
            };
        });
    }

    createDBStore() {
        if( !this.db ) throw new Error("No Database");
        if (!this.db.objectStoreNames.contains(STORE_NAME)) {
            console.error( "Create Store ");
            this.db.createObjectStore(STORE_NAME, { keyPath: 'date' });
        }
    }

    async getTodayWorkout(): Promise<DailyWorkout> {
        const today = new Date().toISOString().split('T')[0];
        const workout = await this.getWorkout(today);
        
        if (workout) {
            return workout;
        }

        // Create new workout for today
        const newWorkout: DailyWorkout = {
            date: today,
            sets: Array(8).fill(null).map((_, i) => ({
                id: i,
                state: i === 0 ? 'next' : 'future',
                timeLeft: 2700, // 45 minutes
                startTime: null,
                completionTime: null,
                dueTime: i === 0 ? this.getFirstSetDueTime() : null
            }))
        };

        await this.saveWorkout(newWorkout);
        return newWorkout;
    }

    getFirstSetDueTime(): number {
        // Calculate timestamp for today at the configured start time
        const now = new Date();
        const dueDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            this.startTime, // Hour (e.g., 9 for 9 AM)
            0, // Minutes
            0 // Seconds
        );
        return dueDate.getTime();
    }

    // Calculate due time for next set (45 minutes after previous set was completed)
    calculateNextDueTime(previousSetCompletionTime: number): number {
        return previousSetCompletionTime + (45 * 60 * 1000); // 45 minutes in milliseconds
    }

    private async getWorkout(date: string): Promise<DailyWorkout | null> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Database not initialized'));

            const transaction = this.db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(date);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async saveWorkout(workout: DailyWorkout): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Database not initialized'));

            const transaction = this.db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(workout);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                currentWorkout.set(workout);
                resolve();
            };
        });
    }
}

export const db = new WorkoutDB(); 