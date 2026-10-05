# Duck's Water Reminder 🦆💧

> A cute, simple duck companion that reminds you to drink water every 30 minutes while you work.

![Duck Preview](assets/characters/duck.png)

---

## 📖 Overview

Designed to be minimal, cozy, and cute. No overwhelming stats, no complicated menus—just a friendly duck living in your browser, waiting patiently and checking in on you every **30 minutes** so you stay hydrated.

---

## ✨ Features

- **Cozy & Minimal Dashboard (Popup)**:
  - Modeled after a clean warm cream graph-paper aesthetic.
  - Large, clear countdown timer (`29:45`) showing exactly when the next reminder will arrive.
  - Cute duck mascot with a gentle breathing animation.
  - Quick **"I Drank 💧"** button.
  - Clean settings gear `⚙` to pause or reset the timer whenever needed.
- **Top-Right Floating Reminder Card**:
  - Automatically pops up in the top-right corner of your current webpage after every 30 minutes.
  - Fully encapsulated with **Shadow DOM** so it never interferes with any website's CSS.
  - Gentle water chime sound when Duck appears.
  - Click **"I DRANK 💧"** for a cheerful confirmation ("Good job! 🦆✨") and the timer resets for another 30 minutes.
- **Smart Session Behavior**:
  - Automatically detects when your laptop was sleeping or closed for a long time (> 20 mins) and resets cleanly instead of spamming you with old reminders.
  - Survives browser restarts and background service worker suspensions.
  - Falls back to clean system notifications if you are on restricted pages (e.g. `chrome://extensions`).

---

## 🚀 How to Add to Google Chrome

1. Open **Google Chrome** and visit:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **"Load unpacked"** (top-left).
4. Select the project directory:
   ```text
   C:\Users\honey\max-water-reminder
   ```
5. Pin **Duck's Water Reminder** 🦆 to your Chrome toolbar!

---

## 🧪 Testing Locally

- To preview the in-page reminder right away, open [`test-page/index.html`](file:///C:/Users/honey/max-water-reminder/test-page/index.html) in Chrome and click **"Test Duck Reminder Now 🦆"**.
- Run automated tests anytime with:
  ```bash
  npm test
  ```

---

## 📄 License
MIT License. Keep quacking and stay hydrated! 🦆💧
