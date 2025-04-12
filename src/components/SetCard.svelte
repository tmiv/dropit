<!-- SetCard.svelte -->
<script lang="ts">
    export let setNumber: number;
    export let state: 'completed' | 'next' | 'upcoming' | 'disabled'; // Define possible states
    export let timeLeft: number = 0; // For 'next' state countdown
    export let completionTime: string | null = null; // For 'completed' state
    export let estimatedTime: string | null = null; // For 'upcoming' state
    export let isEnabled: boolean = true; // For 'disabled' state
    export let onDone: ()=>void;

    let isCollapsed = false;

    $: if (state === 'completed') {
        isCollapsed = true;
    }

    function handleDoneClick() {
        onDone();
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

<div class="set-card" class:state-completed={state === 'completed'} class:state-next={state === 'next'} class:state-upcoming={state === 'upcoming'} class:state-disabled={state === 'disabled' || !isEnabled} >
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
            <h3 class="set-title">Next Set: Set {setNumber}</h3>
            <div class="countdown">
                {formatTime(timeLeft)}
            </div>
            <button class="done-button" on:click={handleDoneClick}>DONE!</button>
            <div class="gorilla-icon-small">🦍</div> <!-- Placeholder, replace with actual image/icon -->
        </div>
    {:else if state === 'upcoming'}
        <div class="upcoming-content">
            <span class="icon upcoming-icon">⏱️</span>
            <h3 class="set-title">Set {setNumber}</h3>
            {#if estimatedTime}
                <p class="estimated-time">Due {estimatedTime}</p>
            {/if}
        </div>
    {:else} <!-- state === 'disabled' or !isEnabled -->
        <div class="disabled-content">
            <h3 class="set-title">Set {setNumber}</h3>
        </div>
    {/if}
</div>

<style>
    .set-card {
        background-color: #b3a79b;
        border-radius: 8px;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Subtle shadow */
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        opacity: 1;
        padding: 1.5rem;
        transition: opacity 0.2s ease-in-out;
    }

    .set-card.state-disabled, .set-card.state-disabled .set-title, .set-card.state-disabled .icon, .set-card.state-disabled p {
        cursor: not-allowed;
        color: #777; 
    }

    .set-card.state-disabled {
        background-color: #4f3a34;
    }

    .completed-content {
        cursor: pointer;
        background-color: #765f71;
    }

    .collapsed-view {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
    }

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

    .upcoming-icon {
        background-color: #e8eaf6; /* Light blue/grey for upcoming */
        color: #3f51b5; /* Blue clock color */
    }


    .set-title {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 0.2rem;
        color: #333;
    }

    .completion-time, .estimated-time {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 0.5rem;
    }

    .message {
        font-style: italic;
        color: #555;
    }

    .countdown {
        font-size: 2rem;
        font-weight: bold;
        color: #e64a19; /* Orange-red countdown color */
        margin-bottom: 0.8rem;
        text-align: center;
    }

    .done-button {
        background-color: #4caf50; /* Green button */
        color: white;
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 6px;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
    }

    .done-button:hover {
        background-color: #43a047; /* Darker green on hover */
    }

    .gorilla-icon-small {
        text-align: right;
        font-size: 1.5rem; /* Example size for gorilla icon/text */
        color: #777; /* Grey color */
        /* Add actual icon/image here instead of text '🦍' */
    }

    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
    }

</style>