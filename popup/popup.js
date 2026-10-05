/**
 * Max's Water Reminder - Popup Dashboard Controller
 */

import { MESSAGE_TYPES } from '../shared/constants.js';
import {
  formatCountdown,
  formatDuration,
  getEffectiveIntervalMinutes
} from '../shared/utils.js';
import { playDrankTone } from '../shared/synth-audio.js';

let currentState = null;
let currentSettings = null;
let timerInterval = null;

// DOM Elements
const statusPill = document.getElementById('status-pill');
const statusLabel = document.getElementById('status-label');
const countdownEl = document.getElementById('countdown-timer');
const progressBarFill = document.getElementById('progress-bar-fill');
const btnQuickDrink = document.getElementById('btn-quick-drink');
const statSessionTime = document.getElementById('stat-session-time');
const statSessionDrinks = document.getElementById('stat-session-drinks');
const statTodayDrinks = document.getElementById('stat-today-drinks');
const currentModeTag = document.getElementById('current-mode-tag');
const btnModeProd = document.getElementById('btn-mode-prod');
const btnModeDev = document.getElementById('btn-mode-dev');
const btnTestReminder = document.getElementById('btn-test-reminder');
const btnResetSession = document.getElementById('btn-reset-session');
const toggleActive = document.getElementById('toggle-active');
const toggleSound = document.getElementById('toggle-sound');

/**
 * Initializes popup, fetching state from service worker
 */
async function init() {
  try {
    const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
    if (res?.success) {
      currentState = res.state;
      currentSettings = res.settings;
      render();
      startTicker();
    }
  } catch (err) {
    console.error('[Max Reminder Popup] Failed to initialize state:', err);
  }

  setupEventListeners();
}

/**
 * Starts 1-second live countdown ticker
 */
function startTicker() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    tick();
  }, 1000);
}

/**
 * Updates ticking numbers each second
 */
function tick() {
  if (!currentState || !currentSettings) return;

  const now = Date.now();

  // 1. Session Duration
  if (currentState.sessionStartTime) {
    const elapsed = Math.max(0, now - currentState.sessionStartTime);
    statSessionTime.textContent = formatDuration(elapsed);
  }

  // 2. Countdown Timer
  if (!currentSettings.timerActive) {
    countdownEl.textContent = 'PAUSED';
    progressBarFill.style.width = '0%';
    return;
  }

  const next = currentState.nextReminderTimestamp || now;
  const remaining = Math.max(0, next - now);
  countdownEl.textContent = formatCountdown(remaining);

  // 3. Progress Bar Fill
  const intervalMs = getEffectiveIntervalMinutes(currentSettings) * 60 * 1000;
  const elapsedInInterval = Math.max(0, intervalMs - remaining);
  const percentage = Math.min(100, Math.max(0, (elapsedInInterval / intervalMs) * 100));
  progressBarFill.style.width = `${percentage}%`;

  // Auto-refresh state if countdown completed
  if (remaining <= 0) {
    setTimeout(refreshState, 1500);
  }
}

/**
 * Fetches fresh state from background service worker
 */
async function refreshState() {
  try {
    const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
    if (res?.success) {
      currentState = res.state;
      currentSettings = res.settings;
      render();
    }
  } catch (err) {
    console.debug('[Max Reminder Popup] Refresh state error:', err);
  }
}

/**
 * Renders state and settings to DOM
 */
function render() {
  if (!currentState || !currentSettings) return;

  // Active / Paused Pill
  if (currentSettings.timerActive) {
    statusPill.className = 'status-pill active';
    statusLabel.textContent = 'Active';
  } else {
    statusPill.className = 'status-pill paused';
    statusLabel.textContent = 'Paused';
  }

  // Stats
  statSessionDrinks.textContent = String(currentState.sessionGlassesDrank || 0);
  statTodayDrinks.textContent = `${currentState.todayGlassesDrank || 0} 💧`;

  // Mode Selection
  if (currentSettings.isDevMode) {
    btnModeDev.classList.add('active');
    btnModeProd.classList.remove('active');
    currentModeTag.textContent = `${currentSettings.devIntervalMinutes || 1} MIN (DEV)`;
  } else {
    btnModeProd.classList.add('active');
    btnModeDev.classList.remove('active');
    currentModeTag.textContent = `${currentSettings.prodIntervalMinutes || 30} MIN`;
  }

  // Toggles
  toggleActive.checked = Boolean(currentSettings.timerActive);
  toggleSound.checked = Boolean(currentSettings.soundEnabled);

  // Immediate tick
  tick();
}

/**
 * Sets up all interactive button listeners
 */
function setupEventListeners() {
  // Quick "I DRANK 💧" Button
  btnQuickDrink.addEventListener('click', async () => {
    btnQuickDrink.classList.add('success');
    btnQuickDrink.innerHTML = '<span>Nice! 💧✨</span>';

    if (currentSettings?.soundEnabled) {
      playDrankTone();
    }

    try {
      const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CONFIRM_HYDRATION });
      if (res?.success) {
        currentState = res.state;
        setTimeout(() => {
          btnQuickDrink.classList.remove('success');
          btnQuickDrink.innerHTML = '<span>I DRANK</span><span class="btn-icon">💧</span>';
          render();
        }, 1200);
      }
    } catch (err) {
      console.error('[Max Reminder Popup] Quick drink error:', err);
      btnQuickDrink.classList.remove('success');
      btnQuickDrink.innerHTML = '<span>I DRANK</span><span class="btn-icon">💧</span>';
    }
  });

  // Switch to Production Mode (30 min)
  btnModeProd.addEventListener('click', async () => {
    if (!currentSettings?.isDevMode) return;
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { settings: { isDevMode: false } }
    });
    if (res?.success) {
      currentSettings = res.settings;
      currentState = res.state;
      render();
    }
  });

  // Switch to Dev Mode (1 min)
  btnModeDev.addEventListener('click', async () => {
    if (currentSettings?.isDevMode) return;
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { settings: { isDevMode: true } }
    });
    if (res?.success) {
      currentSettings = res.settings;
      currentState = res.state;
      render();
    }
  });

  // Test Reminder Card (Inject on screen immediately)
  btnTestReminder.addEventListener('click', async () => {
    const originalText = btnTestReminder.innerHTML;
    btnTestReminder.innerHTML = '<span>⚡ Sent to tab!</span>';

    try {
      await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TRIGGER_TEST_REMINDER });
    } catch (err) {
      console.debug('[Max Reminder Popup] Test trigger error:', err);
    }

    setTimeout(() => {
      btnTestReminder.innerHTML = originalText;
    }, 1500);
  });

  // Reset Session
  btnResetSession.addEventListener('click', async () => {
    const originalText = btnResetSession.innerHTML;
    btnResetSession.innerHTML = '<span>🔄 Resetting...</span>';

    try {
      const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_SESSION });
      if (res?.success) {
        currentState = res.state;
        currentSettings = res.settings;
        render();
      }
    } catch (err) {
      console.error('[Max Reminder Popup] Reset session error:', err);
    }

    setTimeout(() => {
      btnResetSession.innerHTML = originalText;
    }, 1000);
  });

  // Enable/Disable Reminders Switch
  toggleActive.addEventListener('change', async () => {
    const timerActive = toggleActive.checked;
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { settings: { timerActive } }
    });
    if (res?.success) {
      currentSettings = res.settings;
      currentState = res.state;
      render();
    }
  });

  // Sound FX Switch
  toggleSound.addEventListener('change', async () => {
    const soundEnabled = toggleSound.checked;
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { settings: { soundEnabled } }
    });
    if (res?.success) {
      currentSettings = res.settings;
    }
  });
}

// Cleanup on unload
window.addEventListener('unload', () => {
  if (timerInterval) clearInterval(timerInterval);
});

// Run init
init();
