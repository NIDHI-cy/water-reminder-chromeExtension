/**
 * Max's Water Reminder - Shared Utilities
 */

import { DUCK_QUOTES } from './constants.js';

/**
 * Returns a random quote from Duck's quote list
 * @param {string[]} [excludeQuotes]
 */
export function getRandomQuote(excludeQuotes = []) {
  const pool = DUCK_QUOTES.filter(q => !excludeQuotes.includes(q));
  const activePool = pool.length > 0 ? pool : DUCK_QUOTES;
  const index = Math.floor(Math.random() * activePool.length);
  return activePool[index];
}

/**
 * Formats milliseconds remaining into MM:SS
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
