
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Flashcard } from "../types";
import { speakNative as speak, playSuccessSound, playClickSound, playErrorSound } from "../lib/audio";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, X, Trophy, CheckCircle2, ChevronLeft } from "lucide-react";

interface ListeningGameProps {
  cards: Flashcard[];
  onClose: () => void;
}

// 随机
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// 获取随机题目
function generateQuestion(cards: Flashcard[], currentIndex: number) {
  const current = cards[currentIndex];
  if (!current) return null;

  const answer = current.front;
  
  // Get wrong options from other cards
  const otherTexts = cards
    .filter((_, i) => i !== currentIndex)
    .map((c) => c.front);

  const wrongTexts = shuffle(otherTexts).slice(0, 3); // Get up to 3 wrong options if possible
  const options = shuffle([answer, ...wrongTexts]);

  return {
    answer,
    options,
    translation: current.back
  };
}

export function ListeningGame({ cards, onClose }: ListeningGameProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const question = useMemo(() => {
    return generateQuestion(cards, questionIndex);
  }, [cards, questionIndex]);

  // 播放音频
  const playAudio = () => {
    if (question) {
      speak(question.answer, { rate: 0.8 });
    }
  };

  // 自动播放
  useEffect(() => {
    const timer = setTimeout(() => {
      playAudio();
    }, 600);
    return () => clearTimeout(timer);
  }, [questionIndex]);

  // 选择答案
  const choose = (item: string) => {
    if (showResult || !question) return;

    const correct = item === question.answer;
    setSelected(item);
    setShowResult(true);

    if (correct) {
      playSuccessSound();
      setScore((prev) => prev + 100);
      setCombo((prev) => {
        const next = prev + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });
    } else {
      playErrorSound();
      setWrongCount((prev) => prev + 1);
      setCombo(0);
    }

    // 下一题
    setTimeout(() => {
      setSelected(null);
      setShowResult(false);

      if (questionIndex + 1 >= cards.length) {
        setGameFinished(true);
      } else {
        setQuestionIndex((prev) => prev + 1);
      }
    }, 1500);
  };

  // 重开
  const restart = () => {
    setQuestionIndex(0);
    setScore(0);
    setWrongCount(0);
    setCombo(0);
    setMaxCombo(0);
    setSelected(null);
    setShowResult(false);
    setGameFinished(false);
  };

  if (gameFinished) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl p-8 text-center border border-gray-100"
        >
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">听力挑战结束</h2>
          
          <div className="space-y-4 py-6">
            <div className="bg-blue-50 py-4 rounded-3xl">
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">总分</p>
              <p className="text-4xl font-black text-blue-600">{score}</p>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 bg-red-50 py-4 rounded-3xl">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">错误题数</p>
                <p className="text-2xl font-black text-red-500">{wrongCount}</p>
              </div>
              <div className="flex-1 bg-green-50 py-4 rounded-3xl">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">最长连击</p>
                <p className="text-2xl font-black text-green-500">{maxCombo}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-5 rounded-2xl bg-gray-100 text-gray-600 text-lg font-black hover:bg-gray-200 transition-all mb-3"
          >
            返回关卡选择
          </button>
          <button
            onClick={restart}
            className="w-full py-5 rounded-2xl bg-indigo-600 text-white text-lg font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            再来一回合
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* HUD */}
      <div className="w-full flex items-center justify-between mb-8">
        <button 
          onClick={onClose}
          className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-all"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex-1 mx-6">
          <div className="flex justify-between items-end mb-1">
            <span className="text-indigo-500 text-xs font-black uppercase tracking-widest">
              连击 × {combo}
            </span>
            <span className="text-gray-400 text-[10px] font-bold">
              {questionIndex + 1} / {cards.length}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
            <motion.div
              className="h-full bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)]"
              initial={{ width: 0 }}
              animate={{
                width: `${((questionIndex + 1) / cards.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="text-pink-500 text-xl font-black tabular-nums">
          ⚡ {score}
        </div>
      </div>

      <div className="text-center space-y-2 mb-10">
        <h3 className="text-3xl font-black text-gray-800">你听到了什么？</h3>
        <p className="text-gray-400 font-bold text-sm">点击喇叭重新播放音频</p>
      </div>

      {/* Speaker */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={playAudio}
        className="w-40 h-40 rounded-[48px] bg-indigo-500 shadow-2xl shadow-indigo-200 flex items-center justify-center transition-all relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Volume2 size={80} className="text-white drop-shadow-lg" />
      </motion.button>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mt-12">
        {question?.options.map((item) => {
          const isCorrect = item === question.answer;
          const isSelected = item === selected;

          return (
            <motion.button
              key={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => choose(item)}
              disabled={showResult}
              className={cn(
                "min-h-[100px] rounded-3xl border-2 p-6 text-xl font-bold transition-all flex items-center justify-center text-center shadow-sm",
                !showResult && "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700",
                showResult && isSelected && isCorrect && "bg-green-50 border-green-500 text-green-700 shadow-green-100",
                showResult && isSelected && !isCorrect && "bg-red-50 border-red-500 text-red-700 shadow-red-100",
                showResult && !isSelected && isCorrect && "bg-green-50 border-green-200 text-green-600 opacity-60",
                showResult && !isSelected && !isCorrect && "bg-gray-50 border-gray-100 text-gray-300 opacity-40"
              )}
            >
              {item}
            </motion.button>
          );
        })}
      </div>

      {/* Bottom Feedback Banner */}
      <AnimatePresence>
        {showResult && question && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={cn(
              "fixed bottom-0 left-0 w-full p-8 z-50 flex flex-col items-center border-t backdrop-blur-md",
              selected === question.answer
                ? "bg-green-50/90 border-green-200"
                : "bg-red-50/90 border-red-200"
            )}
          >
            <div className="flex items-center gap-3">
              {selected === question.answer ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1.2, rotate: 0 }}
                  transition={{ type: "spring", damping: 10 }}
                >
                  <CheckCircle2 size={40} className="text-green-600" />
                </motion.div>
              ) : (
                <X size={32} className="text-red-500" />
              )}
              <div className="text-3xl font-black">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={selected === question.answer ? "text-green-600 block" : "text-red-500"}
                >
                  {selected === question.answer ? "太棒啦！" : "哎呀，选错了"}
                </motion.span>
              </div>
            </div>

            <div className="mt-2 text-gray-600 font-bold flex items-center gap-2">
              正确答案：<span className="text-indigo-600">{question.answer}</span>
              <span className="text-gray-300 mx-2">|</span>
              释义：<span className="text-gray-800">{question.translation}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Back Button - Moved to top right for better visibility and consistency */}
      <div className="fixed top-6 right-6 z-40">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-6 py-3 bg-white border-2 border-indigo-100 hover:border-indigo-500 text-indigo-600 rounded-2xl shadow-lg transition-all font-black text-sm tracking-widest flex items-center gap-2 group active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <X size={16} />
          </div>
          返回
        </motion.button>
      </div>
    </div>
  );
}
