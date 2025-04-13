<!-- SetCard.svelte -->
<script lang="ts">
	import { type SetState } from "../lib/db";

    export let setNumber: number;
    export let state: SetState;
    export let timeLeft: number = 0; // For 'next' state countdown
    export let completionTime: string | null = null; // For 'completed' state
    export let dueTime: number | null = null; // When this set is scheduled to be due
    export let onDone: ()=>void;
    export let onStart: ()=>void;

    let isCollapsed = false;
    let countdownInterval: number;
    let formattedTimeLeft = formatTime(timeLeft);
    let dueTimeFormatted: string | null = null;

    // Compute formatted due time
    $: if (dueTime) {
        const dueDate = new Date(dueTime);
        dueTimeFormatted = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        dueTimeFormatted = null;
    }

    // Set up countdown timer for 'next' state
    $: if (state === 'next' && dueTime) {
        startCountdown();
    } else {
        stopCountdown();
    }

    // Auto-collapse completed sets
    $: if (state === 'completed') {
        isCollapsed = true;
    }

    function startCountdown() {
        // Clear any existing interval
        stopCountdown();
        
        // Start a new countdown
        countdownInterval = setInterval(() => {
            if (dueTime) {
                const now = Date.now();
                const remaining = Math.max(0, dueTime - now);
                
                if (remaining <= 0) {
                    // Time's up!
                    formattedTimeLeft = '0:00';
                    stopCountdown();
                } else {
                    // Update countdown
                    formattedTimeLeft = formatTime(Math.floor(remaining / 1000));
                }
            }
        }, 1000);
    }

    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    }

    function handleDoneClick() {
        onDone();
    }

    function handleStartClick() {
        onStart();
    }

    function formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function toggleCollapse() {
        if (state === 'completed') {
            isCollapsed = !isCollapsed;
        }
    }
</script>

<div class="set-card" class:state-completed={state === 'completed'} class:state-next={state === 'next'} class:state-due={state === 'due'} class:state-active={state === 'active'} class:state-future={state === 'future'}>
    {state}
    {#if state === 'completed'}
        <div class="completed-content">
            {#if isCollapsed}
                <div class="collapsed-view">
                    <span>Set {setNumber} completed!</span>
                    <div class="icon-container">
                        <span class="icon completed-icon">✓</span>
                        <span class="expand-icon"><button on:click={toggleCollapse}>▼</button></span>
                    </div>
                </div>
            {:else}
                <div class="expanded-view">
                    <span class="icon completed-icon">✓</span>
                    <h3 class="set-title">Set {setNumber} - Completed</h3>
                    {#if completionTime}
                        <p class="completion-time">Completed at {completionTime}</p>
                    {/if}
                    <p class="message">Great job! 💪</p>
                    <span class="collapse-icon"><button on:click={toggleCollapse}>▲</button></span>
                </div>
            {/if}
        </div>
    {:else if state === 'next'}
        <div class="next-content">
            <span class="icon next-icon">⏳</span>
            <h3 class="set-title">Next: Set {setNumber}</h3>
            {#if dueTimeFormatted}
                <p class="due-time">Due at {dueTimeFormatted}</p>
            {/if}
            <div class="countdown">
                {formattedTimeLeft}
            </div>
            <button class="start-button" on:click={handleStartClick}>START NOW</button>
        </div>
    {:else if state === 'due'}
        <div class="due-content">
            <span class="icon due-icon">⏰</span>
            <h3 class="set-title">DUE NOW: Set {setNumber}</h3>
            <p class="message-urgent">It's time for your squats!</p>
            <button class="start-button start-urgent" on:click={handleStartClick}>START NOW</button>
        </div>
    {:else if state === 'active'}
        <div class="active-content">
            <span class="icon active-icon">🏋️</span>
            <h3 class="set-title">ACTIVE: Set {setNumber}</h3>
            <p class="message">10 squats - You can do it!</p>
            <button class="done-button" on:click={handleDoneClick}>DONE!</button>
        </div>
    {:else} <!-- state === 'future' -->
        <div class="future-content">
            <span class="icon future-icon">⌛</span>
            <h3 class="set-title">Set {setNumber}</h3>
            <p class="message">Coming up later</p>
        </div>
    {/if}
</div>

<style>
    .set-card {
        border-radius: 8px;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow */
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        opacity: 1;
        padding: 1.5rem;
        transition: all 0.3s ease-in-out;
    }

    /* State-based styling */
    .set-card.state-completed {
        background-color: #765f71;
    }

    .set-card.state-next {
        background-color: #b3a79b;
        border: 2px solid #ffb74d;
    }

    .set-card.state-due {
        background-color: #ff6d3b;
        border: 2px solid #ff3d00;
        animation: pulse-urgent 1s infinite;
    }

    .set-card.state-active {
        background-color: #66bb6a;
        border: 2px solid #43a047;
    }

    .set-card.state-future {
        background-color: #4f3a34;
        opacity: 0.7;
    }

    /* Content containers */
    .completed-content, .next-content, .due-content, .active-content, .future-content {
        width: 100%;
    }

    .collapsed-view {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
    }

    /* Icons */
    .icon {
        font-size: 1.5rem; /* Adjust icon size */
        margin-right: 0.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem; /* Fixed width for icons */
        height: 2rem; /* Fixed height for icons */
        border-radius: 50%; /* Make icons circular */
        background-color: #e0e0e0; /* Default icon background */
        color: #555; /* Default icon color */
    }

    .completed-icon {
        background-color: #c6f7d9; /* Light green for completed */
        color: #27ae60; /* Green checkmark color */
    }

    .next-icon {
        background-color: #ffe0b2; /* Light orange for next */
        color: #ff9800; /* Orange timer color */
        animation: pulse 1.5s infinite cubic-bezier(0.66, 0, 0.24, 1); /* Pulsing animation */
    }

    .due-icon {
        background-color: #ffcdd2; /* Light red for due */
        color: #f44336; /* Red alarm color */
        animation: shake 0.5s infinite cubic-bezier(0.36, 0.07, 0.19, 0.97); /* Shaking animation */
    }

    .active-icon {
        background-color: #c8e6c9; /* Light green for active */
        color: #388e3c; /* Green workout color */
    }

    .future-icon {
        background-color: #e0e0e0; /* Light grey for future */
        color: #757575; /* Grey hourglass color */
    }

    /* Text elements */
    .set-title {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 0.2rem;
        color: #fff;
    }

    .due-time, .completion-time {
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 0.5rem;
    }

    .message {
        font-style: italic;
        color: rgba(255, 255, 255, 0.9);
        margin: 0.5rem 0;
    }

    .message-urgent {
        font-weight: bold;
        color: white;
        font-size: 1.1rem;
        margin: 0.5rem 0;
    }

    .countdown {
        font-size: 2rem;
        font-weight: bold;
        color: white;
        margin: 0.8rem 0;
        text-align: center;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
    }

    /* Buttons */
    .done-button, .start-button {
        background-color: #4caf50; /* Green button */
        color: white;
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 6px;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
        margin-top: 0.5rem;
        width: 100%;
    }

    .done-button:hover {
        background-color: #43a047; /* Darker green on hover */
    }

    .start-button {
        background-color: #2196f3; /* Blue button */
    }

    .start-button:hover {
        background-color: #1976d2; /* Darker blue on hover */
    }

    .start-urgent {
        background-color: #f44336; /* Red button for urgent */
        animation: pulse-button 1s infinite;
    }

    .start-urgent:hover {
        background-color: #d32f2f; /* Darker red on hover */
    }

    /* Animations */
    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
    }

    @keyframes pulse-urgent {
        0% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 61, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0); }
    }

    @keyframes pulse-button {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
    }
</style>