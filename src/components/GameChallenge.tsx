import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Timer, Trophy, RotateCcw, ChevronLeft, Volume2, CheckCircle2, XCircle, Sparkles, Send, Loader2, BookOpen, ArrowLeft, Gamepad2 } from 'lucide-react';
import { Flashcard } from '../types';
import { cn } from '../lib/utils';
import { speakNative as speak, playClickSound } from '../lib/audio';
import { geminiPatternService, PatternChallenge, EvaluationResult } from '../services/geminiPatternService';
import { WordPlaneGame } from './WordPlaneGame';
import { ZombieEnglishGame } from './ZombieEnglishGame';
import { DesertRacingGame } from './DesertRacingGame';
import { ListeningGame } from './ListeningGame';
import { WordMatchGame } from './WordMatchGame';

interface GameChallengeProps {
  cards: Flashcard[];
  onAddCards: (cards: Flashcard[]) => Promise<void>;
  onClose: () => void;
}

type GameMode = 'classic' | 'pattern' | 'levels' | 'plane' | 'zombie' | 'racing' | 'listening' | 'match';
type GameState = 'start' | 'playing' | 'finished';

export function GameChallenge({ cards, onAddCards, onClose }: GameChallengeProps) {
  const [mode, setMode] = useState<GameMode>('levels');
  const [gameState, setGameState] = useState<GameState>('start');
  const [level, setLevel] = useState(1);
  const [isWrongRetry, setIsWrongRetry] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastRating, setLastRating] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  // Pattern Mode Specific State
  const [patternChallenge, setPatternChallenge] = useState<PatternChallenge | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<EvaluationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCard = cards[currentIndex];

  const getRank = (finalScore: number) => {
    if (finalScore >= 250) return { label: 'SSS', color: 'text-purple-600', title: '英语之神' };
    if (finalScore >= 180) return { label: 'SS', color: 'text-red-600', title: '语言大师' };
    if (finalScore >= 120) return { label: 'S', color: 'text-amber-500', title: '翻译精英' };
    if (finalScore >= 80) return { label: 'A', color: 'text-blue-500', title: '学有成效' };
    if (finalScore >= 50) return { label: 'B', color: 'text-green-500', title: '初见端倪' };
    return { label: 'C', color: 'text-gray-500', title: '仍需努力' };
  };

  const generateOptions = (card: Flashcard) => {
    if (!card) return;
    const correct = card.details?.translation && !card.details.translation.includes('暂无')
      ? card.details.translation
      : (card.back && card.back !== '(自定义句子)' ? card.back : '(暂无翻译)');
    const distractors = cards
      .filter(c => c.id !== card.id)
      .map(c => c.details?.translation && !c.details.translation.includes('暂无')
        ? c.details.translation
        : (c.back && c.back !== '(自定义句子)' ? c.back : '(暂无翻译)'))
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const all = [correct, ...distractors].sort(() => 0.5 - Math.random());
    setOptions(all);
  };

  const startGame = () => {
    if (cards.length < 4) return;
    setGameState('playing');
    setCurrentIndex(0);
    setHearts(3);
    setScore(0);
    setCombo(0);
    setLastRating(null);
    nextRound(0);
  };

  const preparePatternChallenge = async (card: Flashcard) => {
    setIsAiLoading(true);
    setPatternChallenge(null);
    setAiEvaluation(null);
    setUserInput('');
    try {
      const challenge = await geminiPatternService.generateChallenge(card.front);
      setPatternChallenge(challenge);
    } catch (error) {
      console.error("Failed to generate AI challenge:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const nextRound = (index: number) => {
    const card = cards[index];
    if (!card) return;
    setCurrentIndex(index);
    setFeedback(null);
    setLastRating(null);

    if (mode === 'classic') {
      setTimeLeft(15);
      generateOptions(card);
    } else if (mode === 'pattern') {
      setTimeLeft(45); 
      preparePatternChallenge(card);
    } else {
      setTimeLeft(0); // No timer for level mode
      setUserInput('');
      setFeedback(null);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !feedback && !aiEvaluation && !isAiLoading) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing' && !feedback && !aiEvaluation) {
      if (mode === 'classic') {
        handleAnswer(''); 
      } else {
        handleSubmitPattern();
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gameState, feedback, aiEvaluation, isAiLoading, mode]);

  const handleAnswer = (selected: string) => {
    if (feedback) return;

    if (mode === 'levels') {
      const isCorrect = selected.trim().toLowerCase().replace(/[.,!?;:]/g, '') === currentCard.front.trim().toLowerCase().replace(/[.,!?;:]/g, '');
      if (isCorrect) {
         setFeedback('correct');
         setScore(prev => prev + 25);
         setIsWrongRetry(false);
         speak(currentCard.front);
         
         setTimeout(() => {
           if (currentIndex < cards.length - 1) {
             setCurrentIndex(prev => prev + 1);
             setLevel(prev => prev + 1);
             setFeedback(null);
             setUserInput('');
           } else {
             setGameState('finished');
           }
         }, 1500);
      } else {
         setFeedback('wrong');
         setIsWrongRetry(true);
         setTimeout(() => setFeedback(null), 1000);
      }
      return;
    }

    const isCorrect = selected === currentCard.back;
    if (isCorrect) {
      setFeedback('correct');
      const newCombo = combo + 1;
      setCombo(newCombo);

      let rating = 'GOOD';
      let bonus = 0;
      if (timeLeft > 11) {
        rating = 'PERFECT';
        bonus = 15;
      } else if (timeLeft > 6) {
        rating = 'GREAT';
        bonus = 8;
      }
      setLastRating(rating);

      const baseScore = 15 + bonus;
      const multiplier = Math.min(1 + newCombo * 0.1, 2);
      const points = Math.floor(baseScore * multiplier);
      setScore(prev => prev + points);

      speak(currentCard.front);
      
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          nextRound(currentIndex + 1);
        } else {
          setGameState('finished');
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setHearts(prev => prev - 1);
      setCombo(0);
      setLastRating('Ouch!');
      
      if (hearts <= 1) {
        setTimeout(() => setGameState('finished'), 1000);
      } else {
        setTimeout(() => {
          if (currentIndex < cards.length - 1) {
            nextRound(currentIndex + 1);
          } else {
            setGameState('finished');
          }
        }, 1500);
      }
    }
  };

  const handleSubmitPattern = async () => {
    if (isSubmitting || !patternChallenge) return;
    setIsSubmitting(true);
    try {
      const evaluation = await geminiPatternService.evaluateResponse(
        userInput,
        patternChallenge.expectedPattern,
        patternChallenge.pattern
      );
      setAiEvaluation(evaluation);
      
      if (evaluation.isCorrect) {
        const points = Math.floor(evaluation.score / 2);
        setScore(prev => prev + points);
        setCombo(prev => prev + 1);
        setLastRating(evaluation.score > 90 ? 'EXCELLENT' : 'GOOD');
      } else {
        setHearts(prev => prev - 1);
        setCombo(0);
        setLastRating('WRONG');
        if (hearts <= 1) {
          setTimeout(() => setGameState('finished'), 2000);
          return;
        }
      }

      // Auto advance after short delay if correct
      if (evaluation.isCorrect) {
        setTimeout(() => {
          if (currentIndex < cards.length - 1) {
            nextRound(currentIndex + 1);
          } else {
            setGameState('finished');
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (gameState === 'playing' || gameState === 'finished') {
      setGameState('start');
    } else {
      onClose();
    }
  };

  if (cards.length < 4) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
          <RotateCcw size={32} />
        </div>
        <h2 className="text-xl font-bold">词库不足</h2>
        <p className="text-gray-500 text-sm">闯关模式至少需要 4 个单词。快去探索新词吧！</p>
        <button onClick={handleBack} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">返回</button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={handleBack} 
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-bold text-sm">返回</span>
        </button>
        {gameState === 'playing' && (
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {combo > 1 && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1 rounded-lg shadow-lg"
                >
                  <span className="text-[10px] font-black uppercase tracking-tighter">Combo</span>
                  <span className="text-lg font-black italic">{combo}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart key={i} size={18} className={cn("transition-all", i < hearts ? "text-red-500 fill-red-500" : "text-gray-200")} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <Timer size={14} className={cn("text-blue-500", timeLeft < 5 && "text-red-500 animate-pulse")} />
              <span className={cn("text-sm font-mono font-bold w-6", timeLeft < 5 ? "text-red-500" : "text-blue-700")}>{timeLeft}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
          <Trophy size={14} className="text-amber-500" />
          <span className="text-sm font-bold text-amber-700">{score}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'start' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center space-y-8 text-center relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-0 left-0 p-3 bg-white/50 backdrop-blur-sm text-gray-400 rounded-2xl hover:text-gray-900 transition-all hover:bg-white shadow-sm group"
              title="返回"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>

            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
              <Trophy size={80} className="text-amber-400 relative" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-gray-900">游戏化英语学习</h2>
              
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 bg-gray-100 p-1 rounded-2xl w-full max-w-3xl mx-auto">
                <button 
                  onClick={() => { setMode('classic'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'classic' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <BookOpen size={18} /> 经典
                </button>
                <button 
                  onClick={() => { setMode('levels'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'levels' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Trophy size={18} /> 闯关
                </button>
                <button 
                  onClick={() => { setMode('pattern'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'pattern' ? "bg-white text-purple-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Sparkles size={18} /> 句型
                </button>
                <button 
                  onClick={() => { setMode('match'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'match' ? "bg-white text-green-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Sparkles size={18} /> 配对
                </button>
                <button 
                  onClick={() => { setMode('plane'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'plane' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Gamepad2 size={18} /> 游戏
                </button>
                <button 
                  onClick={() => { setMode('zombie'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'zombie' ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  🧟 僵尸
                </button>
                <button 
                  onClick={() => { setMode('racing'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'racing' ? "bg-white text-yellow-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  🏎️ 飙车
                </button>
                <button 
                  onClick={() => { setMode('listening'); playClickSound(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    mode === 'listening' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  🎧 听力
                </button>
              </div>

              {/* PDF Import Helper */}
              <div className="pt-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">或者</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-purple-600 font-bold text-xs hover:bg-purple-50 transition-all cursor-pointer shadow-sm">
                  <BookOpen size={14} className="text-purple-500" />
                  一键导入 PDF 生成专属关卡
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { processPDFToFlashcards } = await import('../services/pdfService');
                        const imported = await processPDFToFlashcards(file);
                        if (imported.length > 0) {
                          await onAddCards(imported);
                          alert(`成功导入 ${imported.length} 个单词到游戏库！`);
                        }
                      } catch (err) {
                        alert("导入失败");
                      }
                    }}
                  />
                </label>
              </div>

              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                {mode === 'classic' 
                  ? "选择正确的翻译，连续答对可获得 Combo 奖励！" 
                  : mode === 'levels'
                  ? "逐关击破：必须答对当前句子才能解锁下一关，挑战完美通关！"
                  : mode === 'pattern'
                  ? "AI 分析句型并生成变换练习，深度掌握固定搭配。"
                  : mode === 'zombie'
                  ? "僵尸大战：输入正确单词击退僵尸，保卫你的英语基地！"
                  : mode === 'racing'
                  ? "沙漠飙车：在极速驰骋中识别单词，体验心跳加速的英语学习！"
                  : mode === 'listening'
                  ? "听力挑战：耳机党福利！通过纯正美式发音识别单词，全方位提升语感。"
                  : mode === 'match'
                  ? "单词配对模式：经典的单词配对练习。将英文句型与正确翻译快速匹配，提升检索速度。"
                  : "飞机大战：击落不断砸向你的单词，在战斗中形成肌肉记忆！"}
              </p>
            </div>

            <button 
              onClick={startGame}
              className={cn(
                "group relative px-12 py-4 text-white rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all",
                mode === 'classic' ? "bg-blue-600 shadow-blue-100" : "bg-purple-600 shadow-purple-100"
              )}
            >
              立即开战
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center w-full"
          >
            {mode === 'plane' ? (
              <WordPlaneGame 
                cards={cards} 
                onClose={() => setGameState('start')} 
              />
            ) : mode === 'zombie' ? (
              <ZombieEnglishGame 
                cards={cards} 
                onClose={() => setGameState('start')} 
              />
            ) : mode === 'racing' ? (
              <DesertRacingGame 
                cards={cards}
                onClose={() => setGameState('start')} 
              />
            ) : mode === 'listening' ? (
              <ListeningGame 
                cards={cards}
                onClose={() => setGameState('start')} 
              />
            ) : mode === 'match' ? (
              <WordMatchGame 
                cards={cards}
                onClose={() => setGameState('start')} 
              />
            ) : mode === 'levels' ? (
               <div className="w-full space-y-8">
                  {/* Level Progress */}
                  <div className="flex items-center gap-2 justify-center mb-4">
                     {cards.map((_, i) => (
                        <div 
                           key={i}
                           className={cn(
                              "h-2 flex-1 rounded-full transition-all duration-500",
                              i < currentIndex ? "bg-green-500" : i === currentIndex ? "bg-orange-500 animate-pulse" : "bg-gray-200"
                           )}
                        />
                     ))}
                  </div>

                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-orange-100 border border-orange-50 border-b-4 border-b-orange-200 relative overflow-hidden">
                     <div className="absolute top-6 left-6">
                        <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                           Level {level}
                        </div>
                     </div>

                     <div className="text-center space-y-6 pt-6">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">请翻译此句</span>
                        <h3 className="text-3xl font-black text-gray-800 leading-tight">
                           {currentCard.back}
                        </h3>

                        <div className="relative mt-8 group">
                           <input 
                              autoFocus
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAnswer(userInput)}
                              placeholder="在这里输入英文答案..."
                              className={cn(
                                 "w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-xl font-bold outline-none transition-all text-center",
                                 !feedback && "border-gray-100 focus:border-orange-400 focus:bg-white",
                                 feedback === 'correct' && "border-green-500 bg-green-50 text-green-700",
                                 feedback === 'wrong' && "border-red-500 bg-red-50 text-red-700 animate-shake"
                              )}
                           />
                           {isWrongRetry && !feedback && (
                              <motion.p 
                                 initial={{ opacity: 0, y: 5 }} 
                                 animate={{ opacity: 1, y: 0 }}
                                 className="text-xs text-red-500 font-bold mt-3 text-center"
                              >
                                 ❌ 回答不正确，请再试一次 (提示: {currentCard.front.slice(0, 3)}...)
                              </motion.p>
                           )}
                        </div>

                        <div className="flex justify-center items-center gap-4 pt-4">
                           <button 
                              onClick={handleBack}
                              className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center gap-2"
                           >
                              <ArrowLeft size={20} />
                              返回
                           </button>
                           <button 
                              onClick={() => handleAnswer(userInput)}
                              disabled={!userInput.trim() || !!feedback}
                              className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50"
                           >
                              提交关卡
                           </button>
                        </div>
                     </div>

                     <AnimatePresence>
                        {feedback === 'correct' && (
                           <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute inset-0 bg-green-500/10 backdrop-blur-sm flex items-center justify-center z-10"
                           >
                              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4">
                                 <CheckCircle2 size={64} className="text-green-500 mx-auto" />
                                 <h4 className="text-2xl font-black text-green-700">Perfect!</h4>
                                 <p className="text-gray-500">第 {level} 关解锁成功</p>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            ) : mode === 'classic' ? (
              <>
                {/* Word Display */}
                <div className="w-full text-center py-12 mb-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 relative overflow-hidden">
                   <AnimatePresence>
                     {lastRating && (
                       <motion.div
                         initial={{ y: 20, opacity: 0, scale: 0.5 }}
                         animate={{ y: -40, opacity: 1, scale: 1.2 }}
                         exit={{ opacity: 0 }}
                         className={cn(
                           "absolute left-0 right-0 top-1/2 -translate-y-1/2 z-10 font-black text-2xl italic tracking-widest text-center",
                           lastRating === 'PERFECT' ? "text-purple-600" : 
                           lastRating === 'GREAT' ? "text-blue-500" : 
                           lastRating === 'GOOD' ? "text-green-500" : "text-red-500"
                         )}
                       >
                         {lastRating}
                       </motion.div>
                     )}
                   </AnimatePresence>
                   <motion.h3 
                    key={currentIndex}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-black text-blue-600 tracking-tight"
                   >
                    {currentCard.front}
                   </motion.h3>
                   {currentCard.details.phonetic && <p className="text-gray-400 font-mono mt-2">/{currentCard.details.phonetic}/</p>}
                   
                   {/* Time Bar */}
                   <div className="absolute bottom-0 left-0 h-1.5 bg-blue-100 w-full">
                     <motion.div 
                       className={cn("h-full transition-all duration-1000 ease-linear", timeLeft < 5 ? "bg-red-500" : "bg-blue-500")}
                       style={{ width: `${(timeLeft / 15) * 100}%` }}
                     />
                   </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {options.map((option, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: feedback ? 1 : 1.02 }}
                      whileTap={{ scale: feedback ? 1 : 0.98 }}
                      onClick={() => handleAnswer(option)}
                      disabled={!!feedback}
                      className={cn(
                        "p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                        !feedback && "bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50 shadow-sm",
                        feedback === 'correct' && option === currentCard.back && "bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-100",
                        feedback === 'wrong' && option === currentCard.back && "bg-green-50 border-green-500 text-green-700",
                        feedback === 'wrong' && option !== currentCard.back && "bg-red-50 border-red-200 text-red-500 opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                          !feedback && "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500",
                          feedback === 'correct' && option === currentCard.back && "bg-green-500 text-white",
                          feedback === 'wrong' && option === currentCard.back && "bg-green-500 text-white"
                        )}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="font-bold text-lg">{option}</span>
                      </div>
                      
                      {feedback === 'correct' && option === currentCard.back && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-4 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="text-green-500" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <button 
                    onClick={handleBack}
                    className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <ArrowLeft size={20} />
                    返回
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full space-y-6">
                {/* AI Pattern Analysis Section */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-100">
                     <motion.div 
                       className="h-full bg-purple-500"
                       animate={{ width: isAiLoading ? ['0%', '100%'] : '100%' }}
                       transition={isAiLoading ? { duration: 2, repeat: Infinity } : {}}
                       style={{ width: `${(timeLeft / 45) * 100}%` }}
                     />
                   </div>

                   {isAiLoading ? (
                     <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="animate-spin text-purple-500" size={40} />
                        <p className="text-gray-400 font-bold animate-pulse">Gemini AI 正在分析句型并生成挑战...</p>
                     </div>
                   ) : patternChallenge ? (
                     <div className="space-y-8">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 bg-purple-50 px-4 py-1.5 rounded-full border border-purple-100">
                              <Sparkles className="text-purple-500" size={14} />
                              <span className="text-xs font-black text-purple-700 uppercase tracking-widest">句型套用练习</span>
                           </div>
                           <button 
                             onClick={() => speak(patternChallenge.pattern)}
                             className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                           >
                             <Volume2 size={20} />
                           </button>
                        </div>

                        <div className="space-y-4 text-left">
                           <div className="space-y-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">针对句型</span>
                              <h4 className="text-xl font-black text-purple-600">{patternChallenge.pattern}</h4>
                           </div>
                           <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-left">新的挑战 (请翻译成英文)</span>
                              <p className="text-2xl font-bold text-gray-800 leading-tight">
                                {patternChallenge.generatedPrompt}
                              </p>
                              <p className="text-sm text-gray-400 mt-4 italic">
                                提示: {patternChallenge.hint}
                              </p>
                           </div>
                        </div>

                        {!aiEvaluation ? (
                          <div className="space-y-6">
                             <div className="relative">
                               <input 
                                 autoFocus
                                 value={userInput}
                                 onChange={(e) => setUserInput(e.target.value)}
                                 placeholder="输入您的回答..."
                                 onKeyDown={(e) => e.key === 'Enter' && handleSubmitPattern()}
                                 className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-5 text-lg font-bold outline-none focus:border-purple-500 transition-all shadow-sm"
                               />
                             </div>

                             <div className="flex justify-center items-center gap-4">
                                <button 
                                  onClick={handleBack}
                                  className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all flex items-center gap-2"
                                >
                                  <ArrowLeft size={20} />
                                  返回
                                </button>
                                <button 
                                  onClick={handleSubmitPattern}
                                  disabled={isSubmitting || !userInput.trim()}
                                  className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                  <span>提交答案</span>
                                </button>
                             </div>
                          </div>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-6 rounded-2xl border-2 space-y-4 text-left",
                              aiEvaluation.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                            )}
                          >
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   {aiEvaluation.isCorrect ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                                   <span className={cn("text-2xl font-black", aiEvaluation.isCorrect ? "text-green-700" : "text-red-700")}>
                                     {aiEvaluation.score}分
                                   </span>
                                </div>
                                {aiEvaluation.isCorrect && (
                                   <button 
                                     onClick={() => speak(userInput)}
                                     className="p-3 bg-red-500 text-white rounded-lg shadow-sm"
                                   >
                                     <Volume2 size={16} />
                                   </button>
                                )}
                             </div>

                             <div className="space-y-4">
                                {!aiEvaluation.isCorrect && (
                                   <div className="bg-white/50 p-4 rounded-xl">
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 font-sans">修正建议</span>
                                      <p className="font-bold text-gray-800">{aiEvaluation.correction}</p>
                                   </div>
                                )}
                                <div className="bg-white/50 p-4 rounded-xl">
                                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 font-sans">AI 详解</span>
                                   <p className="text-sm text-gray-600 leading-relaxed">{aiEvaluation.explanation}</p>
                                </div>
                             </div>

                             {aiEvaluation.isCorrect ? (
                               <div className="text-center py-2">
                                  <p className="text-xs text-green-600 font-bold animate-pulse">太棒了！即将进入下一题...</p>
                               </div>
                             ) : (
                               <button 
                                 onClick={() => {
                                   if (currentIndex < cards.length - 1) {
                                     nextRound(currentIndex + 1);
                                   } else {
                                     setGameState('finished');
                                   }
                                 }}
                                 className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                               >
                                 下一题
                               </button>
                             )}
                          </motion.div>
                        )}
                     </div>
                   ) : (
                     <div className="text-center py-12">
                        <p className="text-red-500 font-bold">无法生成 AI 挑战，请重试。</p>
                        <button onClick={() => nextRound(currentIndex)} className="mt-4 px-6 py-2 bg-gray-100 rounded-xl font-bold">刷新</button>
                     </div>
                   )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'finished' && (
          <motion.div 
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center space-y-8 text-center"
          >
            {(() => {
              const rank = getRank(score);
              return (
                <>
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <Trophy size={100} className="text-amber-400 mx-auto" />
                      <motion.div 
                        initial={{ scale: 0, rotate: 15 }}
                        animate={{ scale: 1, rotate: -5 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                          delay: 0.3 
                        }}
                        className={cn(
                          "absolute -top-4 -right-4 bg-white px-4 py-2 rounded-2xl font-black text-4xl shadow-2xl border-4",
                          rank.color,
                          "border-current"
                        )}
                      >
                        {rank.label}
                      </motion.div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black">挑战达成！</h2>
                      <p className="text-gray-500 mt-1">
                        荣获评价：<span className={cn("font-black", rank.color)}>{rank.title}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="text-xs text-gray-400 font-bold uppercase mb-1">SCORE</div>
                      <div className="text-xl font-black text-gray-900">{score}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="text-xs text-gray-400 font-bold uppercase mb-1">MAX COMBO</div>
                      <div className="text-xl font-black text-orange-500">{combo}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="text-xs text-gray-400 font-bold uppercase mb-1">XP</div>
                      <div className="text-xl font-black text-blue-500">+{Math.floor((score + combo * 5) / 2)}</div>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex gap-4 w-full max-w-sm">
              <button 
                onClick={startGame}
                className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all"
              >
                再战一次
              </button>
              <button 
                onClick={handleBack}
                className="flex-1 px-8 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-50 transition-all"
              >
                返回关卡
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
