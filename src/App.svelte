<script lang="ts">
  import { onMount } from 'svelte';
  import SetCard from './components/SetCard.svelte';
  import { db, currentWorkout, type WorkoutSet } from './lib';

  let sets: WorkoutSet[] = [];
  // Define interface for BeforeInstallPromptEvent which isn't in standard lib
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    prompt(): Promise<void>;
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
  }

  let installPrompt: BeforeInstallPromptEvent | null = null;

  // Subscribe to workout changes
  $: if ($currentWorkout) {
      sets = $currentWorkout.sets;
     }

  onMount(async () => {
        window.addEventListener('beforeinstallprompt', (e: Event) => {
          e.preventDefault();
          installPrompt = e as BeforeInstallPromptEvent;
        });

        window.addEventListener('appinstalled', () => {
          installPrompt = null;
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
            } else if (event.data.type === 'WORKOUT_UPDATED') {
                const workout = await db.getTodayWorkout();
                currentWorkout.set(workout);
            } else if (event.data.type === 'ACTIVATE_SET') {
                const setIndex = event.data.setIndex;
                if (typeof setIndex === 'number' && setIndex >= 0 && $currentWorkout && setIndex < $currentWorkout.sets.length) {
                    handleStartSet(setIndex);
                }
            }
        });
        
        // Check URL params when loading the app
        const params = new URLSearchParams(window.location.search);
        const setIndex = params.get('setIndex');
        
        // If we have a setIndex param, activate that set
        if (setIndex && workout) {
            const index = parseInt(setIndex);
            if (!isNaN(index) && index >= 0 && index < workout.sets.length) {
                // Only activate the set if it's in 'next' or 'due' state
                if (workout.sets[index].state === 'next' || workout.sets[index].state === 'due') {
                    handleStartSet(index);
                }
            }
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    });

  async function installApp() {
    if (!installPrompt) return;
    
    // Show the installation prompt
    installPrompt.prompt();
    
    // Wait for the user's choice
    const { outcome } = await installPrompt.userChoice;
    console.log(`Installation ${outcome}`);
    
    // Clear the saved prompt, we can't use it twice
    installPrompt = null;
  }

  async function handleStartSet(index: number) {
      if (!$currentWorkout) return;

      const workout = { ...$currentWorkout };
      const set = workout.sets[index];
      
      // Only allow starting a set if it's next or due
      if (set.state !== 'next' && set.state !== 'due') return;
      
      // Transition to active state
      set.state = 'active';
      set.startTime = Date.now();
      
      await db.saveWorkout(workout);
      
      // Notify other tabs
      const channel = new BroadcastChannel('workout-updates');
      channel.postMessage('update');
  }

  async function handleCheck(index: number) {
      if (!$currentWorkout) return;

      const workout = { ...$currentWorkout };
      const now = Date.now();
      
      // Mark current set as completed
      workout.sets[index].state = 'completed';
      workout.sets[index].completionTime = new Date().toLocaleTimeString();
      
      // Enable next set if exists
      if (index < workout.sets.length - 1) {
          const nextSet = workout.sets[index + 1];
          if (nextSet.state === 'future') {
              nextSet.state = 'next';
              // Next set is due 45 minutes after this set was completed
              nextSet.dueTime = db.calculateNextDueTime(now);
          }
      }

      await db.saveWorkout(workout);
      
      // Notify other tabs
      const channel = new BroadcastChannel('workout-updates');
      channel.postMessage('update');
  }

  // Calculate time left based on dueTime
  function getTimeLeft(set: WorkoutSet): number {
      if (!set.dueTime) return 2700; // 45 minutes
      const now = Date.now();
      const remaining = Math.max(0, set.dueTime - now);
      return Math.floor(remaining / 1000);
  }

  // The URL param checking is now handled in the main onMount function
</script>
  
<main class="container">
  {#if installPrompt}
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
                  state={set.state}
                  timeLeft={getTimeLeft(set)}
                  completionTime={set.completionTime}
                  dueTime={set.dueTime}
                  onDone={() => handleCheck(i)}
                  onStart={() => handleStartSet(i)}
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
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    
    .checkbox-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .checkbox-container::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .checkbox-container::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
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