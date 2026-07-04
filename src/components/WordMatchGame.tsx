
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Flashcard } from '../types';
import { cn } from '../lib/utils';
import { speakNative as speak, playSuccessSound, playClickSound, playErrorSound } from '../lib/audio';
import { deconstructCards } from '../lib/vocabulary';

interface WordMatchGameProps {
  cards: Flashcard[];
  onClose: () => void;
}

export function WordMatchGame({ cards, onClose }: WordMatchGameProps) {
  const [leftMatchItems, setLeftMatchItems] = useState<{id: string, text: string, type: 'en'}[]>([]);
  const [rightMatchItems, setRightMatchItems] = useState<{id: string, text: string, type: 'cn'}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{id: string, type: 'en' | 'cn'} | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchError, setMatchError] = useState<{id1: string, id2: string} | null>(null);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [deconstructedWords, setDeconstructedWords] = useState<{en: string, cn: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const initialize = async () => {
      setIsDeconstructing(true);
      try {
        const words = await deconstructCards(cards.slice(0, 20));
        if (!words || words.length === 0) {
          throw new Error("Empty vocabulary deconstruction array");
        }
        setDeconstructedWords(words);
        prepareSet(words, 0);
      } catch (error) {
        console.warn("AI deconstruction failed or empty, falling back to basic cards:", error);
        // Fallback to basic cards if AI deconstruction fails.
        // Use the card's stored translation (details.translation -> back) so
        // every card always has a real Chinese side, never a placeholder.
        const words = cards.slice(0, 20).map(c => {
          const cn = c.details?.translation && !c.details.translation.includes('暂无')
            ? c.details.translation
            : (c.back && c.back !== '(自定义句子)' ? c.back : '(暂无翻译)');
          return { en: c.front, cn };
        });
        setDeconstructedWords(words);
        prepareSet(words, 0);
      } finally {
        setIsDeconstructing(false);
      }
    };
    initialize();
  }, [cards]);

  const prepareSet = (words: {en: string, cn: string}[], startIndex: number) => {
    const nextSet = words.slice(startIndex, startIndex + 5);
    if (nextSet.length === 0) {
      setIsFinished(true);
      return;
    }
    const enItems = nextSet.map((w, i) => ({ id: `word-${startIndex + i}`, text: w.en, type: 'en' as const }));
    const cnItems = nextSet.map((w, i) => ({ id: `word-${startIndex + i}`, text: w.cn, type: 'cn' as const }));
    setLeftMatchItems([...enItems].sort(() => Math.random() - 0.5));
    setRightMatchItems([...cnItems].sort(() => Math.random() - 0.5));
    setMatchedIds([]);
  };

  const handleSelect = (id: string, type: 'en' | 'cn', text: string) => {
    if (matchedIds.includes(id) || (matchError && (matchError.id1 === id || matchError.id2 === id))) return;

    if (!selectedMatch) {
      setSelectedMatch({ id, type });
      if (type === 'en') {
        speak(text);
      } else {
        playClickSound();
      }
      return;
    }

    if (selectedMatch.id === id && selectedMatch.type === type) {
      playClickSound();
      setSelectedMatch(null);
      return;
    }

    if (selectedMatch.id === id && selectedMatch.type !== type) {
      // Correct Match
      playSuccessSound();
      setMatchedIds(prev => [...prev, id]);
      setSelectedMatch(null);
      setScore(prev => prev + 20);
      
      if (matchedIds.length + 1 === leftMatchItems.length) {
        setTimeout(() => {
          const nextIdx = currentIndex + 5;
          if (nextIdx < deconstructedWords.length) {
            setCurrentIndex(nextIdx);
            prepareSet(deconstructedWords, nextIdx);
          } else {
            setIsFinished(true);
          }
        }, 1000);
      }
    } else {
      // Wrong Match
      playErrorSound();
      setMatchError({ id1: selectedMatch.id, id2: id });
      setTimeout(() => {
        setMatchError(null);
        setSelectedMatch(null);
      }, 500);
    }
  };

  if (isFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-6 py-20"
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-gray-900">恭喜完成配对！</h2>
        <p className="text-gray-500 font-bold">最终得分: {score}</p>
        <button 
          onClick={onClose}
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          返回闯关中心
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 shadow-sm">
          <Sparkles size={14} className="animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Word Match Mode</span>
        </div>
        <h2 className="text-3xl font-black text-gray-800">单词配对挑战</h2>
        <p className="text-gray-400 font-bold text-sm">将左侧的英文与右侧的中文正确配对</p>
      </div>

      {isDeconstructing ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-green-500" size={40} />
          <p className="text-gray-400 font-bold">AI 正在精准拆分核心词汇...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8 px-4">
          {/* Left Column: English */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">English</p>
            {leftMatchItems.map((item) => {
              const matched = matchedIds.includes(item.id);
              const selected = selectedMatch?.id === item.id && selectedMatch.type === 'en';
              const error = matchError && (matchError.id1 === item.id || matchError.id2 === item.id);
              
              return (
                <motion.button
                  key={item.text}
                  onClick={() => handleSelect(item.id, 'en', item.text)}
                  disabled={matched}
                  animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                  className={cn(
                    "w-full h-20 rounded-2xl border-2 font-bold text-lg transition-all flex items-center justify-center p-4",
                    matched && "opacity-0 scale-90 pointer-events-none transition-all",
                    selected && "border-green-500 bg-green-50 text-green-700 shadow-md",
                    error && "border-red-500 bg-red-50 text-red-700",
                    !matched && !selected && !error && "bg-white border-gray-100 hover:border-green-200 text-gray-700 shadow-sm"
                  )}
                >
                  {item.text}
                </motion.button>
              );
            })}
          </div>

          {/* Right Column: Chinese */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">Chinese</p>
            {rightMatchItems.map((item) => {
              const matched = matchedIds.includes(item.id);
              const selected = selectedMatch?.id === item.id && selectedMatch.type === 'cn';
              const error = matchError && (matchError.id1 === item.id || matchError.id2 === item.id);

              return (
                <motion.button
                  key={item.text}
                  onClick={() => handleSelect(item.id, 'cn', item.text)}
                  disabled={matched}
                  animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                  className={cn(
                    "w-full h-20 rounded-2xl border-2 font-bold text-lg transition-all flex items-center justify-center p-4",
                    matched && "opacity-0 scale-90 pointer-events-none transition-all",
                    selected && "border-green-500 bg-green-50 text-green-700 shadow-md",
                    error && "border-red-500 bg-red-50 text-red-700",
                    !matched && !selected && !error && "bg-white border-gray-100 hover:border-green-200 text-gray-700 shadow-sm"
                  )}
                >
                  {item.text}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {!isDeconstructing && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-8 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all border border-gray-200"
          >
            <ArrowLeft size={18} /> 返回主页
          </button>
        </div>
      )}
    </div>
  );
}
