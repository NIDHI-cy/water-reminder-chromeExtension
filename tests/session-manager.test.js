/**
 * Max's Water Reminder - Session Manager Test Suite
 * Validates session lifecycle, sleep detection, alarm scheduling, and drink tracking.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SessionManager } from '../background/session-manager.js';
import { MockChrome } from './mock-chrome.js';
import { DEFAULT_SETTINGS, MESSAGE_TYPES } from '../shared/constants.js';

test('1. Session Initialization - Fresh Start', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);

  const { state, settings, isNewSession } = await manager.initSession();

  assert.equal(isNewSession, true, 'First run should create a brand new session');
  assert.ok(state.sessionId, 'Session ID must be generated');
  assert.ok(state.sessionStartTime, 'Session start timestamp must be set');
  assert.equal(state.sessionGlassesDrank, 0, 'Initial session glasses drank must be 0');

  // Verify production defaults
  assert.equal(settings.isDevMode, false, 'Default mode must be Production (isDevMode: false)');
  assert.equal(settings.prodIntervalMinutes, 30, 'Production interval must be 30 minutes');

  // Verify alarm was scheduled
  assert.ok(mockChrome.alarms.get('max_water_reminder_alarm'), 'Hydration alarm must be scheduled');
});

test('2. Timer State is Persisted in Storage', async () => {
  const mockChrome = new MockChrome();
  const manager1 = new SessionManager(mockChrome);

  await manager1.initSession();
  await manager1.confirmHydration();

  // Create new manager instance reading from the same storage
  const manager2 = new SessionManager(mockChrome);
  const state = await manager2.getState();
  const settings = await manager2.getSettings();

  assert.equal(state.sessionGlassesDrank, 1, 'Persisted drink count should be restored');
  assert.equal(settings.prodIntervalMinutes, 30, 'Persisted settings should be restored');
});

test('3. Mode Switching - Production (30m) vs Dev (1m)', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  // Switch to Dev Mode (1 min)
  const devSettings = await manager.updateSettings({ isDevMode: true });
  assert.equal(devSettings.isDevMode, true, 'isDevMode should be true');
  assert.equal(devSettings.devIntervalMinutes, 1, 'Dev interval should be 1 minute');

  let state = await manager.getState();
  const now = Date.now();
  // Next reminder should be around 1 minute in the future
  const diffDevMs = state.nextReminderTimestamp - now;
  assert.ok(diffDevMs > 50000 && diffDevMs <= 60000, `Dev mode interval should be ~1 min (actual: ${diffDevMs}ms)`);

  // Switch back to Production Mode (30 min)
  const prodSettings = await manager.updateSettings({ isDevMode: false });
  assert.equal(prodSettings.isDevMode, false, 'isDevMode should be false in production');
  assert.equal(prodSettings.prodIntervalMinutes, 30, 'Prod interval should be 30 minutes');

  state = await manager.getState();
  const diffProdMs = state.nextReminderTimestamp - now;
  assert.ok(diffProdMs > 1700000 && diffProdMs <= 1800000, `Prod mode interval should be ~30 min (actual: ${diffProdMs}ms)`);
});

test('4. Sleep / Long Inactivity Detection - Prevents Reminder Backlog', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  const initial = await manager.initSession();

  // Simulate laptop sleep/wake after 4 hours (14,400,000 ms)
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  await manager.saveState({ lastActiveTimestamp: fourHoursAgo });

  // Simulate alarm firing upon waking up
  const result = await manager.handleAlarm();

  assert.equal(result.triggered, false, 'Stale reminder must NOT be triggered after long sleep');
  assert.equal(result.action, 'session_reset', 'Session should be automatically reset');

  // Verify timer was reset to 30 minutes from now rather than firing repeatedly
  const state = await manager.getState();
  const now = Date.now();
  const diffMs = state.nextReminderTimestamp - now;
  assert.ok(diffMs > 1700000, 'Fresh session timer should start from 0 for 30 minutes');
  assert.notEqual(state.sessionId, initial.state.sessionId, 'New session ID should be created');
});

test('5. Normal Alarm Execution - Reminders Triggered & Broadcast', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  // Normal alarm trigger within session
  const result = await manager.handleAlarm();

  assert.equal(result.triggered, true, 'Reminder should trigger on normal alarm');
  assert.ok(result.quote, 'Reminder should include a playful Max quote');

  const state = await manager.getState();
  assert.equal(state.remindersCompleted, 1, 'Reminders completed count should increment');
  assert.equal(mockChrome.sentTabMessages.length, 1, 'Reminder message should be sent to active tab');
  assert.equal(mockChrome.sentTabMessages[0].message.type, MESSAGE_TYPES.SHOW_REMINDER);
});

test('6. "I DRANK 💧" Interaction Updates Counts and Resets Timer', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  const stateBefore = await manager.getState();
  assert.equal(stateBefore.sessionGlassesDrank, 0);

  // User clicks "I DRANK 💧"
  const updatedState = await manager.confirmHydration();

  assert.equal(updatedState.sessionGlassesDrank, 1, 'Session glasses should increment');
  assert.equal(updatedState.totalGlassesDrank, 1, 'Total glasses should increment');
  assert.equal(updatedState.todayGlassesDrank, 1, 'Today glasses should increment');
  assert.ok(updatedState.lastHydrationTimestamp, 'Last hydration timestamp must be recorded');

  // Verify next reminder is scheduled for full 30 minutes from now
  const now = Date.now();
  const diffMs = updatedState.nextReminderTimestamp - now;
  assert.ok(diffMs > 1700000 && diffMs <= 1800000, 'Next reminder should be scheduled for full interval');
});

test('7. Snooze Reminder (5 minutes)', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  const updatedState = await manager.snoozeReminder(5);
  const now = Date.now();
  const diffMs = updatedState.nextReminderTimestamp - now;

  assert.ok(diffMs > 290000 && diffMs <= 300000, 'Snoozed timer should be ~5 minutes');
  assert.equal(updatedState.sessionGlassesDrank, 0, 'Snoozing should not increment drink count');
});

test('8. Reset Session Works', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();
  await manager.confirmHydration();

  let state = await manager.getState();
  assert.equal(state.sessionGlassesDrank, 1);
  const oldSessionId = state.sessionId;

  // Reset Session
  const result = await manager.initSession(true);
  state = result.state;

  assert.notEqual(state.sessionId, oldSessionId, 'Session ID should change');
  assert.equal(state.sessionGlassesDrank, 0, 'Session drinks count should reset to 0');
  assert.equal(state.totalGlassesDrank, 1, 'Lifetime total glasses should NOT be reset');
});

test('9. Enable / Disable Reminders Toggle', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  // Disable reminders
  await manager.updateSettings({ timerActive: false });
  assert.equal(await mockChrome.alarms.get('max_water_reminder_alarm'), null, 'Alarm should be cleared when disabled');

  // Alarm firing while disabled should be ignored
  const alarmResult = await manager.handleAlarm();
  assert.equal(alarmResult.triggered, false, 'Disabled timer must ignore alarms');

  // Re-enable reminders
  await manager.updateSettings({ timerActive: true });
  assert.ok(await mockChrome.alarms.get('max_water_reminder_alarm'), 'Alarm should be re-scheduled when enabled');
});

test('10. Restricted Pages Fallback to System Notifications Gracefully', async () => {
  const mockChrome = new MockChrome();
  // Simulate active tab on chrome://extensions
  mockChrome.tabsList = [{ id: 99, url: 'chrome://extensions', active: true }];

  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  // Trigger reminder broadcast
  const sentToTab = await manager.broadcastReminder("Drink water! 💧");

  assert.equal(sentToTab, false, 'Should not inject into restricted chrome:// URL');
  assert.equal(mockChrome.createdNotifications.length, 1, 'Should trigger Chrome system notification fallback');
  assert.ok(mockChrome.createdNotifications[0].options.message.includes('Drink water'), 'Fallback notification should contain quote');
});
