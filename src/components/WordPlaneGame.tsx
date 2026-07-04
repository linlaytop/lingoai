import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, Rocket, Zap, Trophy, RotateCcw, ArrowLeft, Heart, Volume2, Sparkles } from 'lucide-react';
import { Flashcard } from '../types';
import { deconstructCards } from '../lib/vocabulary';
import { speak } from '../lib/audio';
import { cn } from '../lib/utils';

interface WordPlaneGameProps {
  cards: Flashcard[];
  onClose: () => void;
}

interface GameItem {
  id: string;
  en: string;
  cn: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'word' | 'rock';
  health: number;
  isHit?: boolean;
}

interface Bullet {
  x: number;
  y: number;
  initialY: number;
  speed: number;
  length: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function WordPlaneGame({ cards, onClose }: WordPlaneGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'gameOver' | 'victory'>('loading');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0);
  const [words, setWords] = useState<{ en: string; cn: string }[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Game refs for high-perf loop
  const spawnedCountRef = useRef(0);
  const totalToSpawnRef = useRef(0);
  const gameLoopRef = useRef<number>(null);
  const itemsRef = useRef<GameItem[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const planePosRef = useRef({ x: 0, y: 0 });
  const targetPlanePosRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const bgMeteorsRef = useRef<{x: number, y: number, length: number, speed: number}[]>([]);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const shootTimerRef = useRef<number>(0);

  useEffect(() => {
    // Load words
    const loadWords = async () => {
      setIsInitializing(true);
      try {
        const extracted = await deconstructCards(cards);
        let finalWords = [];
        if (extracted && extracted.length > 0) {
          finalWords = extracted.slice(0, 50);
        } else {
          finalWords = cards.map(c => ({ en: c.front, cn: c.back }));
        }
        
        // Shuffle for variety
        finalWords = [...finalWords].sort(() => Math.random() - 0.5);
        setWords(finalWords);
        totalToSpawnRef.current = finalWords.length;
        spawnedCountRef.current = 0;
        setProgress(0);
      } catch (e) {
        console.error("Game word load error:", e);
        setWords(cards.map(c => ({ en: c.front, cn: c.back })));
      } finally {
        setGameState('playing');
        setIsInitializing(false);
      }
    };
    
    loadWords();

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [cards]);

  const scoreRef = useRef(0);

  // Sync ref for game loop speed calculations without re-running effect
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current || words.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (containerRef.current && canvas) {
        const clientWidth = containerRef.current.clientWidth;
        const clientHeight = containerRef.current.clientHeight;
        
        if (clientWidth > 0 && clientHeight > 0) {
          canvas.width = clientWidth;
          canvas.height = clientHeight;
          
          // Use a flag to avoid repetitive initialization
          if (planePosRef.current.x === 0 && planePosRef.current.y === 0) {
            planePosRef.current = { x: clientWidth / 2, y: clientHeight - 100 };
            targetPlanePosRef.current = { x: clientWidth / 2, y: clientHeight - 100 };
          }

          // Initialize background meteors if they don't exist
          if (bgMeteorsRef.current.length === 0) {
            bgMeteorsRef.current = Array.from({ length: 25 }, () => ({
              x: Math.random() * clientWidth,
              y: Math.random() * clientHeight,
              length: Math.random() * 40 + 10,
              speed: Math.random() * 400 + 200
            }));
          }
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    
    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);

    const update = (time: number) => {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (deltaTime > 0.1) {
        gameLoopRef.current = requestAnimationFrame(update);
        return;
      }

      // Smooth plane movement (Lower agility as requested)
      const easing = 0.15; // Lower = more "floaty"
      planePosRef.current.x += (targetPlanePosRef.current.x - planePosRef.current.x) * easing;
      planePosRef.current.y += (targetPlanePosRef.current.y - planePosRef.current.y) * easing;

      // Update background meteors
      bgMeteorsRef.current.forEach(m => {
        m.y += m.speed * deltaTime;
        if (m.y > canvas.height) {
          m.y = -m.length;
          m.x = Math.random() * canvas.width;
        }
      });

      // Spawn logic
      spawnTimerRef.current += deltaTime;
      const canSpawn = spawnedCountRef.current < totalToSpawnRef.current;
      
      if (spawnTimerRef.current > 1.8 && canSpawn) {
        const isRock = Math.random() > 0.8 && spawnedCountRef.current > 3; // Rocks only after 3 words
        const isSlowWord = !isRock && Math.random() > 0.6;
        
        // Pick the NEXT word in sequence to ensure all "own words" are played
        const word = words[spawnedCountRef.current % words.length];
        
        ctx.font = 'bold 16px Inter';
        const textWidth = ctx.measureText(isRock ? '🪨' : word.en).width;

        itemsRef.current.push({
          id: Math.random().toString(36),
          en: word.en,
          cn: word.cn,
          x: Math.random() * (canvas.width - 100) + 50,
          y: -50,
          width: textWidth + 40,
          height: 40,
          speed: (isSlowWord ? 30 : 60) + Math.random() * 30 + (scoreRef.current * 0.15), 
          type: isRock ? 'rock' : 'word',
          health: isRock ? 3 : 1
        });
        
        if (!isRock) {
          spawnedCountRef.current++;
          setProgress((spawnedCountRef.current / totalToSpawnRef.current) * 100);
        }
        spawnTimerRef.current = 0;
      }

      // Check Victory Condition
      if (!canSpawn && itemsRef.current.length === 0 && gameState === 'playing') {
        setGameState('victory');
      }

      // Shooting logic (Auto-fire: 2x plane length)
      shootTimerRef.current += deltaTime;
      if (shootTimerRef.current > 0.2) {
        bulletsRef.current.push({
          x: planePosRef.current.x,
          y: planePosRef.current.y - 40,
          initialY: planePosRef.current.y - 40,
          speed: 600,
          length: 100 // 2x plane length (50px)
        });
        shootTimerRef.current = 0;
      }

      // Update bullets
      const maxBulletRange = 250; // Roughly 5x plane length
      bulletsRef.current = bulletsRef.current.filter(b => {
        b.y -= b.speed * deltaTime;
        return b.y > -50 && Math.abs(b.y - b.initialY) < maxBulletRange;
      });

      // Update items
      itemsRef.current = itemsRef.current.filter(item => {
        item.y += item.speed * deltaTime;

        // Add meteor trail particles
        if (Math.random() > 0.6) {
          particlesRef.current.push({
            x: item.x + (Math.random() - 0.5) * 20,
            y: item.y - 10,
            vx: (Math.random() - 0.5) * 20,
            vy: -item.speed * 0.2,
            life: 0.3,
            color: item.type === 'rock' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(59, 130, 246, 0.3)'
          });
        }

        // Collision with bullets
        const hitBullet = bulletsRef.current.find(b => 
          b.x > item.x - item.width/2 && b.x < item.x + item.width/2 &&
          b.y > item.y - item.height/2 && b.y < item.y + item.height/2
        );

        if (hitBullet) {
          bulletsRef.current = bulletsRef.current.filter(b => b !== hitBullet);
          item.health--;
          item.isHit = true;
          setTimeout(() => { item.isHit = false; }, 100);
          
          if (item.health <= 0) {
            const isLightning = item.type === 'word' && Math.random() > 0.5;
            
            if (isLightning) {
              // Lightning Effect: Sharp zap particles
              for(let i=0; i<15; i++) {
                particlesRef.current.push({
                  x: item.x + (Math.random() - 0.5) * 40,
                  y: item.y + (Math.random() - 0.5) * 40,
                  vx: (Math.random() - 0.5) * 600,
                  vy: (Math.random() - 0.5) * 600,
                  life: 0.3,
                  color: '#fbbf24' // Yellow lightning color
                });
              }
              // Jagged bolt particles
              for(let i=0; i<3; i++) {
                particlesRef.current.push({
                  x: item.x,
                  y: item.y,
                  vx: 0,
                  vy: 0,
                  life: 0.2,
                  color: 'lightning' // Special flag for drawing
                });
              }
            } else {
              // Enhanced Explosion Particles
              const pCount = 30;
              for(let i=0; i<pCount; i++) {
                particlesRef.current.push({
                  x: hitBullet.x,
                  y: hitBullet.y,
                  vx: (Math.random() - 0.5) * 400,
                  vy: (Math.random() - 0.5) * 400,
                  life: 1.0,
                  color: item.type === 'rock' ? '#94a3b8' : i % 2 === 0 ? '#3b82f6' : '#60a5fa'
                });
              }
            }

            if (item.type === 'word') {
              setScore(s => s + 10);
              speak(item.en);
            } else {
              setScore(s => s + 5);
            }
            return false;
          } else {
            // Tiny hit sparks
            for(let i=0; i<5; i++) {
              particlesRef.current.push({
                x: hitBullet.x,
                y: hitBullet.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.4,
                color: item.type === 'rock' ? '#94a3b8' : '#3b82f6'
              });
            }
          }
        }

        // Collision with plane
        const distToPlane = Math.hypot(item.x - planePosRef.current.x, item.y - planePosRef.current.y);
        if (distToPlane < 50) {
          setLives(l => {
            const newL = l - 1;
            if (newL <= 0) setGameState('gameOver');
            return newL;
          });
          return false;
        }

        return item.y < canvas.height + 50;
      });

      // Update particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.life -= deltaTime;
        return p.life > 0;
      });

      draw();
      gameLoopRef.current = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background Meteor Shower (Star streaks)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      bgMeteorsRef.current.forEach(m => {
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x, m.y + m.length);
        ctx.stroke();
      });

      // Draw grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
      ctx.beginPath();
      for(let i=0; i<canvas.width; i+=60) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
      for(let i=0; i<canvas.height; i+=60) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
      ctx.stroke();

      // Draw bullets (Dynamic length energy beams)
      bulletsRef.current.forEach(b => {
        const beamLength = b.length;
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + beamLength);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
        grad.addColorStop(1, 'transparent');
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f59e0b';
        
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y + beamLength);
        ctx.stroke();
        
        // Internal core
        ctx.strokeStyle = '#fffbeb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y + beamLength * 0.6);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      });

      // Draw items
      itemsRef.current.forEach(item => {
        const isRock = item.type === 'rock';
        
        ctx.save();
        ctx.translate(item.x, item.y);
        
        if (!isRock) {
          const pulse = Math.sin(Date.now() / 200) * 0.05;
          ctx.scale(1 + pulse, 1 + pulse);

          ctx.shadowBlur = 15;
          ctx.shadowColor = item.isHit ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)';
          ctx.fillStyle = item.isHit ? '#fee2e2' : 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(-item.width/2, -item.height/2, item.width, item.height, 12);
          ctx.fill();
          ctx.strokeStyle = item.isHit ? '#ef4444' : '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = item.isHit ? '#b91c1c' : '#1e3a8a';
          ctx.font = 'bold 16px Inter';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.en, 0, 0);
        } else {
          ctx.font = '32px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪨', 0, 0);
          
          if (item.health < 3) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-15, 20, 30 * (item.health / 3), 4);
          }
        }
        
        ctx.restore();
      });

      // Draw particles
      particlesRef.current.forEach(p => {
        if (p.color === 'lightning') {
          // Draw Jagged Lightning Bolt
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 40);
          let currentY = p.y - 40;
          let currentX = p.x;
          for(let i=0; i<5; i++) {
            currentX += (Math.random() - 0.5) * 40;
            currentY += 20;
            ctx.lineTo(currentX, currentY);
          }
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#fbbf24';
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.life * 3), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Draw plane
      ctx.save();
      ctx.translate(planePosRef.current.x, planePosRef.current.y);
      
      // Multi-layer engine fire
      const thrust = (Math.sin(Date.now() / 40) + 1) * 12;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.ellipse(0, 25, 8, 15 + thrust, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.ellipse(0, 22, 4, 8 + thrust/2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plane Body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, -35); // Nose
      ctx.lineTo(25, 15); // Wings
      ctx.lineTo(0, 5);
      ctx.lineTo(-25, 15);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    gameLoopRef.current = requestAnimationFrame(update);

    const handlePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetPlanePosRef.current.x = e.clientX - rect.left;
      targetPlanePosRef.current.y = Math.max(e.clientY - rect.top, 100);

      // Handle click/tap to fire power shot (3x plane length)
      if (e.type === 'pointerdown' && gameState === 'playing') {
        bulletsRef.current.push({
          x: planePosRef.current.x,
          y: planePosRef.current.y - 40,
          initialY: planePosRef.current.y - 40,
          speed: 700, // Faster power shot
          length: 150 // 3x plane length
        });
        // Feedback vibration/shake could be added here
      }
    };

    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('pointerdown', handlePointer);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', handlePointer);
      canvas.removeEventListener('pointerdown', handlePointer);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, words]);

  const restart = () => {
    itemsRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    spawnedCountRef.current = 0;
    setProgress(0);
    setScore(0);
    setLives(3);
    setGameState('playing');
    lastTimeRef.current = performance.now();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[500px] mx-auto aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800 touch-none select-none">
      <canvas 
        ref={canvasRef}
        className="block w-full h-full cursor-none"
      />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 right-6 flex flex-col gap-4 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700">
              <Trophy size={20} className="text-amber-400" />
              <span className="text-xl font-black text-white tabular-nums">{score}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  size={18} 
                  className={cn(
                    "transition-all duration-300", 
                    i < lives ? "text-red-500 fill-red-500" : "text-slate-700 fill-transparent scale-90"
                  )} 
                />
              ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-3 bg-slate-800/80 backdrop-blur-md text-white rounded-2xl border border-slate-700 hover:bg-slate-700 pointer-events-auto transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Progress Bar for "Own Word Level" */}
        <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400" 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <AnimatePresence>
        {gameState === 'loading' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50"
          >
            <div className="relative">
              <Zap size={60} className="text-blue-500 animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border-2 border-dashed border-blue-500/30 rounded-full"
              />
            </div>
            <p className="text-blue-400 font-black mt-8 tracking-widest uppercase">正在载入单词能量...</p>
          </motion.div>
        )}

        {gameState === 'gameOver' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-40"
          >
            <div className="bg-slate-800 p-12 rounded-[3rem] border-2 border-slate-700 shadow-2xl text-center space-y-8 max-w-sm w-full mx-4">
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-500/5">
                <Rocket size={40} className="rotate-180" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">任务失败</h2>
                <p className="text-slate-400 font-medium">能量耗尽，单词军团突破了防线</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">能量得分</span>
                  <span className="text-2xl font-black text-white">{score}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">击落单词</span>
                  <span className="text-2xl font-black text-blue-400">{Math.floor(score / 10)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={restart}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} /> 重启任务
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-700 text-slate-300 rounded-2xl font-black hover:bg-slate-600 transition-all"
                >
                  退出前线
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'victory' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-40"
          >
            <div className="bg-slate-800 p-12 rounded-[3rem] border-2 border-amber-500/20 shadow-2xl text-center space-y-8 max-w-sm w-full mx-4">
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
                <Trophy size={40} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">任务达成</h2>
                <p className="text-slate-400 font-medium">你已成功掌握该关卡的所有单词</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">最终得分</span>
                  <span className="text-2xl font-black text-white">{score}</span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">完美度</span>
                  <span className="text-2xl font-black text-amber-400">{lives === 3 ? '100%' : lives === 2 ? '66%' : '33%'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={restart}
                  className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black shadow-xl shadow-amber-900/20 hover:bg-amber-500 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} /> 再次挑战
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-700 text-slate-300 rounded-2xl font-black hover:bg-slate-600 transition-all"
                >
                  返回营地
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Hint */}
      {gameState === 'playing' && score === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-32 left-0 right-0 text-center pointer-events-none"
        >
          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 px-6 py-3 rounded-full inline-flex items-center gap-2">
            <span className="text-blue-400 font-black text-xs uppercase tracking-widest">移动飞机击落单词</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
