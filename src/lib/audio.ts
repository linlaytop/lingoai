// Speed options for non-native speakers
export type SpeechSpeed = 'fast' | 'normal' | 'slow';

interface SpeakOptions {
  speed?: SpeechSpeed;
  rate?: number;
  useNeural?: boolean;
  gender?: 'male' | 'female';
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Native Browser TTS with voice selection
 */
export async function speakNative(text: string, options: SpeakOptions & { lang?: string } = {}) {
  if (!('speechSynthesis' in window)) return;

  const { speed = 'normal', rate, gender, onStart, onEnd, lang = 'en-US' } = options;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  if (rate) {
    utterance.rate = rate;
  } else {
    utterance.rate = speed === 'slow' ? 0.6 : speed === 'fast' ? 1.1 : 0.85;
  }

  const voices = window.speechSynthesis.getVoices();

  let selectedVoice = voices.find(v =>
    v.lang.startsWith(lang.split('-')[0]) &&
    (v.name.includes('Google') || v.name.includes('Neural')) &&
    (gender ? (gender === 'male' ? (v.name.includes('Male') || v.name.includes('David')) : (v.name.includes('Female') || v.name.includes('Samantha'))) : true)
  );

  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

/**
 * Specifically for Chinese TTS
 */
export function speakChinese(text: string, options: SpeakOptions = {}) {
  speakNative(text, { ...options, lang: 'zh-CN', rate: 0.95 });
}

/**
 * High-quality TTS - uses browser speech synthesis (local mode)
 */
export async function speakGemini(text: string, options: SpeakOptions = {}) {
  // In local mode, fall back to native browser TTS
  return speakNative(text, options);
}

/**
 * Play a simple success chime using AudioContext
 */
export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);

    const playNote = (freq: number, startTime: number) => {
      const g = audioContext.createGain();
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      g.connect(masterGain);
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(g);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    };

    playNote(660, audioContext.currentTime);
    playNote(880, audioContext.currentTime + 0.1);

    setTimeout(() => audioContext.close(), 1500);
  } catch (e) {
    console.error("Failed to play success sound:", e);
  }
}

/**
 * Play a subtle UI click sound
 */
export function playClickSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.05);
    setTimeout(() => audioContext.close(), 100);
  } catch (e) {}
}

/**
 * Play a error/failure sound
 */
export function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(80, audioContext.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
    setTimeout(() => audioContext.close(), 300);
  } catch (e) {}
}

/**
 * Universal speak function that respects user preference
 */
export function speak(text: string, options: SpeakOptions = {}) {
  // Always use native browser TTS in local mode
  speakNative(text, options);
}
