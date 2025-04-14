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
            const permission = await Notification.requestPermission();
            
            // If permission is granted, register for background sync
            if (permission === 'granted' && 'serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                
                // Try to register for sync if available (helps with mobile devices)
                if ('sync' in registration) {
                    try {
                        await registration.sync.register('check-sets');
                    } catch (e) {
                        console.error('Failed to register sync:', e);
                    }
                }
            }
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
        
        // Auto-scroll to the 'next' set when the app opens
        // Add a small delay to ensure DOM is fully rendered
        setTimeout(() => {
            if (workout && workout.sets) {
                // Check if all sets are complete
                const allComplete = workout.sets.every(set => set.state === 'completed');
                
                if (!allComplete) {
                    // Find the index of the first 'next' set
                    const nextSetIndex = workout.sets.findIndex(set => set.state === 'next');
                    if (nextSetIndex !== -1) {
                        // Get all set cards
                        const setCards = document.querySelectorAll('.set-card');
                        if (setCards && setCards[nextSetIndex]) {
                            // Scroll the container to show the 'next' set
                            const container = document.querySelector('.checkbox-container');
                            if (container) {
                                setCards[nextSetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }
                    }
                }
            }
        }, 100);
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
      height: 100%;
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
      flex-direction: row;
      height: 100%;
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
  
    @media (orientation: portrait) {
      .content-wrapper {
        flex-direction: column;
        height: calc(100vh - 8rem);
        gap: 0;
      }
      
      .checkbox-container {
        flex-grow: 1;
        padding-bottom: 0;
      }
      
      .video-container {
        max-width: 35vh;
        margin-left: auto;
        margin-right: auto;
        justify-content: center;
        align-items: center;
      }
      
      video {
        max-height: 100%;
        width: auto;
        max-width: 100%;
        object-fit: contain;
      }
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
      justify-content: center;
    }
  
    video {
      width: 100%;
      height: auto;
      border-radius: 8px;
      max-height: 50vh;
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