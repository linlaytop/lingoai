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

// ===== 豆包 TTS 配置 =====
const TTS_CONFIG_KEY = 'lingoai_tts_config';

export interface TtsConfig {
  enabled: boolean;
  workerUrl: string;
  speaker: string;
}

const DEFAULT_TTS_CONFIG: TtsConfig = {
  enabled: true,
  workerUrl: 'https://doubao-tts.linlaytop.workers.dev/',
  speaker: 'zh_female_shaoergushi_mars_bigtts',
};

export function getTtsConfig(): TtsConfig {
  try {
    const raw = localStorage.getItem(TTS_CONFIG_KEY);
    if (raw) return { ...DEFAULT_TTS_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_TTS_CONFIG;
}

export function setTtsConfig(config: Partial<TtsConfig>) {
  const current = getTtsConfig();
  const next = { ...current, ...config };
  localStorage.setItem(TTS_CONFIG_KEY, JSON.stringify(next));
  return next;
}

// 豆包 TTS 音频缓存（避免重复请求同一个词）
const ttsCache = new Map<string, string>();

/**
 * 豆包 TTS 语音合成（通过 Cloudflare Worker 代理）
 * 返回音频 blob URL，失败时返回 null
 */
async function speakDoubao(text: string, options: SpeakOptions = {}): Promise<boolean> {
  const config = getTtsConfig();
  if (!config.enabled || !config.workerUrl) return false;

  const { speed = 'normal' } = options;
  const speechRate = speed === 'slow' ? -20 : speed === 'fast' ? 30 : 0;

  // 缓存命中
  const cacheKey = `${text}|${config.speaker}|${speechRate}`;
  if (ttsCache.has(cacheKey)) {
    return playAudioUrl(ttsCache.get(cacheKey)!, options);
  }

  try {
    if (options.onStart) options.onStart();

    const resp = await fetch(config.workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speaker: config.speaker,
        speed: speechRate,
      }),
    });

    if (!resp.ok) {
      console.warn('[豆包TTS] 请求失败:', resp.status);
      return false;
    }

    const blob = await resp.blob();
    if (blob.size === 0) return false;

    const url = URL.createObjectURL(blob);
    ttsCache.set(cacheKey, url);
    return playAudioUrl(url, options);
  } catch (err) {
    console.warn('[豆包TTS] 调用异常，回退到浏览器TTS:', err);
    return false;
  }
}

/** 播放音频 URL */
function playAudioUrl(url: string, options: SpeakOptions = {}): boolean {
  const audio = new Audio(url);
  audio.playbackRate = 1;
  if (options.onStart) audio.onplay = options.onStart;
  if (options.onEnd) audio.onended = options.onEnd;
  audio.play().catch(() => {});
  return true;
}

/**
 * Native Browser TTS with voice selection
 */
export async function speakNative(text: string, options: SpeakOptions & { lang?: string } = {}) {
  // 优先使用豆包 TTS（仅英文场景）
  const { lang = 'en-US' } = options;
  if (lang.startsWith('en')) {
    const ok = await speakDoubao(text, options);
    if (ok) return;
  }

  if (!('speechSynthesis' in window)) return;

  const { speed = 'normal', rate, gender, onStart, onEnd } = options;

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
