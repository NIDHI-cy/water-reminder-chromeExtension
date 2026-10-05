# Max's Water Reminder 💧🚲

> A cute, retro 80s Stranger Things-inspired hydration companion Chrome extension that lives in your browser and keeps you hydrated throughout your work sessions.

![Max's Water Reminder Preview](assets/characters/max-avatar.png)

---

## 📖 Overview & Problem Statement

When working or browsing on a laptop for hours, it is easy to enter "hyperfocus" and forget to drink water. Most generic hydration reminders either rely on boring system notifications that get ignored, or use naive timers that break when your laptop sleeps or when the background process is suspended.

**Max's Water Reminder** brings a friendly, sassy character to your browser—inspired by **Max Mayfield from Stranger Things**. Max occasionally pops into the top-right corner of whatever webpage you're browsing, reminds you to hydrate, plays an authentic 80s synth chime, and celebrates when you log a drink with **"I DRANK 💧"**.

---

## ✨ Features

- **Top-Right Floating Reminder Card**:
  - Pops gracefully into the top-right corner of your active webpage.
  - Fully encapsulated using **Shadow DOM** so it never clashes with or breaks website CSS.
  - Features Max's retro avatar, friendly randomized quotes, and smooth animations.
  - Includes a quick **"I DRANK 💧"** button, a **Snooze (5m)** button, and a close button.

- **"I DRANK 💧" Celebration Interaction**:
  - Instant positive feedback: the button transforms into **"Nice! 💧✨"** accompanied by an 80s arcade victory chime.
  - Increments session drinks, lifetime drinks, and today's total drinks.
  - Reschedules the next reminder for a fresh interval.

- **Polished 80s Synthwave Dashboard (Popup)**:
  - Live ticking countdown (`MM:SS`) to your next reminder.
  - Real-time session duration meter and drinks counter.
  - One-click **Production (30 min)** vs **🧪 Dev Test (1 min)** toggle.
  - **"⚡ Test Reminder Card"** button to summon Max immediately on screen.
  - **"🔄 Reset Session"** and **Enable/Disable** toggles.

- **Built-in 80s Synth Audio Generator**:
  - Uses the native **Web Audio API** to synthesize warm analog synth bells and victory chimes on the fly—zero external sound files, 100% offline, zero CORS issues.

- **Robust Session Lifecycle Architecture**:
  - Distinguishes active sessions from prolonged laptop sleep or computer shut-down.
  - Will **NOT** spam backlogged reminders after waking up from sleep.

- **Zero-Dependency Core**:
  - Native Manifest V3 compliant, pure modern JavaScript (ES Modules). No build/bundle step required to load unpacked.

---

## 🧠 Session Behavior & Timer Architecture

In Manifest V3, background service workers are event-driven and suspended after ~30 seconds of inactivity. Continuous JavaScript timers (`setInterval`) will freeze.

### How Max's Water Reminder solves this:

1. **Persistent State & Timestamps**:
   - Every state change is serialized to `chrome.storage.local`:
     - `sessionId`: Unique identifier for the current active work session.
     - `sessionStartTime`: Timestamp when the user began using their browser.
     - `lastActiveTimestamp`: Heartbeat timestamp tracking active usage.
     - `nextReminderTimestamp`: Exact epoch millisecond when the next reminder is due.
     - `sessionGlassesDrank`: Count of glasses drank during this session.

2. **Alarm Scheduling via `chrome.alarms`**:
   - The browser wakes the service worker when the alarm fires, regardless of worker suspension.

3. **Sleep / Wake / Long Inactivity Detection**:
   - When your laptop goes to sleep or stays closed for hours, `chrome.idle` records the transition.
   - When the alarm triggers or the browser awakens, `SessionManager` compares `Date.now() - lastActiveTimestamp` against `sessionGapThresholdMinutes` (default **20 minutes**).
   - If the gap exceeds 20 minutes:
     - **It does NOT trigger a backlog of missed reminders.**
     - It treats the return as a **new session**, resets the session timer to start from 0, and schedules the next reminder for 30 minutes in the future.
   - If the gap is short (< 20 minutes, like getting a cup of coffee), the existing session countdown continues smoothly.

4. **Restricted Pages Fallback**:
   - Certain browser pages (e.g. `chrome://extensions`, `chrome://newtab`, Chrome Web Store) forbid content script injection.
   - When you are on a restricted page, Max automatically falls back to a **Chrome System Notification** with actionable buttons ("I DRANK 💧" and "Snooze 5m"). You will never miss a reminder.

5. **Duplicate Prevention**:
   - If a reminder card is already displayed on screen, subsequent triggers will wiggle the existing card and refresh the text instead of stacking multiple cards.

---

## 📁 Project Structure

```text
max-water-reminder/
├── manifest.json              # Manifest V3 extension configuration
├── background/
│   ├── service-worker.js      # Background event dispatcher (MV3)
│   └── session-manager.js     # Lifecycle, sleep gap detection & alarms
├── content/
│   ├── content-script.js      # Content script with Shadow DOM reminder card
│   ├── reminder-card.js       # Modular card component
│   └── reminder.css           # Scoped styling for floating card
├── popup/
│   ├── popup.html             # 80s synthwave dashboard popup
│   ├── popup.js               # Live ticker, mode toggles, controls
│   └── popup.css              # Neon dark theme styles
├── shared/
│   ├── constants.js           # Messages, intervals, default settings, quotes
│   ├── utils.js               # Formatting, countdowns, session IDs
│   └── synth-audio.js         # Web Audio API 80s synth sound generator
├── assets/
│   ├── characters/
│   │   ├── max-avatar.svg     # Scalable vector retro Max character
│   │   ├── max-avatar.png     # 128x128 rasterized Max character
│   │   └── README.md          # Guide for replacing avatar with custom artwork
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       ├── icon-128.png
│       └── icon.svg           # Master vector extension icon
├── scripts/
│   ├── generate-icons.js      # Pure Node.js script to render PNG icons
│   └── validate-extension.js  # Validation script verifying all assets & manifest
├── tests/
│   ├── mock-chrome.js         # Mock Chrome Extension API harness
│   ├── session-manager.test.js# 10 unit tests for session lifecycle & sleep
│   └── manifest.test.js       # Manifest V3 compliance and asset verification
├── test-page/
│   └── index.html             # Local browser demo page to preview animations
├── package.json
└── README.md
```

---

## 🚀 How to Load into Google Chrome

1. **Open Google Chrome**.
2. In the URL bar, navigate to:
   ```text
   chrome://extensions
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click **"Load unpacked"**.
5. Select the `max-water-reminder` folder:
   ```text
   C:\Users\honey\max-water-reminder
   ```
6. The extension **"Max's Water Reminder"** will appear in your extensions list.
7. Click the extension puzzle piece icon in Chrome's toolbar and **pin** Max's Water Reminder for easy access!

---

## 🧪 Testing & Development Mode

### 1. Fast Development Testing (1-Minute Interval)
To test reminders without waiting 30 minutes:
1. Click the **Max's Water Reminder** extension icon in your toolbar to open the popup dashboard.
2. Under **REMINDER INTERVAL**, click **"🧪 Dev Test (1 min)"**.
3. Max will now pop up every **60 seconds**!
4. Click **"Production (30 min)"** whenever you want to return to standard 30-minute intervals.

> **Production Guarantee**: By default, `manifest.json` and `constants.js` ship in **Production Mode** with a **30-minute** interval. Dev mode is an explicit toggle.

### 2. Instant Reminder Test
- In the popup dashboard, click **"⚡ Test Reminder Card"**.
- Max will immediately slide into the top-right corner of your current tab!
- Click **"I DRANK 💧"** to test the celebratory animation and victory chime.

### 3. Automated Test Suite
Run the built-in test suite using Node.js:

```bash
npm test
```

This runs 12 comprehensive unit tests covering:
- Manifest V3 schema and asset path integrity
- Fresh session initialization and session IDs
- Timer persistence in `chrome.storage.local`
- Switching between 1-minute Dev Mode and 30-minute Production Mode
- Sleep detection: verifying that waking from a 4-hour sleep resets the session instead of triggering a backlog of reminders
- Normal alarm triggers, quotes, and tab messaging
- "I DRANK 💧" drink count incrementation and timer reset
- Snooze timer (5 minutes)
- Session reset
- Enable/disable toggling
- Graceful fallback on restricted (`chrome://`) tabs

### 4. Extension Asset Validation
Verify manifest validity and asset presence at any time:

```bash
npm run validate
```

---

## 🎨 Customizing the Max Avatar

The extension has a dedicated location for character assets:
- `assets/characters/max-avatar.svg`
- `assets/characters/max-avatar.png`

To use your own artwork, photo, or custom character:
1. Drop your PNG (recommended size: `128x128` or `256x256`) into `assets/characters/max-avatar.png`.
2. Or drop your custom vector graphic into `assets/characters/max-avatar.svg`.
3. Open `chrome://extensions` and click the reload icon on the extension card.

---

## ⚠️ Known Limitations & Edge Cases

- **Restricted Chrome URLs**: Extensions cannot inject DOM content into `chrome://`, `chrome-extension://`, or the Chrome Web Store. When on these pages, Max automatically triggers a Chrome system notification fallback.
- **Full Screen Video**: If a video is playing in native OS fullscreen (e.g. YouTube fullscreen mode), DOM overlays may be hidden behind the video player layer.

---

## 🔮 Future Improvements

- Custom interval slider (e.g. 15m, 45m, 60m).
- Weekly hydration graphs and streak milestones.
- Customizable character themes (Lucas, Dustin, Eleven, or custom retro palettes).
- Sound volume slider and customizable synth melodies.

---

## 📄 License

MIT License. Built with ❤️ for staying hydrated and healthy while coding.
