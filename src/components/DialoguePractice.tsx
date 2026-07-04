import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, MessageSquare, Settings2, BookOpen, PlayCircle, Sparkles, Cloud, Loader2, FileUp, PauseCircle } from 'lucide-react';
import { speakNative, speakGemini } from '../lib/audio';
import { cn } from '../lib/utils';
import { localDb } from '../lib/localDb';
import type { LocalUser } from '../lib/localAuth';

interface DialoguePracticeProps {
  user: LocalUser;
  onClose: () => void;
}

export function DialoguePractice({ user, onClose }: DialoguePracticeProps) {
  const [context, setContext] = useState('');
  const [showContextInput, setShowContextInput] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [activeScriptIdx, setActiveScriptIdx] = useState<number | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);

  const sequenceCancelRef = useRef(false);

  // Load saved script from local storage
  useEffect(() => {
    if (!user) return;
    const settings = localDb.getCollection<any>(user.uid, 'settings');
    const scriptSetting = settings.find((s: any) => s.id === 'current_script');
    if (scriptSetting) {
      setContext(scriptSetting.content || '');
    }
  }, [user.uid]);

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { processPDFToFlashcards } = await import('../services/pdfService');
      const cards = await processPDFToFlashcards(file);
      if (cards.length > 0) {
        const vocabList = cards.map(c => `${c.front} (${c.back})`).join(', ');
        const newContext = `Please create a dialogue practicing these words: ${vocabList}`;
        setContext(newContext);
        saveToCloud(newContext);
        alert(`成功导入 ${cards.length} 个单词到对话练习！`);
      }
    } catch (error) {
      alert("导入失败");
    } finally {
      setIsImporting(false);
    }
  };

  const saveToCloud = (newContent: string) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      localDb.setDoc(user.uid, 'settings', 'current_script', {
        content: newContent,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSpeak = async (text: string) => {
    const englishPart = text.split(/[（(]/)[0].trim();

    const options = {
      onStart: () => setIsSpeaking(text),
      onEnd: () => setIsSpeaking(null)
    };

    if (useAI) {
      await speakGemini(englishPart, options);
    } else {
      speakNative(englishPart, options);
    }
  };

  const handleSpeakItem = (text: string, idx?: number) => {
    if (idx !== undefined) setActiveScriptIdx(idx);
    handleSpeak(text);
  };

  const scriptLines = useMemo(() => {
    if (!context) return [];
    return context.split('\n').filter(line => line.trim()).map(line => {
      let content = line.trim();
      let speaker: string | null = null;
      let translation: string | null = null;

      const transMatch = content.match(/[（(](.+?)[）)]/);
      if (transMatch) {
        translation = transMatch[1];
        content = content.replace(transMatch[0], '').trim();
      }

      const parts = content.split(/[:：]/);
      if (parts.length > 1) {
        speaker = parts[0].trim();
        content = parts.slice(1).join(':').trim();
      }

      return { speaker, text: content, translation };
    });
  }, [context]);

  const stopSequence = () => {
    sequenceCancelRef.current = true;
    setIsPlayingSequence(false);
    setActiveScriptIdx(null);
    setIsSpeaking(null);
    window.speechSynthesis?.cancel();
  };

  const playScriptSequence = async () => {
    if (isPlayingSequence) {
      stopSequence();
      return;
    }

    setIsPlayingSequence(true);
    sequenceCancelRef.current = false;

    for (let i = 0; i < scriptLines.length; i++) {
        if (sequenceCancelRef.current) break;

        setActiveScriptIdx(i);
        const line = scriptLines[i];
        await new Promise<void>((resolve) => {
            const englishPart = line.text.split(/[（(]/)[0].trim();
            const options = {
                onStart: () => setIsSpeaking(line.text),
                onEnd: () => {
                    setIsSpeaking(null);
                    resolve();
                }
            };

            if (useAI) {
              speakGemini(englishPart, options).catch(() => {
                resolve();
              });
            } else {
              speakNative(englishPart, options);
            }
        });

        if (sequenceCancelRef.current) break;

        await new Promise(r => setTimeout(r, 800));
    }

    if (!sequenceCancelRef.current) {
        setIsPlayingSequence(false);
        setActiveScriptIdx(null);
    }
  };

  return (
    <div className="flex flex-col h-[740px] bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none">课文跟读分析</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Script Practice Mode</p>
              {isSyncing ? <Loader2 size={10} className="animate-spin text-blue-400" /> : <Cloud size={10} className="text-green-400" />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContextInput(!showContextInput)}
            className={cn(
              "p-3 rounded-2xl transition-all",
              showContextInput ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
            )}
            title="设置课文"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showContextInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-8 py-6 bg-blue-50/50 border-b border-blue-100 overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-blue-900 flex items-center gap-2">
                  <BookOpen size={16} /> 粘贴课文内容 (支持：角色: 句子 (翻译))
                </label>
                <span className="text-[10px] font-bold text-blue-400 bg-white px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest leading-none">Auto Save</span>
              </div>
              <textarea
                value={context}
                onChange={(e) => {
                  setContext(e.target.value);
                  saveToCloud(e.target.value);
                }}
                placeholder={"例如：\nMrs. Vann: What's it for? (做什么用的?)\nRichard: It's for a book. (为一本书拍的.)"}
                className="w-full h-48 bg-white border border-blue-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-100/50 outline-none transition-all resize-none font-medium"
              />
              <div className="flex justify-end gap-3">
                <label className="flex-1 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-sm font-bold border border-purple-100 hover:bg-purple-100 transition-all cursor-pointer flex items-center justify-center gap-2">
                  {isImporting ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                  {isImporting ? "正在解析..." : "导入 PDF"}
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePDFImport} disabled={isImporting} />
                </label>
                <button
                  onClick={() => setShowContextInput(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-mono"
                >
                  START ANALYSIS
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
         <div className="space-y-6">
           <div className="flex items-center justify-between px-4">
             <div className="space-y-1">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">练习列表</h3>
               <p className="text-[10px] text-gray-400 font-bold">Total sentences: {scriptLines.length}</p>
             </div>
             <div className="flex items-center gap-3">
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={cn(
                    "flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all border min-w-[120px]",
                    useAI
                      ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-100"
                      : "bg-white text-gray-400 border-gray-100 hover:border-purple-200"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} />
                    <span className="text-xs font-bold">AI 发音</span>
                  </div>
                  <span className={cn(
                    "text-[8px] mt-0.5 font-medium",
                    useAI ? "text-purple-200" : "text-gray-300"
                  )}>浏览器语音引擎</span>
                </button>
                {scriptLines.length > 0 && (
                  <button
                    onClick={playScriptSequence}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black shadow-xl transition-all hover:scale-105 active:scale-95",
                      isPlayingSequence
                        ? "bg-gray-800 text-white shadow-gray-100"
                        : "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-100"
                    )}
                  >
                    {isPlayingSequence ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                    {isPlayingSequence ? "停止朗读" : "顺序朗读"}
                  </button>
                )}
             </div>
           </div>

           {scriptLines.length === 0 ? (
             <div className="py-20 text-center space-y-6 opacity-30">
               <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                 <BookOpen size={40} />
               </div>
               <p className="text-sm font-bold">暂无内容，请点击右上角设置图标粘贴课文</p>
             </div>
           ) : (
             scriptLines.map((line, idx) => (
               <motion.div
                 key={idx}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{
                   opacity: 1,
                   x: 0,
                   scale: isSpeaking === line.text || activeScriptIdx === idx ? 1.02 : 1
                 }}
                 className={cn(
                   "group p-6 rounded-[2.5rem] border transition-all duration-300",
                   (isSpeaking === line.text || activeScriptIdx === idx)
                     ? "bg-gradient-to-br from-white to-orange-50/30 border-orange-200 shadow-xl shadow-orange-100/20"
                     : "bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200"
                 )}
               >
                 <div className="flex items-start gap-6">
                   <div className="flex-1 space-y-3">
                     {line.speaker && (
                       <span className={cn(
                         "text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-xl border inline-block",
                         (isSpeaking === line.text || activeScriptIdx === idx)
                           ? "bg-orange-500 text-white border-orange-400"
                           : "bg-blue-50 text-blue-500 border-blue-100"
                       )}>
                         {line.speaker}
                       </span>
                     )}
                     <div>
                      <p className={cn(
                        "text-2xl font-black leading-tight transition-colors tracking-tight",
                        (isSpeaking === line.text || activeScriptIdx === idx) ? "text-orange-600" : "text-gray-800"
                      )}>
                        {line.text}
                      </p>
                      {line.translation && (
                        <div className="flex items-center gap-2 mt-3">
                          <p className={cn(
                            "text-base font-bold transition-opacity",
                            (isSpeaking === line.text || activeScriptIdx === idx) ? "text-orange-400" : "text-gray-400"
                          )}>
                            ({line.translation})
                          </p>
                          <button
                            onClick={() => {
                              import('../lib/audio').then(m => m.speakChinese(line.translation!));
                            }}
                            className={cn(
                              "p-1 px-3 rounded-lg transition-all flex items-center gap-1",
                              (isSpeaking === line.text || activeScriptIdx === idx)
                                ? "bg-orange-500 text-white"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            )}
                            title="朗读翻译"
                          >
                            <Volume2 size={12} />
                            <span className="text-[10px] font-bold">中</span>
                          </button>

                          {isPlayingSequence && activeScriptIdx === idx && (
                            <button
                              onClick={stopSequence}
                              className="p-1 px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1 animate-pulse"
                              title="暂停播放"
                            >
                              <PauseCircle size={12} />
                              <span className="text-[10px] font-bold">PAUSE</span>
                            </button>
                          )}
                        </div>
                      )}
                     </div>
                   </div>
                   <button
                     onClick={() => handleSpeakItem(line.text, idx)}
                     className={cn(
                        "p-6 rounded-[2rem] transition-all shadow-sm shrink-0",
                        (isSpeaking === line.text || activeScriptIdx === idx)
                          ? "bg-orange-500 text-white scale-110 shadow-2xl shadow-orange-200 rotate-6"
                          : "bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                      )}
                    >
                      <Volume2 size={36} className={(isSpeaking === line.text || activeScriptIdx === idx) ? "animate-pulse" : ""} />
                    </button>
                 </div>
               </motion.div>
             ))
           )}
         </div>
      </div>
    </div>
  );
}
