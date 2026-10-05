/**
 * Max's Water Reminder - Session Manager
 * Orchestrates session lifecycle, sleep/idle detection, persistent storage,
 * and reliable alarm scheduling for Manifest V3 service workers.
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
  getEffectiveIntervalMinutes,
  getRandomQuote
} from '../shared/utils.js';

export class SessionManager {
  /**
   * @param {Object} [chromeApi] - Mockable Chrome API for unit testing
   */
  constructor(chromeApi = (typeof chrome !== 'undefined' ? chrome : null)) {
    this.chrome = chromeApi;
    this.cachedSettings = null;
    this.cachedState = null;
  }

  /**
   * Loads settings from chrome.storage.local
   * @returns {Promise<Object>}
   */
  async getSettings() {
    if (!this.chrome?.storage?.local) {
      return { ...DEFAULT_SETTINGS, ...(this.cachedSettings || {}) };
    }
    const result = await this.chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS] || {};
    this.cachedSettings = { ...DEFAULT_SETTINGS, ...stored };
    return this.cachedSettings;
  }

  /**
   * Saves settings to chrome.storage.local
   * @param {Object} newSettings 
   * @returns {Promise<Object>}
   */
  async saveSettings(newSettings) {
    const current = this.cachedSettings || (await this.getSettings());
    const updated = { ...current, ...newSettings };
    this.cachedSettings = updated;
    if (this.chrome?.storage?.local) {
      await this.chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    }
    return updated;
  }

  /**
   * Loads state from chrome.storage.local, automatically handling date rollover
   * @returns {Promise<Object>}
   */
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

  /**
   * Saves state to chrome.storage.local
   * @param {Object} newState 
   * @returns {Promise<Object>}
   */
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

  /**
   * Schedules the next reminder alarm based on nextReminderTimestamp
   * @param {number} timestamp 
   */
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

  /**
   * Clears any active reminder alarm
   */
  async clearAlarm() {
    if (!this.chrome?.alarms) return;
    await this.chrome.alarms.clear(ALARM_NAME);
  }

  /**
   * Initializes or resumes a session.
   * Detects whether user was away for > sessionGapThresholdMinutes (e.g. laptop sleep or power off).
   * If a gap is detected or forceNew is true, starts a brand new session starting at 0.
   * @param {boolean} [forceNew=false]
   * @returns {Promise<{state: Object, settings: Object, isNewSession: boolean}>}
   */
  async initSession(forceNew = false) {
    const settings = await this.getSettings();
    let state = await this.getState();
    const now = Date.now();
    const intervalMinutes = getEffectiveIntervalMinutes(settings);
    const intervalMs = intervalMinutes * 60 * 1000;
    const gapThresholdMs = (settings.sessionGapThresholdMinutes || 20) * 60 * 1000;

    let isNewSession = false;

    // Check if session exists and is fresh
    const hasValidSession = Boolean(state.sessionId && state.sessionStartTime && state.lastActiveTimestamp);
    const gapSinceLastActive = hasValidSession ? now - state.lastActiveTimestamp : Infinity;

    if (forceNew || !hasValidSession || gapSinceLastActive > gapThresholdMs) {
      // Long absence or forced reset -> Start Fresh Session
      isNewSession = true;
      const nextReminder = now + intervalMs;

      state = await this.saveState({
        sessionId: generateSessionId(),
        sessionStartTime: now,
        lastActiveTimestamp: now,
        nextReminderTimestamp: nextReminder,
        lastReminderTimestamp: null,
        sessionGlassesDrank: 0,
        isReminderActiveOnScreen: false
      });

      if (settings.timerActive) {
        await this.scheduleAlarm(nextReminder);
      } else {
        await this.clearAlarm();
      }
    } else {
      // Resume existing active session
      const updates = { lastActiveTimestamp: now };

      // Verify timer hasn't expired while inactive
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

  /**
   * Handles alarm execution when chrome.alarms fires
   * @returns {Promise<{action: string, triggered: boolean, quote?: string, reason?: string}>}
   */
  async handleAlarm() {
    const settings = await this.getSettings();
    if (!settings.timerActive) {
      await this.clearAlarm();
      return { action: 'ignored', triggered: false, reason: 'timer_disabled' };
    }

    const state = await this.getState();
    const now = Date.now();
    const gapThresholdMs = (settings.sessionGapThresholdMinutes || 20) * 60 * 1000;

    // If the laptop was sleeping for hours and woke up, don't trigger a stale reminder
    if (state.lastActiveTimestamp && (now - state.lastActiveTimestamp) > gapThresholdMs) {
      // Sleep detected - reset session instead of firing backlogged reminder
      await this.initSession(true);
      return { action: 'session_reset', triggered: false, reason: 'inactivity_gap_exceeded' };
    }

    const intervalMinutes = getEffectiveIntervalMinutes(settings);
    const nextReminder = now + intervalMinutes * 60 * 1000;

    // Update state for reminder
    await this.saveState({
      lastActiveTimestamp: now,
      lastReminderTimestamp: now,
      nextReminderTimestamp: nextReminder,
      remindersCompleted: (state.remindersCompleted || 0) + 1,
      isReminderActiveOnScreen: true
    });

    // Schedule next alarm interval
    await this.scheduleAlarm(nextReminder);

    // Trigger visual reminder
    const quote = getRandomQuote();
    await this.broadcastReminder(quote);

    return { action: 'reminder_triggered', triggered: true, quote };
  }

  /**
   * Broadcasts the reminder to the current active tab or triggers system notification fallback
   * @param {string} [quote]
   */
  async broadcastReminder(quote = getRandomQuote()) {
    const settings = await this.getSettings();
    let sentToTab = false;

    if (this.chrome?.tabs?.query) {
      try {
        const tabs = await this.chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tabs && tabs.length > 0 && tabs[0].id) {
          const activeTab = tabs[0];
          // Check if tab URL is allowed for content scripts
          if (this.isInjectableUrl(activeTab.url)) {
            try {
              await this.chrome.tabs.sendMessage(activeTab.id, {
                type: MESSAGE_TYPES.SHOW_REMINDER,
                data: {
                  quote,
                  soundEnabled: settings.soundEnabled,
                  intervalMinutes: getEffectiveIntervalMinutes(settings)
                }
              });
              sentToTab = true;
            } catch (tabErr) {
              console.debug('[Max Reminder] Content script message failed:', tabErr);
            }
          }
        }
      } catch (err) {
        console.debug('[Max Reminder] Tab query failed:', err);
      }
    }

    // If content script was unable to display reminder (e.g. restricted chrome:// tab or browser minimized)
    // and fallback is enabled, trigger Chrome rich notification
    if (!sentToTab && settings.notificationFallbackEnabled && this.chrome?.notifications) {
      try {
        this.chrome.notifications.create('max-water-reminder-notice', {
          type: 'basic',
          iconUrl: this.chrome.runtime?.getURL ? this.chrome.runtime.getURL('assets/icons/icon-128.png') : 'assets/icons/icon-128.png',
          title: "Max's Water Reminder 💧",
          message: quote,
          priority: 2,
          buttons: [
            { title: 'I DRANK 💧' },
            { title: 'Snooze 5m' }
          ]
        });
      } catch (notifErr) {
        console.debug('[Max Reminder] Notification fallback failed:', notifErr);
      }
    }

    return sentToTab;
  }

  /**
   * Checks if a URL is eligible for content script injection
   * @param {string} [url]
   * @returns {boolean}
   */
  isInjectableUrl(url) {
    if (!url) return false;
    const restrictedPrefixes = [
      'chrome://',
      'chrome-extension://',
      'edge://',
      'about:',
      'view-source:',
      'https://chrome.google.com/webstore',
      'https://chromewebstore.google.com'
    ];
    return !restrictedPrefixes.some(prefix => url.startsWith(prefix));
  }

  /**
   * Confirms hydration ("I DRANK 💧" clicked)
   * Increments drink counters, updates timestamps, resets timer for full interval
   * @returns {Promise<Object>} Updated state
   */
  async confirmHydration() {
    const settings = await this.getSettings();
    const state = await this.getState();
    const now = Date.now();
    const intervalMinutes = getEffectiveIntervalMinutes(settings);
    const nextReminder = now + intervalMinutes * 60 * 1000;

    const updatedState = await this.saveState({
      lastActiveTimestamp: now,
      lastHydrationTimestamp: now,
      sessionGlassesDrank: (state.sessionGlassesDrank || 0) + 1,
      totalGlassesDrank: (state.totalGlassesDrank || 0) + 1,
      todayGlassesDrank: (state.todayGlassesDrank || 0) + 1,
      nextReminderTimestamp: nextReminder,
      isReminderActiveOnScreen: false
    });

    if (settings.timerActive) {
      await this.scheduleAlarm(nextReminder);
    }

    return updatedState;
  }

  /**
   * Snoozes the reminder for specified minutes (default 5)
   * @param {number} [minutes=5]
   * @returns {Promise<Object>}
   */
  async snoozeReminder(minutes = 5) {
    const state = await this.getState();
    const now = Date.now();
    const snoozeMs = minutes * 60 * 1000;
    const nextReminder = now + snoozeMs;

    const updatedState = await this.saveState({
      lastActiveTimestamp: now,
      nextReminderTimestamp: nextReminder,
      isReminderActiveOnScreen: false
    });

    await this.scheduleAlarm(nextReminder);
    return updatedState;
  }

  /**
   * Handles system idle / lock state change from chrome.idle
   * @param {string} idleState - 'active' | 'idle' | 'locked'
   */
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

  /**
   * Handles browser startup (chrome.runtime.onStartup)
   */
  async handleStartup() {
    await this.initSession(false);
  }

  /**
   * Updates settings and reschedules timer if interval or active state changed
   * @param {Object} partialSettings 
   * @returns {Promise<Object>}
   */
  async updateSettings(partialSettings) {
    const prevSettings = await this.getSettings();
    const updatedSettings = await this.saveSettings(partialSettings);

    const intervalChanged = (
      prevSettings.isDevMode !== updatedSettings.isDevMode ||
      prevSettings.prodIntervalMinutes !== updatedSettings.prodIntervalMinutes ||
      prevSettings.devIntervalMinutes !== updatedSettings.devIntervalMinutes
    );

    const activeChanged = prevSettings.timerActive !== updatedSettings.timerActive;

    if (activeChanged) {
      if (updatedSettings.timerActive) {
        const state = await this.getState();
        const now = Date.now();
        let next = state.nextReminderTimestamp;
        if (!next || next <= now) {
          const intervalMs = getEffectiveIntervalMinutes(updatedSettings) * 60 * 1000;
          next = now + intervalMs;
          await this.saveState({ nextReminderTimestamp: next });
        }
        await this.scheduleAlarm(next);
      } else {
        await this.clearAlarm();
      }
    } else if (intervalChanged && updatedSettings.timerActive) {
      const now = Date.now();
      const intervalMs = getEffectiveIntervalMinutes(updatedSettings) * 60 * 1000;
      const next = now + intervalMs;
      await this.saveState({ nextReminderTimestamp: next });
      await this.scheduleAlarm(next);
    }

    return updatedSettings;
  }
}
