/**
 * Duck Water Reminder - Popup Dashboard Controller
 */

import { MESSAGE_TYPES } from '../shared/constants.js';
import { formatCountdown } from '../shared/utils.js';
import { playDrankTone } from '../shared/synth-audio.js';

let currentState = null;
let currentSettings = null;
let timerInterval = null;

// DOM Elements
const countdownEl = document.getElementById('countdown-timer');
const statusPill = document.getElementById('status-pill');
const statusSubtext = document.getElementById('status-subtext');
const btnDrink = document.getElementById('btn-drink');
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const toggleActive = document.getElementById('toggle-active');
const toggleSound = document.getElementById('toggle-sound');
const btnReset = document.getElementById('btn-reset');

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
    console.debug('[Duck Reminder Popup] State init error:', err);
  }

  setupEventListeners();
}

function startTicker() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  if (!currentState || !currentSettings) return;

  const now = Date.now();

  if (!currentSettings.timerActive) {
    countdownEl.textContent = 'PAUSED';
    statusSubtext.textContent = 'Duck is resting.';
    statusPill.innerHTML = '<span>Reminder paused</span><span class="pill-icon">💤</span>';
    return;
  }

  const next = currentState.nextReminderTimestamp || now;
  const remaining = Math.max(0, next - now);
  countdownEl.textContent = formatCountdown(remaining);

  if (remaining <= 0) {
    statusPill.innerHTML = '<span>Water break time!</span><span class="pill-icon">💧</span>';
    statusSubtext.textContent = 'Quack! Time to drink water.';
    btnDrink.style.display = 'inline-flex';
  } else {
    statusPill.innerHTML = '<span>Hydration check pending.</span><span class="pill-icon">📝</span>';
    statusSubtext.textContent = 'Duck is waiting...';
  }
}

function render() {
  if (!currentState || !currentSettings) return;

  toggleActive.checked = Boolean(currentSettings.timerActive);
  toggleSound.checked = Boolean(currentSettings.soundEnabled);

  tick();
}

function setupEventListeners() {
  // Settings gear toggle
  btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPanel.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== btnSettings) {
      settingsPanel.classList.add('hidden');
    }
  });

  // "I Drank 💧" Button
  btnDrink.addEventListener('click', async () => {
    btnDrink.classList.add('success');
    btnDrink.innerHTML = '<span>Good job! 🦆✨</span>';

    if (currentSettings?.soundEnabled) {
      playDrankTone();
    }

    try {
      const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CONFIRM_HYDRATION });
      if (res?.success) {
        currentState = res.state;
      }
    } catch (err) {
      console.debug('[Duck Reminder Popup] Confirm drink error:', err);
    }

    setTimeout(() => {
      btnDrink.classList.remove('success');
      btnDrink.innerHTML = '<span>I Drank 💧</span>';
      tick();
    }, 1200);
  });

  // Toggle active/pause
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

  // Toggle sound
  toggleSound.addEventListener('change', async () => {
    const soundEnabled = toggleSound.checked;
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      data: { settings: { soundEnabled } }
    });
    currentSettings.soundEnabled = soundEnabled;
  });

  // Reset timer
  btnReset.addEventListener('click', async () => {
    settingsPanel.classList.add('hidden');
    const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_SESSION });
    if (res?.success) {
      currentState = res.state;
      currentSettings = res.settings;
      render();
    }
  });
}

window.addEventListener('unload', () => {
  if (timerInterval) clearInterval(timerInterval);
});

init();
