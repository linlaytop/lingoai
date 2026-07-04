import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Heart, Flame, Timer, Zap } from 'lucide-react';
import { Flashcard } from '../types';

interface DesertRacingGameProps {
  cards: Flashcard[];
  onClose: () => void;
}

interface GameItem {
  id: string;
  word: string;
  correct: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function DesertRacingGame({ cards, onClose }: DesertRacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<'playing' | 'gameOver' | 'victory'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [nitro, setNitro] = useState(0);
  const [speed, setSpeed] = useState(150); // Reduced base speed for easier gameplay
  const [flashcard, setFlashcard] = useState(cards[Math.floor(Math.random() * cards.length)]);

  // Resolve a card's Chinese translation, falling back through details -> back -> placeholder
  const resolveCn = (c: Flashcard) => {
    if (c.details?.translation && !c.details.translation.includes('暂无')) return c.details.translation;
    if (c.back && c.back !== '(自定义句子)') return c.back;
    return '(暂无翻译)';
  };

  // Internal refs for performance loop
  const itemsRef = useRef<GameItem[]>([]);
  const particlesRef = useRef<TrailParticle[]>([]);
  const carPosRef = useRef({ x: 0, y: 0 });
  const targetCarPosRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const gameLoopRef = useRef<number>(null);
  const collisionLockRef = useRef(false);
  const roadOffsetRef = useRef(0);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvas.width = clientWidth;
        canvas.height = clientHeight;
        
        if (carPosRef.current.x === 0) {
          carPosRef.current = { x: clientWidth / 2, y: clientHeight - 120 };
          targetCarPosRef.current = { ...carPosRef.current };
        }
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current!);

    const spawnWord = () => {
      const isCorrect = Math.random() > 0.4;
      const card = isCorrect ? flashcard : cards[Math.floor(Math.random() * cards.length)];
      const word = isCorrect
        ? (card.answer || resolveCn(card))
        : (card.options?.[Math.floor(Math.random() * (card.options?.length || 1))] || card.front || "");

      ctx.font = 'bold 18px Inter';
      const textWidth = ctx.measureText(word).width;

      itemsRef.current.push({
        id: Math.random().toString(36),
        word,
        correct: isCorrect && word === (flashcard.answer || resolveCn(flashcard)),
        x: Math.random() * (canvas.width - 100) + 50,
        y: -50,
        width: textWidth + 40,
        height: 44,
        speed: speed + Math.random() * 50 // Reduced variance
      });
    };

    const update = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (dt > 0.1) {
        gameLoopRef.current = requestAnimationFrame(update);
        return;
      }

      roadOffsetRef.current = (roadOffsetRef.current + speed * dt) % 100;

      // Smooth move car
      const easing = 0.15;
      carPosRef.current.x += (targetCarPosRef.current.x - carPosRef.current.x) * easing;
      carPosRef.current.y += (targetCarPosRef.current.y - carPosRef.current.y) * easing;

      // Spawn - increased interval for easier gameplay
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current > 1.8) {
        spawnWord();
        spawnTimerRef.current = 0;
      }

      // Update Items
      itemsRef.current = itemsRef.current.filter(item => {
        item.y += item.speed * dt;

        // Collision Check
        const dist = Math.hypot(item.x - carPosRef.current.x, item.y - carPosRef.current.y);
        if (dist < 60 && !collisionLockRef.current) {
          if (item.correct) {
            setScore(s => s + 100);
            setNitro(n => Math.min(n + 15, 100));
            setFlashcard(cards[Math.floor(Math.random() * cards.length)]);
            
            // Success particles
            for(let i=0; i<15; i++) {
               particlesRef.current.push({
                 x: item.x, y: item.y,
                 vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400,
                 life: 0.8, color: '#facc15'
               });
            }
          } else {
            setLives(l => {
              const nl = l - 1;
              if (nl <= 0) setGameState('gameOver');
              return nl;
            });
            // Damage particles
            for(let i=0; i<15; i++) {
               particlesRef.current.push({
                 x: item.x, y: item.y,
                 vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300,
                 life: 0.6, color: '#ef4444'
               });
            }
          }
          return false;
        }

        return item.y < canvas.height + 100;
      });

      // Trail Particles
      if (Math.random() > 0.3) {
        particlesRef.current.push({
          x: carPosRef.current.x + (Math.random() - 0.5) * 30,
          y: carPosRef.current.y + 30,
          vx: (Math.random() - 0.5) * 20,
          vy: 100,
          life: 0.5,
          color: nitro > 90 ? '#22d3ee' : '#fed7aa'
        });
      }
      
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      draw();
      gameLoopRef.current = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Road lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([40, 60]);
      ctx.lineDashOffset = -roadOffsetRef.current; 
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Word Items
      itemsRef.current.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(-item.width/2 + 4, -item.height/2 + 4, item.width, item.height, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-item.width/2, -item.height/2, item.width, item.height, 12);
        ctx.fill();
        ctx.strokeStyle = item.correct ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.word, 0, 0);
        ctx.restore();
      });

      // Draw Car
      ctx.save();
      ctx.translate(carPosRef.current.x, carPosRef.current.y);
      ctx.font = '64px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏎️', 0, 0);
      ctx.restore();
    };

    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(update);

    const handlePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetCarPosRef.current.x = e.clientX - rect.left;
      targetCarPosRef.current.y = e.clientY - rect.top;
    };

    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('pointerdown', handlePointer);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      ro.disconnect();
      canvas.removeEventListener('pointermove', handlePointer);
      canvas.removeEventListener('pointerdown', handlePointer);
    };
  }, [gameState, cards, flashcard]);

  const restart = () => {
    itemsRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setLives(3);
    setNitro(0);
    setGameState('playing');
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-[#d49b35] overflow-hidden select-none touch-none">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-yellow-500 to-orange-700 pointer-events-none" />
      
      <canvas ref={canvasRef} className="relative z-10 block w-full h-full cursor-none" />

      {/* UI Elements */}
      <div className="absolute top-6 left-6 right-6 z-20 flex flex-col gap-4 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
              <Trophy className="text-yellow-400" />
              <span className="text-2xl font-black text-white tabular-nums">{score}</span>
            </div>
            <div className="flex gap-1.5 ml-1">
              {[...Array(3)].map((_, i) => (
                <Heart key={i} size={22} className={i < lives ? "text-red-500 fill-red-500" : "text-white/20 fill-white/10"} />
              ))}
            </div>
          </div>

          <button onClick={onClose} className="p-3 bg-black/40 backdrop-blur-md text-white rounded-2xl border border-white/10 hover:bg-black/60 pointer-events-auto transition-all">
            <ChevronLeft size={32} />
          </button>
        </div>

        {/* Level Question */}
        <div className="w-full max-w-xl mx-auto bg-black/50 backdrop-blur-xl p-6 rounded-[30px] border border-white/10 text-center shadow-2xl">
          <div className="text-yellow-400 text-sm font-black tracking-widest uppercase mb-2">Target Challenge</div>
          <p className="text-3xl font-bold leading-tight text-white">
            {(flashcard.sentence || flashcard.front).split(flashcard.answer || resolveCn(flashcard)).map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && <span className="text-cyan-400 border-b-4 border-cyan-400 px-2 mx-1 italic">_____</span>}
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* Nitro Bar */}
      <div className="absolute left-6 bottom-10 w-48 h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 z-20">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${nitro}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black tracking-tighter text-white uppercase italic">Nitro Boost</div>
      </div>

      {/* Control Hint */}
      {score === 0 && (
         <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 z-20 text-white/80 font-black text-xs uppercase tracking-widest pointer-events-none">
           Drag car to eat the correct words
         </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 z-[200] bg-black/90 flex items-center justify-center backdrop-blur-2xl p-6">
          <div className="text-center max-w-sm">
            <div className="text-9xl mb-8">💥</div>
            <h2 className="text-6xl font-black text-white mb-4 italic tracking-tighter">GAME OVER</h2>
            <p className="text-white/60 text-lg mb-10">You've reached critical engine damage.</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={restart}
                className="w-full py-5 bg-gradient-to-br from-red-500 to-orange-600 rounded-[2rem] text-2xl font-black text-white hover:scale-105 active:scale-95 transition-all"
              >
                🔄 RESTART
              </button>
              <button 
                onClick={onClose}
                className="w-full py-5 bg-white/5 text-white/50 rounded-[2rem] font-bold hover:bg-white/10 transition-all border border-white/10"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
