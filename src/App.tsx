import { useState, useEffect, useCallback } from 'react';
import { Search, History, BookOpen, Star, Trash2, ChevronRight, Loader2, Languages, LayoutGrid, PlusCircle, CalendarCheck, AlertTriangle, LogIn, LogOut, User as UserIcon, GraduationCap, Gamepad2, PenTool, Sparkles, Volume2, Coffee, Briefcase, Plane, MapPin, MessageSquare, Utensils, Music2, Mic2, X, FileUp, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WordAnalysis, Flashcard, CheckIn, CustomAudio } from './types';
import { analyzeWord } from './services/gemini';
import { cn } from './lib/utils';
import { FlashcardStudy } from './components/FlashcardStudy';
import { SentenceQuiz } from './components/SentenceQuiz';
import { GameChallenge } from './components/GameChallenge';
import { AILiaisonPractice } from './components/AILiaisonPractice';
import { DialoguePractice } from './components/DialoguePractice';
import { CourseSystem } from './components/CourseSystem';
import { LoginPage } from './components/LoginPage';
import { AdminPage } from './components/AdminPage';
import { localAuth, type LocalUser } from './lib/localAuth';
import { localDb } from './lib/localDb';
import { seedUserData } from './lib/seedData';
import { speak, speakChinese, SpeechSpeed } from './lib/audio';

export default function App() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [query_str, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentWord, setCurrentWord] = useState<WordAnalysis | null>(() => {
    const saved = localStorage.getItem('lingua_current_word');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentWord) {
      localStorage.setItem('lingua_current_word', JSON.stringify(currentWord));
    } else {
      localStorage.removeItem('lingua_current_word');
    }
  }, [currentWord]);

  const [history, setHistory] = useState<WordAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'history' | 'cards' | 'quiz' | 'game' | 'song' | 'course'>('cards');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [quizFilter, setQuizFilter] = useState<Flashcard[] | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [customAudios, setCustomAudios] = useState<CustomAudio[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [historySearch, setHistorySearch] = useState('');
  const [speed, setSpeed] = useState<SpeechSpeed>(() => (localStorage.getItem('lingua_speed') as SpeechSpeed) || 'normal');
  const [useAI, setUseAI] = useState(() => localStorage.getItem('lingua_use_ai') === 'true');
  const [activeRhymeLine, setActiveRhymeLine] = useState<number | null>(null);
  const [isPlayingRhyme, setIsPlayingRhyme] = useState(false);

  // Learning Insights
  const totalMinutes = checkIns.reduce((acc, curr) => acc + (curr.totalDuration || 0), 0);

  const proficiency = (() => {
    if (totalMinutes < 60) return { label: '初学萌新', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🌱' };
    if (totalMinutes < 300) return { label: '语感探索者', color: 'text-blue-600', bg: 'bg-blue-50', icon: '🔍' };
    if (totalMinutes < 1000) return { label: '深度实践者', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '🚀' };
    if (totalMinutes < 3000) return { label: '语言大师', color: 'text-purple-600', bg: 'bg-purple-50', icon: '🧙' };
    return { label: '语之本源', color: 'text-amber-600', bg: 'bg-amber-50', icon: '💎' };
  })();

  const currentStreak = (() => {
    if (checkIns.length === 0) return 0;
    const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sorted[0].date !== todayStr && sorted[0].date !== yesterdayStr) return 0;

    let streak = 0;
    let checkDate = new Date(sorted[0].date);

    for (let i = 0; i < sorted.length; i++) {
      const expected = checkDate.toISOString().split('T')[0];
      if (sorted[i].date === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  })();

  const weeklyActivity = (() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => ({
      date,
      count: checkIns.find(c => c.date === date)?.count || 0,
      duration: checkIns.find(c => c.date === date)?.totalDuration || 0,
      label: new Date(date).toLocaleDateString('zh-CN', { weekday: 'narrow' })
    }));
  })();

  const trackActivity = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    const diffMs = now - lastActiveTime;
    const diffMins = diffMs / (1000 * 60);

    if (diffMins > 0.05 && diffMins < 10) {
      const today = new Date().toISOString().split('T')[0];
      const existing = checkIns.find(c => c.date === today);

      if (existing) {
        const newTotal = (existing.totalDuration || 0) + diffMins;
        let updatedSessions = [...(existing.sessions || [])];
        const lastSession = updatedSessions[updatedSessions.length - 1];

        if (lastSession && (now - lastSession.timestamp) < 15 * 60 * 1000) {
          lastSession.duration += diffMins;
        } else {
          updatedSessions.push({ timestamp: now, duration: diffMins });
        }

        localDb.mergeDoc(user.uid, 'checkIns', today, {
          totalDuration: newTotal,
          sessions: updatedSessions,
        });
      }
    }

    setLastActiveTime(now);
  }, [user, lastActiveTime, checkIns]);

  const getTimeLabel = (ts: number) => {
    const date = new Date(ts);
    const hour = date.getHours();
    let period = "";
    if (hour < 5) period = "凌晨";
    else if (hour < 9) period = "早晨";
    else if (hour < 12) period = "上午";
    else if (hour < 14) period = "中午";
    else if (hour < 18) period = "下午";
    else if (hour < 22) period = "晚上";
    else period = "深夜";
    return `${period}学习`;
  };

  const filteredHistory = (() => {
    if (!historySearch) return history;
    return history.filter(item =>
      item.word.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.translation.toLowerCase().includes(historySearch.toLowerCase())
    );
  })();

  useEffect(() => {
    localStorage.setItem('lingua_speed', speed);
  }, [speed]);

  useEffect(() => {
    localStorage.setItem('lingua_use_ai', String(useAI));
  }, [useAI]);

  const handleSpeak = (text: string) => {
    speak(text, {
      speed,
      useNeural: useAI,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  };

  useEffect(() => {
    trackActivity();
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hasFocus()) {
        trackActivity();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [lastActiveTime, user]);

  const scenarios = [
    { name: '餐厅点餐', icon: Utensils, query: 'Ordering at a restaurant' },
    { name: '职场社交', icon: Briefcase, query: 'Professional networking' },
    { name: '机场值机', icon: Plane, query: 'Airport check-in' },
    { name: '咖啡时间', icon: Coffee, query: 'Ordering coffee and snacks' },
    { name: '寻找路径', icon: MapPin, query: 'Asking for directions' },
    { name: '日常闲聊', icon: MessageSquare, query: 'Casual small talk' },
  ];

  // Auth subscriber
  useEffect(() => {
    const unsubscribe = localAuth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        // Seed default flashcards for new users (no-op if they already have cards)
        seedUserData(u.uid, localDb);
      } else {
        setHistory([]);
        setFlashcards([]);
        setCheckIns([]);
        setCurrentWord(null);
        setShowAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Local DB sync for History
  useEffect(() => {
    if (!user) return;
    const unsubscribe = localDb.subscribe<WordAnalysis>(user.uid, 'history', (data) => {
      const sorted = [...data].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setHistory(sorted.slice(0, 50));
    });
    return () => unsubscribe();
  }, [user]);

  // Local DB sync for Flashcards
  useEffect(() => {
    if (!user) {
      setFlashcardsLoading(false);
      return;
    }
    setFlashcardsLoading(true);
    const unsubscribe = localDb.subscribe<Flashcard>(user.uid, 'flashcards', (data) => {
      const sorted = [...data].sort((a, b) => {
        const timeA = a.details?.timestamp || (a as any).timestamp || 0;
        const timeB = b.details?.timestamp || (b as any).timestamp || 0;
        return timeB - timeA;
      });
      setFlashcards(sorted);
      setFlashcardsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Local DB sync for CheckIns
  useEffect(() => {
    if (!user) return;
    const unsubscribe = localDb.subscribe<CheckIn>(user.uid, 'checkIns', (data) => {
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
      setCheckIns(sorted.slice(0, 30));
    });
    return () => unsubscribe();
  }, [user]);

  // Local DB sync for CustomAudios
  useEffect(() => {
    if (!user) return;
    const unsubscribe = localDb.subscribe<CustomAudio>(user.uid, 'customAudios', (data) => {
      const sorted = [...data].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setCustomAudios(sorted);
    });
    return () => unsubscribe();
  }, [user]);

  // Clear quiz filter when navigating away
  useEffect(() => {
    if (activeTab !== 'quiz') {
      setQuizFilter(null);
    }
  }, [activeTab]);

  const addCustomAudio = async (audio: CustomAudio) => {
    if (!user) return;
    localDb.setDoc(user.uid, 'customAudios', audio.id, audio);
  };

  const deleteCustomAudio = async (id: string) => {
    if (!user) return;
    localDb.deleteDoc(user.uid, 'customAudios', id);
  };

  const updateCustomAudio = async (id: string, data: Partial<CustomAudio>) => {
    if (!user) return;
    localDb.mergeDoc(user.uid, 'customAudios', id, data);
  };

  const addFlashcards = async (cards: Flashcard[]) => {
    if (!user) return;
    cards.forEach(card => {
      localDb.setDoc(user.uid, 'flashcards', card.id, card);
    });
  };

  const addToFlashcards = async (word: WordAnalysis) => {
    if (!user) return;
    trackActivity();

    const existingCard = flashcards.find(f =>
      f.details?.word === word.word ||
      f.front.toLowerCase() === word.word.toLowerCase()
    );

    const id = existingCard?.id || crypto.randomUUID();
    const newCard: Flashcard = {
      ...(existingCard || {}),
      id,
      front: word.word,
      back: word.translation,
      details: word,
      viewCount: existingCard?.viewCount || 0
    };

    localDb.setDoc(user.uid, 'flashcards', id, newCard);

    const today = new Date().toISOString().split('T')[0];
    const existingCheckIn = checkIns.find(c => c.date === today);

    const newItem = { word: word.word, translation: word.translation, pattern: word.pattern };
    const updatedItems = existingCheckIn
      ? [...(existingCheckIn.items || []).filter(i => i.word !== word.word), newItem]
      : [newItem];

    const newCheckIn: CheckIn = existingCheckIn
      ? {
          ...existingCheckIn,
          count: existingCheckIn.items?.some(i => i.word === word.word) ? existingCheckIn.count : (existingCheckIn.count || 0) + 1,
          items: updatedItems
        }
      : { date: today, count: 1, items: [newItem] };

    localDb.setDoc(user.uid, 'checkIns', today, newCheckIn);
  };

  const handleSearch = async (e?: React.FormEvent | string) => {
    let finalQuery = query_str;
    if (typeof e === 'string') {
      finalQuery = e;
    } else {
      e?.preventDefault();
    }

    if (!finalQuery.trim()) return;
    if (!user) return;

    const existingCard = flashcards.find(f => f.details?.word.toLowerCase() === finalQuery.trim().toLowerCase());
    if (existingCard) {
      const confirmSearch = window.confirm(`「${finalQuery}」已在您的闪卡库中，是否依然重新分析并保存？`);
      if (!confirmSearch) {
        setCurrentWord(existingCard.details);
        setActiveTab('dialogue');
        setQuery('');
        return;
      }
    }

    setLoading(true);
    trackActivity();
    try {
      const result = await analyzeWord(finalQuery);
      setCurrentWord(result);

      localDb.setDoc(user.uid, 'history', result.id, result);

      const today = new Date().toISOString().split('T')[0];
      const existing = checkIns.find(c => c.date === today);

      const newItem = { word: result.word, translation: result.translation, pattern: result.pattern };
      const updatedItems = existing
        ? [...(existing.items || []).filter(i => i.word !== result.word), newItem]
        : [newItem];

      const newCheckIn: CheckIn = existing
        ? { ...existing, count: (existing.count || 0) + 1, items: updatedItems }
        : { date: today, count: 1, items: [newItem] };

      localDb.setDoc(user.uid, 'checkIns', today, newCheckIn);

      setActiveTab('dialogue');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '查询失败';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRhyme = async (rhyme: string) => {
    if (isPlayingRhyme) {
      window.speechSynthesis.cancel();
      setIsPlayingRhyme(false);
      setActiveRhymeLine(null);
      return;
    }

    const lines = rhyme.split('\n').filter(l => l.trim().length > 0);
    setIsPlayingRhyme(true);

    for (let i = 0; i < lines.length; i++) {
      if (!isPlayingRhyme) break;
      setActiveRhymeLine(i);
      await new Promise<void>((resolve) => {
        speak(lines[i], {
          speed: 'normal',
          useNeural: useAI,
          onEnd: () => resolve()
        });
      });
      await new Promise(r => setTimeout(r, 400));
    }

    setIsPlayingRhyme(false);
    setActiveRhymeLine(null);
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    localDb.deleteDoc(user.uid, 'history', id);
    if (currentWord?.id === id) setCurrentWord(null);
  };

  const deleteFlashcard = async (id: string) => {
    if (!user || !id) return;
    localDb.deleteDoc(user.uid, 'flashcards', id);
  };

  const updateFlashcard = async (id: string, data: Partial<Flashcard>) => {
    if (!user) return;
    trackActivity();
    localDb.mergeDoc(user.uid, 'flashcards', id, data);
  };

  const handleLogout = async () => {
    await localAuth.signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onSuccess={() => {}} />;
  }

  // Show admin page
  if (showAdmin && user.role === 'admin') {
    return <AdminPage currentUser={user} onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Languages size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">LingoAI</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveTab('cards')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'cards' ? "bg-white shadow-sm text-purple-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <LayoutGrid size={16} /> 闪卡
              </button>
              <button
                onClick={() => setActiveTab('game')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'game' ? "bg-white shadow-sm text-amber-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Gamepad2 size={16} /> 闯关
              </button>
              <button
                onClick={() => setActiveTab('dialogue')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'dialogue' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <MessageSquare size={16} /> 对话
              </button>
              <button
                onClick={() => setActiveTab('course')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'course' ? "bg-white shadow-sm text-green-600 border border-green-100" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <BookOpen size={16} /> 课程
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'history' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <History size={16} /> 记录
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'quiz' ? "bg-white shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <GraduationCap size={16} /> 考试
              </button>
              <button
                onClick={() => setActiveTab('song')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'song' ? "bg-white shadow-sm text-green-600 border border-green-100" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Zap size={16} /> AI 连读
              </button>
            </div>

            {/* Header Right */}
            <div className="flex items-center gap-2 sm:gap-4">
              {user.role === 'admin' && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="bg-amber-50 text-amber-600 px-3 py-1.5 sm:p-2 rounded-xl hover:bg-amber-100 transition-all flex items-center gap-2 font-bold text-xs shadow-sm border border-amber-100"
                  title="管理后台"
                >
                  <Shield size={18} />
                  <span className="hidden lg:inline">管理后台</span>
                </button>
              )}
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-700">本地已同步</span>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-gray-900 leading-none">{user.displayName}</p>
                <p className="text-[10px] text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={() => setActiveTab('quiz')}
                className="bg-orange-50 text-orange-600 px-3 py-1.5 sm:p-2 rounded-xl hover:bg-orange-100 transition-all flex items-center gap-2 font-bold text-xs shadow-sm border border-orange-100"
              >
                <GraduationCap size={18} />
                <span className="hidden lg:inline">考试模式</span>
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <UserIcon size={16} />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="退出登录"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Bar */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200 px-4 py-3 rounded-[2rem] shadow-2xl z-50 flex items-center gap-1">
        <button
          onClick={() => setActiveTab('cards')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'cards' ? "text-purple-600 bg-purple-50" : "text-gray-400"
          )}
        >
          <LayoutGrid size={20} />
          <span className="text-[10px] font-bold">闪卡</span>
        </button>
        <button
          onClick={() => setActiveTab('game')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'game' ? "text-amber-600 bg-amber-50" : "text-gray-400"
          )}
        >
          <Gamepad2 size={20} />
          <span className="text-[10px] font-bold">闯关</span>
        </button>
        <button
          onClick={() => setActiveTab('dialogue')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'dialogue' ? "text-blue-600 bg-blue-50" : "text-gray-400"
          )}
        >
          <MessageSquare size={20} />
          <span className="text-[10px] font-bold">对话</span>
        </button>
        <button
          onClick={() => setActiveTab('course')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'course' ? "text-green-600 bg-green-50" : "text-gray-400"
          )}
        >
          <BookOpen size={20} />
          <span className="text-[10px] font-bold">课程</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'history' ? "text-blue-600 bg-blue-50" : "text-gray-400"
          )}
        >
          <History size={20} />
          <span className="text-[10px] font-bold">记录</span>
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'quiz' ? "text-orange-600 bg-orange-50" : "text-gray-400"
          )}
        >
          <GraduationCap size={20} />
          <span className="text-[10px] font-bold">考试</span>
        </button>
        <button
          onClick={() => setActiveTab('song')}
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all",
            activeTab === 'song' ? "text-green-600 bg-green-50" : "text-gray-400"
          )}
        >
          <Zap size={20} />
          <span className="text-[10px] font-bold">AI连读</span>
        </button>
      </div>

      <main className="pt-24 pb-12 max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={query_str}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入单词或短语... (试试: hello, world, learn, book, water, time, friend, happy, school, food)"
                  className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 pl-14 text-lg focus:ring-4 focus:ring-blue-50/50 focus:border-blue-500 outline-none transition-all shadow-sm group-hover:shadow-md"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <button
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : '分析'}
                </button>
              </div>
              <label className="flex flex-col items-center justify-center p-4 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 hover:bg-purple-100 transition-all cursor-pointer shadow-sm min-w-[60px]" title="导入 PDF 单词本">
                {loading ? <Loader2 className="animate-spin" size={24} /> : <FileUp size={24} />}
                <span className="text-[8px] font-black mt-1 uppercase">PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLoading(true);
                    try {
                      const { processPDFToFlashcards } = await import('./services/pdfService');
                      const imported = await processPDFToFlashcards(file);
                      if (imported && imported.length > 0) {
                        await addFlashcards(imported);
                        alert(`成功从 PDF 导入 ${imported.length} 个单词到闪卡库！`);
                        setActiveTab('cards');
                      } else {
                        alert('未能在 PDF 中找到明显的单词。');
                      }
                    } catch (err: any) {
                      alert(`PDF 导入失败: ${err.message || '未知错误'}`);
                    } finally {
                      setLoading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </form>

            <AnimatePresence mode="wait">
              {activeTab === 'dialogue' ? (
                <motion.div
                  key="dialogue-center"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {currentWord && !loading && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between">
                      <div className="flex flex-col items-center justify-center py-2 text-center space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                          {(currentWord?.word?.[0] || '').toUpperCase()}
                        </div>
                        <div className="text-center">
                          <h4 className="font-bold text-gray-900 leading-none">{currentWord?.word || ''}</h4>
                          <p className="text-xs text-blue-600 font-bold mt-1 leading-tight">{currentWord?.translation || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSpeak(currentWord.word)}
                          className="p-2 bg-white text-blue-600 rounded-xl shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors flex items-center gap-1"
                          title="朗读原文"
                        >
                          <Volume2 size={16} />
                          <span className="text-[10px] font-bold">EN</span>
                        </button>
                        <button
                          onClick={() => speakChinese(currentWord.translation)}
                          className="p-2 bg-white text-green-600 rounded-xl shadow-sm border border-green-100 hover:bg-green-50 transition-colors flex items-center gap-1"
                          title="朗读翻译"
                        >
                          <Volume2 size={16} />
                          <span className="text-[10px] font-bold">中</span>
                        </button>
                        <button
                          onClick={() => setCurrentWord(null)}
                          className="p-2 bg-white text-gray-400 rounded-xl shadow-sm border border-gray-100 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  <DialoguePractice user={user} onClose={() => setCurrentWord(null)} />
                </motion.div>
              ) : activeTab === 'cards' ? (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <FlashcardStudy
                    cards={flashcards}
                    isLoading={flashcardsLoading}
                    onAddCard={addToFlashcards}
                    onAddCards={addFlashcards}
                    onDeleteCard={deleteFlashcard}
                    onUpdateCard={updateFlashcard}
                    onStartQuiz={(subset) => {
                      setQuizFilter(subset);
                      setActiveTab('quiz');
                    }}
                    onClose={() => setActiveTab('dialogue')}
                  />
                </motion.div>
              ) : activeTab === 'quiz' ? (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <SentenceQuiz
                    cards={quizFilter || flashcards}
                    onUpdateCard={updateFlashcard}
                    onAddCards={addFlashcards}
                    onNavigate={setActiveTab}
                  />
                </motion.div>
              ) : activeTab === 'game' ? (
                <motion.div
                  key="game"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GameChallenge
                    cards={flashcards}
                    onAddCards={addFlashcards}
                    onClose={() => setActiveTab('cards')}
                  />
                </motion.div>
              ) : activeTab === 'song' ? (
                <motion.div
                  key="song"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <AILiaisonPractice
                    customAudios={customAudios}
                    onAddAudio={addCustomAudio}
                    onDeleteAudio={deleteCustomAudio}
                    onUpdateAudio={updateCustomAudio}
                  />
                </motion.div>
              ) : activeTab === 'course' ? (
                <motion.div
                  key="course"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <CourseSystem
                    onClose={() => setActiveTab('dialogue')}
                    userEmail={user?.email || undefined}
                  />
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <History size={20} className="text-blue-600" /> 学习档案
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">回顾你探索过的英语知识</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                        <input
                          type="text"
                          placeholder="搜索单词或翻译..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 focus:border-blue-500 rounded-xl text-xs outline-none transition-all w-full md:w-48 appearance-none shadow-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 whitespace-nowrap">
                        <span className="text-[10px] font-black uppercase font-mono italic">{filteredHistory.length}</span>
                        <span className="text-[10px] font-bold">ITEMS</span>
                      </div>
                    </div>
                  </div>

                  {filteredHistory.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredHistory.map((item) => (
                        <motion.div
                          layout
                          key={item.id}
                          onClick={() => { setCurrentWord(item); setActiveTab('dialogue'); }}
                          className="group bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                              {item.word[0].toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{item.word}</h4>
                              <p className="text-sm text-gray-500">{item.translation}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => deleteFromHistory(item.id, e)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                            <ChevronRight size={20} className="text-gray-300" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 italic">
                      记录为空
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 border-b border-gray-100 pb-3">
                <CalendarCheck size={18} className="text-green-500" /> 打卡记录
              </h3>

              {/* Streak info */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-1">连胜天数</p>
                    <p className="text-3xl font-black text-orange-900 leading-none">{currentStreak}</p>
                  </div>
                  <div className="absolute -right-2 -bottom-2 text-4xl opacity-10 rotate-12">🔥</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">词汇规模</p>
                    <p className="text-3xl font-black text-emerald-900 leading-none">{flashcards.length}</p>
                  </div>
                  <div className="absolute -right-2 -bottom-2 text-4xl opacity-10 -rotate-12">📖</div>
                </div>
              </div>

              {/* Weekly Progress Bar */}
              <div className="mb-8 px-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">近 7 日活跃度</p>
                  <p className="text-[10px] text-blue-500 font-bold">{Math.round(weeklyActivity.reduce((a, b) => a + b.duration, 0))} min total</p>
                </div>
                <div className="flex items-end justify-between h-20 gap-2">
                  {weeklyActivity.map((day, i) => {
                    const maxDur = Math.max(...weeklyActivity.map(d => d.duration), 10);
                    const height = (day.duration / maxDur) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full relative bg-gray-50 rounded-t-lg overflow-hidden h-full">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 15, delay: i * 0.06 }}
                            className={cn(
                              "absolute bottom-0 left-0 right-0",
                              day.duration > 0 ? "bg-blue-400" : "bg-gray-100"
                            )}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-300 group-hover:text-blue-500 transition-colors uppercase">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proficiency level info */}
              <div className="mb-8 p-4 rounded-3xl border-2 border-dashed border-gray-100 flex items-center gap-4 group hover:border-blue-100 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-50 shadow-sm flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  {proficiency.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">当前称号</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-black", proficiency.bg, proficiency.color)}>LV.{Math.floor(totalMinutes / 100) + 1}</span>
                  </div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tighter">{proficiency.label}</h4>
                  <div className="mt-2 w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(totalMinutes % 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 flex items-center justify-between shadow-sm border border-blue-100">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">累计打卡</p>
                    <p className="text-2xl font-black text-blue-900 leading-none">{checkIns.length} <span className="text-xs font-bold text-blue-400">天</span></p>
                  </div>
                  <div className="w-px h-8 bg-blue-100 self-center" />
                  <div>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mb-1">学习时长</p>
                    <p className="text-2xl font-black text-indigo-900 leading-none">
                      {(() => {
                        const totalMins = checkIns.reduce((acc, curr) => acc + (curr.totalDuration || 0), 0);
                        if (totalMins < 60) return <>{Math.round(totalMins)} <span className="text-xs font-bold text-indigo-400">分钟</span></>;
                        return <>{Math.floor(totalMins / 60)} <span className="text-xs font-bold text-indigo-400">小时</span> {Math.round(totalMins % 60)} <span className="text-xs font-bold text-indigo-400">分</span></>;
                      })()}
                    </p>
                  </div>
                </div>
                {checkIns.length > 0 && checkIns.length % 7 === 0 && (
                  <div className="flex items-center gap-2 bg-yellow-400 text-white px-3 py-1.5 rounded-full text-[10px] font-black animate-pulse shadow-md shadow-yellow-100 uppercase tracking-tight">
                    <AlertTriangle size={12} strokeWidth={3} /> 遗忘提醒
                  </div>
                )}
              </div>

              <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                {checkIns.map((ci, idx) => (
                  <div key={ci.date} className="relative pl-8 border-l-2 border-gray-100 space-y-4 pb-6 last:pb-0">
                    <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm" />
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-black text-gray-900 font-mono italic block">{ci.date.replace(/-/g, ' / ')}</span>
                        {ci.sessions && ci.sessions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {ci.sessions.map((s, i) => (
                              <span key={i} className="text-[9px] bg-white border border-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {getTimeLabel(s.timestamp)}: {Math.max(1, Math.round(s.duration))} 分钟
                              </span>
                            ))}
                          </div>
                        )}
                        {ci.totalDuration && (
                          <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1 inline-block">
                            今日共 {Math.round(ci.totalDuration)} 分钟
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => {
                            const words = (ci.items || []).map(i => i.word);
                            if (words.length > 0) {
                              let index = 0;
                              const playNext = () => {
                                if (index < words.length) {
                                  speak(words[index], {
                                    speed,
                                    useNeural: useAI,
                                    onStart: () => setIsSpeaking(true),
                                    onEnd: () => {
                                      setIsSpeaking(false);
                                      index++;
                                      setTimeout(playNext, 600);
                                    }
                                  });
                                }
                              };
                              playNext();
                            }
                          }}
                          className="text-[9px] bg-white text-gray-900 border border-gray-200 px-2.5 py-1 rounded-xl font-black hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Volume2 size={10} strokeWidth={3} /> 播报本页
                        </button>
                        <span className="text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter">
                          {ci.count} WORDS
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(ci.items || []).map((item, i) => (
                        <div key={i} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 space-y-1.5 hover:bg-blue-50/30 transition-all group/item relative overflow-hidden">
                          <div className="flex items-start justify-between gap-3 relative z-10">
                            <span className="text-xs font-bold text-gray-900 leading-tight flex-1">{item.word}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap bg-blue-50 px-1.5 rounded">{item.translation}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSpeak(item.word); }}
                                className="p-1 px-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center justify-center shadow-sm shadow-orange-200"
                                title="播放读音"
                              >
                                <Volume2 size={10} />
                              </button>
                            </div>
                          </div>
                          {item.pattern && (
                            <div className="flex items-center gap-2 pt-0.5 border-t border-gray-100/50">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter opacity-50">Pattern</span>
                              <span className="text-[10px] text-gray-500 font-medium italic leading-none">{item.pattern}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!ci.items || ci.items.length === 0) && (!ci.words || ci.words.length === 0) && (
                        <p className="text-[10px] text-gray-300 italic pl-1">暂无记录</p>
                      )}
                    </div>
                  </div>
                ))}
                {checkIns.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm italic">
                    今天还没打卡呢，快搜索单词吧！
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Search size={18} className="text-blue-600" /> 快速回顾
              </h3>
              <div className="space-y-4">
                {history.slice(0, 3).map((item) => (
                  <div key={item.id} className="border-l-2 border-blue-500 pl-4 py-1">
                    <p className="font-bold text-sm">{item.word}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 italic">{item.definition}</p>
                  </div>
                ))}
                {history.length === 0 && <p className="text-xs text-gray-400 italic">暂无记录...</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
