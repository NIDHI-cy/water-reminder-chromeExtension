/**
 * Max's Water Reminder - Shared Utilities
 */

import { MAX_QUOTES } from './constants.js';

/**
 * Returns a random quote from Max's quote list
 * @param {string[]} [excludeQuotes] - Optional quotes to avoid immediate repeats
 */
export function getRandomQuote(excludeQuotes = []) {
  const pool = MAX_QUOTES.filter(q => !excludeQuotes.includes(q));
  const activePool = pool.length > 0 ? pool : MAX_QUOTES;
  const index = Math.floor(Math.random() * activePool.length);
  return activePool[index];
}

/**
 * Formats milliseconds remaining into mm:ss
 * @param {number} msRemaining 
 * @returns {string} "MM:SS"
 */
export function formatCountdown(msRemaining) {
  if (msRemaining <= 0 || !Number.isFinite(msRemaining)) {
    return '00:00';
  }
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats duration into human readable string: e.g. "1h 14m" or "42m" or "< 1m"
 * @param {number} ms 
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  if (totalMinutes < 1) return '< 1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Gets formatted date string YYYY-MM-DD
 * @param {Date} [date]
 * @returns {string}
 */
export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a unique session identifier
 * @returns {string}
 */
export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Resolves the effective interval in minutes based on settings
 * @param {Object} settings 
 * @returns {number}
 */
export function getEffectiveIntervalMinutes(settings) {
  if (settings.isDevMode) {
    return Number(settings.devIntervalMinutes) || 1;
  }
  return Number(settings.prodIntervalMinutes) || 30;
}
