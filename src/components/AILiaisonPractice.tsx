import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Trash2, Edit3, 
  FileUp, Music, RefreshCw, 
  Volume2, Loader2, StickyNote, Save,
  Video, X, Sparkles
} from 'lucide-react';
import { analyzeLiaison } from '../services/gemini';
import { cn } from '../lib/utils';
import { LiaisonAnalysis, CustomAudio } from '../types';
import { storeMedia, getMedia, deleteMedia } from '../lib/storage';

interface AILiaisonPracticeProps {
  customAudios?: CustomAudio[];
  onAddAudio?: (audio: CustomAudio) => Promise<void>;
  onDeleteAudio?: (id: string) => Promise<void>;
  onUpdateAudio?: (id: string, data: Partial<CustomAudio>) => Promise<void>;
}

export function AILiaisonPractice({ 
  customAudios = [], 
  onAddAudio, 
  onDeleteAudio, 
  onUpdateAudio 
}: AILiaisonPracticeProps) {
  const [audioList, setAudioList] = useState<any[]>(
    Array.from({ length: 31 }, (_, i) => ({
      id: `demo-${i + 1}`,
      title: i === 0 ? 'Daily Conversation Practice' : i === 1 ? 'IELTS Listening Part 1' : `Practice Material ${i + 1}`,
      fileName: `audio_${i + 1}.mp3`,
      duration: `${String(Math.floor(Math.random() * 3) + 1).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,
      createdAt: new Date(Date.now() - i * 3600000).toLocaleString(),
      notes: i === 0 ? 'Focus on "wanna" and "talk ta" liaisons.' : '',
    }))
  );

  const [inputText, setInputText] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingType, setPlayingType] = useState<'audio' | 'video'>('audio');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<LiaisonAnalysis | null>(null);
  
  // Player state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [tempAudios, setTempAudios] = useState<any[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rehydratedUrls, setRehydratedUrls] = useState<Record<string, string>>({});
  const itemsPerPage = 10;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mediaRef = useMemo(() => playingType === 'video' ? videoRef : audioRef, [playingType]);

  // Update volume/rate when they change
  useEffect(() => {
    const media = mediaRef.current;
    if (media) {
      media.volume = volume;
      media.playbackRate = playbackRate;
    }
  }, [volume, playbackRate, mediaRef, playingId]); // Sync when playing item changes too

  // Re-hydrate URLs from IndexedDB for custom audios
  useEffect(() => {
    const hydrate = async () => {
      const newUrls: Record<string, string> = { ...rehydratedUrls };
      let changed = false;

      for (const audio of customAudios) {
        // If we don't have a rehydrated URL yet, try to get it from IndexedDB
        if (!newUrls[audio.id]) {
          try {
            const blob = await getMedia(audio.id);
            if (blob) {
              newUrls[audio.id] = URL.createObjectURL(blob);
              changed = true;
            }
          } catch (err) {
            console.error(`Failed to hydrate audio ${audio.id}:`, err);
          }
        }
      }

      if (changed) {
        setRehydratedUrls(newUrls);
      }
    };

    if (customAudios.length > 0) {
      hydrate();
    }
  }, [customAudios]);

  // 合并音频：本地暂存 + 外部同步 + 默认预设
  const displayAudios = useMemo(() => [
    ...tempAudios,
    ...customAudios.map(a => ({
      id: a.id,
      title: a.title,
      fileName: a.title + (a.type === 'video' ? '.mp4' : '.mp3'),
      duration: '00:00',
      url: rehydratedUrls[a.id] || a.url,
      createdAt: new Date(a.timestamp).toLocaleString(),
      notes: a.notes || '',
      type: a.type || 'audio',
      isExternal: true
    })), 
    ...audioList.map(a => ({ ...a, type: a.type || 'audio' }))
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i), [tempAudios, customAudios, audioList, rehydratedUrls]);

  // Pagination logic
  const totalPages = useMemo(() => Math.ceil(displayAudios.length / itemsPerPage), [displayAudios.length]);
  const paginatedAudios = useMemo(() => displayAudios.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [displayAudios, currentPage]);

  // Go to page 1 when total items count changes significantly (e.g. upload new)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [displayAudios.length, totalPages, currentPage]);

  // 上传音频
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `audio_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        const objectUrl = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');

        // Store file in IndexedDB for persistence
        try {
          await storeMedia(id, file);
        } catch (err) {
          console.error('Failed to store media in IndexedDB:', err);
        }

        const newAudio: CustomAudio = {
          id,
          title: file.name.replace(/\.[^/.]+$/, '') || 'Untitled Media',
          url: objectUrl,
          timestamp: Date.now(),
          type: isVideo ? 'video' : 'audio'
        };

        setTempAudios(prev => [{
          id,
          title: newAudio.title,
          fileName: file.name,
          duration: '--:--',
          url: objectUrl,
          createdAt: new Date().toLocaleString(),
          isTemp: true,
          type: isVideo ? 'video' : 'audio'
        }, ...prev]);
        
        if (onAddAudio) {
          try {
            await onAddAudio(newAudio);
          } catch (err) {
            console.error('Firestore sync failed:', err);
          }
        }
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // 删除单个文件
  const handleDelete = async (id: string) => {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId(null), 3000); // 3秒后取消确认状态
      return;
    }
    
    setTempAudios(prev => prev.filter(a => a.id !== id));
    
    // Clean up IndexedDB
    try {
      await deleteMedia(id);
    } catch (err) {
      console.error('Failed to delete media from IndexedDB:', err);
    }

    if (audioList.some(a => a.id === id)) {
        setAudioList(prev => prev.filter(a => a.id !== id));
    } else {
        if (onDeleteAudio) await onDeleteAudio(id);
    }

    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    setConfirmingDeleteId(null);
  };

  const handleTitleChange = async (id: string, value: string) => {
    if (audioList.some(a => a.id === id)) {
        setAudioList(prev => prev.map(a => a.id === id ? { ...a, title: value } : a));
    } else {
        if (onUpdateAudio) await onUpdateAudio(id, { title: value });
    }
  };

  const handleNotesChange = async (id: string, value: string) => {
    if (audioList.some(a => a.id === id)) {
        setAudioList(prev => prev.map(a => a.id === id ? { ...a, notes: value } : a));
    } else {
        if (onUpdateAudio) await onUpdateAudio(id, { notes: value });
    }
  };

  const handlePlay = useCallback(async (item: any) => {
    try {
      const type = item.type || 'audio';
      const ref = type === 'video' ? videoRef : audioRef;
      
      if (playingId === item.id) {
        if (ref.current?.paused) {
          await ref.current.play();
        } else {
          ref.current?.pause();
        }
        return;
      }

      // Stop previous
      const prevRef = playingType === 'video' ? videoRef : audioRef;
      if (prevRef.current) prevRef.current.pause();

      setPlayingType(type);
      setPlayingId(item.id);
      setShowControls(true);

      // We need to wait for the next tick to ensure the correct element is rendered and refs are updated
      setTimeout(async () => {
        const currentRef = type === 'video' ? videoRef : audioRef;
        if (currentRef.current) {
          currentRef.current.src = item.url;
          currentRef.current.load();
          await currentRef.current.play();
        }
      }, 0);

    } catch (error) {
      console.error('播放失败:', error);
      alert('播放失败，请检查文件格式或浏览器设置');
    }
  }, [playingId, playingType]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    const media = mediaRef.current;
    if (media) {
      media.currentTime = time;
    }
  };

  const handleReplay = () => {
    const media = mediaRef.current;
    if (media) {
      media.currentTime = 0;
      media.play();
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('确定删除全部音频吗？')) return;
    if (audioRef.current) audioRef.current.pause();
    setPlayingId(null);
    
    setAudioList([]);
    setTempAudios([]);
    for (const audio of customAudios) {
      try {
        await deleteMedia(audio.id);
      } catch (err) {
        console.error(`Failed to delete media ${audio.id}:`, err);
      }
      if (onDeleteAudio) await onDeleteAudio(audio.id);
    }
  };

  const handleAIAnalyze = async (text: string = inputText) => {
    if (!text.trim()) {
      alert('请输入英语句子');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await analyzeLiaison(text);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Sync player state and handle auto-play
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handleDurationChange = () => setDuration(media.duration);
    const handlePlayState = () => setIsPaused(false);
    const handlePauseState = () => setIsPaused(true);
    
    const handleEnded = () => {
      setIsPaused(true);
      if (isAutoPlaying) {
        const currentIndex = displayAudios.findIndex(a => a.id === playingId);
        if (currentIndex !== -1 && currentIndex < displayAudios.length - 1) {
          const nextItem = displayAudios[currentIndex + 1];
          
          // 自动翻页逻辑
          const nextItemPage = Math.floor((currentIndex + 1) / itemsPerPage) + 1;
          if (nextItemPage !== currentPage) {
            setCurrentPage(nextItemPage);
          }
          
          handlePlay(nextItem);
        } else {
          setIsAutoPlaying(false);
          setPlayingId(null);
          setShowControls(false);
        }
      } else {
        setPlayingId(null);
        setShowControls(false);
      }
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('durationchange', handleDurationChange);
    media.addEventListener('play', handlePlayState);
    media.addEventListener('pause', handlePauseState);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('durationchange', handleDurationChange);
      media.removeEventListener('play', handlePlayState);
      media.removeEventListener('pause', handlePauseState);
      media.removeEventListener('ended', handleEnded);
    };
  }, [isAutoPlaying, playingId, displayAudios, currentPage, handlePlay, mediaRef]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8 pb-32 text-gray-800 font-sans">
      <audio ref={audioRef} preload="auto" className="hidden" />
      
      {/* 视频悬浮窗 */}
      <div className={cn(
        "fixed bottom-28 right-8 z-[100] transition-all duration-500 transform",
        playingId && playingType === 'video' ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 pointer-events-none scale-90"
      )}>
        <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white w-[320px] aspect-video flex items-center justify-center group relative cursor-pointer"
             onClick={() => playingId && handlePlay(displayAudios.find(a => a.id === playingId))}>
          <video 
            ref={videoRef} 
            preload="auto" 
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
             {isPaused ? <Play size={48} className="text-white ring-4 ring-white/20 rounded-full p-2" /> : <Pause size={48} className="text-white ring-4 ring-white/20 rounded-full p-2" />}
          </div>
        </div>
      </div>

      {/* 底部全局控制栏 */}
      <AnimatePresence>
        {playingId && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-4xl"
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] px-8 py-4 flex items-center gap-6">
              {/* 当前播放信息 */}
              <div className="flex items-center gap-4 min-w-[200px] shrink-0">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse",
                  playingType === 'video' ? "bg-purple-600 shadow-purple-100" : "bg-blue-600 shadow-blue-100"
                )}>
                  {playingType === 'video' ? <Video size={20} /> : <Music size={20} />}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-black text-gray-900 truncate">
                    {displayAudios.find(a => a.id === playingId)?.title || 'Playing...'}
                  </h4>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1">
                    {playingType === 'video' ? 'Video Mode' : 'Audio Mode'}
                  </p>
                </div>
              </div>

              {/* 播放核心控制 */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleReplay}
                  className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center"
                  title="重播"
                >
                  <RefreshCw size={18} />
                </button>
                <button 
                  onClick={() => playingId && handlePlay(displayAudios.find(a => a.id === playingId))}
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all active:scale-95",
                    isPaused ? "bg-blue-600 shadow-blue-200" : "bg-red-500 shadow-red-200"
                  )}
                >
                  {isPaused ? <Play size={28} fill="currentColor" className="ml-1" /> : <Pause size={28} fill="currentColor" />}
                </button>
              </div>

              {/* 进度控制 */}
              <div className="flex-1 flex items-center gap-4 px-4 bg-gray-50/50 rounded-2xl py-3 border border-gray-100/50">
                <span className="text-[10px] font-black text-blue-600 tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 relative flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-blue-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  {/* 可视化波形(模拟) */}
                  <div className="absolute inset-0 pointer-events-none flex items-end gap-0.5 opacity-20 px-1">
                    {[...Array(40)].map((_, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-blue-400 rounded-t-sm" 
                        style={{ height: `${Math.random() * 60 + 20}%` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-black text-gray-400 tabular-nums w-10">{formatTime(duration)}</span>
              </div>

              {/* 音量与倍速 */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <Volume2 size={16} />
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={1} 
                    step={0.1}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-400" 
                  />
                </div>
                
                <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                  {[1, 1.5, 2].map(rate => (
                    <button 
                      key={rate}
                      onClick={() => setPlaybackRate(rate)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                        playbackRate === rate ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 px-8 py-5 flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              A
            </div>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight">LingoAI</h1>
              <p className="text-gray-500 text-sm mt-1 font-medium italic">Advanced Audio Player</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <label className={cn(
               "cursor-pointer px-6 py-3 rounded-2xl bg-[#111827] text-white font-semibold shadow-lg hover:bg-black transition-all flex items-center gap-2",
               isUploading && "opacity-50 cursor-not-allowed"
             )}>
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                {isUploading ? '正在上传...' : '上传新音频'}
                <input 
                  type="file" 
                  accept="audio/*,video/*" 
                  multiple 
                  style={{ display: 'none' }} 
                  onChange={handleUpload}
                  disabled={isUploading}
                />
             </label>
             <button 
               onClick={handleDeleteAll} 
               disabled={isUploading}
               className="px-5 py-3 rounded-2xl bg-red-50 text-red-500 font-semibold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
             >
                <Trash2 size={16} /> 删除全部
             </button>
          </div>
        </div>

        {/* AI 分析结果显示区域 */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[36px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-blue-100 mb-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button 
                  onClick={() => setAnalysis(null)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-none">AI 连读与发音分析</h3>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">Liaison & Pronunciation Analysis</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Original Sentence 原文</h4>
                  <div className="flex items-center gap-4">
                    <p className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{analysis.sentence}</p>
                    <button 
                      onClick={() => {
                         import('../lib/audio').then(m => m.speakNative(analysis.sentence));
                      }}
                      className="p-3 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <p className="text-lg font-bold text-blue-500">{analysis.translation}</p>
                    <button 
                      onClick={() => {
                         import('../lib/audio').then(m => m.speakChinese(analysis.translation));
                      }}
                      className="p-2 px-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                      <Volume2 size={16} />
                      <span className="text-xs font-black">朗读翻译</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysis.liaisons.map((point, idx) => (
                    <div key={idx} className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 relative group hover:border-blue-200 transition-all">
                      <div className="absolute top-4 right-4 text-[10px] font-black text-blue-200 uppercase tracking-widest">{point.type}</div>
                      <h5 className="text-blue-600 font-black text-xl mb-2 flex items-center gap-2">
                         <span className="w-1.5 h-6 bg-blue-400 rounded-full" />
                         {point.words}
                      </h5>
                      <p className="text-gray-600 font-medium text-sm leading-relaxed">{point.explanation}</p>
                      <button 
                         onClick={() => {
                            import('../lib/audio').then(m => m.speakNative(point.words));
                         }}
                         className="absolute bottom-4 right-4 p-2 rounded-xl bg-white text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-blue-600 shadow-sm"
                      >
                         <Volume2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50/30 rounded-[2.5rem] p-8 border border-blue-50">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Mastery Guide 专家指导</h4>
                  <p className="text-gray-700 font-medium leading-relaxed italic whitespace-pre-wrap">
                    "{analysis.fullExplanation}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 音频列表 */}
        <div className="bg-white rounded-[36px] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-black mb-2 text-gray-900 tracking-tight">我的训练音频</h2>
              <p className="text-gray-400 text-lg font-medium">共 {displayAudios.length} 个文件</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (isAutoPlaying) {
                    setIsAutoPlaying(false);
                    if (audioRef.current) audioRef.current.pause();
                  } else {
                    if (displayAudios.length > 0) {
                      setIsAutoPlaying(true);
                      setCurrentPage(1);
                      handlePlay(displayAudios[0]);
                    }
                  }
                }} 
                className={cn(
                  "px-5 py-3 rounded-2xl border transition-all shadow-sm font-bold flex items-center gap-2",
                  isAutoPlaying 
                    ? "bg-blue-600 text-white border-blue-600 shadow-blue-100" 
                    : "bg-white text-blue-600 border-blue-100 hover:border-blue-500 hover:bg-blue-50"
                )}
              >
                {isAutoPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {isAutoPlaying ? "正在连播..." : "列表连播"}
              </button>
              <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-2xl border border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all bg-white shadow-sm font-bold flex items-center gap-2">
                <RefreshCw size={18} /> 刷新
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-[#f8f9fd] rounded-[2rem] text-gray-400 font-black text-xs uppercase tracking-widest mb-6">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">音频标题</div>
            <div className="col-span-5">播放状态与控制</div>
            <div className="col-span-3 text-center">操作中心</div>
          </div>

          <div className="space-y-4">
            {displayAudios.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 opacity-60">
                 <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center text-gray-200 shadow-sm mb-6">
                    <Music size={40} />
                 </div>
                 <p className="text-gray-400 text-xl font-bold">暂无音频文件，请通过上方按钮上传</p>
              </div>
            )}
            
            {paginatedAudios.map((item, index) => {
              const globalIndex = (currentPage - 1) * itemsPerPage + index;
              const isPlaying = playingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  className={cn(
                    "grid grid-cols-12 gap-4 items-center px-8 py-6 border rounded-[2.5rem] transition-all relative group",
                    isPlaying ? "border-blue-200 shadow-xl bg-blue-50/20 ring-4 ring-blue-50" : "border-gray-100 bg-white hover:shadow-lg hover:border-blue-100"
                  )}
                >
                  <div className="col-span-1 flex justify-center">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all",
                      isPlaying ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      {globalIndex + 1}
                    </div>
                  </div>

                  <div className="col-span-3">
                    <div className="relative group/title">
                      <input
                        value={item.title}
                        onChange={(e) => handleTitleChange(item.id, e.target.value)}
                        className="w-full h-12 rounded-xl border border-transparent px-2 text-lg outline-none focus:border-blue-400 bg-transparent font-black text-gray-900 focus:bg-white transition-all truncate"
                      />
                      <Edit3 size={14} className="absolute right-2 top-4 text-gray-300 group-hover/title:text-blue-400 transition-colors pointer-events-none opacity-0 group-hover/title:opacity-100" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-2">
                       <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                         {item.type === 'video' ? 'MP4 VIDEO' : 'MP3 AUDIO'}
                       </span>
                       <span className="w-1 h-1 rounded-full bg-gray-200" />
                       <span className="text-[10px] font-black text-blue-500 uppercase">{item.createdAt.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="col-span-5 flex flex-col gap-2">
                    {isPlaying ? (
                      <div className="space-y-3 px-4">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-blue-600 w-10">{formatTime(currentTime)}</span>
                           <input
                             type="range"
                             min={0}
                             max={duration || 0}
                             value={currentTime}
                             onChange={handleSeek}
                             className="flex-1 h-1.5 bg-blue-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                           />
                           <span className="text-[10px] font-black text-gray-400 w-10">{formatTime(duration)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button onClick={handleReplay} className="text-gray-400 hover:text-blue-600 transition-colors">
                               <RefreshCw size={16} />
                            </button>
                            
                            <div className="flex items-center gap-2 group/vol">
                               <Volume2 size={16} className="text-gray-400 group-hover/vol:text-blue-600" />
                               <input 
                                 type="range" 
                                 min={0} 
                                 max={1} 
                                 step={0.1}
                                 value={volume}
                                 onChange={(e) => setVolume(parseFloat(e.target.value))}
                                 className="w-16 h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-400" 
                               />
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                             {[0.5, 1, 1.5, 2].map(rate => (
                               <button 
                                 key={rate} 
                                 onClick={() => setPlaybackRate(rate)}
                                 className={cn(
                                   "px-2 py-0.5 rounded text-[10px] font-black",
                                   playbackRate === rate ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                                 )}
                               >
                                 {rate}x
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 h-full px-4 text-gray-300">
                         <div className="flex-1 flex gap-1">
                            {[...Array(20)].map((_, i) => (
                              <div key={i} className="flex-1 h-1 bg-gray-100 rounded-full" />
                            ))}
                         </div>
                         <span className="text-[10px] font-black uppercase">{item.duration}</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-3 flex justify-center items-center gap-3">
                    <button
                      onClick={() => handlePlay(item)}
                      className={cn(
                        "w-14 h-14 rounded-2xl text-white font-black shadow-lg transition-all active:scale-90 flex items-center justify-center shrink-0",
                        isPlaying && !isPaused ? "bg-red-500 shadow-red-100" : "bg-blue-600 shadow-blue-100"
                      )}
                    >
                      {isPlaying && !isPaused ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className={cn(!isPlaying && "ml-1")} />}
                    </button>
                    
                    <button 
                      onClick={() => handleAIAnalyze(item.title)}
                      className="h-14 px-6 rounded-2xl bg-[#f0f4ff] text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shrink-0"
                    >
                      AI 分析
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className={cn(
                        "w-14 h-14 rounded-2xl transition-all flex items-center justify-center shrink-0 overflow-hidden",
                        confirmingDeleteId === item.id 
                          ? "bg-red-600 text-white shadow-lg ring-4 ring-red-100 animate-pulse" 
                          : "bg-red-50 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white"
                      )}
                    >
                      {confirmingDeleteId === item.id ? (
                        <span className="text-[10px] font-black uppercase whitespace-nowrap">确定？</span>
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </button>
                  </div>

                  {/* 手动笔记区域 */}
                  <div className="col-span-12 mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                        <StickyNote size={18} />
                      </div>
                      <div className="flex-1 relative group/notes">
                        <textarea
                          placeholder="在此输入您的学习笔记，例如：区分 'want to' 和 'wanna' 的发音差异..."
                          value={item.notes}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          className="w-full min-h-[80px] p-4 rounded-[1.5rem] bg-[#fdfaf5] border border-orange-100 text-sm font-medium text-gray-700 outline-none focus:border-orange-300 focus:bg-white transition-all resize-none italic"
                        />
                        <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-0 group-hover/notes:opacity-100 transition-opacity">
                          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Auto Saving...</span>
                          <Save size={12} className="text-orange-400 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-12 h-12 rounded-2xl font-black transition-all shadow-sm flex items-center justify-center",
                    currentPage === i + 1 
                      ? "bg-blue-600 text-white shadow-blue-100 scale-110" 
                      : "bg-white text-gray-400 border border-gray-100 hover:border-blue-200 hover:text-blue-500"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const speakNative = (text: string) => {
    import('../lib/audio').then(m => m.speakNative(text));
};
