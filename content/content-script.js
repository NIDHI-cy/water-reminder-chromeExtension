/**
 * Duck Water Reminder - Content Script
 * Displays a cute, cozy floating reminder card in the top-right corner.
 * Encapsulated via Shadow DOM with zero styling bleed.
 */

(function () {
  'use strict';

  if (window.__DUCK_WATER_REMINDER_INJECTED__) return;
  window.__DUCK_WATER_REMINDER_INJECTED__ = true;

  const MESSAGE_TYPES = {
    SHOW_REMINDER: 'MAX_SHOW_REMINDER',
    HIDE_REMINDER: 'MAX_HIDE_REMINDER',
    CONFIRM_HYDRATION: 'MAX_CONFIRM_HYDRATION'
  };

  // Gentle synth chime for water reminders
  let audioCtx = null;
  function getAudioContext() {
    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioClass) return null;
      if (!audioCtx) audioCtx = new AudioClass();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    } catch {
      return null;
    }
  }

  function playChime(isVictory = false) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (!isVictory) {
        // Soft water drop chord: C5 -> E5 -> G5
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.45);
        });
      } else {
        // Cheerful victory sound: G5 -> C6
        const notes = [783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.4);
        });
      }
    } catch {
      // Audio playback suppressed safely
    }
  }

  const STYLES = `
    :host {
      all: initial !important;
      position: fixed !important;
      top: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      pointer-events: none !important;
    }

    * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      user-select: none !important;
      -webkit-font-smoothing: antialiased !important;
    }

    .duck-card-wrapper {
      pointer-events: auto !important;
      width: 270px !important;
      background: #f5f2e8 !important;
      background-image: 
        linear-gradient(rgba(0, 0, 0, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.035) 1px, transparent 1px) !important;
      background-size: 18px 18px !important;
      border-radius: 22px !important;
      border: 1px solid #e4dec8 !important;
      box-shadow: 
        0 14px 34px rgba(0, 0, 0, 0.14),
        0 2px 8px rgba(0, 0, 0, 0.06) !important;
      padding: 18px 20px !important;
      color: #1a1a1a !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      position: relative !important;
      animation: duckSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      transition: transform 0.2s ease, opacity 0.25s ease !important;
    }

    .duck-card-wrapper.duck-hiding {
      animation: duckSlideOut 0.35s cubic-bezier(0.7, 0, 0.84, 0) forwards !important;
    }

    .duck-card-wrapper.duck-wiggle {
      animation: duckWiggle 0.5s ease !important;
    }

    .duck-card-header {
      width: 100% !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 8px !important;
    }

    .duck-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #555555 !important;
      background: #e6dfce !important;
      padding: 3px 8px !important;
      border-radius: 999px !important;
    }

    .duck-close-btn {
      background: transparent !important;
      border: none !important;
      color: #888888 !important;
      font-size: 18px !important;
      line-height: 1 !important;
      width: 22px !important;
      height: 22px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: background 0.15s, color 0.15s !important;
    }

    .duck-close-btn:hover {
      background: #e2dbca !important;
      color: #111111 !important;
    }

    .duck-sprite-container {
      width: 72px !important;
      height: 80px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin-bottom: 6px !important;
    }

    .duck-sprite {
      width: 70px !important;
      height: auto !important;
      image-rendering: -webkit-optimize-contrast !important;
      animation: duckBob 2.5s ease-in-out infinite !important;
    }

    .duck-content {
      text-align: center !important;
      margin-bottom: 14px !important;
      width: 100% !important;
    }

    .duck-title {
      font-size: 17px !important;
      font-weight: 800 !important;
      color: #181818 !important;
      margin-bottom: 3px !important;
      letter-spacing: -0.3px !important;
    }

    .duck-message {
      font-size: 12.5px !important;
      line-height: 1.4 !important;
      color: #5a5a5a !important;
      font-weight: 500 !important;
    }

    .duck-btn-drink {
      width: 100% !important;
      padding: 10px 18px !important;
      border-radius: 999px !important;
      border: none !important;
      background: #2b3a2f !important;
      color: #ffffff !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      box-shadow: 0 3px 10px rgba(43, 58, 47, 0.22) !important;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    .duck-btn-drink:hover {
      background: #1e2921 !important;
      transform: translateY(-1.5px) !important;
      box-shadow: 0 5px 14px rgba(43, 58, 47, 0.3) !important;
    }

    .duck-btn-drink:active {
      transform: translateY(1px) !important;
    }

    .duck-btn-drink.success {
      background: #2d6a4f !important;
    }

    @keyframes duckSlideIn {
      0% {
        opacity: 0;
        transform: translateX(60px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes duckSlideOut {
      0% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateX(60px) scale(0.95);
      }
    }

    @keyframes duckWiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-4deg); }
      75% { transform: rotate(4deg); }
    }

    @keyframes duckBob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `;

  class DuckCardManager {
    constructor() {
      this.hostId = 'duck-water-reminder-host';
      this.hostEl = null;
      this.shadowRoot = null;
      this.isDismissing = false;
    }

    show({ quote = "Quack! 💧 Time to drink some water.", soundEnabled = true } = {}) {
      const existingHost = document.getElementById(this.hostId);
      if (existingHost && existingHost.shadowRoot) {
        const card = existingHost.shadowRoot.querySelector('.duck-card-wrapper');
        if (card) {
          card.classList.remove('duck-wiggle');
          void card.offsetWidth;
          card.classList.add('duck-wiggle');
          const msg = existingHost.shadowRoot.querySelector('.duck-message');
          if (msg && quote) msg.textContent = quote;
        }
        return;
      }

      if (soundEnabled) {
        playChime(false);
      }

      this.hostEl = document.createElement('div');
      this.hostEl.id = this.hostId;
      this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });

      let duckUrl = '';
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          duckUrl = chrome.runtime.getURL('assets/characters/duck.png');
        }
      } catch {
        duckUrl = '';
      }

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <div class="duck-card-wrapper" role="dialog" aria-label="Duck Water Reminder">
          <header class="duck-card-header">
            <div class="duck-badge">
              <span>Duck</span>
              <span>🦆</span>
            </div>
            <button class="duck-close-btn" id="duck-close-btn" title="Close" aria-label="Close">×</button>
          </header>

          <div class="duck-sprite-container">
            <img src="${duckUrl}" alt="Cute Duck" class="duck-sprite">
          </div>

          <div class="duck-content">
            <h2 class="duck-title">Quack! 💧</h2>
            <p class="duck-message">${quote}</p>
          </div>

          <button class="duck-btn-drink" id="duck-btn-drink">
            <span>I DRANK 💧</span>
          </button>
        </div>
      `;

      const drinkBtn = this.shadowRoot.querySelector('#duck-btn-drink');
      const closeBtn = this.shadowRoot.querySelector('#duck-close-btn');

      drinkBtn.addEventListener('click', () => {
        if (this.isDismissing) return;
        this.isDismissing = true;

        drinkBtn.classList.add('success');
        drinkBtn.innerHTML = `<span>Good job! 🦆✨</span>`;

        if (soundEnabled) {
          playChime(true);
        }

        try {
          if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CONFIRM_HYDRATION });
          }
        } catch (err) {
          console.debug('[Duck Reminder] send confirm drink error:', err);
        }

        setTimeout(() => {
          this.dismiss();
        }, 1100);
      });

      closeBtn.addEventListener('click', () => {
        this.dismiss();
      });

      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          window.removeEventListener('keydown', onKeyDown);
          this.dismiss();
        }
      };
      window.addEventListener('keydown', onKeyDown);

      (document.body || document.documentElement).appendChild(this.hostEl);
    }

    dismiss() {
      if (!this.hostEl) return;
      const card = this.shadowRoot?.querySelector('.duck-card-wrapper');
      if (card) {
        card.classList.add('duck-hiding');
        setTimeout(() => {
          if (this.hostEl && this.hostEl.parentNode) {
            this.hostEl.parentNode.removeChild(this.hostEl);
          }
          this.hostEl = null;
          this.shadowRoot = null;
          this.isDismissing = false;
        }, 350);
      } else {
        if (this.hostEl && this.hostEl.parentNode) {
          this.hostEl.parentNode.removeChild(this.hostEl);
        }
        this.hostEl = null;
        this.isDismissing = false;
      }
    }
  }

  const manager = new DuckCardManager();

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { type, data } = message || {};

      if (type === MESSAGE_TYPES.SHOW_REMINDER) {
        manager.show({
          quote: data?.quote,
          soundEnabled: data?.soundEnabled
        });
        sendResponse({ success: true });
        return true;
      }

      if (type === MESSAGE_TYPES.HIDE_REMINDER) {
        manager.dismiss();
        sendResponse({ success: true });
        return true;
      }
    });
  }
})();
