import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trophy, Sword, RefreshCcw, Home, Loader2, ArrowLeft } from 'lucide-react';
import { Flashcard } from '../types';
import { cn } from '../lib/utils';

interface ZombieEnglishGameProps {
  cards: Flashcard[];
  onClose: () => void;
}

interface Zombie {
  id: number;
  word: string;
  meaning: string;
  hp: number;
  maxHp: number;
  position: number;
  speed: number;
  type: string;
  emoji: string;
  color: string;
}

export function ZombieEnglishGame({ cards, onClose }: ZombieEnglishGameProps) {
  const flashcards = cards.length > 0 ? cards.map(c => ({ word: c.front, meaning: c.back })) : [
    { word: 'apple', meaning: '苹果' },
    { word: 'environment', meaning: '环境' },
    { word: 'conversation', meaning: '对话' },
    { word: 'develop', meaning: '发展' },
    { word: 'pronunciation', meaning: '发音' },
    { word: 'airport', meaning: '机场' },
    { word: 'restaurant', meaning: '餐厅' },
    { word: 'technology', meaning: '科技' },
  ];

  const ZOMBIE_TYPES = [
    { type: 'standard', emoji: '🧟', color: 'text-green-500', hp: 1, speedMult: 1, weight: 60 },
    { type: 'runner', emoji: '🧟‍♂️', color: 'text-purple-500', hp: 1, speedMult: 1.8, weight: 20 },
    { type: 'tank', emoji: '👹', color: 'text-red-600', hp: 3, speedMult: 0.5, weight: 15 },
    { type: 'phantom', emoji: '👻', color: 'text-cyan-400', hp: 1, speedMult: 2.5, weight: 5 },
  ];

  function randomCard() {
    return flashcards[Math.floor(Math.random() * flashcards.length)];
  }

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [input, setInput] = useState('');
  const [currentCard, setCurrentCard] = useState(randomCard());
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const zombieIdRef = useRef(0);

  // 创建僵尸
  const spawnZombie = () => {
    const card = randomCard();
    
    // 根据权重选择类型
    const totalWeight = ZOMBIE_TYPES.reduce((acc, t) => acc + t.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = ZOMBIE_TYPES[0];
    
    for (const type of ZOMBIE_TYPES) {
      if (random < type.weight) {
        selectedType = type;
        break;
      }
      random -= type.weight;
    }

    const baseHp = selectedType.hp;
    const extraHp = Math.floor(wave / 5); // 每5波加一点血量上限

    const zombie: Zombie = {
      id: zombieIdRef.current++,
      word: card.word,
      meaning: card.meaning,
      hp: baseHp + extraHp,
      maxHp: baseHp + extraHp,
      position: 0,
      speed: (0.4 + wave * 0.06) * selectedType.speedMult,
      type: selectedType.type,
      emoji: selectedType.emoji,
      color: selectedType.color,
    };

    setZombies((prev) => [...prev, zombie]);
  };

  // 游戏主循环
  useEffect(() => {
    if (gameOver) return;

    intervalRef.current = setInterval(() => {
      setZombies((prev) => {
        const updatedZombies = prev.map((zombie) => ({
          ...zombie,
          position: zombie.position + zombie.speed,
        }));

        const reachedEnd = updatedZombies.some(z => z.position >= 92);
        
        if (reachedEnd) {
          setLives((l) => {
            if (l <= 1) {
              setGameOver(true);
              return 0;
            }
            return l - 1;
          });
          return updatedZombies.filter(z => z.position < 92);
        }

        return updatedZombies;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [gameOver, wave]);

  // 自动生成僵尸
  useEffect(() => {
    if (gameOver) return;

    spawnZombie();

    const zombieSpawner = setInterval(() => {
      spawnZombie();
    }, Math.max(2000 - wave * 100, 700));

    return () => clearInterval(zombieSpawner);
  }, [wave, gameOver]);

  // 文本标准化工具：移除标点符号，统一空格和撇号
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/['’]/g, "'") // 统一撇号
      .replace(/[^\w\s']/g, '') // 移除其他标点
      .replace(/\s+/g, ' ') // 压缩空格
      .trim();
  };

  const [isError, setIsError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 输入检测
  const handleAttack = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const normalizedInput = normalizeText(trimmedInput);

    // 寻找匹配的僵尸
    const targetIndex = zombies.findIndex(
      (zombie) => normalizeText(zombie.word) === normalizedInput
    );

    if (targetIndex === -1) {
      // 没匹配到时的反馈：抖动提醒
      setIsError(true);
      setCombo(0);
      setTimeout(() => setIsError(false), 500);
      return;
    }

    const target = zombies[targetIndex];

    setZombies((prev) =>
      prev
        .map((zombie) => {
          if (zombie.id === target.id) {
            return {
              ...zombie,
              hp: zombie.hp - 1,
            };
          }

          return zombie;
        })
        .filter((zombie) => zombie.hp > 0)
    );

    setScore((s) => s + 10);
    setCombo((c) => c + 1);

    if ((score + 10) % 100 === 0) {
      setWave((w) => w + 1);
    }

    // 击中后清空输入并更新目标
    setInput('');
    
    // 如果战场上还有僵尸，下一个目标设为最前面的僵尸
    if (zombies.length > 1) {
      const remaining = zombies.filter(z => z.id !== target.id);
      const nextTarget = remaining.reduce((prev, curr) => 
        prev.position > curr.position ? prev : curr
      );
      setCurrentCard({ word: nextTarget.word, meaning: nextTarget.meaning });
    } else {
      setCurrentCard(randomCard());
    }
  };

  // 监听僵尸生成，如果没有当前目标则自动设置一个
  useEffect(() => {
    if (zombies.length > 0 && (!currentCard || !zombies.some(z => z.word === currentCard.word))) {
      const leadingZombie = zombies.reduce((prev, curr) => 
        prev.position > curr.position ? prev : curr
      );
      setCurrentCard({ word: leadingZombie.word, meaning: leadingZombie.meaning });
    }
  }, [zombies]);

  // 回车攻击
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAttack();
    }
  };

  const comboText = useMemo(() => {
    if (combo >= 15) return '🔥 GODLIKE';
    if (combo >= 10) return '⚡ UNSTOPPABLE';
    if (combo >= 5) return '💥 COMBO';
    return '🎯 READY';
  }, [combo]);

  // 重开
  const restartGame = () => {
    setScore(0);
    setLives(3);
    setWave(1);
    setInput('');
    setZombies([]);
    setGameOver(false);
    setCombo(0);
    setCurrentCard(randomCard());
  };

  return (
    <div className="absolute inset-x-0 -top-8 -bottom-8 bg-[#071226] overflow-hidden text-white rounded-3xl z-50 flex flex-col">
      {/* 背景 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* 顶部信息 */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-wide flex items-center gap-2">
              🧟 Zombie War
            </h1>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none">
              击败僵尸保卫基地
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Score</div>
            <div className="text-lg font-black leading-tight">{score}</div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Wave</div>
            <div className="text-lg font-black leading-tight">{wave}</div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">Lives</div>
            <div className="flex gap-0.5 mt-0.5">
               {[...Array(3)].map((_, i) => (
                  <Heart size={14} key={i} className={i < lives ? "text-red-500 fill-red-500" : "text-white/10"} />
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* 游戏主体区域 */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* 闪卡与输入区域 */}
        <div className="relative z-10 px-8 py-6">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-md p-6 shadow-2xl border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white/40 mb-1 font-black uppercase tracking-widest">
                  当前目标
                </div>

                <div className={`font-black mb-1 break-words tracking-tight leading-none ${
                  currentCard.word.length > 35 ? 'text-lg' :
                  currentCard.word.length > 25 ? 'text-xl' : 
                  currentCard.word.length > 15 ? 'text-2xl' : 
                  currentCard.word.length > 10 ? 'text-3xl' : 'text-4xl'
                }`}>
                  {currentCard.word}
                </div>

                <div className="text-xs text-white/40 font-medium italic truncate max-w-full">
                  {currentCard.meaning}
                </div>
              </div>

            <div className="flex-1 w-full max-w-xl">
              <div className="flex gap-3">
                <motion.input
                  ref={inputRef}
                  autoFocus
                  animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => !gameOver && inputRef.current?.focus()}
                  placeholder="输入单词进行攻击..."
                  className={cn(
                    "flex-1 h-14 rounded-2xl bg-white/10 border px-6 text-lg outline-none transition-all font-bold",
                    isError ? "border-red-500 bg-red-500/10" : "border-white/20 focus:border-cyan-400 focus:bg-white/20"
                  )}
                />

                <button
                  onClick={handleAttack}
                  className={cn(
                    "px-6 rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2",
                    isError ? "bg-red-500 text-white" : "bg-white text-blue-600"
                  )}
                >
                  <Sword size={20} />
                  攻击
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-cyan-300 font-black text-xs tracking-widest italic">
                  {comboText}
                </div>
                {combo > 0 && (
                   <div className="text-[10px] text-white/40 font-bold">
                     COMBO x{combo}
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 战场 */}
        <div className="flex-1 relative mt-4 overflow-hidden select-none">
          {/* 道路线 */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/[0.03] w-full" />
          
          {/* 玩家基地 */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
            <div className="text-7xl drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] filter">🏠</div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">Base</div>
          </div>

          {/* 僵尸 */}
          {zombies.map((zombie) => (
            <div
              key={zombie.id}
              className="absolute transition-all duration-100 ease-linear"
              style={{
                left: `${zombie.position}%`,
                top: `${20 + (zombie.id % 4) * 18}%`,
              }}
            >
              <div className="relative group">
                {/* 血条 */}
                {zombie.maxHp > 1 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${(zombie.hp / zombie.maxHp) * 100}%` }}
                    />
                  </div>
                )}

                {/* 单词（始终可见，提高识别度） */}
                <div className={cn(
                  "absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg font-black whitespace-nowrap shadow-xl transition-all border",
                  normalizeText(input) === normalizeText(zombie.word).slice(0, normalizeText(input).length) && input.length > 0
                    ? "bg-cyan-400 text-black border-white scale-110 z-30" 
                    : "bg-white/90 text-black border-transparent scale-90"
                )}>
                  <div className="text-[10px] leading-none">
                    {zombie.word}
                  </div>
                </div>

                {/* 僵尸动画容器 */}
                <motion.div 
                  animate={{ 
                    rotate: [0, -5, 0, 5, 0],
                    x: [0, 2, 0, -2, 0]
                  }}
                  transition={{ 
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={cn("text-5xl drop-shadow-lg", zombie.color)}
                >
                  {zombie.emoji}
                </motion.div>
              </div>
            </div>
          ))}

          {/* 子弹特效（点击攻击时） */}
          <div className="absolute right-24 top-1/2 -translate-y-1/2 w-0.5 h-32 bg-gradient-to-t from-cyan-400 to-transparent blur-[1px] opacity-20 animate-pulse pointer-events-none" />
        </div>
      </div>

      {/* 游戏结束面板 */}
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-6"
          >
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="w-full max-w-md rounded-[40px] bg-[#101c35] border border-white/10 p-10 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
              
              <div className="text-7xl mb-6">💀</div>

              <h2 className="text-4xl font-black mb-2 tracking-tighter">
                英语基地失陷
              </h2>

              <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-8">
                Game Over
              </p>

              <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-[10px] text-white/40 mb-1 font-black uppercase">最终得分</div>
                  <div className="text-3xl font-black text-blue-400">{score}</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-[10px] text-white/40 mb-1 font-black uppercase">最大浪潮</div>
                  <div className="text-3xl font-black text-purple-400">{wave}</div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={restartGame}
                  className="w-full h-14 rounded-2xl bg-white text-blue-900 text-lg font-black shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={20} />
                  立刻复仇
                </button>
                <button
                  onClick={onClose}
                  className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-lg font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Home size={20} />
                  返回入口
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
