/**
 * Max's Water Reminder - Session Manager (Cute Duck Edition)
 * Manages 30-minute reminder intervals and sleep/idle lifecycle.
 */

import {
  ALARM_NAME,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  MESSAGE_TYPES
} from '../shared/constants.js';

import {
  generateSessionId,
  getTodayDateString,
  getRandomQuote
} from '../shared/utils.js';

export class SessionManager {
  constructor(chromeApi = (typeof chrome !== 'undefined' ? chrome : null)) {
    this.chrome = chromeApi;
    this.cachedSettings = null;
    this.cachedState = null;
  }

  async getSettings() {
    if (!this.chrome?.storage?.local) {
      return { ...DEFAULT_SETTINGS, ...(this.cachedSettings || {}) };
    }
    const result = await this.chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS] || {};
    this.cachedSettings = { ...DEFAULT_SETTINGS, ...stored };
    return this.cachedSettings;
  }

  async saveSettings(newSettings) {
    const current = this.cachedSettings || (await this.getSettings());
    const updated = { ...current, ...newSettings };
    this.cachedSettings = updated;
    if (this.chrome?.storage?.local) {
      await this.chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    }
    return updated;
  }

  async getState() {
    if (!this.chrome?.storage?.local) {
      return { ...DEFAULT_STATE, ...(this.cachedState || {}) };
    }
    const result = await this.chrome.storage.local.get(STORAGE_KEYS.STATE);
    let state = result[STORAGE_KEYS.STATE] ? { ...result[STORAGE_KEYS.STATE] } : { ...DEFAULT_STATE };

    const todayStr = getTodayDateString();
    if (state.todayDateStr !== todayStr) {
      state.todayDateStr = todayStr;
      state.todayGlassesDrank = 0;
      this.cachedState = state;
      if (this.chrome?.storage?.local) {
        await this.chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
      }
    }

    this.cachedState = state;
    return state;
  }

  async saveState(newState) {
    let current = this.cachedState;
    if (!current) {
      if (this.chrome?.storage?.local) {
        const result = await this.chrome.storage.local.get(STORAGE_KEYS.STATE);
        current = result[STORAGE_KEYS.STATE] || { ...DEFAULT_STATE };
      } else {
        current = { ...DEFAULT_STATE };
      }
    }
    const updated = { ...current, ...newState };
    this.cachedState = updated;
    if (this.chrome?.storage?.local) {
      await this.chrome.storage.local.set({ [STORAGE_KEYS.STATE]: updated });
    }
    return updated;
  }

  async scheduleAlarm(timestamp) {
    if (!this.chrome?.alarms) return;
    await this.chrome.alarms.clear(ALARM_NAME);
    const now = Date.now();
    const delayMs = Math.max(1000, timestamp - now);
    const delayInMinutes = delayMs / (1000 * 60);

    this.chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: Math.max(0.1, delayInMinutes)
    });
  }

  async clearAlarm() {
    if (!this.chrome?.alarms) return;
    await this.chrome.alarms.clear(ALARM_NAME);
  }

  async initSession(forceNew = false) {
    const settings = await this.getSettings();
    let state = await this.getState();
    const now = Date.now();
    const intervalMinutes = settings.intervalMinutes || 30;
    const intervalMs = intervalMinutes * 60 * 1000;
    const gapThresholdMs = (settings.sessionGapThresholdMinutes || 20) * 60 * 1000;

    let isNewSession = false;
    const hasValidSession = Boolean(state.sessionId && state.sessionStartTime && state.lastActiveTimestamp);
    const gapSinceLastActive = hasValidSession ? now - state.lastActiveTimestamp : Infinity;

    if (forceNew || !hasValidSession || gapSinceLastActive > gapThresholdMs) {
      isNewSession = true;
      const nextReminder = now + intervalMs;

      state = await this.saveState({
        sessionId: generateSessionId(),
        sessionStartTime: now,
        lastActiveTimestamp: now,
        nextReminderTimestamp: nextReminder,
        lastReminderTimestamp: null,
        isReminderActiveOnScreen: false
      });

      if (settings.timerActive) {
        await this.scheduleAlarm(nextReminder);
      } else {
        await this.clearAlarm();
      }
    } else {
      const updates = { lastActiveTimestamp: now };
      if (!state.nextReminderTimestamp || state.nextReminderTimestamp < now) {
        updates.nextReminderTimestamp = now + intervalMs;
      }
      state = await this.saveState(updates);

      if (settings.timerActive) {
        await this.scheduleAlarm(state.nextReminderTimestamp);
      }
    }

    return { state, settings, isNewSession };
  }

  async handleAlarm() {
    const settings = await this.getSettings();
    if (!settings.timerActive) {
      await this.clearAlarm();
      return { action: 'ignored', triggered: false, reason: 'timer_disabled' };
    }

    const state = await this.getState();
    const now = Date.now();
    const gapThresholdMs = (settings.sessionGapThresholdMinutes || 20) * 60 * 1000;

    if (state.lastActiveTimestamp && (now - state.lastActiveTimestamp) > gapThresholdMs) {
      await this.initSession(true);
      return { action: 'session_reset', triggered: false, reason: 'inactivity_gap_exceeded' };
    }

    const intervalMinutes = settings.intervalMinutes || 30;
    const nextReminder = now + intervalMinutes * 60 * 1000;

    await this.saveState({
      lastActiveTimestamp: now,
      lastReminderTimestamp: now,
      nextReminderTimestamp: nextReminder,
      isReminderActiveOnScreen: true
    });

    await this.scheduleAlarm(nextReminder);
    const quote = getRandomQuote();
    await this.broadcastReminder(quote);

    return { action: 'reminder_triggered', triggered: true, quote };
  }

  async broadcastReminder(quote = getRandomQuote()) {
    const settings = await this.getSettings();
    let sentToTab = false;

    if (this.chrome?.tabs?.query) {
      try {
        const tabs = await this.chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tabs && tabs.length > 0 && tabs[0].id) {
          const activeTab = tabs[0];
          if (this.isInjectableUrl(activeTab.url)) {
            try {
              await this.chrome.tabs.sendMessage(activeTab.id, {
                type: MESSAGE_TYPES.SHOW_REMINDER,
                data: {
                  quote,
                  soundEnabled: settings.soundEnabled,
                  intervalMinutes: settings.intervalMinutes || 30
                }
              });
              sentToTab = true;
            } catch (tabErr) {
              console.debug('[Duck Reminder] Tab message failed:', tabErr);
            }
          }
        }
      } catch (err) {
        console.debug('[Duck Reminder] Tab query failed:', err);
      }
    }

    if (!sentToTab && this.chrome?.notifications) {
      try {
        this.chrome.notifications.create('duck-water-reminder-notice', {
          type: 'basic',
          iconUrl: this.chrome.runtime?.getURL ? this.chrome.runtime.getURL('assets/icons/icon-128.png') : 'assets/icons/icon-128.png',
          title: "Duck Water Reminder 🦆💧",
          message: quote,
          priority: 2,
          buttons: [{ title: 'I DRANK 💧' }]
        });
      } catch (notifErr) {
        console.debug('[Duck Reminder] Notification fallback failed:', notifErr);
      }
    }

    return sentToTab;
  }

  isInjectableUrl(url) {
    if (!url) return false;
    const restricted = [
      'chrome://',
      'chrome-extension://',
      'edge://',
      'about:',
      'view-source:',
      'https://chrome.google.com/webstore',
      'https://chromewebstore.google.com'
    ];
    return !restricted.some(prefix => url.startsWith(prefix));
  }

  async confirmHydration() {
    const settings = await this.getSettings();
    const state = await this.getState();
    const now = Date.now();
    const intervalMinutes = settings.intervalMinutes || 30;
    const nextReminder = now + intervalMinutes * 60 * 1000;

    const updatedState = await this.saveState({
      lastActiveTimestamp: now,
      lastHydrationTimestamp: now,
      todayGlassesDrank: (state.todayGlassesDrank || 0) + 1,
      nextReminderTimestamp: nextReminder,
      isReminderActiveOnScreen: false
    });

    if (settings.timerActive) {
      await this.scheduleAlarm(nextReminder);
    }

    return updatedState;
  }

  async handleIdleStateChange(idleState) {
    const settings = await this.getSettings();
    const state = await this.getState();
    const now = Date.now();
    const gapThresholdMs = (settings.sessionGapThresholdMinutes || 20) * 60 * 1000;

    if (idleState === 'active') {
      if (state.lastActiveTimestamp && (now - state.lastActiveTimestamp) > gapThresholdMs) {
        await this.initSession(true);
      } else {
        await this.saveState({ lastActiveTimestamp: now });
      }
    } else {
      await this.saveState({ lastActiveTimestamp: now });
    }
  }

  async handleStartup() {
    await this.initSession(false);
  }

  async updateSettings(partialSettings) {
    const updatedSettings = await this.saveSettings(partialSettings);
    if ('timerActive' in partialSettings) {
      if (updatedSettings.timerActive) {
        const state = await this.getState();
        const now = Date.now();
        let next = state.nextReminderTimestamp;
        if (!next || next <= now) {
          next = now + (updatedSettings.intervalMinutes || 30) * 60 * 1000;
          await this.saveState({ nextReminderTimestamp: next });
        }
        await this.scheduleAlarm(next);
      } else {
        await this.clearAlarm();
      }
    }
    return updatedSettings;
  }
}
