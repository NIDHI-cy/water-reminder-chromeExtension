/**
 * Max's Water Reminder - 80s Retro Synth Audio Generator
 * Uses Web Audio API to create authentic 80s synth chimes and victory tones
 * without requiring external sound files or network requests.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a dreamy 80s synthwave reminder chime
 */
export function playReminderTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 80s Synth chord arpeggio: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), E6 (1318.51Hz)
    const notes = [659.25, 830.61, 987.77, 1318.51];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Warm analog lowpass filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      const noteStart = now + index * 0.12;
      const noteEnd = noteStart + 0.45;

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd);
    });
  } catch (err) {
    console.debug('[Max Reminder] Audio tone playback skipped:', err);
  }
}

/**
 * Play an 80s arcade victory / level-up chime for "I DRANK 💧"
 */
export function playDrankTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Happy ascending fanfare: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), E6 (1318.51)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      const noteStart = now + index * 0.08;
      const noteEnd = noteStart + 0.35;

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd);
    });
  } catch (err) {
    console.debug('[Max Reminder] Victory tone playback skipped:', err);
  }
}
