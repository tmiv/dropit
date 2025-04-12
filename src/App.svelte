<script lang="ts">
  import { onMount } from 'svelte';
  import SetCard from './components/SetCard.svelte';
  import { db, currentWorkout, type WorkoutSet } from './lib/db';

  let sets: WorkoutSet[] = [];
  let deferredPrompt: any;

  // Subscribe to workout changes
  $: if ($currentWorkout) {
      sets = $currentWorkout.sets;
     }

  onMount(async () => {
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
          deferredPrompt = null;
        });

        // Initialize database and load today's workout
        await db.init();
        const workout = await db.getTodayWorkout();
        currentWorkout.set(workout);
        
        // Request notification permission
        if ('Notification' in window) {
            await Notification.requestPermission();
        }

        // Set up broadcast channel for cross-tab communication
        const channel = new BroadcastChannel('workout-updates');
        channel.onmessage = async () => {
            const workout = await db.getTodayWorkout();
            currentWorkout.set(workout);
        };

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', async (event) => {
            if (event.data.type === 'NEW_DAY') {
                const workout = await db.getTodayWorkout();
                currentWorkout.set(workout);
                channel.postMessage('update'); // Notify other tabs
            }
        });
    });

  async function installApp() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }

  async function handleCheck(index: number) {
      if (!$currentWorkout) return;

      const workout = { ...$currentWorkout };
      workout.sets[index].checked = true;
      workout.sets[index].completionTime = new Date().toLocaleTimeString();
      
      // Enable next set if exists
      if (index < workout.sets.length - 1) {
          workout.sets[index + 1].enabled = true;
          workout.sets[index + 1].startTime = Date.now();
      }

      await db.saveWorkout(workout);
      
      // Notify other tabs
      const channel = new BroadcastChannel('workout-updates');
      channel.postMessage('update');
  }

  // Format seconds to MM:SS
  function formatTime(seconds: number) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Calculate time left based on startTime
  function getTimeLeft(set: WorkoutSet): number {
      if (!set.startTime) return 3600;
      const elapsed = Math.floor((Date.now() - set.startTime) / 1000);
      return Math.max(3600 - elapsed, 0);
  }
</script>
  
<main class="container">
  {#if deferredPrompt}
    <button class="install-button" on:click={installApp}>
      Install App
    </button>
  {/if}
  <h1 class="title">Drop it like it's squat!</h1>
  <div class="content-wrapper">
      <div class="checkbox-container">
          {#each sets as set, i}
              <SetCard 
                  setNumber={i + 1}
                  state={set.checked ? 'completed' : (set.enabled && set.startTime ? 'next' : (set.enabled ? 'upcoming' : 'disabled'))}
                  timeLeft={getTimeLeft(set)}
                  completionTime={set.completionTime}
                  estimatedTime={set.enabled && !set.checked && !set.startTime ? 'in 1 hour' : null}
                  isEnabled={set.enabled}
                  onDone={() => handleCheck(i)}
              />
          {/each}
      </div>
      <div class="video-container">
        <video autoplay loop muted playsinline>
          <source src="./GSquatSmallSquareLoopFlip.mp4" type="video/mp4">
        </video>
      </div>
  </div>
</main>
  
  <style>
    :global(body) {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    .container {
      padding: 2rem;
      background-color: #8ea897;
      min-height: 100vh;
    }

    .title {
      text-align: center;
      margin-bottom: 2rem;
      color: white;
      font-size: 2.5rem;
    }
  
    .content-wrapper {
      display: flex;
      justify-content: space-between;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  
    .checkbox-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background-color: #58685e;
      padding: 1rem; 
      border-radius: 8px;
      overflow-y: auto; 
      max-height: 50vh;
    }
  
    .video-container {
      flex: 1;
      display: flex;
      align-items: center;
    }
  
    video {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }

    .install-button {
      position: fixed;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem 1rem;
      background-color: #58685e;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      z-index: 1000;
    }

    .install-button:hover {
      background-color: #455349;
    }
  </style>