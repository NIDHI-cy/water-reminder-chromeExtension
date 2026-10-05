/**
 * Duck's Water Reminder - Session Manager Test Suite
 * Validates 30-minute session lifecycle, sleep detection, alarm scheduling, and drink tracking.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SessionManager } from '../background/session-manager.js';
import { MockChrome } from './mock-chrome.js';
import { MESSAGE_TYPES } from '../shared/constants.js';

test('1. Session Initialization - Fresh Start', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);

  const { state, settings, isNewSession } = await manager.initSession();

  assert.equal(isNewSession, true, 'First run should create a brand new session');
  assert.ok(state.sessionId, 'Session ID must be generated');
  assert.ok(state.sessionStartTime, 'Session start timestamp must be set');

  // Verify 30-minute interval
  assert.equal(settings.intervalMinutes, 30, 'Reminder interval must be exactly 30 minutes');

  // Verify alarm was scheduled
  assert.ok(mockChrome.alarmMap.get('max_water_reminder_alarm'), 'Hydration alarm must be scheduled');
});

test('2. Timer State is Persisted in Storage', async () => {
  const mockChrome = new MockChrome();
  const manager1 = new SessionManager(mockChrome);

  await manager1.initSession();
  await manager1.confirmHydration();

  const manager2 = new SessionManager(mockChrome);
  const state = await manager2.getState();
  const settings = await manager2.getSettings();

  assert.equal(state.todayGlassesDrank, 1, 'Persisted drink count should be restored');
  assert.equal(settings.intervalMinutes, 30, 'Persisted 30m interval should be restored');
});

test('3. Sleep / Long Inactivity Detection - Prevents Reminder Backlog', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  const initial = await manager.initSession();

  // Simulate laptop sleep/wake after 4 hours
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  await manager.saveState({ lastActiveTimestamp: fourHoursAgo });

  const result = await manager.handleAlarm();

  assert.equal(result.triggered, false, 'Stale reminder must NOT be triggered after long sleep');
  assert.equal(result.action, 'session_reset', 'Session should be automatically reset');

  const state = await manager.getState();
  const now = Date.now();
  const diffMs = state.nextReminderTimestamp - now;
  assert.ok(diffMs > 1700000, 'Fresh session timer should start from 0 for 30 minutes');
  assert.notEqual(state.sessionId, initial.state.sessionId, 'New session ID should be created');
});

test('4. Normal Alarm Execution - 30-Minute Reminder Triggered', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  const result = await manager.handleAlarm();

  assert.equal(result.triggered, true, 'Reminder should trigger on normal alarm');
  assert.ok(result.quote, 'Reminder should include a cute duck quote');

  assert.equal(mockChrome.sentTabMessages.length, 1, 'Reminder message should be sent to active tab');
  assert.equal(mockChrome.sentTabMessages[0].message.type, MESSAGE_TYPES.SHOW_REMINDER);
});

test('5. "I DRANK 💧" Updates Count and Reschedules 30-Minute Timer', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  const stateBefore = await manager.getState();
  assert.equal(stateBefore.todayGlassesDrank, 0);

  const updatedState = await manager.confirmHydration();

  assert.equal(updatedState.todayGlassesDrank, 1, 'Today glasses should increment');
  assert.ok(updatedState.lastHydrationTimestamp, 'Last hydration timestamp must be recorded');

  // Verify next reminder is scheduled for full 30 minutes from now
  const now = Date.now();
  const diffMs = updatedState.nextReminderTimestamp - now;
  assert.ok(diffMs > 1700000 && diffMs <= 1800000, 'Next reminder should be scheduled for 30m');
});

test('6. Reset Session Works', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  const state1 = await manager.getState();
  const oldSessionId = state1.sessionId;

  const result = await manager.initSession(true);
  const state2 = result.state;

  assert.notEqual(state2.sessionId, oldSessionId, 'Session ID should change on reset');
});

test('7. Enable / Disable Reminders Toggle', async () => {
  const mockChrome = new MockChrome();
  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  await manager.updateSettings({ timerActive: false });
  assert.equal(await mockChrome.alarms.get('max_water_reminder_alarm'), null, 'Alarm should be cleared when disabled');

  const alarmResult = await manager.handleAlarm();
  assert.equal(alarmResult.triggered, false, 'Disabled timer must ignore alarms');

  await manager.updateSettings({ timerActive: true });
  assert.ok(await mockChrome.alarms.get('max_water_reminder_alarm'), 'Alarm should be re-scheduled when enabled');
});

test('8. Restricted Pages Fallback to System Notifications Gracefully', async () => {
  const mockChrome = new MockChrome();
  mockChrome.tabsList = [{ id: 99, url: 'chrome://extensions', active: true }];

  const manager = new SessionManager(mockChrome);
  await manager.initSession();

  const sentToTab = await manager.broadcastReminder("Quack! Drink water! 💧");

  assert.equal(sentToTab, false, 'Should not inject into restricted chrome:// URL');
  assert.equal(mockChrome.createdNotifications.length, 1, 'Should trigger Chrome system notification fallback');
});
