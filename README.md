# Drop It Like It's Squat!

A simple but effective Progressive Web App (PWA) to remind you to take squat breaks throughout your day and combat the negative effects of prolonged sitting.

## About

**Drop It Like It's Squat!** helps you incorporate regular squatting exercises throughout your day by scheduling 8 sets of 10 squats, spaced 45 minutes apart. This app was inspired by research showing that breaking up sedentary time with simple resistance exercises like squats can have significant health benefits.

Based on research published in the paper ["Enhanced muscle activity during interrupted sitting improves glycemic control in overweight and obese men"](https://onlinelibrary.wiley.com/doi/10.1111/sms.14628) in the Scandinavian Journal of Medicine & Science in Sports, breaking up prolonged sitting with brief squatting exercises every 45 minutes can:

- Significantly improve glycemic control (reduce blood sugar spikes after meals)
- Be more effective than a single longer exercise session
- Increase muscle activity in quadriceps and gluteal muscles, which directly correlates with improved metabolic response
- Provide similar benefits to short walking breaks
- Be particularly beneficial for overweight and obese individuals
- Effectively counteract the negative metabolic effects of prolonged sitting

## Features

- **Simple Set Tracking**: Track 8 sets of 10 squats throughout your day
- **Intelligent Notifications**: Get notified when it's time for your next set
- **Visual Status Indicators**: Clearly see which sets are completed, active, next, or upcoming
- **Countdown Timer**: Shows the time until your next set is due
- **Cross-Device Sync**: Your progress syncs across all your devices
- **Works Offline**: Fully functional without an internet connection
- **Installable**: Can be installed as a standalone app on your device

## States of a Set

- **Next**: The upcoming set with a countdown timer
- **Due**: A set that has reached its scheduled time and requires your attention
- **Active**: The set you're currently performing
- **Completed**: A set you've successfully finished
- **Future**: Sets scheduled for later in the day

## How It Works

1. The first set becomes available at the start of each day (configurable, default: 9 AM)
2. You can start the first set at any time, or wait for the scheduled time
3. When a set becomes due, you'll receive a notification
4. Click "Start Now" to begin your set
5. After completing your 10 squats, click "Done"
6. The next set will become available and scheduled for 45 minutes later
7. Complete all 8 sets to finish your daily squats

## Installation

1. Visit the app in your browser
2. For the best experience, install it as a PWA when prompted
3. Allow notifications when requested

## Why Squats Every 45 Minutes?

This app's design is directly based on the scientific research findings that showed:

1. Short, frequent activity breaks (every 45 minutes) produced better glycemic control than a single longer exercise session
2. The study demonstrated that 3-minute squatting breaks repeated 10 times throughout the day significantly reduced post-meal blood glucose levels
3. The research specifically showed that the increased muscle activation in the quadriceps and gluteal muscles during squats was directly associated with improved metabolic responses

Squats are ideal for these frequent breaks because they:
- Activate the key muscle groups (quadriceps and glutes) identified in the research
- Can be done anywhere without special equipment
- Don't require changing clothes or causing excessive sweating
- Are easily scalable for different fitness levels
- Can be completed in just a few minutes

The 45-minute interval timing in this app precisely follows the research protocol that demonstrated significant health benefits, particularly for individuals who spend most of their day sitting.

## Development

This app is built with:
- Svelte for the UI framework
- TypeScript for type safety
- IndexedDB for local storage
- Service Workers for offline functionality and notifications

## License

[MIT License](LICENSE)

---

*Remember: Always consult with a healthcare professional before starting any new exercise routine, especially if you have existing health conditions.*
