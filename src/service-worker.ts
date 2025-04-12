/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { WorkoutDB } from './lib/db'

// Claim control immediately
self.skipWaiting();
clientsClaim();

// Clean old caches
cleanupOutdatedCaches();

// Precache and route all static assets
precacheAndRoute(self.__WB_MANIFEST);

// IndexedDB setup and workout management
const DB_NAME = 'workout-db';
const DB_VERSION = 1;

// Function to calculate time left for a set
function getTimeLeft(startTime: number | null): number {
  if (!startTime) return 3600;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(3600 - elapsed, 0);
}

// Helper function to open IndexedDB
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('workouts')) {
        db.createObjectStore('workouts', { keyPath: 'date' });
      }
    };
  });
}

setInterval(async () => {
  const db = new WorkoutDB();
  await db.init()
  const workout = await db.getTodayWorkout();
  const today = new Date().toISOString().split('T')[0];
  
  // Create new workout if none exists or it's from a previous day
  if (!workout || workout.date !== today) {
      const newWorkout = {
          date: today,
          sets: Array(8).fill(null).map((_, i) => ({
              id: i,
              enabled: i === 0,
              checked: false,
              timeLeft: 3600,
              startTime: null,
              completionTime: null
          }))
      };
     
      db.saveWorkout(newWorkout);

      const clients = await self.clients.matchAll();
      clients.forEach(client => {
          client.postMessage({ type: 'NEW_DAY' });
      });
  }
  
  // Check existing timers
  if (workout) {
      workout.sets.forEach((set, index) => {
          if (set.startTime && !set.checked) {
              const timeLeft = getTimeLeft(set.startTime);
              if (timeLeft === 0) {
                  //sendNotification(index);
              }
          }
      });
  }
}, 60000); 

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Timer Complete!',
    icon: '/GSquat-192x192.png',
    badge: '/GSquat-192x192.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('Checkbox Timer', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});