import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Send, CheckCircle2, XCircle, RotateCcw, Lightbulb, ArrowRight, Sparkles, Brain, Clock, Volume2, VolumeX, AlertCircle, FileUp, Loader2 } from 'lucide-react';
import { Flashcard } from '../types';
import { cn } from '../lib/utils';
import { speak, SpeechSpeed } from '../lib/audio';
import { deconstructCards } from '../lib/vocabulary';

interface SentenceQuizProps {
  cards: Flashcard[];
  onUpdateCard: (id: string, data: Partial<Flashcard>) => Promise<void>;
  onAddCards: (cards: Flashcard[]) => Promise<void>;
  onNavigate: (tab: 'dialogue' | 'history' | 'cards' | 'quiz' | 'game' | 'song') => void;
}

// SM-2 Spaced Repetition Algorithm (Optimized for frequent review)
function calculateNextReview(card: Flashcard, quality: number) {
  let { interval = 0, easeFactor = 2.1 } = card;

  if (quality < 3) {
    // If forgotten, start over but keep it more frequent
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.1); 
  } else {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 2; // Jump to 2 days instead of 3
    } else if (interval === 2) {
      interval = 4; // Jump to 4 days instead of 7
    } else if (interval === 4) {
      interval = 7; 
    } else {
      interval = Math.round(interval * (easeFactor * 0.85)); // Dampen the growth for more frequency
    }
    
    // Adjust easeFactor: slower growth for more frequent reviews
    easeFactor = easeFactor + (0.05 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
  }

  const now = Date.now();
  const nextDate = now + interval * 24 * 60 * 60 * 1000;

  return {
    interval,
    easeFactor,
    lastReviewed: now,
    nextReviewDate: nextDate
  };
}

export function SentenceQuiz({ cards, onUpdateCard, onAddCards, onNavigate }: SentenceQuizProps) {
  const [quizMode, setQuizMode] = useState<'selection' | 'vocab' | 'sentence' | 'match' | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeechSpeed>('normal');
  const [useAI, setUseAI] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const { processPDFToFlashcards } = await import('../services/pdfService');
      const imported = await processPDFToFlashcards(file);
      if (imported.length > 0) {
        // We'll trust the user to go to cards to see them
        await onAddCards(imported);
        alert(`成功从 PDF 提取了 ${imported.length} 个单词，并已同步到您的闪卡库。`);
        onNavigate('cards');
      }
    } catch (err) {
      alert("导入失败");
    } finally {
      setIsImporting(false);
    }
  };

  // Match Mode Specific State
  const [leftMatchItems, setLeftMatchItems] = useState<{id: string, text: string, type: 'en'}[]>([]);
  const [rightMatchItems, setRightMatchItems] = useState<{id: string, text: string, type: 'cn'}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{id: string, type: 'en' | 'cn'} | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchError, setMatchError] = useState<{id1: string, id2: string} | null>(null);
  const [matchProgress, setMatchProgress] = useState(0);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [deconstructedWords, setDeconstructedWords] = useState<{en: string, cn: string}[]>([]);
  const [errorCounts, setErrorCounts] = useState<Record<string, number>>({});

  // Vocabulary Test Specific State
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSpeak = (text: string) => {
    speak(text, {
      speed,
      useNeural: useAI,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  };

  // Filter cards: prefer those due for review
  const dueCards = useMemo(() => {
    const now = Date.now();
    return cards.filter(c => !c.nextReviewDate || c.nextReviewDate <= now);
  }, [cards]);

  // Initial setup for quizzes
  useEffect(() => {
    if (!isInitialized && cards.length > 0 && quizMode) {
      const now = Date.now();
      const due = cards.filter(c => !c.nextReviewDate || c.nextReviewDate <= now);
      const cardsToQuiz = due.length > 0 ? due : (cards.length <= 50 ? cards : cards.slice(0, 30));
      const newShuffled = [...cardsToQuiz].sort(() => Math.random() - 0.5);
      setShuffledCards(newShuffled);
      setIsInitialized(true);
      
      // If selection/vocab mode, prepare first question
      if (quizMode === 'vocab') {
        const firstCard = newShuffled[0];
        const others = cards.filter(c => c.id !== firstCard.id).sort(() => Math.random() - 0.5).slice(0, 3);
        setOptions([firstCard.back, ...others.map(o => o.back)].sort(() => Math.random() - 0.5));
      }

      // If match mode, deconstruct sentences into words first
      if (quizMode === 'match') {
        setIsDeconstructing(true);
        deconstructCards(cardsToQuiz).then(words => {
          if (!words || words.length === 0) {
            throw new Error("Empty vocabulary deconstruction array");
          }
          setDeconstructedWords(words);
          const initialSet = words.slice(0, 5);
          const enItems = initialSet.map((w, i) => ({ id: `word-${i}`, text: w.en, type: 'en' as const }));
          const cnItems = initialSet.map((w, i) => ({ id: `word-${i}`, text: w.cn, type: 'cn' as const }));
          setLeftMatchItems(enItems.sort(() => Math.random() - 0.5));
          setRightMatchItems(cnItems.sort(() => Math.random() - 0.5));
          setIsDeconstructing(false);
        }).catch((err) => {
          console.warn("AI deconstruction failed or empty, falling back to card words:", err);
          // Fallback to cards if AI fails
          const selected = newShuffled.slice(0, 5);
          const enItems = selected.map((c, i) => ({ id: `word-${i}`, text: c.front, type: 'en' as const }));
          const cnItems = selected.map((c, i) => ({ id: `word-${i}`, text: c.back, type: 'cn' as const }));
          setLeftMatchItems(enItems.sort(() => Math.random() - 0.5));
          setRightMatchItems(cnItems.sort(() => Math.random() - 0.5));
          setIsDeconstructing(false);
        });
      }
    }
  }, [cards, isInitialized, quizMode]);

  const handleMatchSelect = (id: string, type: 'en' | 'cn', text: string) => {
    if (matchedIds.includes(id) || (matchError && (matchError.id1 === id || matchError.id2 === id))) return;

    if (!selectedMatch) {
      setSelectedMatch({ id, type });
      if (type === 'en') handleSpeak(text);
      return;
    }

    // Deselect if clicking same
    if (selectedMatch.id === id && selectedMatch.type === type) {
      setSelectedMatch(null);
      return;
    }

    // Match logic
    if (selectedMatch.id === id && selectedMatch.type !== type) {
      setMatchedIds(prev => [...prev, id]);
      setSelectedMatch(null);
      setMatchProgress(prev => prev + 1);
      
      const totalPairsInSet = Math.min(5, deconstructedWords.length > 0 ? deconstructedWords.length : shuffledCards.length / 2);
      if (matchedIds.length + 1 === totalPairsInSet) {
        setTimeout(() => {
          const nextIndex = currentQuizIndex + 5;
          const source = deconstructedWords.length > 0 ? deconstructedWords : shuffledCards.map(c => ({ en: c.front, cn: c.back }));
          
          if (nextIndex < source.length) {
            setCurrentQuizIndex(nextIndex);
            setMatchedIds([]);
            const nextSet = source.slice(nextIndex, nextIndex + 5);
            const en = nextSet.map((w, i) => ({ id: `word-${nextIndex + i}`, text: w.en, type: 'en' as const }));
            const cn = nextSet.map((w, i) => ({ id: `word-${nextIndex + i}`, text: w.cn, type: 'cn' as const }));
            setLeftMatchItems(en.sort(() => Math.random() - 0.5));
            setRightMatchItems(cn.sort(() => Math.random() - 0.5));
          } else {
            setIsFinished(true);
          }
        }, 500);
      }
    } else {
      const item1 = [...leftMatchItems, ...rightMatchItems].find(i => i.id === selectedMatch.id);
      const item2 = [...leftMatchItems, ...rightMatchItems].find(i => i.id === id);
      
      if (item1) setErrorCounts(prev => ({ ...prev, [item1.text]: (prev[item1.text] || 0) + 1 }));
      if (item2) setErrorCounts(prev => ({ ...prev, [item2.text]: (prev[item2.text] || 0) + 1 }));

      setMatchError({ id1: selectedMatch.id, id2: id });
      setTimeout(() => {
        setMatchError(null);
        setSelectedMatch(null);
      }, 500);
    }
  };

  const currentCard = shuffledCards[currentQuizIndex];

  const handleVocabSelect = async (option: string) => {
    if (isCorrect !== null || !currentCard) return;
    
    setSelectedOption(option);
    const correct = option === currentCard.back;
    setIsCorrect(correct);

    if (!correct && currentCard) {
      setErrorCounts(prev => ({ ...prev, [currentCard.back]: (prev[currentCard.back] || 0) + 1 }));
    }

    const quality = correct ? 5 : 0;
    const srsUpdate = calculateNextReview(currentCard, quality);
    await onUpdateCard(currentCard.id, srsUpdate);
  };

  const handleSentenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard || isCorrect !== null) return;

    const normalizedInput = userInput.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    const normalizedTarget = currentCard.front.trim().toLowerCase().replace(/[.,!?;:]/g, '');

    const correct = normalizedInput === normalizedTarget;
    setIsCorrect(correct);

    if (!correct && currentCard) {
      setErrorCounts(prev => ({ ...prev, [currentCard.front]: (prev[currentCard.front] || 0) + 1 }));
    }

    const quality = correct ? 5 : 0;
    const srsUpdate = calculateNextReview(currentCard, quality);
    await onUpdateCard(currentCard.id, srsUpdate);
  };

  const handleNext = () => {
    if (currentQuizIndex < shuffledCards.length - 1) {
      const nextIdx = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIdx);
      setUserInput('');
      setIsCorrect(null);
      setShowHint(false);
      setSelectedOption(null);

      // Prepare options for next vocab question
      if (quizMode === 'vocab') {
        const nextCard = shuffledCards[nextIdx];
        const others = cards.filter(c => c.id !== nextCard.id).sort(() => Math.random() - 0.5).slice(0, 3);
        setOptions([nextCard.back, ...others.map(o => o.back)].sort(() => Math.random() - 0.5));
      }
    } else {
      setIsFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuizIndex(0);
    setUserInput('');
    setIsCorrect(null);
    setShowHint(false);
    setIsFinished(false);
    setIsInitialized(false);
    setSelectedOption(null);
    setMatchedIds([]);
    setSelectedMatch(null);
    setMatchProgress(0);
    setDeconstructedWords([]);
    setIsDeconstructing(false);
    setErrorCounts({});
    if (!isFinished) setQuizMode(null);
  };

  if (cards.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-6">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-400 mx-auto">
          <GraduationCap size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">暂无考试内容</h2>
          <p className="text-gray-500 mt-2">请先在“对话”中搜索并添加一些您想学习的词汇或句型到闪卡中。</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const totalErrors = Object.values(errorCounts).reduce((a, b) => a + b, 0);
    const score = Math.max(0, 100 - totalErrors * 2);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-100 rounded-[2.5rem] p-12 text-center space-y-8 shadow-2xl shadow-orange-100/20 max-w-2xl mx-auto"
      >
        <div className="relative inline-block mx-auto">
          <div className="w-32 h-32 bg-gradient-to-tr from-orange-400 to-yellow-400 rounded-full flex items-center justify-center text-white mx-auto shadow-xl ring-8 ring-orange-50">
            <div className="text-center">
              <span className="block text-4xl font-black leading-none">{score}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Score</span>
            </div>
          </div>
          {score === 100 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white"
            >
              <Sparkles size={20} />
            </motion.div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {score === 100 ? '完美通过！' : score >= 80 ? '非常出色！' : '继续努力！'}
          </h2>
          <p className="text-gray-500 font-medium">
            本次评估完成，您的得分为 {score} 分。
          </p>
        </div>

        {Object.keys(errorCounts).length > 0 && (
          <div className="bg-red-50/50 border-2 border-red-100 rounded-[2rem] p-8 space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertCircle size={20} />
                 </div>
                 <div>
                    <h3 className="font-black text-red-900">错题分析报告</h3>
                    <p className="text-red-500 text-xs font-bold leading-none mt-1">
                      共计 {totalErrors} 次点击错误，涉及 {Object.keys(errorCounts).length} 个知识点
                    </p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
               {Object.entries(errorCounts)
                 .sort(([, a], [, b]) => b - a)
                 .map(([word, count]) => (
                 <div key={word} className="bg-white border border-red-100 p-4 rounded-2xl flex items-center justify-between shadow-sm group hover:border-red-300 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-red-100/50 text-red-600 rounded-lg flex items-center justify-center font-black text-xs">
                          {count}
                       </div>
                       <span className="font-bold text-gray-800">{word}</span>
                    </div>
                    <button 
                      onClick={() => handleSpeak(word)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Volume2 size={16} />
                    </button>
                 </div>
               ))}
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4">
           <button 
            onClick={() => { resetQuiz(); setQuizMode(null); }}
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-[1.5rem] font-bold hover:bg-black transition-all shadow-xl active:scale-95"
          >
            <RotateCcw size={18} /> 返回考试中心
          </button>
        </div>
      </motion.div>
    );
  }

  if (!quizMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100 shadow-sm">
             <Brain size={14} className="animate-pulse" />
             <span className="text-xs font-black uppercase tracking-wider">AI Powered Exam System</span>
           </div>
           <h1 className="text-4xl font-black text-gray-900 tracking-tight">智能复习考试中心</h1>
           <p className="text-gray-500 max-w-lg mx-auto">系统已根据您的掌握程度准备好了针对性练习，请选择一种模式开始巩固知识。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentence Quiz Mode (Existing) */}
          <button 
            onClick={() => setQuizMode('sentence')}
            className="group relative bg-white border-2 border-gray-100 hover:border-orange-500 rounded-[2.5rem] p-8 text-left transition-all hover:shadow-2xl hover:shadow-orange-200/20 active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-orange-50 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 transition-colors">
              <GraduationCap size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">句型构建考试</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
              根据中文翻译，手动输入并构建完整的英文原句。通过艾宾浩斯算法巩固肌肉记忆。
            </p>
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-black py-1 px-3 bg-orange-50 text-orange-600 rounded-lg uppercase">难度：⭐⭐⭐</span>
               <div className="flex -space-x-2">
                 {cards.slice(0, 3).map((c, i) => (
                   <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                     {c.front[0].toUpperCase()}
                   </div>
                 ))}
               </div>
            </div>
          </button>

          {/* PDF Import Helper - New Button for "One Click PDF Import" */}
          <label className="group relative bg-purple-50 border-2 border-purple-100 hover:border-purple-500 rounded-[2.5rem] p-8 text-left transition-all hover:shadow-2xl hover:shadow-purple-200/20 active:scale-[0.98] cursor-pointer">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-purple-600 mb-6 transition-colors group-hover:scale-110 duration-300 shadow-sm">
              {isImporting ? <Loader2 className="animate-spin" size={32} /> : <FileUp size={32} />}
            </div>
            <h3 className="text-2xl font-black text-purple-900 mb-2">一键导入 PDF 考试</h3>
            <p className="text-purple-700/60 text-sm font-medium leading-relaxed mb-6">
              上传您的 PDF 单词本，AI 将自动分析并将其转化为所有的考试题目类型。
            </p>
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black py-1 px-3 bg-purple-200 text-purple-800 rounded-lg uppercase">即享智能解析</span>
               <div className="flex items-center gap-1 text-purple-600 font-bold text-xs">
                 {isImporting ? "正在解析..." : "立即导入"} <ArrowRight size={14} />
               </div>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={handlePDFImport} disabled={isImporting} />
          </label>

          {/* Vocabulary Test Mode (New - Green Design) */}
          <button 
            onClick={() => setQuizMode('match')}
            className="group relative bg-white border-2 border-gray-100 hover:border-green-500 rounded-[2.5rem] p-8 text-left transition-all hover:shadow-2xl hover:shadow-green-200/20 active:scale-[0.98]"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-green-500 rounded-b-[2.5rem] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            <div className="w-16 h-16 bg-green-50 group-hover:bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6 transition-colors">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">单词配对模式</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
              经典的单词配对练习。将英文句型与正确翻译快速匹配，提升大脑的中英检索速度。
            </p>
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black py-1 px-3 bg-green-50 text-green-700 rounded-lg uppercase">难度：⭐</span>
               <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
                 立即进入 <ArrowRight size={14} />
               </div>
            </div>
          </button>

          {/* Legacy Vocab Mode */}
          <button 
            onClick={() => setQuizMode('vocab')}
            className="group relative bg-white border-2 border-gray-100 hover:border-blue-500 rounded-[2.5rem] p-8 text-left transition-all hover:shadow-2xl hover:shadow-blue-200/20 active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 transition-colors">
              <Brain size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">快速翻译笔试</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
              四选一模式。在干扰项中精准识别正确释义，适合针对容易混淆的词汇进行专项纠错。
            </p>
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black py-1 px-3 bg-blue-50 text-blue-700 rounded-lg uppercase">难度：⭐⭐</span>
               <div className="flex items-center gap-1 text-blue-600 font-bold text-xs">
                 立即开始 <ArrowRight size={14} />
               </div>
            </div>
          </button>
        </div>

        {/* Existing Pattern Promo */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-purple-200">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                 <Sparkles size={32} className="text-yellow-300" />
              </div>
              <div>
                 <h4 className="font-black text-xl">进阶体验：AI 句型套用考试</h4>
                 <p className="text-white/70 text-sm">Gemini AI 直接读取您的闪卡规律，生成全新的、完全不同的实战变体题</p>
              </div>
           </div>
           <button 
             onClick={() => onNavigate('game')}
             className="w-full md:w-auto px-10 py-4 bg-white text-purple-600 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-lg active:scale-95"
           >
             立即进入闯关
           </button>
        </div>
      </div>
    );
  }

  if (!currentCard && quizMode) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-6">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto animate-pulse">
          <Brain size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">正在生成试卷...</h2>
          <p className="text-gray-500 mt-2">系统正在为您挑选合适的题目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setQuizMode(null)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
          >
            <ArrowRight size={20} className="rotate-180" />
          </button>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg",
            quizMode === 'vocab' ? "bg-blue-600 shadow-blue-100" : 
            quizMode === 'match' ? "bg-green-600 shadow-green-100" :
            "bg-orange-600 shadow-orange-100"
          )}>
            {quizMode === 'vocab' ? <Brain size={20} /> : 
             quizMode === 'match' ? <Sparkles size={20} /> :
             <GraduationCap size={20} />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-none mb-1">
              {quizMode === 'vocab' ? '翻译笔试' : 
               quizMode === 'match' ? '选择配对' :
               '句型构建考试'}
            </h2>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] px-1.5 rounded font-bold uppercase tracking-wider",
                quizMode === 'vocab' ? "text-blue-600 bg-blue-50" : 
                quizMode === 'match' ? "text-green-600 bg-green-50" :
                "text-orange-600 bg-orange-50"
              )}>模式：{quizMode === 'vocab' ? '词汇闪电战' : 
                      quizMode === 'match' ? '选择配对模式' :
                      '全句书写'}</span>
              {dueCards.length > 0 && <span className="text-[10px] text-red-600 bg-red-50 px-1.5 rounded font-bold">{dueCards.length} 个复习点</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((currentQuizIndex + matchedIds.length) / (deconstructedWords.length || shuffledCards.length)) * 100}%` 
                }}
                className={cn("h-full transition-all duration-500", 
                  quizMode === 'vocab' ? "bg-blue-500" : 
                  quizMode === 'match' ? "bg-green-500" :
                  "bg-orange-500"
                )}
              />
            </div>
            <span className="text-sm font-black text-gray-600 tabular-nums">
              {quizMode === 'match' 
                ? `${Math.min(currentQuizIndex + matchedIds.length, deconstructedWords.length || shuffledCards.length)}/${deconstructedWords.length || shuffledCards.length}`
                : `${currentQuizIndex + 1}/${shuffledCards.length}`
              }
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${quizMode}-${currentQuizIndex}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm space-y-8 relative overflow-hidden"
        >
          <div className={cn(
            "absolute top-[-10%] right-[-5%] w-64 h-64 rounded-full blur-3xl opacity-50 pointer-events-none",
            quizMode === 'vocab' ? "bg-blue-50" : 
            quizMode === 'match' ? "bg-green-50" :
            "bg-orange-50"
          )} />
          
          <div className="space-y-6 relative z-10">
            {quizMode === 'match' ? (
              // Match Mode (Separated Columns)
              <div className="space-y-8">
                 {isDeconstructing ? (
                   <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                      <div className="text-center">
                        <p className="font-black text-gray-900 text-lg">AI 正在拆分句型...</p>
                        <p className="text-gray-400 text-xs">正在从您的闪卡中提取核心词汇进行配对考试</p>
                      </div>
                   </div>
                 ) : (
                   <>
                     <div className="text-center">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">选择对应的翻译</h3>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
                        {/* Left Column: English Words (with Red border as requested) */}
                        <div className="space-y-4 p-4 border-l-4 border-red-500 bg-red-50/20 rounded-r-3xl">
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mb-4 text-center">ENGLISH AREA</p>
                          {leftMatchItems.map((item) => {
                            const isMatched = matchedIds.includes(item.id);
                            const isSelected = selectedMatch?.id === item.id && selectedMatch?.type === item.type;
                            const isError = matchError && (matchError.id1 === item.id || matchError.id2 === item.id);

                            return (
                              <motion.button
                                key={`${item.id}-${item.type}`}
                                onClick={() => handleMatchSelect(item.id, item.type, item.text)}
                                disabled={isMatched}
                                animate={isError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className={cn(
                                  "w-full p-4 rounded-2xl border-2 text-base font-bold transition-all h-20 flex items-center justify-center text-center leading-tight shadow-sm",
                                  isMatched 
                                    ? "bg-gray-50 border-gray-100 text-transparent opacity-0" 
                                    : isSelected
                                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-blue-100 shadow-md"
                                      : isError
                                        ? "bg-red-50 border-red-500 text-red-700"
                                        : "bg-white border-gray-100 hover:border-blue-300 text-gray-700"
                                )}
                              >
                                <motion.span animate={{ scale: isMatched ? 0.8 : 1 }}>
                                  {item.text}
                                </motion.span>
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Right Column: Chinese Translations */}
                        <div className="space-y-4 p-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">中文释义</p>
                          {rightMatchItems.map((item) => {
                            const isMatched = matchedIds.includes(item.id);
                            const isSelected = selectedMatch?.id === item.id && selectedMatch?.type === item.type;
                            const isError = matchError && (matchError.id1 === item.id || matchError.id2 === item.id);

                            return (
                              <motion.button
                                key={`${item.id}-${item.type}`}
                                onClick={() => handleMatchSelect(item.id, item.type, item.text)}
                                disabled={isMatched}
                                animate={isError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className={cn(
                                  "w-full p-4 rounded-2xl border-2 text-base font-bold transition-all h-20 flex items-center justify-center text-center leading-tight shadow-sm",
                                  isMatched 
                                    ? "bg-gray-50 border-gray-100 text-transparent opacity-0" 
                                    : isSelected
                                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-blue-100 shadow-md"
                                      : isError
                                        ? "bg-red-50 border-red-500 text-red-700"
                                        : "bg-white border-gray-100 hover:border-blue-300 text-gray-700"
                                )}
                              >
                                <motion.span animate={{ scale: isMatched ? 0.8 : 1 }}>
                                  {item.text}
                                </motion.span>
                              </motion.button>
                            );
                          })}
                        </div>
                     </div>

                     {matchedIds.length === Math.min(5, deconstructedWords.length || shuffledCards.length) && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="flex justify-center"
                       >
                         <div className="flex items-center gap-2 text-green-600 font-black animate-bounce mt-4">
                            <CheckCircle2 size={24} />
                            <span>这一组完成，非常棒！</span>
                         </div>
                       </motion.div>
                     )}

                     {/* Return Button at the Bottom (Requested) */}
                     <div className="pt-12 flex justify-center border-t border-gray-50 mt-12">
                        <button 
                          onClick={() => setQuizMode(null)}
                          className="flex items-center gap-2 px-10 py-3.5 bg-white border-2 border-gray-100 text-gray-400 hover:text-gray-900 hover:border-gray-200 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-sm"
                        >
                          <ArrowRight size={18} className="rotate-180" /> 返回主页
                        </button>
                     </div>
                   </>
                 )}
              </div>
            ) : quizMode === 'vocab' ? (
              // Vocabulary Mode Content
              <div className="space-y-8">
                 <div className="space-y-4 text-center pb-8 border-b border-gray-50">
                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center justify-center gap-2">
                       <Clock size={12} /> 快速给出该单词的中文意思
                    </h3>
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-5xl font-black text-gray-900 tracking-tight">
                        {currentCard.front}
                      </p>
                      <button 
                        onClick={() => handleSpeak(currentCard.front)}
                        className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors"
                      >
                         <Volume2 size={24} />
                      </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleVocabSelect(option)}
                        disabled={isCorrect !== null}
                        className={cn(
                          "p-6 rounded-[1.5rem] border-2 text-lg font-bold transition-all text-left flex items-center justify-between group",
                          isCorrect === null 
                            ? "bg-white border-gray-100 hover:border-green-500 hover:bg-green-50/30"
                            : option === currentCard.back
                              ? "bg-green-50 border-green-500 text-green-700"
                              : selectedOption === option
                                ? "bg-red-50 border-red-500 text-red-700"
                                : "bg-white border-gray-100 text-gray-300"
                        )}
                      >
                        <span>{option}</span>
                        {isCorrect !== null && option === currentCard.back && (
                          <CheckCircle2 className="text-green-600" size={24} />
                        )}
                        {isCorrect !== null && selectedOption === option && option !== currentCard.back && (
                          <XCircle className="text-red-600" size={24} />
                        )}
                      </button>
                    ))}
                 </div>

                 {isCorrect !== null && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="pt-6"
                   >
                     <button 
                       onClick={handleNext}
                       className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95"
                     >
                       {currentQuizIndex < shuffledCards.length - 1 ? '下一题' : '查看报告'} <ArrowRight size={18} />
                     </button>
                   </motion.div>
                 )}
              </div>
            ) : (
              // Sentence Mode Content (Legacy)
              <>
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                     <Clock size={12} /> 根据翻译写出英文句型
                  </h3>
                  <p className={cn(
                    "font-bold text-gray-900 leading-tight transition-all",
                    currentCard.back.length > 50 ? "text-xl" :
                    currentCard.back.length > 30 ? "text-2xl" : "text-3xl"
                  )}>
                    {currentCard.back}
                  </p>
                </div>

                {currentCard?.details?.pattern && (
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb size={14} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">句型参考 (Pattern)</span>
                    </div>
                    <p className="text-sm text-orange-800 font-medium italic">
                      {currentCard?.details?.pattern}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSentenceSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">你的回答 (Sentence Building)</h3>
                      {isCorrect === false && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-blue-50 border-2 border-blue-200 px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-sm"
                        >
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">正确答案:</span>
                          <span className="text-sm font-bold text-blue-900">{currentCard.front}</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="relative">
                      <textarea
                        autoFocus
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        disabled={isCorrect !== null}
                        placeholder="请输入完整的英文句子..."
                        className={cn(
                          "w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-xl outline-none transition-all resize-none h-32",
                          isCorrect === true ? "border-green-500 bg-green-50/30" : 
                          isCorrect === false ? "border-red-500 bg-red-50/30" : 
                          "border-gray-100 focus:border-orange-500 focus:bg-white"
                        )}
                      />
                      {isCorrect !== null && (
                        <div className="absolute right-4 bottom-4">
                          {isCorrect ? (
                            <div className="flex items-center gap-2 text-green-600 font-bold">
                              <CheckCircle2 size={24} />
                              <span>正确</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600 font-bold">
                              <XCircle size={24} />
                              <span>错误</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isCorrect === null ? (
                      <button 
                        type="submit"
                        disabled={!userInput.trim()}
                        className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 disabled:opacity-30 active:scale-95"
                      >
                        <Send size={18} /> 提交验证
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={handleNext}
                        className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
                      >
                        {currentQuizIndex < shuffledCards.length - 1 ? '下一题' : '查看结果'} <ArrowRight size={18} />
                      </button>
                    )}
                    
                    {isCorrect === false && !showHint && (
                      <button 
                        type="button"
                        onClick={() => setShowHint(true)}
                        className="bg-white border border-gray-200 text-gray-600 px-6 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                      >
                        查看正确答案
                      </button>
                    )}
                  </div>
                </form>

                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">正确表述</p>
                        <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => handleSpeak(currentCard.front)}
                              className={cn(
                                "p-2 rounded-full transition-all flex items-center justify-center",
                                isSpeaking ? "bg-orange-100 text-orange-600 scale-110" : "bg-white text-gray-400 border border-gray-200 hover:text-orange-600"
                              )}
                            >
                              <Volume2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpeed(prev => prev === 'normal' ? 'slow' : 'normal')}
                              className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded transition-all",
                                speed === 'slow' ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              )}
                            >
                              {speed === 'slow' ? '慢速开启' : '慢速模式'}
                            </button>
                            <button
                               type="button"
                               onClick={() => setUseAI(prev => !prev)}
                               className={cn(
                                 "text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1",
                                 useAI ? "bg-purple-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                               )}
                             >
                               <Sparkles size={10} />
                               {useAI ? 'AI 语音' : '普通语音'}
                             </button>
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">系统将稍后再次测试此句</span>
                        </div>
                      </div>
                      <p className="text-xl font-medium text-gray-900 leading-relaxed font-serif uppercase tracking-tight">{currentCard.front}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-2 text-[#36446a]/40 text-[9px] font-bold tracking-[0.2em] uppercase italic">
         Spaced Repetition System Active • Efficient Word Recalibration
      </div>
    </div>
  );
}
