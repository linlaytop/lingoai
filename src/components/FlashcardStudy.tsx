import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Book, ClipboardList, PlusCircle, Loader2, Send, Trash2, Sparkles, Edit2, Check, X, Settings2, Pause, Play, FileUp, FileType, Repeat, PlayCircle, RefreshCw, GraduationCap, Tag, Calendar, ListFilter, Save } from 'lucide-react';
import { Flashcard, WordAnalysis } from '../types';
import { cn } from '../lib/utils';
import { analyzeWord } from '../services/gemini';
import { localDictionary } from '../lib/dictionary';
import { speak, speakChinese, SpeechSpeed } from '../lib/audio';

interface FlashcardStudyProps {
  cards: Flashcard[];
  isLoading?: boolean;
  onAddCard: (word: WordAnalysis) => Promise<void>;
  onAddCards: (cards: Flashcard[]) => Promise<void>;
  onDeleteCard: (id: string) => void;
  onUpdateCard: (id: string, data: Partial<Flashcard>) => void;
  onStartQuiz?: (subset: Flashcard[]) => void;
  onClose: () => void;
}

const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  return `${months}个月前`;
};

export function FlashcardStudy({ cards, isLoading, onAddCard, onAddCards, onDeleteCard, onUpdateCard, onStartQuiz, onClose }: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<'study' | 'manage' | 'add'>('study');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeechSpeed>('normal');
  const [useAI, setUseAI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editFrontValue, setEditFrontValue] = useState('');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'tag'>('none');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const filteredCards = cards.filter(card => {
    if (!filterTag) return true;
    return card.tags?.includes(filterTag);
  });

  const allTags = Array.from(new Set(cards.flatMap(c => c.tags || []))).sort();

  const handleUpdateTags = (cardId: string, tags: string[]) => {
    onUpdateCard(cardId, { tags });
  };

  const CardItem = ({ card }: { card: Flashcard }) => {
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [isEditingCard, setIsEditingCard] = useState(false);
    const [editFront, setEditFront] = useState(card.front);
    const [editTranslation, setEditTranslation] = useState(card.details?.translation || '');
    const [editDefinition, setEditDefinition] = useState(card.details?.definition || '');

    const handleSaveLocalEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      const trimmedFront = editFront.trim();
      if (!trimmedFront) {
        alert('英文内容不能为空');
        return;
      }
      onUpdateCard(card.id, {
        front: trimmedFront,
        back: editTranslation.trim() || editTranslation,
        details: {
          ...card.details,
          translation: editTranslation.trim(),
          definition: editDefinition.trim(),
        }
      });
      setIsEditingCard(false);
    };

    const handleAddTag = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTag.trim()) return;
      
      const currentTags = card.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        handleUpdateTags(card.id, [...currentTags, newTag.trim()]);
      }
      setNewTag('');
      setIsAddingTag(false);
    };

    const handleRemoveTag = (tag: string) => {
      handleUpdateTags(card.id, (card.tags || []).filter(t => t !== tag));
    };

    return (
      <div key={card.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full">
         <div className="flex justify-between items-start mb-2">
            <h4 className={cn(
              "font-bold text-gray-900 break-words flex-1 pr-2 tracking-tight",
              card.front.length <= 12 ? "text-xl" : card.front.length <= 25 ? "text-lg" : "text-base"
            )}>
              {card.front}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
               <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditFront(card.front);
                    setEditTranslation(card.details?.translation || '');
                    setEditDefinition(card.details?.definition || '');
                    setIsEditingCard(true); 
                  }}
                  className="p-2 text-gray-300 hover:text-indigo-500 rounded-xl transition-all"
                  title="编辑"
               >
                 <Edit2 size={16} />
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(card.id); }}
                  className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                  title="删除"
               >
                 <Trash2 size={18} />
               </button>
            </div>
         </div>
         
         {isEditingCard ? (
           <div className="mb-4 space-y-3">
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">英文 / 句子</label>
               <textarea 
                 autoFocus
                 value={editFront}
                 onChange={(e) => setEditFront(e.target.value)}
                 onClick={(e) => e.stopPropagation()}
                 className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-gray-900 focus:border-blue-400 outline-none resize-none"
                 rows={2}
                 placeholder="输入英文单词或句子..."
               />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">中文翻译</label>
               <textarea 
                 value={editTranslation}
                 onChange={(e) => setEditTranslation(e.target.value)}
                 onClick={(e) => e.stopPropagation()}
                 className="w-full p-3 bg-gray-50 border border-indigo-100 rounded-xl text-sm font-medium focus:border-indigo-400 outline-none resize-none"
                 rows={2}
                 placeholder="输入中文翻译..."
               />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">英文释义 (可选)</label>
               <textarea 
                 value={editDefinition}
                 onChange={(e) => setEditDefinition(e.target.value)}
                 onClick={(e) => e.stopPropagation()}
                 className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600 focus:border-gray-400 outline-none resize-none"
                 rows={2}
                 placeholder="English definition..."
               />
             </div>
             <div className="flex justify-end gap-2">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsEditingCard(false); }}
                 className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
               >
                 取消
               </button>
               <button 
                 onClick={handleSaveLocalEdit}
                 className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1"
               >
                 <Check size={12} /> 保存
               </button>
             </div>
           </div>
         ) : (
           <p className="text-gray-600 mb-4 text-sm line-clamp-2">{card.details?.translation || ''}</p>
         )}
         
         {/* Tags area */}
         <div className="flex flex-wrap gap-1.5 mb-6">
            {(card.tags || []).map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
            {isAddingTag ? (
              <form onSubmit={handleAddTag} className="inline-flex items-center">
                <input
                  autoFocus
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onBlur={() => setIsAddingTag(false)}
                  className="w-20 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-full text-[10px] outline-none"
                  placeholder="标签名..."
                />
              </form>
            ) : (
              <button 
                onClick={() => setIsAddingTag(true)}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-full text-[10px] font-bold border border-gray-100 transition-colors"
              >
                <PlusCircle size={10} /> 加标签
              </button>
            )}
         </div>

         <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            <span>{card.viewCount || 0} VIEWS</span>
            <span>STREAK: {card.interval || 0}</span>
         </div>
      </div>
    );
  };

  const GROUP_SIZE = 30;
  const cardGroups = Array.from(
    { length: Math.ceil((cards?.length || 0) / GROUP_SIZE) || 0 },
    (_, i) => cards.slice(i * GROUP_SIZE, i * GROUP_SIZE + GROUP_SIZE)
  );

  const currentGroupCards = cardGroups[activeGroupIndex] || cardGroups[0] || [];
  const safeIndex = Math.min(currentIndex, Math.max(0, currentGroupCards.length - 1));
  const currentCard = currentGroupCards[safeIndex] || (currentGroupCards.length > 0 ? currentGroupCards[0] : null);

  useEffect(() => {
    if (!isAutoPlaying || currentGroupCards.length === 0) return;

    const current = currentGroupCards[currentIndex];
    if (!current) return;
    
    speak(current.front, {
      speed,
      useNeural: useAI,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        setTimeout(() => {
          if (!isAutoPlaying) return;
          setIsFlipped(true);
          
          setTimeout(() => {
            if (!isAutoPlaying) return;
            if (isLooping || currentIndex < currentGroupCards.length - 1) {
              handleNext();
            } else {
              setIsAutoPlaying(false);
              setIsFlipped(false);
            }
          }, 2000); 
        }, 800);
      }
    });
  }, [isAutoPlaying, currentIndex]);

  useEffect(() => {
    if (currentGroupCards.length > 0 && currentIndex >= currentGroupCards.length) {
      setCurrentIndex(Math.max(0, currentGroupCards.length - 1));
    }
  }, [currentGroupCards.length, currentIndex]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [activeGroupIndex]);

  useEffect(() => {
    if (currentGroupCards.length > 0 && activeSubTab === 'study') {
      const card = currentGroupCards[currentIndex];
      if (card) {
        onUpdateCard(card.id, { 
          viewCount: (card.viewCount || 0) + 1,
          lastReviewed: Date.now()
        });
      }
    }
  }, [currentIndex, activeGroupIndex, activeSubTab]);

  const [newWord, setNewWord] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-6 text-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-gray-500 font-medium">正在同步云端闪卡...</p>
      </div>
    );
  }

  if (!cards || !Array.isArray(cards)) {
    return <div className="p-20 text-center text-gray-400">数据加载中...</div>;
  }

  if (cards.length > 0 && !currentCard && currentGroupCards.length > 0) {
    return <div className="p-20 text-center text-gray-400">正在准备卡片...</div>;
  }

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    speak(text, {
      speed,
      useNeural: useAI,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  };
  
  // Track cards length to reset index if out of bounds

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || isAnalyzing) return;

    // Duplicate check to save AI resources
    const existing = cards.find(c => c.front.toLowerCase() === newWord.trim().toLowerCase());
    if (existing) {
      const confirmAdd = window.confirm(`「${newWord}」已经在您的闪卡库中，是否依然要重新分析并重复添加？\n(这会消耗 AI 分析额度)`);
      if (!confirmAdd) {
        setNewWord('');
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeWord(newWord);
      await onAddCard(result);
      setNewWord('');
      setActiveSubTab('study');
      setActiveGroupIndex(0);
      setCurrentIndex(0); // View the newly added card if possible
    } catch (error) {
      alert(error instanceof Error ? error.message : '添加失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick save: directly save the input as a flashcard without full analysis
  const handleQuickSave = async () => {
    const text = newWord.trim();
    if (!text || isSaving) return;

    // Check for duplicates
    const existing = cards.find(c => c.front.toLowerCase() === text.toLowerCase());
    if (existing) {
      alert(`「${text}」已经在您的闪卡库中了。`);
      return;
    }

    setIsSaving(true);
    try {
      const isSentence = text.split(/\s+/).length > 3;
      const analysis = localDictionary.analyze(text);
      // Always use the real translation from analysis, regardless of whether input is a word or sentence.
      // Falls back to '(暂无翻译)' only if the dictionary truly has no translation.
      const translation = analysis.translation && !analysis.translation.includes('暂无')
        ? analysis.translation
        : (isSentence ? '(句子 - 暂无翻译)' : '暂无翻译');
      const card: Flashcard = {
        id: crypto.randomUUID(),
        front: text,
        back: translation,
        viewCount: 0,
        details: { ...analysis, translation },
        sentence: isSentence ? text : undefined,
        tags: ['自定义'],
      };
      await onAddCards([card]);
      setNewWord('');
      setActiveSubTab('study');
      setActiveGroupIndex(0);
      setCurrentIndex(0);
    } catch (error) {
      alert('保存失败，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isImporting) return;

    setIsImporting(true);
    try {
      const { processPDFToFlashcards } = await import('../services/pdfService');
      const importedCards = await processPDFToFlashcards(file);
      if (importedCards.length > 0) {
        await onAddCards(importedCards);
        alert(`成功导入 ${importedCards.length} 个单词！`);
        setActiveSubTab('study');
      } else {
        alert('未能从 PDF 中识别到有效单词。');
      }
    } catch (error) {
      console.error(error);
      alert('PDF 解析失败，请检查文件格式或重试。');
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isImporting) return;

    setIsImporting(true);
    try {
      const { processWordToFlashcards } = await import('../services/pdfService');
      const importedCards = await processWordToFlashcards(file);
      if (importedCards.length > 0) {
        await onAddCards(importedCards);
        alert(`成功导入 ${importedCards.length} 个单词/句子！`);
        setActiveSubTab('study');
      } else {
        alert('未能从 Word 中识别到有效单词或句子。');
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Word 解析失败，请检查文件格式或重试。';
      alert(message);
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  if (cards.length === 0 && activeSubTab !== 'add') {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] space-y-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-300">
          <Book size={40} />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-900">还没有闪卡</p>
          <p className="text-gray-500 font-medium whitespace-pre-wrap">快去搜索并添加，或者一键导入 PDF 单词本吧！</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={onClose} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">
            去主页搜索
          </button>
          <label className="px-8 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all cursor-pointer flex items-center gap-2">
            <FileUp size={20} />
            {isImporting ? '导入中...' : '导入 PDF 单词本'}
            <input type="file" accept=".pdf" className="hidden" onChange={handlePDFImport} disabled={isImporting} />
          </label>
          <label className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-2">
            <FileType size={20} />
            {isImporting ? '导入中...' : '导入 Word 单词本'}
            <input type="file" accept=".docx" className="hidden" onChange={handleWordImport} disabled={isImporting} />
          </label>
        </div>
      </div>
    );
  }

  const handleDeleteCurrentCard = (id: string) => {
    onDeleteCard(id);
    setIsFlipped(false);
    setIsEditing(false);
  };

  const getScaledFontSize = (text: string, isEnglish: boolean) => {
    const len = text.length;
    if (isEnglish) {
      if (len <= 8) return 'text-4xl sm:text-5xl md:text-6xl';
      if (len <= 15) return 'text-3xl sm:text-4xl md:text-5xl';
      if (len <= 25) return 'text-2xl sm:text-3xl md:text-4xl';
      if (len <= 45) return 'text-xl sm:text-2xl md:text-3xl';
      return 'text-lg sm:text-xl md:text-2xl';
    } else {
      if (len <= 6) return 'text-3xl sm:text-4xl md:text-5xl';
      if (len <= 12) return 'text-2xl sm:text-3xl md:text-4xl';
      if (len <= 20) return 'text-xl sm:text-2xl md:text-3xl';
      if (len <= 40) return 'text-lg sm:text-xl md:text-2xl';
      return 'text-base sm:text-lg md:text-xl';
    }
  };

  const getZenScaledFontSize = (text: string, isEnglish: boolean) => {
    const len = text.length;
    if (isEnglish) {
      if (len <= 8) return 'text-[8vw] sm:text-7xl md:text-8xl lg:text-9xl';
      if (len <= 15) return 'text-[6vw] sm:text-6xl md:text-7xl lg:text-8xl';
      if (len <= 25) return 'text-[4.5vw] sm:text-4xl md:text-5xl lg:text-6xl';
      if (len <= 45) return 'text-[3.5vw] sm:text-3xl md:text-4xl lg:text-5xl';
      return 'text-[2.5vw] sm:text-2xl md:text-3xl lg:text-4xl';
    } else {
      if (len <= 6) return 'text-[7vw] sm:text-5xl md:text-6xl lg:text-7xl';
      if (len <= 12) return 'text-[5vw] sm:text-4xl md:text-5xl lg:text-6xl';
      if (len <= 25) return 'text-[4vw] sm:text-3xl md:text-4xl lg:text-5xl';
      if (len <= 45) return 'text-[3vw] sm:text-2xl md:text-3xl lg:text-4xl';
      return 'text-[2.5vw] sm:text-xl md:text-2xl lg:text-3xl';
    }
  };

  const handleNext = () => {
    if (currentGroupCards.length <= 1) return;
    setDirection(1);
    setIsFlipped(false);
    setIsEditing(false);
    setCurrentIndex(prev => (prev + 1) % currentGroupCards.length);
  };

  const handleBack = () => {
    if (currentGroupCards.length <= 1) return;
    setDirection(-1);
    setIsFlipped(false);
    setIsEditing(false);
    setCurrentIndex(prev => (prev - 1 + currentGroupCards.length) % currentGroupCards.length);
  };

  const handleSaveEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentCard) {
      const trimmedFront = editFrontValue.trim();
      const trimmedTranslation = editValue.trim();
      onUpdateCard(currentCard.id, {
        front: trimmedFront || currentCard.front,
        back: trimmedTranslation || currentCard.back,
        details: {
          ...currentCard.details,
          translation: trimmedTranslation || currentCard.details?.translation,
        }
      });
      setIsEditing(false);
    }
  };

  const handleUpdateDetails = async (card: Flashcard) => {
    if (isUpdatingDetails) return;
    setIsUpdatingDetails(true);
    try {
      const result = await analyzeWord(card.front);
      onUpdateCard(card.id, {
        details: result
      });
      // If we are in edit mode, update the editValue too
      if (isEditing) {
        setEditValue(result.translation);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新详情失败');
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleRecalibrate = (card: Flashcard, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateCard(card.id, {
      interval: 1,
      easeFactor: 1.8, // Significantly lower ease factor for aggressive frequent review
      nextReviewDate: Date.now() + 12 * 60 * 60 * 1000 // Reset to 12 hours from now for "urgent" review
    });
    alert(`「${card.front}」已重置为极速复习模式（间隔 12 小时，系数 1.8）`);
  };

  if (isZenMode && activeSubTab === 'study') {
    const segments = currentCard?.details?.mnemonicRhyme ? currentCard.details.mnemonicRhyme.split('\n') : [];
    
    return (
      <motion.div 
        layoutId="flashcard-study-root"
        className="fixed inset-0 z-[100] bg-[#050811] flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Cinematic Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
        </div>

        {/* Top Controls */}
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-10">
          <button 
            onClick={() => {
              setIsZenMode(false);
              setIsAutoPlaying(false);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white font-bold transition-all"
          >
            <ChevronLeft size={20} />
            <span>返回列表</span>
          </button>

            <div className="flex items-center gap-4">
            <button
               onClick={() => setUseAI(!useAI)}
               className={cn(
                 "p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 min-w-[100px]",
                 useAI ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "bg-white/5 border-white/10 text-white/40"
               )}
               title="Gemini AI 发音 (标准收费功能)"
            >
              <Sparkles size={24} />
              <span className="text-[8px] font-black uppercase tracking-tighter">Gemini AI</span>
            </button>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-white/40 text-[10px] font-mono font-bold uppercase tracking-widest">Group {activeGroupIndex + 1}</span>
              <span className="text-white/20 ml-2">|</span>
              <span className="text-white/40 text-[10px] font-mono font-bold uppercase tracking-widest ml-2">Progress</span>
              <span className="text-white font-mono font-bold ml-1">{currentIndex + 1} / {currentGroupCards.length}</span>
            </div>
            <button
               onClick={() => setIsAutoPlaying(!isAutoPlaying)}
               className={cn(
                 "p-3 rounded-2xl border transition-all flex items-center gap-2",
                 isAutoPlaying ? "bg-orange-500 border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]" : "bg-white/5 border-white/10 text-white/40"
               )}
            >
              {isAutoPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
               onClick={() => setIsLooping(!isLooping)}
               className={cn(
                 "p-3 rounded-2xl border transition-all flex items-center gap-2",
                 isLooping ? "bg-green-500 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-white/5 border-white/10 text-white/40"
               )}
               title="循环播放"
            >
              <Repeat size={24} />
            </button>
          </div>
        </div>

        {/* Large Card Content */}
        <div className="relative w-full max-w-4xl px-8 h-[70vh] flex flex-col items-center justify-center">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={`${activeGroupIndex}-${currentIndex}`}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0, scale: 0.8, rotateY: dir > 0 ? 45 : -45 }),
                  center: { x: 0, opacity: 1, scale: 1, rotateY: 0 },
                  exit: (dir: number) => ({ x: dir > 0 ? -1000 : 1000, opacity: 0, scale: 0.8, rotateY: dir > 0 ? -45 : 45 })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                <motion.div 
                  onClick={() => {
                    if (!isFlipped && currentCard) {
                      handleSpeak(currentCard.front);
                    }
                    setIsFlipped(!isFlipped);
                  }}
                  className="w-full h-full relative cursor-pointer group preserve-3d hover:scale-[1.02]"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                >
                  {/* Front View */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-[#1e2e4d] to-[#0f172a] rounded-[4rem] p-16 flex flex-col items-center justify-center border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-black text-blue-400 tracking-[0.4em] uppercase">
                      Front Side
                    </div>

                    <div className="flex flex-col items-center gap-8">
                       <motion.h1 
                         initial={{ scale: 0.9, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         className={cn(
                           "font-serif font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-[0_20px_50px_rgba(255,255,255,0.1)] leading-none text-center break-words max-w-full",
                           getZenScaledFontSize(currentCard?.front || '', true)
                         )}
                       >
                         {currentCard?.front}
                       </motion.h1>
                       
                       <div className="flex items-center gap-6">
                         {currentCard?.details?.phonetic && (
                           <p className="text-3xl font-mono text-purple-400 opacity-60">/{currentCard.details.phonetic}/</p>
                         )}
                         <button 
                           onClick={(e) => { e.stopPropagation(); currentCard && handleSpeak(currentCard.front); }}
                           className="p-6 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 text-white rounded-full transition-all active:scale-90"
                         >
                           <Volume2 size={40} />
                         </button>
                       </div>
                    </div>

                    <div className="absolute bottom-16 flex items-center gap-2">
                       {[1,2,3,4,5].map(i => (
                         <div 
                           key={i} 
                           className={cn(
                             "w-12 h-2 rounded-full",
                             i <= (currentCard?.interval ? Math.min(5, Math.floor(currentCard.interval / 5) + 1) : 0) ? "bg-green-400" : "bg-white/10"
                           )} 
                         />
                       ))}
                    </div>

                      {/* Delete Button */}
                      <div className="absolute bottom-16 left-12">
                         <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             const cardId = currentCard?.id;
                             console.log("Delete clicked (Zen Mode), ID:", cardId);
                             if (!cardId) {
                               alert("错误：无法获取当前卡片 ID");
                               return;
                             }
                             setDeleteConfirmId(cardId);
                           }}
                           className="p-6 bg-white/10 hover:bg-red-500/40 border border-white/20 text-white/40 hover:text-red-400 rounded-full transition-all active:scale-95 flex items-center justify-center backdrop-blur-md"
                           title="删除卡片"
                         >
                           <Trash2 size={32} />
                         </button>
                      </div>

                    {/* Page Number Indicator */}
                    <div className="absolute bottom-12 right-12 w-16 h-16 flex items-center justify-center rounded-full border-2 border-white/5 text-white/5 text-xl font-black font-mono">
                       {currentIndex + 1}
                    </div>
                  </div>

                  {/* Back View */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-white rounded-[4rem] p-16 flex flex-col items-center justify-between border border-white shadow-2xl"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <div className="absolute top-12 left-12">
                       <button 
                         onClick={(e) => { e.stopPropagation(); currentCard?.details?.translation && speakChinese(currentCard.details.translation); }}
                         className="p-6 bg-green-500 hover:bg-green-600 shadow-lg shadow-green-100 text-white rounded-full transition-all active:scale-90"
                         title="朗读翻译"
                       >
                         <Volume2 size={40} />
                       </button>
                    </div>
                    <div className="absolute top-12 right-12 flex items-center gap-3">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (isEditing) {
                             handleSaveEdit();
                           } else {
                             setEditFrontValue(currentCard.front);
                             setEditValue(currentCard.details?.translation || '');
                             setIsEditing(true);
                           }
                         }}
                         className={cn(
                           "p-4 rounded-2xl border transition-all hover:scale-105 active:scale-95",
                           isEditing ? "bg-green-500 border-green-400 text-white shadow-lg" : "bg-white border-gray-100 text-gray-400"
                         )}
                       >
                          {isEditing ? <Check size={24} /> : <Edit2 size={24} />}
                       </button>
                       <div className="px-6 py-2 bg-gray-100 rounded-full text-xs font-black text-gray-400 tracking-[0.4em] uppercase">
                          Back Side
                       </div>
                    </div>

                    <div className="flex flex-col items-center text-center gap-4 w-full max-w-2xl px-1 overflow-y-auto max-h-[80%]">
                         {isEditing ? (
                           <div className="w-full space-y-4">
                             <div>
                               <label className="block text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">英文 / 句子</label>
                               <textarea
                                 value={editFrontValue}
                                 onClick={(e) => e.stopPropagation()}
                                 onChange={(e) => setEditFrontValue(e.target.value)}
                                 className="w-full bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 text-center text-3xl font-bold text-gray-900 focus:border-blue-400 outline-none resize-none shadow-inner"
                                 rows={2}
                               />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider">中文翻译</label>
                               <textarea
                                 autoFocus
                                 value={editValue}
                                 onClick={(e) => e.stopPropagation()}
                                 onChange={(e) => setEditValue(e.target.value)}
                                 className="w-full bg-gray-50 border-2 border-indigo-100 rounded-[2rem] p-6 text-center text-3xl font-bold text-gray-900 focus:border-indigo-400 outline-none resize-none shadow-inner"
                                 rows={2}
                               />
                             </div>
                             <div className="flex justify-center gap-4">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                                 className="px-6 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                               >
                                 取消
                               </button>
                               <button 
                                 onClick={handleSaveEdit}
                                 className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
                               >
                                 <Check size={16} /> 保存修改
                               </button>
                             </div>
                           </div>
                         ) : (
                           <>
                             <h2 className={cn("font-bold text-gray-900 leading-tight break-words max-w-full", getZenScaledFontSize(currentCard?.details?.translation || '', false))}>
                               {currentCard?.details?.translation}
                              </h2>
                           <p className="text-2xl text-gray-500 leading-relaxed font-serif italic">
                             {currentCard?.details?.definition || ''}
                           </p>

                           {/* Tags in Zen Mode */}
                           <div className="flex flex-wrap justify-center gap-2 mt-4">
                              {(currentCard?.tags || []).map(tag => (
                                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-indigo-50/50 text-indigo-400 rounded-lg text-sm font-bold border border-white/10 backdrop-blur-sm">
                                  <Tag size={12} /> {tag}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      currentCard && handleUpdateTags(currentCard.id, (currentCard.tags || []).filter(t => t !== tag));
                                    }} 
                                    className="hover:text-red-400 ml-1"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                           </div>

                           {/* NEW: Synonyms and Examples in Zen Mode */}
                           <div className="flex flex-col gap-6 w-full mt-4">
                             {currentCard?.details?.synonyms && Array.isArray(currentCard.details.synonyms) && currentCard.details.synonyms.length > 0 && (
                               <div className="flex flex-wrap justify-center gap-2">
                                 {currentCard.details.synonyms.map((s, i) => (
                                   <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold border border-indigo-100">
                                     {s}
                                   </span>
                                 ))}
                               </div>
                             )}
                             
                             {currentCard?.details?.examples && Array.isArray(currentCard.details.examples) && currentCard.details.examples.length > 0 && (
                               <div className="space-y-3 text-left bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50">
                                 {currentCard.details.examples.slice(0, 2).map((ex, i) => (
                                   <div key={i} className="flex gap-3">
                                     <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] shrink-0 mt-1">
                                       {i + 1}
                                     </div>
                                     <p className="text-lg text-gray-600 font-medium leading-relaxed italic">{ex}</p>
                                   </div>
                                 ))}
                                </div>
                             )}
                           </div>
                         </>
                       )}
                    </div>

                    <div className="w-full flex items-center gap-4">
                       <div className="flex-1 bg-blue-50/50 p-8 rounded-[3rem] border border-blue-100/50 text-center">
                         <p className="text-blue-800 text-xl font-medium leading-relaxed">
                           "{currentCard?.details?.pattern || 'No pattern available'}"
                         </p>
                       </div>
                       
                        {/* UPDATE BUTTONS */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); currentCard && handleUpdateDetails(currentCard); }}
                            disabled={isUpdatingDetails}
                            className="p-8 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 rounded-[3rem] transition-all active:scale-95 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                            title="使用 AI 自动完善更多详情"
                          >
                            {isUpdatingDetails ? <Loader2 size={32} className="animate-spin" /> : <Sparkles size={32} />}
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Refill</span>
                          </button>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); currentCard && handleRecalibrate(currentCard, e); }}
                            className="p-8 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100 rounded-[3rem] transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
                            title="调低复习间隔 (更频繁复习)"
                          >
                            <RefreshCw size={32} />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Frequent</span>
                          </button>
                        </div>
                    </div>

                    {/* Page Number Indicator */}
                    <div className="absolute bottom-12 right-12 w-16 h-16 flex items-center justify-center rounded-full border-2 border-indigo-100 text-indigo-100 text-xl font-black font-mono">
                       {currentIndex + 1}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
        </div>

        {/* Global Nav Controls */}
        <div className="absolute bottom-12 flex items-center gap-12 z-10">
           <button 
             onClick={handleBack}
             className="p-8 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-all active:scale-90 border border-white/5"
           >
             <ChevronLeft size={48} />
           </button>
           
           <div className="px-8 py-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 text-white/20 font-black tracking-[0.5em] uppercase text-xs">
             Flippable Study Card
           </div>

           <button 
             onClick={handleNext}
             className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full transition-all active:scale-90 shadow-2xl shadow-blue-900/40"
           >
             <ChevronRight size={48} />
           </button>
        </div>

        {/* Hint */}
        <div className="absolute bottom-4 text-white/5 text-[10px] font-black tracking-widest uppercase">
           Study Mode Activated
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#f1f3f7] py-6 px-4 md:px-8">
      {/* Navigation Tabs */}
      <div className="w-full max-w-4xl flex items-center justify-center mb-12">
        <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-[2rem] flex items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          <button 
            onClick={() => setActiveSubTab('study')}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all",
              activeSubTab === 'study' ? "bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_10px_20px_-5px_rgba(99,102,241,0.5)]" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Book size={18} /> 闪卡学习
          </button>
          <button 
            onClick={() => setActiveSubTab('manage')}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all",
              activeSubTab === 'manage' ? "bg-white text-gray-800 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <ClipboardList size={18} className="text-[#e28c7d]" /> 管理
          </button>
          <button 
            onClick={() => setActiveSubTab('add')}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all",
              activeSubTab === 'add' ? "bg-white text-gray-800 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <PlusCircle size={18} className="text-[#f87171]" /> 自定义短语学习
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'study' ? (
          <motion.div 
            key="study-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-2xl flex flex-col items-center"
          >
            {/* Progress Bar Area & Controls */}
            <div className="w-full flex items-center justify-between gap-6 mb-12">
               <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${((currentIndex + 1) / currentGroupCards.length) * 100}%` }}
                       className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
                     />
                  </div>
                  <span className="text-gray-400 font-bold text-sm font-mono whitespace-nowrap flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md text-[10px] border border-green-100 font-bold">第 {activeGroupIndex + 1} 组</span>
                    {currentIndex + 1} / {currentGroupCards.length}
                  </span>
               </div>

               <div className="flex items-center gap-3">
                 <button
                    onClick={() => setUseAI(!useAI)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl border transition-all text-[10px] font-black shadow-sm",
                      useAI 
                        ? "bg-indigo-500 border-indigo-400 text-white" 
                        : "bg-white border-gray-100 text-gray-400 hover:text-gray-600"
                    )}
                    title="AI 智能发音 (今日免费额度)"
                 >
                    <Sparkles size={16} />
                    <span className="leading-tight">Gemini AI 发音</span>
                    <span className="text-[7px] opacity-60">标准收费功能</span>
                 </button>

                 <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-sm font-bold shadow-sm",
                      isAutoPlaying 
                        ? "bg-orange-500 border-orange-400 text-white shadow-orange-200" 
                        : "bg-white border-gray-100 text-gray-400 hover:text-gray-600"
                    )}
                 >
                    {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span className="hidden sm:inline">{isAutoPlaying ? "暂停播放" : "自动播放"}</span>
                 </button>

                 <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-sm font-bold shadow-sm",
                      isLooping 
                        ? "bg-green-500 border-green-400 text-white shadow-green-200" 
                        : "bg-white border-gray-100 text-gray-400 hover:text-gray-600"
                    )}
                    title="循环播放 - 提高听力"
                 >
                    <Repeat size={16} />
                    <span className="hidden sm:inline">{isLooping ? "正在循环" : "循环播放"}</span>
                 </button>

                 <button
                    onClick={() => {
                      setIsZenMode(true);
                      setIsAutoPlaying(true);
                      setIsFlipped(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all text-sm font-bold shadow-sm"
                 >
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="hidden sm:inline">沉浸模式</span>
                 </button>
               </div>
            </div>

            {/* Flashcard Component */}
            <div className="relative w-full aspect-[16/11] perspective-1000">
               <AnimatePresence mode="popLayout" custom={direction}>
                 <motion.div
                   key={currentIndex}
                   custom={direction}
                   variants={{
                     enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
                     center: { x: 0, opacity: 1, scale: 1 },
                     exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0, scale: 0.95 })
                   }}
                   initial="enter"
                   animate="center"
                   exit="exit"
                   transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                   className="w-full h-full absolute inset-0"
                 >
                   <motion.div 
                     onClick={() => {
                       if (!isFlipped && currentCard) {
                         handleSpeak(currentCard.front);
                       }
                       setIsFlipped(!isFlipped);
                     }}
                     className="w-full h-full relative cursor-pointer preserve-3d"
                     animate={{ rotateY: isFlipped ? 180 : 0 }}
                     transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                   >
                     {/* Front Side */}
                     <div className="absolute inset-0 backface-hidden bg-[#1a2235] rounded-[3rem] p-10 flex flex-col items-center justify-center border border-white/5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] relative overflow-hidden">
                        {/* Audio Button in the "Red Box" Area */}
                        <div className="absolute top-8 left-8">
                           <button 
                             onClick={(e) => { e.stopPropagation(); currentCard && handleSpeak(currentCard.front); }}
                             className="p-4 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 text-white rounded-2xl transition-all active:scale-90 flex items-center gap-2"
                           >
                             <Volume2 size={24} />
                           </button>
                        </div>

                        <div className="absolute top-10 right-10">
                           <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-black text-white/30 tracking-[0.2em] uppercase">
                              EN
                           </div>
                        </div>
                        
                        <div className="text-center py-4 flex-1 flex flex-col items-center justify-center w-full px-4 overflow-hidden">
                           <h2 className={cn("font-bold text-white tracking-tight leading-tight break-words max-w-full", getScaledFontSize(currentCard?.front || '', true))}>
                             {currentCard?.front}
                           </h2>
                           <p className="mt-4 text-white/20 text-sm font-medium tracking-wide">点击翻转查看中文</p>
                        </div>

                          {/* Delete Button */}
                          <div className="absolute bottom-8 left-10">
                             <button 
                               onClick={(e) => { 
                                 e.stopPropagation(); 
                                 const cardId = currentCard?.id;
                                 console.log("Delete clicked (Study Mode Front), ID:", cardId);
                                 if (!cardId) {
                                   alert("错误：无法获取当前卡片 ID");
                                   return;
                                 }
                                 setDeleteConfirmId(cardId);
                               }}
                               className="p-4 bg-white/10 hover:bg-red-500/40 border border-white/20 text-white/40 hover:text-red-400 rounded-2xl transition-all active:scale-90 flex items-center justify-center backdrop-blur-sm"
                               title="删除卡片"
                             >
                               <Trash2 size={24} />
                             </button>
                          </div>

                        {/* Page Number Indicator */}
                        <div className="absolute bottom-8 right-10 w-10 h-10 flex items-center justify-center rounded-full border-2 border-white/5 text-white/10 text-sm font-black font-mono">
                           {currentIndex + 1}
                        </div>
                     </div>

                     {/* Back Side */}
                     <div 
                       className="absolute inset-0 backface-hidden bg-white rounded-[3rem] p-10 flex flex-col items-center justify-between border border-gray-100 shadow-xl"
                       style={{ transform: 'rotateY(180deg)' }}
                     >
                        <div className="absolute top-8 left-8 flex flex-col gap-3">
                           <button onClick={(e) => { e.stopPropagation(); currentCard?.details?.translation && speakChinese(currentCard.details.translation); }} className="p-4 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center"
                             title="朗读翻译"
                           >
                             <Volume2 size={24} />
                             
                           </button>

                           {isAutoPlaying && (
                             <button
                               onClick={(e) => { e.stopPropagation(); setIsAutoPlaying(false); }}
                               className="p-3 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-100 text-white rounded-xl transition-all active:scale-90 flex items-center justify-center"
                               title="暂停自动播放"
                             >
                               <Pause size={18} />
                             </button>
                           )}
                        </div>
                        <div className="absolute top-8 right-8 flex items-center gap-3">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               if (isEditing) {
                                 handleSaveEdit();
                               } else {
                                 setEditFrontValue(currentCard.front);
                                 setEditValue(currentCard?.details?.translation || '');
                                 setIsEditing(true);
                               }
                             }}
                             className={cn(
                               "p-3 rounded-xl border transition-all",
                               isEditing ? "bg-green-500 border-green-400 text-white shadow-md" : "bg-white border-gray-100 text-gray-300 hover:text-indigo-600 hover:border-indigo-100 shadow-sm"
                             )}
                             title="修改翻译"
                           >
                              {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                           </button>
                           <div className="px-6 py-2 bg-gray-50 rounded-full text-xs font-black text-gray-400 tracking-[0.2em] uppercase">
                              ZH
                           </div>
                        </div>

                        <div className="text-center py-2 flex-1 flex flex-col items-center justify-center w-full px-4 overflow-y-auto max-h-[85%]">
                           {isEditing ? (
                             <div className="w-full space-y-3">
                               <div>
                                 <label className="block text-[10px] font-bold text-blue-400 mb-1 uppercase tracking-wider">英文 / 句子</label>
                                 <textarea
                                   value={editFrontValue}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => setEditFrontValue(e.target.value)}
                                   className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-3 text-center text-lg font-bold text-gray-900 focus:border-blue-400 outline-none resize-none"
                                   rows={2}
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-indigo-400 mb-1 uppercase tracking-wider">中文翻译</label>
                                 <textarea
                                   autoFocus
                                   value={editValue}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => setEditValue(e.target.value)}
                                   className="w-full bg-gray-50 border-2 border-indigo-100 rounded-2xl p-3 text-center text-lg font-bold text-gray-900 focus:border-indigo-400 outline-none resize-none"
                                   rows={3}
                                 />
                               </div>
                               <div className="flex justify-center gap-3">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                                   className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-bold"
                                 >
                                   取消
                                 </button>
                                 <button 
                                   onClick={handleSaveEdit}
                                   className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-1"
                                 >
                                   <Check size={14} /> 保存
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <h2 className={cn("font-bold text-gray-900 tracking-tight leading-tight break-words max-w-full", getScaledFontSize(currentCard?.details?.translation || '', false))}>
                                 {currentCard?.details?.translation}
                               </h2>

                               {/* Tags in Study Mode Back */}
                               <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                                  {(currentCard?.tags || []).map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100">
                                      {tag}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          currentCard && handleUpdateTags(currentCard.id, (currentCard.tags || []).filter(t => t !== tag));
                                        }} 
                                        className="hover:text-red-500 ml-1"
                                      >
                                        <X size={10} />
                                      </button>
                                    </span>
                                  ))}
                               </div>
                               

                               {/* NEW: Synonyms and Examples in Study Mode */}
                               <div className="flex flex-col gap-4 w-full mt-6">
                                 {currentCard?.details?.synonyms && Array.isArray(currentCard.details.synonyms) && currentCard.details.synonyms.length > 0 && (
                                   <div className="flex flex-wrap justify-center gap-1.5">
                                     {currentCard.details.synonyms.map((s, i) => (
                                       <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100">
                                         {s}
                                       </span>
                                     ))}
                                   </div>
                                 )}
                                 
                                 {currentCard?.details?.examples && Array.isArray(currentCard.details.examples) && currentCard.details.examples.length > 0 && (
                                   <div className="space-y-2 text-left bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                     {currentCard.details.examples.slice(0, 2).map((ex, i) => (
                                       <div key={i} className="flex gap-2">
                                         <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[8px] shrink-0 mt-0.5">
                                           {i + 1}
                                         </div>
                                         <p className="text-[11px] text-gray-600 font-medium leading-relaxed italic">{ex}</p>
                                       </div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             </>
                           )}
                        </div>

                        <div className="w-full flex items-center gap-3">
                           <div className="flex-1 bg-gray-100/50 p-6 rounded-[2rem] border border-gray-100 text-center">
                              <p className="text-gray-600 text-sm font-medium leading-relaxed italic">
                                "{currentCard?.details?.pattern || 'Pattern analysis needed'}"
                              </p>
                           </div>
                           
                           <button
                             onClick={(e) => { e.stopPropagation(); currentCard && handleUpdateDetails(currentCard); }}
                             disabled={isUpdatingDetails}
                             className="p-6 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 rounded-[2rem] transition-all active:scale-95 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                             title="使用 AI 自动完善更多详情 (释义、近义词、例句等)"
                           >
                             {isUpdatingDetails ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                             <span className="text-[8px] font-black uppercase tracking-tighter">AI 补完</span>
                           </button>

                           <button
                             onClick={(e) => { e.stopPropagation(); currentCard && handleRecalibrate(currentCard, e); }}
                             className="p-6 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100 rounded-[2rem] transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
                             title="调低复习间隔 (更频繁复习)"
                           >
                             <RefreshCw size={20} />
                             <span className="text-[8px] font-black uppercase tracking-tighter">加速复习</span>
                           </button>
                        </div>

                         {/* Delete Button */}
                         <div className="absolute bottom-8 left-10">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const cardId = currentCard?.id;
                                console.log("Delete clicked (Study Mode Back), ID:", cardId);
                                if (!cardId) {
                                  alert("错误：无法获取当前卡片 ID计划");
                                  return;
                                }
                                setDeleteConfirmId(cardId);
                              }}
                              className="p-3 bg-white border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                              title="删除卡片"
                            >
                              <Trash2 size={18} />
                            </button>
                         </div>

                        {/* Page Number Indicator */}
                        <div className="absolute bottom-8 right-10 w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-300 text-sm font-black font-mono">
                           {currentIndex + 1}
                        </div>
                     </div>
                   </motion.div>
                 </motion.div>
               </AnimatePresence>
            </div>

            {/* Stat Summary */}
            <div className="mt-12 mb-8">
               <span className="text-gray-400 text-sm font-bold tracking-wide uppercase">已复习 {currentCard.viewCount || 0} 次</span>
            </div>

            {/* Navigation Buttons */}
            <div className="w-full flex gap-6">
               <button 
                 onClick={handleBack}
                 className="flex-1 py-5 bg-white hover:bg-gray-50 text-gray-600 rounded-[2.5rem] font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-gray-100 shadow-sm"
               >
                 <ChevronLeft size={20} /> 上一张
               </button>
               <button 
                 onClick={handleNext}
                 className="flex-1 py-5 bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:opacity-90 text-white rounded-[2.5rem] font-bold transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2"
               >
                 下一张 <ChevronRight size={20} />
               </button>
            </div>

            {/* Card Groups (Green Blocks) */}
            <div className="w-full mt-16 space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Book size={20} className="text-green-500" /> 复习组卡 (每组 {GROUP_SIZE} 张)
                  </h3>
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-100">
                    共 {cardGroups.length} 组
                  </span>
               </div>
               
               <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {cardGroups.map((group, idx) => {
                    const lastReviewed = group.reduce((max, c) => Math.max(max, c.lastReviewed || 0), 0);
                    const isSelected = activeGroupIndex === idx;
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveGroupIndex(idx);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={cn(
                          "relative aspect-square rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all overflow-hidden border-2 cursor-pointer z-10 active:scale-95",
                          isSelected 
                            ? "bg-[#22c55e] border-[#16a34a] shadow-[0_10px_20px_-5px_rgba(34,197,94,0.4)]" 
                            : "bg-[#4ade80]/10 border-[#4ade80]/20 hover:border-[#4ade80]/40 text-green-700"
                        )}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveGroupIndex(idx);
                          }
                        }}
                      >
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center p-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/5 sm:bg-black/10 backdrop-blur-sm z-20">
                           <div className="flex gap-1.5 sm:gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartQuiz?.(group);
                                }}
                                className="p-2 sm:p-2.5 bg-orange-500 text-white rounded-xl shadow-lg border-2 border-white/20 active:scale-90 transition-transform flex items-center gap-1 sm:gap-1.5"
                                title="针对这组进行考试"
                              >
                                <GraduationCap size={14} className="sm:w-4 sm:h-4" />
                                <span className="text-[8px] sm:text-[10px] font-bold">考试</span>
                              </button>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsAutoPlaying(!isAutoPlaying);
                                  setActiveGroupIndex(idx);
                                }}
                                className={cn(
                                  "p-2 sm:p-2.5 rounded-xl shadow-lg border-2 border-white/20 active:scale-90 transition-transform flex items-center gap-1 sm:gap-1.5",
                                  isAutoPlaying && activeGroupIndex === idx ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                                )}
                                title={isAutoPlaying && activeGroupIndex === idx ? "暂停" : "播放本组"}
                              >
                                {isAutoPlaying && activeGroupIndex === idx ? <Pause size={14} className="sm:w-4 sm:h-4" /> : <PlayCircle size={14} className="sm:w-4 sm:h-4" />}
                                <span className="text-[8px] sm:text-[10px] font-bold">播放</span>
                              </button>
                           </div>
                        </div>

                        <div className={cn(
                          "absolute top-0 right-0 w-1/2 h-1/2 rounded-bl-[2rem] opacity-20 pointer-events-none",
                          isSelected ? "bg-white" : "bg-green-500"
                        )} />
                        
                        <span className={cn("text-xl font-black pointer-events-none", isSelected ? "text-white" : "text-green-600")}>
                          {idx + 1}
                        </span>
                        
                        <div className="flex flex-col items-center pointer-events-none">
                          <span className={cn("text-[9px] font-black uppercase tracking-tighter opacity-70", isSelected ? "text-white" : "text-green-600")}>
                             {idx * GROUP_SIZE + 1}-{idx * GROUP_SIZE + group.length}
                          </span>
                          {lastReviewed > 0 && (
                            <span className={cn(
                               "text-[8px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full",
                               isSelected ? "bg-white/20 text-white" : "bg-green-500/10 text-green-600"
                            )}>
                              {formatTimeAgo(lastReviewed)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
               </div>

            </div>
          </motion.div>
        ) : activeSubTab === 'manage' ? (
          <motion.div 
            key="manage-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-4xl"
          >
            {/* Grouping & Filtering Controls */}
            <div className="mb-8 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white/60 p-1 rounded-2xl border border-white">
                  <button
                    onClick={() => setGroupBy('none')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                      groupBy === 'none' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <ListFilter size={14} /> 默认分组
                  </button>
                  <button
                    onClick={() => setGroupBy('date')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                      groupBy === 'date' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <Calendar size={14} /> 按日期分组
                  </button>
                  <button
                    onClick={() => setGroupBy('tag')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                      groupBy === 'tag' ? "bg-white shadow-sm text-indigo-600" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <Tag size={14} /> 按标签分组
                  </button>
                </div>

                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  共 {cards.length} 张闪卡
                </div>
              </div>

              {/* Tag Filtering Bar */}
              <div className="flex flex-wrap items-center gap-2 p-4 bg-white/40 rounded-3xl border border-white">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">标签过滤:</span>
                <button 
                  onClick={() => setFilterTag(null)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all",
                    !filterTag ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-gray-400 hover:bg-gray-100"
                  )}
                >
                  全部
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all",
                      tag === filterTag ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {groupBy === 'none' ? (
              <>
                {/* Group Selection in Manage View */}
                <div className="mb-12 flex flex-wrap gap-3 justify-center">
                    {Array.from({ length: Math.ceil(filteredCards.length / GROUP_SIZE) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveGroupIndex(idx)}
                        className={cn(
                          "px-6 py-2 rounded-2xl text-sm font-bold transition-all border-2",
                          activeGroupIndex === idx 
                           ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-100" 
                           : "bg-white border-gray-100 text-gray-400 hover:border-green-200"
                        )}
                      >
                        组 {idx + 1} ({idx * GROUP_SIZE + 1}-{Math.min((idx + 1) * GROUP_SIZE, filteredCards.length)} 词)
                      </button>
                    ))}
                    {filteredCards.length === 0 && (
                      <div className="py-20 text-center w-full">
                        <p className="text-gray-400 font-bold">没有找到匹配该标签的闪卡</p>
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCards.slice(activeGroupIndex * GROUP_SIZE, activeGroupIndex * GROUP_SIZE + GROUP_SIZE).map((card) => (
                    <CardItem key={card.id} card={card} />
                  ))}
                </div>
              </>
            ) : groupBy === 'date' ? (
              <div className="space-y-4">
                {Object.entries(
                  filteredCards.reduce((acc, card) => {
                    const date = new Date(card.details.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(card);
                    return acc;
                  }, {} as Record<string, Flashcard[]>)
                ).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, dateCards]) => {
                  const isCollapsed = collapsedGroups[date];
                  return (
                    <div key={date} className="bg-white/40 rounded-[2.5rem] border border-white p-2">
                       <button 
                         onClick={() => toggleGroup(date)}
                         className="w-full flex items-center justify-between p-6 hover:bg-white/40 rounded-[2rem] transition-all group"
                       >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                               <Calendar size={20} />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                                {date}
                              </h3>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                {dateCards.length} FLASHCARDS
                              </span>
                            </div>
                          </div>
                          <div className={cn("p-2 text-gray-400 transition-transform duration-300", isCollapsed ? "" : "rotate-180")}>
                             <ChevronDown size={20} />
                          </div>
                       </button>

                       <AnimatePresence>
                         {!isCollapsed && (
                           <motion.div
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: 'auto', opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             className="overflow-hidden"
                           >
                             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {dateCards.map((card) => (
                                 <CardItem key={card.id} card={card} />
                               ))}
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  filteredCards.reduce((acc, card) => {
                    const cardTags = card.tags && card.tags.length > 0 ? card.tags : ['未分类'];
                    cardTags.forEach(tag => {
                      if (!acc[tag]) acc[tag] = [];
                      acc[tag].push(card);
                    });
                    return acc;
                  }, {} as Record<string, Flashcard[]>)
                ).sort((a, b) => {
                  if (a[0] === '未分类') return 1;
                  if (b[0] === '未分类') return -1;
                  return a[0].localeCompare(b[0]);
                }).map(([tag, tagCards]) => {
                  const isCollapsed = collapsedGroups[tag];
                  return (
                    <div key={tag} className="bg-white/40 rounded-[2.5rem] border border-white p-2">
                       <button 
                         onClick={() => toggleGroup(tag)}
                         className="w-full flex items-center justify-between p-6 hover:bg-white/40 rounded-[2rem] transition-all group"
                       >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                               <Tag size={20} />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                                {tag}
                              </h3>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                {tagCards.length} FLASHCARDS
                              </span>
                            </div>
                          </div>
                          <div className={cn("p-2 text-gray-400 transition-transform duration-300", isCollapsed ? "" : "rotate-180")}>
                             <ChevronDown size={20} />
                          </div>
                       </button>

                       <AnimatePresence>
                         {!isCollapsed && (
                           <motion.div
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: 'auto', opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             className="overflow-hidden"
                           >
                             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {tagCards.map((card) => (
                                 <CardItem key={card.id} card={card} />
                               ))}
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="add-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl flex flex-col items-center"
          >
            <div className="w-full bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl space-y-8">
               <div className="text-center space-y-2">
                 <h3 className="text-3xl font-bold text-gray-900">自定义短语学习</h3>
                 <p className="text-gray-400">我们将使用 AI 为您自动补充单词或短语的详细释义与例句</p>
               </div>

               <form onSubmit={handleManualAdd} className="space-y-6">
                 <div className="relative">
                   <input
                     autoFocus
                     type="text"
                     value={newWord}
                     onChange={(e) => setNewWord(e.target.value)}
                     placeholder="输入单词或短语..."
                     className="w-full bg-gray-50 border-2 border-transparent rounded-[2rem] px-8 py-5 text-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold shadow-inner"
                   />
                   {isAnalyzing && (
                     <div className="absolute right-6 top-1/2 -translate-y-1/2">
                       <Loader2 className="animate-spin text-indigo-600" size={24} />
                     </div>
                   )}
                 </div>
                 <div className="flex gap-4">
                   <button
                     type="submit"
                     disabled={isAnalyzing || !newWord.trim()}
                     className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[2rem] py-5 font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     <PlusCircle size={22} /> 开始分析并添加
                   </button>
                   <button
                     type="button"
                     onClick={handleQuickSave}
                     disabled={isSaving || !newWord.trim()}
                     className="flex items-center justify-center gap-2 px-6 bg-green-50 text-green-700 rounded-[2rem] border-2 border-green-200 hover:bg-green-100 transition-all font-bold shadow-sm min-w-[140px] disabled:opacity-50"
                     title="直接保存，无需 AI 分析"
                   >
                     {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                     <span className="text-sm">自动保存</span>
                   </button>
                   <label className="flex flex-col items-center justify-center px-6 bg-purple-50 text-purple-600 rounded-[2rem] border border-purple-100 hover:bg-purple-100 transition-all cursor-pointer shadow-sm min-w-[120px]" title="导入 PDF 单词本">
                     {isImporting ? <Loader2 className="animate-spin" size={24} /> : <FileUp size={24} />}
                     <span className="text-[10px] font-black mt-1 uppercase tracking-wider">PDF 导入</span>
                     <input type="file" accept=".pdf" className="hidden" onChange={handlePDFImport} disabled={isImporting} />
                   </label>
                   <label className="flex flex-col items-center justify-center px-6 bg-emerald-50 text-emerald-600 rounded-[2rem] border border-emerald-100 hover:bg-emerald-100 transition-all cursor-pointer shadow-sm min-w-[120px]" title="导入 Word 单词本">
                     {isImporting ? <Loader2 className="animate-spin" size={24} /> : <FileType size={24} />}
                     <span className="text-[10px] font-black mt-1 uppercase tracking-wider">Word 导入</span>
                     <input type="file" accept=".docx" className="hidden" onChange={handleWordImport} disabled={isImporting} />
                   </label>
                 </div>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={onClose}
        className="mt-16 text-gray-400 hover:text-indigo-600 transition-colors text-sm font-bold flex items-center gap-2 tracking-wide"
      >
        <RotateCcw size={16} /> 返回翻译主页
      </button>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-[#1a2235] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/10"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500">
                  <Trash2 size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">确定要删除吗？</h3>
                  <p className="text-gray-500 dark:text-white/40 font-medium">
                    单词: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{cards.find(c => c.id === deleteConfirmId)?.front}</span>
                    <br />
                    删除后将无法恢复，确定继续吗？
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (deleteConfirmId) {
                        handleDeleteCurrentCard(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }
                    }}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-red-200 dark:shadow-none"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl font-bold transition-all active:scale-95"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

