/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Claim control immediately
self.skipWaiting();
clientsClaim();

// Handle activation to check for notifications immediately on service worker start/update
self.addEventListener('activate', (event) => {
  event.waitUntil(checkForDueSets());
});

// Clean old caches
cleanupOutdatedCaches();

// Precache and route all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Import the singleton instance and shared functions from db.ts
import { db, SetState } from './lib/db';

// Register for background sync if available (helps with mobile notifications)
if ('sync' in self.registration) {
  self.registration.periodicSync.register('check-sets', {
    minInterval: 15 * 60 * 1000 // 15 minutes in milliseconds
  }).catch(err => {
    console.log('Periodic sync registration failed:', err);
  });
}

// Function to calculate time left for a set
function getTimeLeft(startTime: number | null): number {
  if (!startTime) return 2700; // 45 minutes
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(2700 - elapsed, 0);
}

// Function to check for due sets (can be called manually or by periodic sync)
async function checkForDueSets() {
  // Make sure DB is initialized
  await db.init();
  const workout = await db.getTodayWorkout();
  // Use local date format instead of UTC
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Create new workout if none exists or it's from a previous day
  if (!workout || workout.date !== today) {
    const newWorkout = {
      date: today,
      sets: Array(8).fill(null).map((_, i) => ({
        id: i,
        state: (i === 0 ? 'next' : 'future') as SetState,
        timeLeft: 2700, // 45 minutes
        startTime: null,
        completionTime: null,
        dueTime: i === 0 ? db.getFirstSetDueTime() : null
      }))
    };
    
    await db.saveWorkout(newWorkout);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'NEW_DAY' });
    });
    return;
  }
  
  // Check existing timers
  if (workout) {
    let updatedWorkout = false;
    const now = Date.now();
    
    workout.sets.forEach((set, index) => {
      // Check if any 'next' sets have reached their due time
      if (set.state === 'next' && set.dueTime && now >= set.dueTime) {
        // Transition to 'due' state
        set.state = 'due';
        updatedWorkout = true;
        
        // Send notification
        sendNotification(index);
      }
      
      // Check if any 'active' sets have been active for too long (auto-complete after 10 mins)
      if (set.state === 'active' && set.startTime && (now - set.startTime) > 10 * 60 * 1000) {
        set.state = 'completed';
        set.completionTime = new Date().toLocaleTimeString();
        updatedWorkout = true;
        
        // Enable next set if exists
        if (index < workout.sets.length - 1) {
          const nextSet = workout.sets[index + 1];
          if (nextSet.state === 'future') {
            nextSet.state = 'next';
            nextSet.dueTime = db.calculateNextDueTime(now);
            updatedWorkout = true;
          }
        }
      }
    });
    
    // Save workout if any changes were made
    if (updatedWorkout) {
      await db.saveWorkout(workout);
      
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'WORKOUT_UPDATED' });
      });
    }
  }
}

// Function to send a notification to the user
async function sendNotification(setIndex: number) {
  try {
    // Check if we have permission
    if (self.registration.showNotification) {
      const title = 'Time for squats!';
      const options = {
        body: `Set ${setIndex + 1} is due - time to do your squats!`,
        icon: '/GSquat-192.png',
        badge: '/GSquat-192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'squat-reminder',
        data: {
          setIndex: setIndex,
          url: '/?setIndex=' + setIndex, // This will be used to open the app to the right set
        },
        actions: [
          {
            action: 'open',
            title: 'Start set now'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };
      
      await self.registration.showNotification(title, options);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Set up interval to check for due sets every minute
setInterval(checkForDueSets, 60000); 

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Timer Complete!',
    icon: '/GSquat-192.png',
    badge: '/GSquat-192.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('Time for squats!', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const setIndex = notification.data?.setIndex;
  
  // Close the notification
  notification.close();
  
  // Handle different actions
  if (action === 'dismiss') {
    // Just close the notification, no further action
    return;
  }
  
  // Handle open action or default click (no specific action)
  event.waitUntil(
    (async () => {
      // Look for existing open windows
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
      });
      
      // If we have an open window, focus it and navigate to the set
      if (allClients.length > 0) {
        const client = allClients[0];
        await client.focus();
        // Send a message to the client to activate the set
        if (setIndex !== undefined) {
          return client.postMessage({ 
            type: 'ACTIVATE_SET', 
            setIndex: setIndex 
          });
        }
        return;
      }
      
      // If no window is open, open one with the set index in the URL
      let url = '/';
      if (setIndex !== undefined) {
        url += `?setIndex=${setIndex}`;
      }
      return self.clients.openWindow(url);
    })()
  );
});

// Handle periodic sync events for mobile wakeups
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-sets') {
    event.waitUntil(checkForDueSets());
  }
});

// Handle background sync events (when device comes back online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-sets') {
    event.waitUntil(checkForDueSets());
  }
});