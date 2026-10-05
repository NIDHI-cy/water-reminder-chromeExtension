/**
 * Max's Water Reminder - Shadow DOM Floating Card Component
 * Fully encapsulated from host page styles.
 */

import { MESSAGE_TYPES } from '../shared/constants.js';
import { playReminderTone, playDrankTone } from '../shared/synth-audio.js';

export class MaxReminderCard {
  constructor() {
    this.hostId = 'max-water-reminder-host';
    this.hostEl = null;
    this.shadowRoot = null;
    this.isDismissing = false;
  }

  /**
   * Shows the reminder card in the top-right corner.
   * If a card is already visible, wiggles it and updates text to prevent duplicate cards.
   */
  async show({
    quote = "Hey! 💧 You've been here for 30 minutes. Drink some water!",
    intervalMinutes = 30,
    soundEnabled = true,
    cssText = ''
  } = {}) {
    // 1. Prevent duplicate cards
    const existingHost = document.getElementById(this.hostId);
    if (existingHost && existingHost.shadowRoot) {
      const card = existingHost.shadowRoot.querySelector('.max-card-wrapper');
      if (card) {
        card.classList.remove('max-wiggle');
        void card.offsetWidth; // trigger reflow
        card.classList.add('max-wiggle');

        const messageEl = existingHost.shadowRoot.querySelector('.max-message');
        if (messageEl && quote) {
          messageEl.textContent = quote;
        }
      }
      return;
    }

    // 2. Play 80s synth reminder tone if enabled
    if (soundEnabled) {
      playReminderTone();
    }

    // 3. Create host element
    this.hostEl = document.createElement('div');
    this.hostEl.id = this.hostId;
    this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });

    // 4. Resolve character avatar URL
    let avatarUrl = '';
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        avatarUrl = chrome.runtime.getURL('assets/characters/max-avatar.svg');
      }
    } catch {
      avatarUrl = '';
    }

    // 5. Build template
    this.shadowRoot.innerHTML = `
      <style>
        ${cssText}
      </style>
      <div class="max-card-wrapper" role="dialog" aria-labelledby="max-card-title">
        <div class="max-grid-overlay"></div>
        <div class="max-top-line"></div>

        <header class="max-card-header">
          <div class="max-tag-badge">
            <span class="max-tag-dot"></span>
            <span>HYDRATION CHECK</span>
          </div>
          <button class="max-close-btn" id="max-close-btn" title="Dismiss (Esc)" aria-label="Close reminder">×</button>
        </header>

        <div class="max-avatar-container">
          <div class="max-avatar-glow"></div>
          <img class="max-avatar-img" 
               src="${avatarUrl}" 
               alt="Max - Hydration Companion"
               onerror="this.onerror=null; this.src='${avatarUrl.replace('.svg', '.png')}'" />
        </div>

        <div class="max-content">
          <h2 class="max-title" id="max-card-title">Hey! [ MAX ] 💧</h2>
          <p class="max-message">${quote}</p>
        </div>

        <div class="max-actions">
          <button class="max-btn-drink" id="max-btn-drink">
            <span>I DRANK</span>
            <span>💧</span>
          </button>

          <div class="max-btn-secondary-row">
            <button class="max-btn-snooze" id="max-btn-snooze">Snooze 5m</button>
            <span class="max-session-meta">${intervalMinutes}m interval</span>
          </div>
        </div>
      </div>
    `;

    // 6. Bind interactions
    const cardWrapper = this.shadowRoot.querySelector('.max-card-wrapper');
    const drinkBtn = this.shadowRoot.querySelector('#max-btn-drink');
    const snoozeBtn = this.shadowRoot.querySelector('#max-btn-snooze');
    const closeBtn = this.shadowRoot.querySelector('#max-close-btn');

    // "I DRANK 💧" Click Handler
    drinkBtn.addEventListener('click', async () => {
      if (this.isDismissing) return;
      this.isDismissing = true;

      // Positive visual feedback
      drinkBtn.classList.add('max-success');
      drinkBtn.innerHTML = `<span>Nice! 💧✨</span>`;

      // Play 80s arcade victory sound
      if (soundEnabled) {
        playDrankTone();
      }

      // Notify background service worker to record hydration & reschedule
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.CONFIRM_HYDRATION
          });
        }
      } catch (err) {
        console.debug('[Max Reminder] confirm drink message failed:', err);
      }

      // Smooth slide out
      setTimeout(() => {
        this.dismiss();
      }, 1000);
    });

    // Snooze Click Handler
    snoozeBtn.addEventListener('click', async () => {
      if (this.isDismissing) return;
      this.isDismissing = true;

      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.SNOOZE_REMINDER,
            data: { minutes: 5 }
          });
        }
      } catch (err) {
        console.debug('[Max Reminder] snooze message failed:', err);
      }

      this.dismiss();
    });

    // Close button handler
    closeBtn.addEventListener('click', () => {
      this.dismiss();
    });

    // Keyboard shortcut (Escape to dismiss)
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        this.dismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // 7. Mount into DOM
    document.body.appendChild(this.hostEl);
  }

  /**
   * Smoothly animates out and destroys the card
   */
  dismiss() {
    if (!this.hostEl) return;
    const card = this.shadowRoot?.querySelector('.max-card-wrapper');
    if (card) {
      card.classList.add('max-hiding');
      setTimeout(() => {
        if (this.hostEl && this.hostEl.parentNode) {
          this.hostEl.parentNode.removeChild(this.hostEl);
        }
        this.hostEl = null;
        this.shadowRoot = null;
        this.isDismissing = false;
      }, 400);
    } else {
      if (this.hostEl && this.hostEl.parentNode) {
        this.hostEl.parentNode.removeChild(this.hostEl);
      }
      this.hostEl = null;
    }
  }
}
