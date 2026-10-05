/**
 * Max's Water Reminder - Content Script
 * Executes in webpage context. Uses Shadow DOM to isolate styles completely.
 * Self-contained for zero-latency instant rendering and 100% CSP compatibility.
 */

(function () {
  'use strict';

  // Prevent double injection of content script
  if (window.__MAX_WATER_REMINDER_INJECTED__) return;
  window.__MAX_WATER_REMINDER_INJECTED__ = true;

  const MESSAGE_TYPES = {
    SHOW_REMINDER: 'MAX_SHOW_REMINDER',
    HIDE_REMINDER: 'MAX_HIDE_REMINDER',
    CONFIRM_HYDRATION: 'MAX_CONFIRM_HYDRATION',
    SNOOZE_REMINDER: 'MAX_SNOOZE_REMINDER'
  };

  // Web Audio 80s Synth Tones
  let audioCtx = null;
  function getAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    } catch {
      return null;
    }
  }

  function playTone(type) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'reminder') {
        // Dreamy 80s chord arpeggio
        const notes = [659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2400, now);

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          const start = now + idx * 0.12;
          const end = start + 0.45;

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.18, start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, end);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(end);
        });
      } else if (type === 'victory') {
        // 80s Arcade victory chime
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          const start = now + idx * 0.08;
          const end = start + 0.35;

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, end);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(end);
        });
      }
    } catch (e) {
      console.debug('[Max Reminder] Audio playback suppressed:', e);
    }
  }

  // Scoped CSS for Shadow DOM
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

    .max-card-wrapper {
      pointer-events: auto !important;
      width: 320px !important;
      background: rgba(14, 11, 23, 0.95) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      border-radius: 20px !important;
      border: 1.5px solid rgba(255, 0, 127, 0.45) !important;
      box-shadow: 
        0 12px 36px rgba(0, 0, 0, 0.65),
        0 0 24px rgba(255, 0, 127, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 0 16px rgba(0, 245, 212, 0.08) !important;
      padding: 20px !important;
      color: #ffffff !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      position: relative !important;
      overflow: hidden !important;
      animation: maxSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      transition: transform 0.25s ease, border-color 0.3s ease !important;
    }

    .max-card-wrapper:hover {
      border-color: rgba(0, 245, 212, 0.6) !important;
      box-shadow: 
        0 16px 42px rgba(0, 0, 0, 0.75),
        0 0 32px rgba(0, 245, 212, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
    }

    .max-card-wrapper.max-hiding {
      animation: maxSlideOut 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards !important;
    }

    .max-card-wrapper.max-wiggle {
      animation: maxWiggle 0.6s ease !important;
    }

    .max-grid-overlay {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background-image: 
        linear-gradient(rgba(255, 0, 127, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 0, 127, 0.06) 1px, transparent 1px) !important;
      background-size: 20px 20px !important;
      pointer-events: none !important;
      opacity: 0.6 !important;
    }

    .max-top-line {
      position: absolute !important;
      top: 0 !important;
      left: 15% !important;
      right: 15% !important;
      height: 2px !important;
      background: linear-gradient(90deg, transparent, #ff007f, #00f5d4, transparent) !important;
      box-shadow: 0 0 6px #00f5d4 !important;
    }

    .max-card-header {
      width: 100% !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      position: relative !important;
      z-index: 2 !important;
      margin-bottom: 12px !important;
    }

    .max-tag-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      padding: 3px 8px !important;
      border-radius: 999px !important;
      background: rgba(255, 0, 127, 0.15) !important;
      border: 1px solid rgba(255, 0, 127, 0.4) !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      color: #ff5493 !important;
      box-shadow: 0 0 10px rgba(255, 0, 127, 0.2) !important;
    }

    .max-tag-dot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 50% !important;
      background: #00f5d4 !important;
      box-shadow: 0 0 6px #00f5d4 !important;
      animation: maxPulse 1.8s infinite !important;
    }

    .max-close-btn {
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.5) !important;
      font-size: 18px !important;
      line-height: 1 !important;
      width: 24px !important;
      height: 24px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }

    .max-close-btn:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.15) !important;
      transform: scale(1.1) !important;
    }

    .max-avatar-container {
      position: relative !important;
      width: 80px !important;
      height: 80px !important;
      margin-bottom: 12px !important;
      z-index: 2 !important;
    }

    .max-avatar-glow {
      position: absolute !important;
      top: -3px !important;
      left: -3px !important;
      right: -3px !important;
      bottom: -3px !important;
      border-radius: 50% !important;
      background: conic-gradient(from 180deg at 50% 50%, #ff007f, #00f5d4, #ffb703, #ff007f) !important;
      opacity: 0.75 !important;
      filter: blur(5px) !important;
      animation: maxSpin 8s linear infinite !important;
    }

    .max-avatar-img {
      position: relative !important;
      width: 80px !important;
      height: 80px !important;
      border-radius: 50% !important;
      object-fit: cover !important;
      border: 2px solid #00f5d4 !important;
      background: #140c24 !important;
      display: block !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4) !important;
      transition: transform 0.3s ease !important;
    }

    .max-avatar-container:hover .max-avatar-img {
      transform: scale(1.05) rotate(2deg) !important;
    }

    .max-content {
      text-align: center !important;
      z-index: 2 !important;
      margin-bottom: 14px !important;
      width: 100% !important;
    }

    .max-title {
      font-size: 15px !important;
      font-weight: 800 !important;
      letter-spacing: 0.5px !important;
      color: #ffffff !important;
      margin-bottom: 6px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      text-shadow: 0 0 12px rgba(0, 245, 212, 0.4) !important;
    }

    .max-message {
      font-size: 13.5px !important;
      line-height: 1.45 !important;
      color: #e5e7eb !important;
      font-weight: 450 !important;
      padding: 0 4px !important;
      min-height: 38px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .max-actions {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      width: 100% !important;
      z-index: 2 !important;
    }

    .max-btn-drink {
      position: relative !important;
      overflow: hidden !important;
      width: 100% !important;
      padding: 12px 18px !important;
      border-radius: 12px !important;
      border: none !important;
      background: linear-gradient(135deg, #00f5d4 0%, #00b4d8 60%, #4361ee 100%) !important;
      color: #0c0914 !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      letter-spacing: 0.5px !important;
      cursor: pointer !important;
      box-shadow: 
        0 4px 16px rgba(0, 245, 212, 0.35),
        0 0 8px rgba(0, 245, 212, 0.2) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    .max-btn-drink:hover {
      transform: translateY(-2px) !important;
      box-shadow: 
        0 6px 22px rgba(0, 245, 212, 0.55),
        0 0 12px rgba(0, 245, 212, 0.4) !important;
      filter: brightness(1.08) !important;
    }

    .max-btn-drink:active {
      transform: translateY(1px) scale(0.98) !important;
    }

    .max-btn-drink.max-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 18px rgba(16, 185, 129, 0.5) !important;
      animation: maxPop 0.3s ease !important;
    }

    .max-btn-secondary-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      width: 100% !important;
      padding: 0 4px !important;
    }

    .max-btn-snooze {
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.55) !important;
      font-size: 11.5px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      padding: 4px 6px !important;
      border-radius: 6px !important;
      transition: all 0.2s ease !important;
    }

    .max-btn-snooze:hover {
      color: #00f5d4 !important;
      background: rgba(0, 245, 212, 0.1) !important;
    }

    .max-session-meta {
      font-size: 11px !important;
      color: rgba(255, 255, 255, 0.4) !important;
      font-family: monospace !important;
    }

    @keyframes maxSlideIn {
      0% {
        opacity: 0;
        transform: translateX(80px) scale(0.92);
      }
      70% {
        transform: translateX(-6px) scale(1.02);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes maxSlideOut {
      0% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateX(80px) scale(0.9);
      }
    }

    @keyframes maxWiggle {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-3deg); }
      40% { transform: rotate(3deg); }
      60% { transform: rotate(-2deg); }
      80% { transform: rotate(1deg); }
    }

    @keyframes maxSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes maxPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    @keyframes maxPop {
      0% { transform: scale(0.95); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;

  class CardManager {
    constructor() {
      this.hostId = 'max-water-reminder-host';
      this.hostEl = null;
      this.shadowRoot = null;
      this.isDismissing = false;
    }

    show({ quote = "Hey! 💧 You've been here for 30 minutes. Drink some water!", intervalMinutes = 30, soundEnabled = true } = {}) {
      // Prevent duplicate reminder cards: if one is already visible, wiggle it and update text
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

      // Play 80s synth reminder tone if enabled
      if (soundEnabled) {
        playTone('reminder');
      }

      // Create host element
      this.hostEl = document.createElement('div');
      this.hostEl.id = this.hostId;
      this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });

      // Resolve character avatar URL
      let avatarSvgUrl = '';
      let avatarPngUrl = '';
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          avatarSvgUrl = chrome.runtime.getURL('assets/characters/max-avatar.svg');
          avatarPngUrl = chrome.runtime.getURL('assets/characters/max-avatar.png');
        }
      } catch {
        avatarSvgUrl = '';
        avatarPngUrl = '';
      }

      this.shadowRoot.innerHTML = `
        <style>
          ${STYLES}
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
                 src="${avatarSvgUrl}" 
                 alt="Max - Hydration Companion"
                 onerror="this.onerror=null; this.src='${avatarPngUrl}'" />
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

      // Event listeners inside Shadow DOM
      const drinkBtn = this.shadowRoot.querySelector('#max-btn-drink');
      const snoozeBtn = this.shadowRoot.querySelector('#max-btn-snooze');
      const closeBtn = this.shadowRoot.querySelector('#max-close-btn');

      // "I DRANK 💧" Click Handler
      drinkBtn.addEventListener('click', async () => {
        if (this.isDismissing) return;
        this.isDismissing = true;

        drinkBtn.classList.add('max-success');
        drinkBtn.innerHTML = `<span>Nice! 💧✨</span>`;

        if (soundEnabled) {
          playTone('victory');
        }

        try {
          if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CONFIRM_HYDRATION });
          }
        } catch (err) {
          console.debug('[Max Reminder] confirm drink send failed:', err);
        }

        setTimeout(() => {
          this.dismiss();
        }, 1100);
      });

      // Snooze Click Handler
      snoozeBtn.addEventListener('click', () => {
        if (this.isDismissing) return;
        this.isDismissing = true;

        try {
          if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.SNOOZE_REMINDER,
              data: { minutes: 5 }
            });
          }
        } catch (err) {
          console.debug('[Max Reminder] snooze send failed:', err);
        }

        this.dismiss();
      });

      // Close Button
      closeBtn.addEventListener('click', () => {
        this.dismiss();
      });

      // Escape key listener
      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          window.removeEventListener('keydown', onKeyDown);
          this.dismiss();
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Mount into DOM safely
      (document.body || document.documentElement).appendChild(this.hostEl);
    }

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
        this.isDismissing = false;
      }
    }
  }

  const cardManager = new CardManager();

  // Listen for messages from background service worker
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { type, data } = message || {};

      if (type === MESSAGE_TYPES.SHOW_REMINDER) {
        cardManager.show({
          quote: data?.quote,
          intervalMinutes: data?.intervalMinutes,
          soundEnabled: data?.soundEnabled
        });
        sendResponse({ success: true });
        return true;
      }

      if (type === MESSAGE_TYPES.HIDE_REMINDER) {
        cardManager.dismiss();
        sendResponse({ success: true });
        return true;
      }
    });
  }
})();
