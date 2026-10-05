/**
 * Max's Water Reminder - Shared Constants (Cute Duck Edition)
 */

export const ALARM_NAME = 'max_water_reminder_alarm';

export const STORAGE_KEYS = {
  SETTINGS: 'max_reminder_settings',
  STATE: 'max_reminder_state'
};

export const MESSAGE_TYPES = {
  SHOW_REMINDER: 'MAX_SHOW_REMINDER',
  HIDE_REMINDER: 'MAX_HIDE_REMINDER',
  CONFIRM_HYDRATION: 'MAX_CONFIRM_HYDRATION',
  SNOOZE_REMINDER: 'MAX_SNOOZE_REMINDER',
  GET_STATE: 'MAX_GET_STATE',
  UPDATE_SETTINGS: 'MAX_UPDATE_SETTINGS',
  RESET_SESSION: 'MAX_RESET_SESSION',
  TRIGGER_TEST_REMINDER: 'MAX_TRIGGER_TEST_REMINDER'
};

export const DEFAULT_SETTINGS = {
  timerActive: true,
  intervalMinutes: 30, // 30-minute reminder interval
  sessionGapThresholdMinutes: 20, // Inactivity/sleep > 20m resets session
  soundEnabled: true
};

export const DEFAULT_STATE = {
  sessionId: null,
  sessionStartTime: null,
  lastActiveTimestamp: null,
  nextReminderTimestamp: null,
  lastReminderTimestamp: null,
  lastHydrationTimestamp: null,
  todayGlassesDrank: 0,
  todayDateStr: '',
  isReminderActiveOnScreen: false
};

export const DUCK_QUOTES = [
  "Quack! 💧 Time to drink some water.",
  "Duck reminder: Go grab your water bottle! 🦆",
  "Hydration check! Go take a water break. 💧",
  "You've been working for 30 minutes. Water time! 🌊",
  "Duck is waiting... go take a sip! 🦆💧",
  "Stay healthy! Drink a fresh glass of water. 💧",
  "Quack quack! Quick water break! 🦆"
];
