/**
 * Max's Water Reminder - Shared Constants
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
  TRIGGER_TEST_REMINDER: 'MAX_TRIGGER_TEST_REMINDER',
  LOG_MANUAL_DRINK: 'MAX_LOG_MANUAL_DRINK',
  STATE_UPDATED: 'MAX_STATE_UPDATED'
};

export const DEFAULT_SETTINGS = {
  timerActive: true,
  isDevMode: false,
  prodIntervalMinutes: 30,
  devIntervalMinutes: 1,
  snoozeIntervalMinutes: 5,
  sessionGapThresholdMinutes: 20, // Inactivity/sleep > 20m starts a new session
  idleDetectionSeconds: 300, // 5 min idle detection
  soundEnabled: true,
  notificationFallbackEnabled: true
};

export const DEFAULT_STATE = {
  sessionId: null,
  sessionStartTime: null,
  lastActiveTimestamp: null,
  nextReminderTimestamp: null,
  lastReminderTimestamp: null,
  lastHydrationTimestamp: null,
  sessionGlassesDrank: 0,
  totalGlassesDrank: 0,
  todayGlassesDrank: 0,
  todayDateStr: '',
  remindersCompleted: 0,
  isReminderActiveOnScreen: false
};

export const MAX_QUOTES = [
  "Hey! 💧 You've been here for 30 minutes. Drink some water!",
  "Hydration check! Go grab your water bottle. 💧",
  "Okay, you've been staring at that screen long enough. Water break!",
  "Your brain needs water too, you know. 💧",
  "Quick hydration break? You've got this! 💙",
  "Water. Now. Future you will thank you. 💧",
  "Running up that hill requires proper hydration. Drink up! 🎧",
  "Don't let the Upside Down dry you out. Grab some water! 🚲",
  "Time to recharge! Even skaters need water stops. 🛹",
  "Hey, pause the mixtape for a second and take a sip! 📼💧",
  "Stay fresh! One cool sip makes all the difference. 🌊",
  "You've been kicking butt today. Reward yourself with water! 💧✨"
];
