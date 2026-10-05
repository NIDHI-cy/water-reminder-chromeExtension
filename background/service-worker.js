/**
 * Max's Water Reminder - Background Service Worker (Manifest V3)
 * Operates event-driven without persistent memory, relying on alarms and storage.
 */

import { SessionManager } from './session-manager.js';
import { ALARM_NAME, MESSAGE_TYPES } from '../shared/constants.js';
import { getRandomQuote } from '../shared/utils.js';

const sessionManager = new SessionManager();

// Extension Installed or Updated
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Max Reminder] Extension installed/updated:', details.reason);
  await sessionManager.initSession(true);
});

// Browser Startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Max Reminder] Browser startup detected');
  await sessionManager.handleStartup();
});

// Alarm Triggered
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[Max Reminder] Hydration alarm triggered');
    await sessionManager.handleAlarm();
  }
});

// System Idle / Sleep / Lock Detection
if (chrome.idle?.onStateChanged) {
  // Set idle detection interval (default 300 seconds / 5 mins)
  chrome.idle.setDetectionInterval(300);
  chrome.idle.onStateChanged.addListener(async (idleState) => {
    console.log('[Max Reminder] Idle state changed:', idleState);
    await sessionManager.handleIdleStateChange(idleState);
  });
}

// Fallback System Notification Button Clicks
if (chrome.notifications?.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (notificationId === 'max-water-reminder-notice') {
      if (buttonIndex === 0) {
        // "I DRANK 💧"
        await sessionManager.confirmHydration();
        chrome.notifications.clear(notificationId);
      } else if (buttonIndex === 1) {
        // "Snooze 5m"
        await sessionManager.snoozeReminder(5);
        chrome.notifications.clear(notificationId);
      }
    }
  });
}

// Message Dispatcher for Popup and Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations cleanly
  handleIncomingMessage(message, sender)
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ error: error.message }));

  // Return true to indicate asynchronous response
  return true;
});

async function handleIncomingMessage(message, sender) {
  const { type, data } = message || {};

  switch (type) {
    case MESSAGE_TYPES.GET_STATE: {
      const state = await sessionManager.getState();
      const settings = await sessionManager.getSettings();
      return { success: true, state, settings };
    }

    case MESSAGE_TYPES.CONFIRM_HYDRATION: {
      const state = await sessionManager.confirmHydration();
      return { success: true, state };
    }

    case MESSAGE_TYPES.SNOOZE_REMINDER: {
      const minutes = data?.minutes || 5;
      const state = await sessionManager.snoozeReminder(minutes);
      return { success: true, state };
    }

    case MESSAGE_TYPES.UPDATE_SETTINGS: {
      const updatedSettings = await sessionManager.updateSettings(data?.settings || {});
      const state = await sessionManager.getState();
      return { success: true, settings: updatedSettings, state };
    }

    case MESSAGE_TYPES.RESET_SESSION: {
      const result = await sessionManager.initSession(true);
      return { success: true, state: result.state, settings: result.settings };
    }

    case MESSAGE_TYPES.TRIGGER_TEST_REMINDER: {
      const quote = getRandomQuote();
      const sent = await sessionManager.broadcastReminder(quote);
      return { success: true, sentToTab: sent, quote };
    }

    case MESSAGE_TYPES.LOG_MANUAL_DRINK: {
      const state = await sessionManager.confirmHydration();
      return { success: true, state };
    }

    default:
      return { success: false, reason: `Unknown message type: ${type}` };
  }
}
