import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music2, Mic2, Sparkles, Send, RotateCcw, Play, Pause, ListMusic, AudioLines, Download, Settings2, AlertCircle, Key, Upload, FileAudio, FileVideo, Loader2, Trash2, History as HistoryIcon, Save, Cloud, Repeat } from 'lucide-react';
import { generateRhyme, generateMusicTrack, transcribeMedia } from '../services/gemini';
import { speakNative as speak } from '../lib/audio';
import { storeMedia, getMedia, deleteMedia } from '../lib/storage';
import { cn } from '../lib/utils';
import { SongItem } from '../types';
import { User } from 'firebase/auth';

const MUSIC_STYLES = [
  { id: 'nursery', name: '儿歌/童谣', icon: '👶', prompt: 'cheerful English nursery rhyme' },
  { id: 'rap', name: '说唱/饶舌', icon: '🎤', prompt: 'energetic English rap with a strong beat' },
  { id: 'pop', name: '流行音乐', icon: '🎸', prompt: 'catchy English pop song with a clear melody' },
  { id: 'jazz', name: '爵士/慵懒', icon: '🎷', prompt: 'smooth English jazz ballad' },
];

interface AISongCreatorProps {
  showcaseList: SongItem[];
  onAddShowcase: (item: SongItem) => Promise<void>;
  onDeleteShowcase: (id: string) => Promise<void>;
  onUpdateShowcase: (id: string, data: Partial<SongItem>) => Promise<void>;
  currentUser: User | null;
}

export function AISongCreator({ showcaseList, onAddShowcase, onDeleteShowcase, onUpdateShowcase, currentUser }: AISongCreatorProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rhyme, setRhyme] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(MUSIC_STYLES[0]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const [mode, setMode] = useState<'rhyme' | 'music'>('music');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // localFilesCache stores File objects by their item ID to persist them during the session
  const [localFilesCache, setLocalFilesCache] = useState<Record<string, File>>({});
  // liveUrls stores the active blob URLs for the current session
  const [liveUrls, setLiveUrls] = useState<Record<string, string>>({});
  // localTempList stores files that are not yet synced or are just for local session
  const [localTempList, setLocalTempList] = useState<SongItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [focusedShowcaseId, setFocusedShowcaseId] = useState<string | null>(null);
  const [currentMediaTime, setCurrentMediaTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  const allShowcaseItems = [...showcaseList, ...localTempList].sort((a, b) => b.timestamp - a.timestamp);

  // Initialize live URLs from IndexedDB or remote sources
  useEffect(() => {
    let active = true;
    
    const loadLiveUrls = async () => {
      for (const item of allShowcaseItems) {
        // Use a ref-like check or just wait for the loop to finish and apply patches
        // Actually, checking 'liveUrls' within the async loop is tricky without state sync
        // We'll calculate which ones are MISSING and fetch them
      }
      
      const missingIds = allShowcaseItems
        .filter(item => !liveUrls[item.id])
        .map(item => item.id);

      if (missingIds.length === 0) return;

      const newUrls: Record<string, string> = {};
      let changed = false;

      for (const id of missingIds) {
        if (!active) break;
        const item = allShowcaseItems.find(i => i.id === id);
        if (!item) continue;

        try {
          const blob = await getMedia(id);
          if (blob) {
            newUrls[id] = URL.createObjectURL(blob);
            changed = true;
          } else if (item.url && !item.url.startsWith('blob:')) {
            newUrls[id] = item.url;
            changed = true;
          }
        } catch (e) {
          console.error("Failed to load media for item:", id, e);
        }
      }

      if (active && changed) {
        setLiveUrls(prev => ({ ...prev, ...newUrls }));
      }
    };

    loadLiveUrls();

    return () => {
      active = false;
    };
  }, [allShowcaseItems.length]); // Re-run when items are added/removed

  // Cleanup effect for revoked URLs
  useEffect(() => {
    return () => {
      Object.values(liveUrls).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  useEffect(() => {
    const item = allShowcaseItems.find(i => i.id === (focusedShowcaseId || allShowcaseItems[0]?.id));
    if (item && item.transcription) {
        const segments = parseTranscription(item.transcription);
        const currentLine = [...segments].reverse().find(s => s.time <= currentMediaTime);
        if (currentLine) {
            const idx = segments.indexOf(currentLine);
            const el = document.getElementById(`lyric-line-${idx}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
  }, [currentMediaTime, focusedShowcaseId, showcaseList]);

  const parseTranscription = (text: string) => {
    const lines = text.split('\n');
    const segments: { time: number; en: string; cn: string }[] = [];
    lines.forEach(line => {
      const match = line.match(/^\[(\d{2}):(\d{2})\]\s*(.*)\|(.*)/);
      if (match) {
        const mins = parseInt(match[1]);
        const secs = parseInt(match[2]);
        segments.push({ 
            time: mins * 60 + secs, 
            en: match[3].trim(), 
            cn: match[4].trim() 
        });
      } else {
          const simpleMatch = line.match(/^\[(\d{2}):(\d{2})\]\s*(.*)/);
          if (simpleMatch) {
            const mins = parseInt(simpleMatch[1]);
            const secs = parseInt(simpleMatch[2]);
            segments.push({ 
                time: mins * 60 + secs, 
                en: simpleMatch[3].trim(), 
                cn: '' 
            });
          }
      }
    });
    return segments;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        setAudioError("请上传音频或视频文件。");
        return;
    }

    setUploadedFile(file);
    setIsTranscribing(true);
    setAudioError(null);
    try {
        const text = await transcribeMedia(file);
        if (text) {
            setInput(text);
        } else {
            setAudioError("未能识别到英语内容，请尝试其他文件。");
        }
    } catch (error: any) {
        if (error.message === 'QUOTA_EXCEEDED') {
            setAudioError('⚠️ AI 额度已用完：免费版 Gemini 每天有调用上限。请稍后再试或先进行其他学习。');
        } else {
            setAudioError(error.message || "媒体解析失败");
        }
    } finally {
        setIsTranscribing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [isTranscribingItem, setIsTranscribingItem] = useState<string | null>(null);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFilesMap: Record<string, File> = {};
    const newItems = Array.from(files).map(file => {
      const id = Math.random().toString(36).substr(2, 9);
      newFilesMap[id] = file;
      const url = URL.createObjectURL(file);
      
      // Store in IndexedDB
      storeMedia(id, file);
      setLiveUrls(prev => ({ ...prev, [id]: url }));

      return {
        id,
        file, 
        url: url, // Still keep it in the object for consistency
        name: file.name.split('.')[0],
        type: (file.type.startsWith('video/') ? 'video' : 'audio') as 'audio' | 'video',
        transcription: '',
        timestamp: Date.now()
      };
    });

    setLocalFilesCache(prev => ({ ...prev, ...newFilesMap }));

    if (currentUser) {
        for (const item of newItems) {
            await onAddShowcase(item);
        }
    } else {
        setLocalTempList(prev => [...newItems, ...prev]);
    }

    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleTranscribeItem = async (id: string) => {
    const item = allShowcaseItems.find(i => i.id === id);
    const file = localFilesCache[id] || item?.file;
    if (!item || !file) return;

    setIsTranscribingItem(id);
    try {
        const text = await transcribeMedia(file);
        if (currentUser && showcaseList.some(i => i.id === id)) {
            await onUpdateShowcase(id, { transcription: text });
        } else {
            setLocalTempList(prev => prev.map(i => i.id === id ? { ...i, transcription: text } : i));
        }
    } catch (error: any) {
        if (error.message === 'QUOTA_EXCEEDED') {
            setAudioError('⚠️ AI 额度已用完：免费版 Gemini 每天有调用上限。请稍后再试。');
        } else {
            setAudioError(error.message || "识别失败");
        }
    } finally {
        setIsTranscribingItem(null);
    }
  };

  const removeShowcaseItem = async (id: string) => {
    if (focusedShowcaseId === id) setFocusedShowcaseId(null);
    
    // Revoke URL
    if (liveUrls[id]) {
        URL.revokeObjectURL(liveUrls[id]);
        setLiveUrls(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }

    // Remove from IndexedDB
    await deleteMedia(id);

    // Remove from cache
    setLocalFilesCache(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });

    const isSynced = showcaseList.some(i => i.id === id);
    if (isSynced && currentUser) {
        await onDeleteShowcase(id);
    } else {
        setLocalTempList(prev => {
            const item = prev.find(i => i.id === id);
            if (item) URL.revokeObjectURL(item.url);
            return prev.filter(i => i.id !== id);
        });
    }
  };

  const handleManualSave = async (item: SongItem) => {
    if (!currentUser) {
        alert("请先登录以同步到云端");
        return;
    }
    await onAddShowcase(item);
    setLocalTempList(prev => prev.filter(i => i.id !== item.id));
  };

  // Enhanced Web Audio Drum Machine
  const playBeat = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);

    const playDrum = (time: number, freq: number, type: OscillatorType, dur: number, gainVal = 0.5) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        if (type === 'sine') {
          osc.frequency.exponentialRampToValueAtTime(0.01, time + dur);
        }
        g.gain.setValueAtTime(gainVal, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + dur);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + dur);
    };

    const playNoise = (time: number, dur: number, gainVal = 0.2) => {
        const bufferSize = ctx.sampleRate * dur;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + dur);
        noise.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        noise.start(time);
    };

    let beatCount = 0;
    const tempo = 95; // Slightly slower, more "boom bap" feel
    const secondsPerBeat = 60 / tempo;
    
    // Schedule ahead
    let nextNoteTime = ctx.currentTime + 0.1;

    const scheduler = () => {
        while (nextNoteTime < ctx.currentTime + 0.2) {
            const beatInBar = beatCount % 4;
            setCurrentBeat(beatCount);
            
            // Kick on 1 and 3
            if (beatInBar === 0 || beatInBar === 2) {
                playDrum(nextNoteTime, 60, 'sine', 0.2, 0.8);
            }
            
            // Snare on 2 and 4
            if (beatInBar === 1 || beatInBar === 3) {
                playNoise(nextNoteTime, 0.15, 0.15);
                playDrum(nextNoteTime, 200, 'triangle', 0.1, 0.3);
            }

            // Hi-hats on every half beat (8th notes)
            playNoise(nextNoteTime, 0.05, 0.08); 
            playNoise(nextNoteTime + secondsPerBeat / 2, 0.03, 0.05);

            nextNoteTime += secondsPerBeat;
            beatCount++;
        }
    };

    const timer = setInterval(scheduler, 50);

    return {
        stop: () => {
            clearInterval(timer);
            ctx.close();
        },
        secondsPerBar: secondsPerBeat * 4
    };
  };

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;

    if (mode === 'music' && !hasKey) {
        handleSelectKey();
        return;
    }

    setIsGenerating(true);
    setAudioError(null);
    setRhyme('');
    setAudioUrl(null);
    try {
      if (mode === 'rhyme') {
        const result = await generateRhyme(input, selectedStyle.name);
        setRhyme(result);
        setAudioUrl(null);
      } else {
        const result = await generateMusicTrack(input, selectedStyle.prompt);
        setRhyme(result.lyrics);
        setAudioUrl(result.audioUrl);
        
        const songId = Math.random().toString(36).substr(2, 9);

        // Store the blob in IndexedDB
        const response = await fetch(result.audioUrl);
        const blob = await response.blob();
        await storeMedia(songId, blob);
        setLiveUrls(prev => ({ ...prev, [songId]: result.audioUrl }));

        const newSong: SongItem = {
          id: songId,
          name: `${selectedStyle.name} - ${input.slice(0, 10)}...`,
          url: result.audioUrl,
          type: 'audio',
          transcription: result.lyrics,
          timestamp: Date.now()
        };

        if (currentUser) {
            await onAddShowcase(newSong);
        } else {
            setLocalTempList(prev => [newSong, ...prev]);
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.message === 'KEY_RESET_REQUIRED') {
        setHasKey(false);
        setAudioError("API Key 已失效或权限不足，请重新选择。");
      } else {
        setAudioError("生成失败，请确认已选择支持 Lyria 的 API Key 并重试。");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAndGenerate = async () => {
    if (!rhyme || isGenerating) return;
    
    setMode('music');
    if (!hasKey) {
        handleSelectKey();
        return;
    }

    setIsGenerating(true);
    setAudioError(null);
    try {
        const result = await generateMusicTrack(rhyme, selectedStyle.prompt);
        setAudioUrl(result.audioUrl);
        // We keep the old lyrics but the result might have polished ones
        if (result.lyrics) setRhyme(result.lyrics);
    } catch (error: any) {
        console.error(error);
        if (error.message === 'KEY_RESET_REQUIRED') {
            setHasKey(false);
            setAudioError("API Key 已失效或权限不足，请重新选择。");
        } else {
            setAudioError("生成失败，请确认已选择支持 Lyria 的 API Key 并重试。");
        }
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying) {
      if (mode === 'rhyme') {
        window.speechSynthesis.cancel();
      } else {
        const audio = document.getElementById('ai-song-player') as HTMLAudioElement;
        audio?.pause();
      }
      setIsPlaying(false);
      isPlayingRef.current = false;
      setActiveLine(null);
      return;
    }

    if (mode === 'rhyme') {
      if (!rhyme) return;
      const lines = rhyme.split('\n').filter(l => l.trim().length > 0);
      setIsPlaying(true);
      isPlayingRef.current = true;
      const { stop, secondsPerBar } = playBeat();
      
      const playLine = (line: string, index: number) => {
        return new Promise<void>((resolve) => {
          setActiveLine(index);
          speak(line, {
            rate: 1.05, // Slightly faster for rhythmic feel
            onEnd: () => {
              resolve();
            }
          });
        });
      };

      try {
        for (let i = 0; i < lines.length; i++) {
            if (!isPlayingRef.current) {
              console.log("Stopping playback as ref is false");
              break;
            }
            
            await playLine(lines[i], i);
            
            // Add rhythmic spacing (roughly one bar per line)
            if (i < lines.length - 1 && isPlayingRef.current) {
              await new Promise(r => setTimeout(r, secondsPerBar * 500));
            }
        }
      } finally {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setActiveLine(null);
        stop();
      }
    } else {
      const audio = document.getElementById('ai-song-player') as HTMLAudioElement;
      if (audio) {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold ring-1 ring-purple-100 mb-2">
            <Sparkles size={12} /> AI 音乐引擎
        </div>
        <h2 className="text-4xl font-black tracking-tight text-gray-900">
            定制你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">记忆乐章</span>
        </h2>
        <p className="text-gray-500">输入任何想记住的内容，AI 将为你谱写一首英语记忆韵律诗</p>
      </div>

      {/* Mode and Style selection */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
           <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 p-1 bg-gray-100 rounded-2xl w-fit">
                <button 
                  onClick={() => setMode('music')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    mode === 'music' ? "bg-white shadow-sm text-purple-600" : "text-gray-500"
                  )}
                >
                  <AudioLines size={16} /> 完整单曲 (Lyria)
                </button>
                <button 
                  onClick={() => setMode('rhyme')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    mode === 'rhyme' ? "bg-white shadow-sm text-blue-600" : "text-gray-500"
                  )}
                >
                  <Mic2 size={16} /> 节奏韵律 (TTS)
                </button>
              </div>

              {mode === 'music' && (
                <div className="flex flex-col gap-2">
                    <button 
                    onClick={handleSelectKey}
                    className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-2",
                        hasKey ? "bg-green-50 border-green-200 text-green-600" : "bg-amber-50 border-amber-200 text-amber-600 animate-pulse"
                    )}
                    >
                    {hasKey ? <Key size={14} /> : <AlertCircle size={14} />}
                    {hasKey ? 'API Key 已就绪' : '点击选择 API Key (Lyria 专用)'}
                    </button>
                    {!hasKey && (
                        <p className="text-[10px] text-gray-400 max-w-xs leading-tight">
                            提示：Lyria 单曲功能需要你在 Google AI Studio 中配置一个已开启结算（Paid）的项目。如果你有 Suno API 需求，请点击上方“节奏韵律”模式体验离线版。
                        </p>
                    )}
                </div>
              )}
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MUSIC_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={cn(
                    "p-3 rounded-2xl border-2 transition-all text-left group",
                    selectedStyle.id === style.id 
                      ? "border-purple-500 bg-purple-50" 
                      : "border-gray-100 bg-white hover:border-purple-200"
                  )}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{style.icon}</div>
                  <div className={cn("text-xs font-bold", selectedStyle.id === style.id ? "text-purple-700" : "text-gray-500")}>
                    {style.name}
                  </div>
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="relative group">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        <div className="bg-white rounded-3xl p-6 shadow-2xl shadow-purple-100/50 border border-gray-100">
           <div className="flex flex-col gap-4">
              <AnimatePresence>
                {uploadedFile && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {uploadedFile.type.startsWith('video/') ? <FileVideo size={18} className="text-purple-500 shrink-0" /> : <FileAudio size={18} className="text-purple-500 shrink-0" />}
                      <span className="text-xs font-bold text-purple-700 truncate">{uploadedFile.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {isTranscribing ? (
                         <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg text-[10px] font-black text-purple-600 animate-pulse">
                            <Loader2 size={10} className="animate-spin" /> 解析中...
                         </div>
                       ) : (
                         <button 
                           onClick={() => setUploadedFile(null)}
                           className="text-xs font-black text-purple-300 hover:text-red-500 transition-colors"
                         >
                           移除
                         </button>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="在此输入你想记忆的单词、句子或任何内容..."
                className="w-full h-32 p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-200 text-lg font-medium resize-none transition-all placeholder:text-gray-300"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setInput('')}
                    className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                    title="清空输入"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTranscribing}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-purple-100",
                      isTranscribing ? "bg-purple-50 text-purple-400" : "bg-white text-gray-500 hover:text-purple-600 hover:border-purple-200"
                    )}
                  >
                    {isTranscribing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                    {isTranscribing ? '正在识别媒体...' : '音视频识别'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="audio/*,video/*" 
                    className="hidden" 
                  />
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !input.trim()}
                  className={cn(
                    "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black shadow-lg shadow-purple-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? 'AI 正在创作中...' : (mode === 'music' ? '生成 AI 歌曲' : '生成记忆歌词')}
                  <Send size={18} />
                </button>
              </div>
              {audioError && <p className="text-red-500 text-xs font-bold text-center mt-2">{audioError}</p>}
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(rhyme || isGenerating) && (
          <motion.div
            key="rhyme"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
                    <ListMusic size={16} className="text-purple-500" /> {mode === 'music' ? '歌曲歌词' : '节奏歌词'}
                </h3>
                <div className="flex items-center gap-3">
                  {audioUrl && (
                    <a 
                      href={audioUrl} 
                      download="lingua-ai-song.wav"
                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                      title="下载歌曲"
                    >
                      <Download size={20} />
                    </a>
                  )}
                  <button 
                      onClick={handlePlay}
                      className={cn(
                          "flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm transition-all shadow-md",
                          isPlaying ? "bg-red-50 text-red-600 border border-red-100" : "bg-purple-600 text-white hover:bg-purple-700"
                      )}
                  >
                      {isPlaying ? (
                          <>
                              <Pause size={16} fill="currentColor" /> 停止播放
                          </>
                      ) : (
                          <>
                              <Play size={16} fill="currentColor" /> {mode === 'music' ? '播放歌曲' : '节奏试听'}
                          </>
                      )}
                  </button>
                </div>
            </div>

            {audioUrl && (
              <audio 
                id="ai-song-player" 
                src={audioUrl} 
                className="hidden" 
                onEnded={() => setIsPlaying(false)}
              />
            )}

            <div className={cn(
               "relative p-12 rounded-[2.5rem] overflow-hidden border-2 transition-all duration-700 transform",
               isPlaying ? "bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-800 border-transparent shadow-[0_20px_50px_rgba(88,_80,_236,_0.3)] scale-[1.02]" : "bg-white border-purple-100 shadow-xl"
            )}>
               {/* Animated Background for Playing State */}
               {isPlaying && (
                 <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                    {/* Beat Pulse Rings */}
                    <motion.div 
                        key={currentBeat}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="w-full h-full border-[20px] border-white/20 rounded-full" />
                    </motion.div>

                    <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-4 p-8 justify-between">
                       {[...Array(40)].map((_, i) => (
                         <motion.div 
                           key={i}
                           animate={{ 
                             y: [0, (i % 2 === 0 ? -40 : 40), 0],
                             scale: currentBeat % 4 === 0 ? [1, 1.3, 1] : 1,
                             opacity: currentBeat % 2 === 0 ? [0.3, 0.5, 0.3] : 0.3
                           }}
                           transition={{ 
                             duration: 0.5,
                             repeat: 0
                           }}
                           className="w-1 bg-white rounded-full h-32"
                         />
                       ))}
                    </div>
                 </div>
               )}

               <div className="relative z-10 flex flex-col items-center gap-6 w-full px-4">
                 {isGenerating ? (
                   <div className="flex flex-col items-center gap-4 py-12">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full"
                      />
                      <span className="text-purple-600 font-bold animate-pulse tracking-wide italic text-center">AI 正在根据您的内容谱写记忆之韵...</span>
                   </div>
                 ) : rhyme ? (
                   rhyme.split('\n').filter(l => l.trim()).map((line, idx) => (
                   <motion.p 
                     key={idx}
                     animate={{ 
                        scale: activeLine === idx ? 1.15 : 1,
                        opacity: activeLine === idx ? 1 : (isPlaying ? 0.3 : 1),
                        y: activeLine === idx ? -5 : 0
                     }}
                     className={cn(
                       "text-2xl md:text-3xl font-black text-center transition-all duration-300 leading-tight tracking-tight",
                       isPlaying 
                        ? (activeLine === idx ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "text-white/40")
                        : "text-gray-800"
                     )}
                   >
                     {line}
                   </motion.p>
                 ))
               ) : null}
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                 <button 
                  onClick={() => setRhyme(null)}
                  className="px-6 py-2 text-xs font-bold text-gray-400 hover:text-purple-600 transition-colors uppercase tracking-widest"
                 >
                    清除并重新生成
                 </button>

                 {mode === 'rhyme' && !audioUrl && (
                    <motion.button 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleConfirmAndGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-black shadow-xl shadow-purple-200 transition-all"
                    >
                      <Music2 size={18} />
                      {isGenerating ? '正在为你谱曲...' : '满意？立即生成 AI 歌曲'}
                    </motion.button>
                 )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Showcase Section */}
      <div className="mt-24 space-y-12 border-t border-gray-100 pt-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">自定义音频</h2>
            <p className="text-gray-500 font-medium">支持同步字幕显示，记录你的学习与创作足迹</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-purple-100 rounded-2xl font-bold text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all shadow-xl shadow-purple-100/20"
          >
            <Upload size={24} />
            上传自己的音频
          </motion.button>
          <input 
            type="file" 
            ref={galleryInputRef} 
            onChange={handleGalleryUpload} 
            accept="audio/*,video/*" 
            multiple
            className="hidden" 
          />
        </div>

        {showcaseList.length === 0 ? (
          <div className="p-20 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 bg-gray-50/50">
            <Music2 size={64} className="mb-6 opacity-20" />
            <p className="text-lg font-bold">这里的舞台还空着... 上传你的第一部作品吧！</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Primary Player (if focused) */}
            <AnimatePresence mode="wait">
              {(focusedShowcaseId || allShowcaseItems[0]?.id) && (
                <motion.div 
                  key={focusedShowcaseId || allShowcaseItems[0].id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="w-full bg-white rounded-[3rem] p-10 shadow-2xl shadow-purple-100 border border-gray-100 overflow-hidden"
                >
                  {(() => {
                    const item = allShowcaseItems.find(i => i.id === (focusedShowcaseId || allShowcaseItems[0].id))!;
                    const segments = parseTranscription(item.transcription || '');
                    const currentLine = [...segments].reverse().find(s => s.time <= currentMediaTime);
                    const isSynced = showcaseList.some(s => s.id === item.id);

                    return (
                      <div className="flex flex-col lg:flex-row gap-12">
                        {/* Player Area */}
                        <div className="flex-1 space-y-6">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-4 bg-purple-100 rounded-3xl text-purple-600">
                                   {item.type === 'video' ? <FileVideo size={32} /> : <FileAudio size={32} />}
                                </div>
                                <div>
                                   <h3 className="text-2xl font-black text-gray-900">{item.name}</h3>
                                   <div className="flex items-center gap-2">
                                       <p className="text-xs font-black text-purple-400 uppercase tracking-widest">
                                          {item.type === 'video' ? '精选视频成品' : '双语节奏单曲'}
                                       </p>
                                       {isSynced ? (
                                           <span className="flex items-center gap-1 bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100">
                                               <Cloud size={10} /> 已同步
                                           </span>
                                       ) : (
                                           <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100">
                                               <Cloud size={10} className="opacity-50" /> 未同步
                                           </span>
                                       )}
                                       {!liveUrls[item.id] && (
                                           <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100" title="此媒体文件仅保存在本地设备，若在不同设备登录或清理了浏览器缓存，文件可能会丢失。">
                                              <AlertCircle size={10} /> 媒体文件已丢失
                                           </span>
                                       )}
                                   </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setIsLooping(!isLooping)}
                                  className={cn(
                                    "p-3 rounded-xl transition-all shadow-sm",
                                    isLooping ? "bg-purple-600 text-white shadow-purple-200" : "bg-white text-gray-400 border border-gray-100 hover:text-purple-600"
                                  )}
                                  title={isLooping ? "取消循环" : "循环播放"}
                                >
                                  <Repeat size={20} className={isLooping ? "animate-spin-slow" : ""} />
                                </button>
                                {!isSynced && currentUser && (
                                   <button 
                                     onClick={() => handleManualSave(item)}
                                     className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                                   >
                                     <Save size={16} /> 保存到云端
                                   </button>
                                )}
                                <button 
                                  onClick={() => removeShowcaseItem(item.id)}
                                  className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm group"
                                >
                                  <Trash2 size={20} className="group-hover:rotate-12 transition-transform" />
                                </button>
                              </div>
                           </div>

                           <div className="aspect-video bg-gray-900 rounded-[2rem] overflow-hidden shadow-inner relative ring-8 ring-gray-50 group/player">
                              {item.type === 'video' ? (
                                <video 
                                  ref={(el) => { if (el) mediaRef.current = el; }}
                                  key={liveUrls[item.id]}
                                  src={liveUrls[item.id]} 
                                  loop={isLooping}
                                  onTimeUpdate={(e) => setCurrentMediaTime((e.target as HTMLVideoElement).currentTime)}
                                  onLoadedMetadata={(e) => setMediaDuration((e.target as HTMLVideoElement).duration)}
                                  onPlay={() => setIsMediaPlaying(true)}
                                  onPause={() => setIsMediaPlaying(false)}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-indigo-900">
                                  <AudioLines size={80} className={cn("text-purple-400 mb-8", isMediaPlaying ? "animate-pulse" : "opacity-40")} />
                                  <audio 
                                    ref={(el) => { if (el) mediaRef.current = el; }}
                                    key={liveUrls[item.id]}
                                    src={liveUrls[item.id]} 
                                    loop={isLooping}
                                    onTimeUpdate={(e) => setCurrentMediaTime((e.target as HTMLAudioElement).currentTime)}
                                    onLoadedMetadata={(e) => setMediaDuration((e.target as HTMLAudioElement).duration)}
                                    onPlay={() => setIsMediaPlaying(true)}
                                    onPause={() => setIsMediaPlaying(false)}
                                    className="hidden"
                                  />
                                </div>
                              )}

                              {/* Custom Controls Overlay */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-12 opacity-0 group-hover/player:opacity-100 transition-all duration-300">
                                <div className="space-y-4">
                                  {/* Progress Bar */}
                                  <div className="relative h-2 bg-white/20 rounded-full cursor-pointer group/progress"
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const percentage = x / rect.width;
                                      if (mediaRef.current) {
                                        mediaRef.current.currentTime = percentage * mediaDuration;
                                      }
                                    }}
                                  >
                                    <div 
                                      className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all"
                                      style={{ width: `${(currentMediaTime / mediaDuration) * 100}%` }}
                                    />
                                    <div 
                                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-all"
                                      style={{ left: `${(currentMediaTime / mediaDuration) * 100}%` }}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                      <button 
                                        onClick={() => {
                                          if (isMediaPlaying) mediaRef.current?.pause();
                                          else mediaRef.current?.play();
                                        }}
                                        className="text-white hover:text-purple-400 transition-colors"
                                      >
                                        {isMediaPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                                      </button>
                                      <div className="flex items-center gap-2 font-mono text-xs text-white/80">
                                        <span className="font-bold text-white">
                                          {Math.floor(currentMediaTime / 60)}:{Math.floor(currentMediaTime % 60).toString().padStart(2, '0')}
                                        </span>
                                        <span className="opacity-40">/</span>
                                        <span>
                                          {Math.floor(mediaDuration / 60)}:{Math.floor(mediaDuration % 60).toString().padStart(2, '0')}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      {/* Volume or other settings could go here */}
                                      <button 
                                        onClick={() => {
                                          if (mediaRef.current) mediaRef.current.currentTime = 0;
                                        }}
                                        className="text-white/60 hover:text-white p-2 transition-all"
                                        title="重新开始"
                                      >
                                        <RotateCcw size={20} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>

                        {/* Lyrics Area */}
                        <div className="flex-1 flex flex-col pt-4">
                           <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-3">
                               <Sparkles size={24} className="text-yellow-500" />
                               <h4 className="text-xl font-black text-gray-900">同步双语字幕</h4>
                             </div>
                             {!item.transcription && (
                               <button 
                                 onClick={() => handleTranscribeItem(item.id)}
                                 disabled={isTranscribingItem === item.id}
                                 className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-200 transition-all disabled:opacity-50 flex items-center gap-2"
                               >
                                 {isTranscribingItem === item.id ? <Loader2 size={16} className="animate-spin" /> : <Mic2 size={16} />}
                                 {isTranscribingItem === item.id ? '正在捕捉声音...' : '立即识别字幕'}
                               </button>
                             )}
                           </div>

                           <div className="flex-1 bg-gray-50 rounded-[2rem] p-8 border-2 border-gray-100 overflow-y-auto max-h-[400px] custom-scrollbar relative scroll-smooth">
                              {item.transcription ? (
                                <div className="space-y-6 pb-40">
                                   {segments.map((s, idx) => {
                                     const isActive = currentLine === s;
                                     return (
                                       <motion.div 
                                         key={idx}
                                         id={`lyric-line-${idx}`}
                                         initial={false}
                                         animate={{ 
                                           backgroundColor: isActive ? "rgba(126, 34, 206, 0.05)" : "transparent",
                                           scale: isActive ? 1.02 : 1,
                                           opacity: isActive ? 1 : 0.4
                                         }}
                                         className={cn(
                                           "p-4 rounded-2xl transition-all duration-500 cursor-pointer hover:bg-gray-100 flex flex-col gap-1",
                                           isActive && "border-l-4 border-purple-500"
                                         )}
                                         onClick={() => {
                                            const media = document.querySelector('.aspect-video video, .aspect-video audio') as HTMLMediaElement;
                                            if (media) media.currentTime = s.time;
                                         }}
                                       >
                                         <p className={cn(
                                             "text-lg font-black transition-all",
                                             isActive ? "text-purple-900" : "text-gray-900"
                                         )}>{s.en}</p>
                                         {s.cn && (
                                             <p className={cn(
                                                 "text-sm font-bold opacity-60",
                                                 isActive ? "text-purple-600" : "text-gray-500"
                                             )}>{s.cn}</p>
                                         )}
                                       </motion.div>
                                     );
                                   })}
                                </div>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50">
                                   <ListMusic size={48} />
                                   <p className="font-bold">点击右上方按钮开始识别英文字幕</p>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thumbnail List */}
            {allShowcaseItems.length > 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {allShowcaseItems.map((item) => {
                   const synchronized = showcaseList.some(s => s.id === item.id);
                   return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -5 }}
                      className={cn(
                        "relative aspect-square rounded-[1.5rem] overflow-hidden border-2 transition-all group cursor-pointer",
                        (focusedShowcaseId || allShowcaseItems[0].id) === item.id 
                         ? "border-purple-600 shadow-lg ring-4 ring-purple-100" 
                         : "border-gray-100 hover:border-purple-300 bg-white"
                      )}
                      onClick={() => {
                         setFocusedShowcaseId(item.id);
                         setCurrentMediaTime(0);
                      }}
                    >
                       <div className="absolute top-2 left-2 z-20">
                          {synchronized ? (
                             <div className="bg-green-500 text-white p-1 rounded-md shadow-sm" title="已同步">
                                <Cloud size={10} />
                             </div>
                          ) : (
                             <div className="bg-amber-500 text-white p-1 rounded-md shadow-sm" title="未同步">
                                <Cloud size={10} className="opacity-50" />
                             </div>
                          )}
                       </div>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           removeShowcaseItem(item.id);
                         }}
                         className="absolute top-2 right-2 z-20 p-2 bg-white/90 backdrop-blur-md rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                         title="删除作品"
                       >
                         <Trash2 size={16} />
                       </button>

                       <div className="absolute inset-0 bg-gray-900 opacity-0 group-hover:opacity-10 transition-opacity" />
                      <div className="flex flex-col h-full p-4 items-center justify-center text-center">
                         <div className={cn(
                           "p-3 rounded-2xl mb-2",
                           (focusedShowcaseId || allShowcaseItems[0].id) === item.id ? "bg-purple-100 text-purple-600" : "bg-gray-50 text-gray-400"
                         )}>
                            {item.type === 'video' ? <FileVideo size={20} /> : <FileAudio size={20} />}
                         </div>
                         <span className="text-[10px] font-black text-gray-900 truncate w-full px-1">{item.name}</span>
                      </div>
                    </motion.div>
                   );
                 })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
