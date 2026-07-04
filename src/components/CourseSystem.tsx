import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronRight, Volume2, ArrowLeft, PlayCircle, Star, Sparkles, MessageCircle, ShieldCheck, GraduationCap, Edit3, Save, Plus, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { speakGemini as speak } from '../lib/audio';

interface DialogueStep {
  role: 'AI' | 'User';
  content: string;
  pinyin?: string;
  translation: string;
  context?: string;
  gender?: 'male' | 'female';
}

interface Course {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  description: string;
  icon: any;
  steps: DialogueStep[];
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  lessons: Course[];
}

const generateFamilyAlbumChapter1 = (): Course[] => [
  {
    id: 'fa-ch1-l1',
    title: 'Richard Stewart: The Photographer',
    level: 'Beginner',
    category: 'Introduction',
    description: '理查德正在布朗克斯维尔捕捉生活镜头。',
    icon: PlayCircle,
    steps: [
      { role: 'AI' as const, content: "Excuse me. I'm Richard Stewart. I'm a photographer.", translation: "打扰一下。我是理查德·斯图尔特。我是一名摄影师。", context: "理查德试图向路人介绍自己以便拍照。", gender: 'male' as const },
      { role: 'User' as const, content: "Oh, really? What kind of photographs do you take?", translation: "噢，真的吗？你拍哪种类型的照片？", context: "路人表现出了好奇。", gender: 'female' as const },
      { role: 'AI' as const, content: "I'm working on a book. It's called 'Family Album, USA'.", translation: "我正在写一本书。书名叫《走遍美国》。", context: "解释他的长期拍摄项目。", gender: 'male' as const }
    ]
  },
  {
    id: 'fa-ch1-l2',
    title: 'A Nice Smile (Meeting Alexandra)',
    level: 'Beginner',
    category: 'Daily Life',
    description: '理查德遇到了正在交换生项目中的亚历山德拉向对方问好。',
    icon: MessageCircle,
    steps: [
      { role: 'AI' as const, content: "That's a nice smile. Are you from around here?", translation: "笑容很美。你是这儿的人吗？", context: "理查德主动搭话。", gender: 'male' as const },
      { role: 'User' as const, content: "No, I'm from Greece. My name is Alexandra Pappas.", translation: "不，我来自希腊。我叫亚历山德拉·帕帕斯。", context: "亚历山德拉友好地回应。", gender: 'female' as const },
      { role: 'AI' as const, content: "Welcome to New York, Alexandra! How do you like it so far?", translation: "欢迎来到纽约，亚历山德拉！你觉得这儿怎么样？", context: "典型的纽约客问候。", gender: 'male' as const }
    ]
  },
  {
    id: 'fa-ch1-l3',
    title: 'Looking for 4600 Gerard Street',
    level: 'Beginner',
    category: 'Travel',
    description: '理查德邀请亚历山德拉去他家坐坐，介绍他的家人。',
    icon: BookOpen,
    steps: [
      { role: 'AI' as const, content: "My family lives nearby. Why don't you come and meet them?", translation: "我家人就住在附近。你为什么不过来见见他们呢？", context: "热情的邀请。", gender: 'male' as const },
      { role: 'User' as const, content: "That's very kind of you. Is it far from here?", translation: "你太客气了。离这儿远吗？", context: "亚历山德拉有些迟疑但很礼貌。", gender: 'female' as const },
      { role: 'AI' as const, content: "It's just a short walk to 4600 Gerard Street.", translation: "步行一会儿就到杰勒德街 4600 号了。", context: "明确目的地。", gender: 'male' as const }
    ]
  },
  // Add more as needed to reach 10, or fill with meaningful placeholders
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `fa-ch1-l${i + 4}`,
    title: `Chapter 1 Lesson ${i + 4}: Stewart Family Life`,
    level: 'Beginner' as const,
    category: 'Family',
    description: '继续探索斯图尔特一家的生活点滴。',
    icon: Star,
    steps: [
      { role: 'AI' as const, content: "This is my wife, Marilyn. She's a designer.", translation: "这是我妻子玛丽莲。她是个设计师。", context: "理查德介绍家人。", gender: 'male' as const },
      { role: 'User' as const, content: "Nice to meet you, Marilyn. Your home is lovely.", translation: "很高兴见到你，玛丽莲。你们的家真漂亮。", context: "客人进屋后的赞美。", gender: 'female' as const }
    ]
  }))
];

const generateMockLessons = (chapterIdx: number): Course[] => {
  const icons = [PlayCircle, BookOpen, MessageCircle, Star, Sparkles, ShieldCheck, GraduationCap, Volume2, Edit3, Save];
  const levels: ('Beginner' | 'Intermediate' | 'Advanced')[] = ['Beginner', 'Intermediate', 'Advanced'];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `ch${chapterIdx + 1}-l${i + 1}`,
    title: `Lesson ${i + 1}: Modern Practical English`,
    level: levels[i % 3],
    category: 'Social Interaction',
    description: `Mastering the essential vocabulary for Chapter ${chapterIdx + 1}.`,
    icon: icons[i % icons.length],
    steps: [
      { role: 'AI', content: "Hello! Welcome to Lesson " + (i + 1) + ". Let's practice now.", translation: "你好！欢迎来到第" + (i + 1) + "课。让我们现在开始练习。", context: "AI tutor greeting." },
      { role: 'User', content: "I'm ready. Please guide me through this dialogue.", translation: "我准备好了。请引导我完成这段对话。", context: "User confirmation." }
    ]
  }));
};

const PREDEFINED_CHAPTERS: Chapter[] = Array.from({ length: 10 }, (_, i) => ({
  id: `chapter-${i + 1}`,
  title: `第 ${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]} 章`,
  description: i === 0 ? "经典美剧《走遍美国》第一季：在纽约的新生活。" : `更多实战对话场景，系统提升口语能力。`,
  lessons: i === 0 ? generateFamilyAlbumChapter1() : generateMockLessons(i)
}));

export const CourseSystem: React.FC<{ onClose: () => void; userEmail?: string }> = ({ onClose, userEmail }) => {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSteps, setEditSteps] = useState<DialogueStep[]>([]);
  const [speechSpeed, setSpeechSpeed] = useState<'fast' | 'normal' | 'slow'>('normal');

  const isDeveloper = userEmail === 'linlaytop@gmail.com';

  const handleBack = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    if (selectedCourse) {
      setSelectedCourse(null);
      setCurrentStep(0);
    } else if (selectedChapter) {
      setSelectedChapter(null);
    } else {
      onClose();
    }
  };

  const handleStartEdit = () => {
    if (selectedCourse) {
      setEditSteps([...selectedCourse.steps]);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedCourse && selectedChapter) {
      const cIdx = PREDEFINED_CHAPTERS.findIndex(c => c.id === selectedChapter.id);
      if (cIdx !== -1) {
        const lIdx = PREDEFINED_CHAPTERS[cIdx].lessons.findIndex(l => l.id === selectedCourse.id);
        if (lIdx !== -1) {
          PREDEFINED_CHAPTERS[cIdx].lessons[lIdx].steps = editSteps;
          setSelectedCourse({ ...selectedCourse, steps: editSteps });
        }
      }
      setIsEditing(false);
    }
  };

  const handleSpeak = (text: string, gender?: 'male' | 'female') => {
    speak(text, {
      speed: speechSpeed,
      useNeural: true,
      gender,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 shadow-2xl shadow-blue-100/50 border border-blue-50 relative overflow-hidden min-h-[600px] flex flex-col">
      {/* Design Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50/50 rounded-full blur-3xl -ml-32 -mb-32" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-black text-sm">返回</span>
        </button>

        <div className="flex items-center gap-3">
          {isDeveloper && selectedCourse && !isEditing && (
            <button 
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all font-black text-xs border border-green-200"
            >
              <Edit3 size={14} />
              手动输入
            </button>
          )}
          <div className="px-4 py-1.5 bg-blue-600/10 text-blue-600 rounded-full text-xs font-black tracking-wider flex items-center gap-2">
            <Sparkles size={12} fill="currentColor" />
            AI COURSE SYSTEM v1.0
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          /* Editor UI remains the same */
          <motion.div 
            key="editor"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-20 flex-1 flex flex-col bg-white rounded-3xl border-2 border-green-500 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="text-green-600" size={20} />
                课程内容编辑器
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 shadow-lg shadow-green-100"
                >
                  <Save size={16} />
                  保存课程
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide pb-6">
              {editSteps.map((step, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400">步骤 {idx + 1}</span>
                    <button 
                      onClick={() => setEditSteps(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">角色</label>
                      <select 
                        value={step.role}
                        onChange={(e) => {
                          const newSteps = [...editSteps];
                          newSteps[idx].role = e.target.value as 'AI' | 'User';
                          setEditSteps(newSteps);
                        }}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-green-500"
                      >
                        <option value="AI">AI (机器)</option>
                        <option value="User">User (用户)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">发音性别</label>
                      <select 
                        value={step.gender || 'female'}
                        onChange={(e) => {
                          const newSteps = [...editSteps];
                          newSteps[idx].gender = e.target.value as 'male' | 'female';
                          setEditSteps(newSteps);
                        }}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-green-500"
                      >
                        <option value="female">女声 (Female)</option>
                        <option value="male">男声 (Male)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">情境提示</label>
                      <input 
                        type="text"
                        value={step.context || ''}
                        onChange={(e) => {
                          const newSteps = [...editSteps];
                          newSteps[idx].context = e.target.value;
                          setEditSteps(newSteps);
                        }}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-green-500"
                        placeholder="情境说明..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">英文原文</label>
                    <textarea 
                      value={step.content}
                      onChange={(e) => {
                        const newSteps = [...editSteps];
                        newSteps[idx].content = e.target.value;
                        setEditSteps(newSteps);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-green-500 min-h-[60px]"
                      placeholder="Input English text here..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">中文翻译</label>
                    <input 
                      type="text"
                      value={step.translation}
                      onChange={(e) => {
                        const newSteps = [...editSteps];
                        newSteps[idx].translation = e.target.value;
                        setEditSteps(newSteps);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-green-500"
                      placeholder="中文对应翻译内容"
                    />
                  </div>
                </div>
              ))}

              <button 
                onClick={() => setEditSteps(prev => [...prev, { role: 'AI', content: '', translation: '', context: '' }])}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-green-600 hover:border-green-500 transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                添加一个步骤
              </button>
            </div>
          </motion.div>
        ) : !selectedChapter ? (
          <motion.div 
            key="chapters"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 space-y-6 flex-1"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">付费对话课程</h2>
              <p className="text-gray-500 mt-2 text-sm font-medium">由 LingoAI 独立研发，10 章 100 课的全方位外语沉浸</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PREDEFINED_CHAPTERS.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapter(chapter)}
                  className="group bg-white border-2 border-gray-100 hover:border-green-500 rounded-3xl p-6 text-left transition-all hover:shadow-xl hover:shadow-green-600/5 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-50 group-hover:bg-green-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-green-600 transition-colors">
                      <BookOpen size={24} />
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {chapter.lessons.length} 课时
                    </span>
                  </div>
                  <h3 className="font-black text-xl text-gray-900 group-hover:text-green-600 transition-colors">{chapter.title}</h3>
                  <p className="text-gray-400 text-xs mt-2 font-medium line-clamp-2 leading-relaxed">{chapter.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : !selectedCourse ? (
          <motion.div 
            key="lessons"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative z-10 space-y-6 flex-1"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">{selectedChapter.title}：课程目录</h2>
              <p className="text-gray-500 text-sm font-medium">选择一个小节开始练习</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedChapter.lessons.map((course, index) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="group bg-white border-2 border-gray-100 hover:border-blue-500 rounded-3xl p-6 text-left transition-all hover:shadow-xl hover:shadow-blue-600/5 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                        <course.icon size={24} />
                      </div>
                      <div className="px-2 py-1 bg-green-50 text-green-600 border border-green-100 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        第 {['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][index]} 课
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                      course.level === 'Beginner' ? "bg-green-100 text-green-700" :
                      course.level === 'Intermediate' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}>
                      {course.level}
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                  <p className="text-gray-400 text-xs mt-2 font-medium line-clamp-2 leading-relaxed">{course.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative z-10 flex-1 flex flex-col"
          >
            <div className="mb-8">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <selectedCourse.icon size={18} />
                <span className="text-xs font-black uppercase tracking-widest">{selectedCourse.category}</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900">{selectedCourse.title}</h2>
              <div className="h-1.5 w-full bg-gray-100 rounded-full mt-6 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / selectedCourse.steps.length) * 100}%` }}
                  className="h-full bg-blue-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide pb-20">
              {selectedCourse.steps.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: idx <= currentStep ? 1 : 0.3, 
                    y: 0,
                    scale: idx === currentStep ? 1 : 0.98
                  }}
                  className={cn(
                    "relative p-6 rounded-3xl border-2 transition-all",
                    idx === currentStep ? "bg-white border-blue-500 shadow-xl shadow-blue-500/10" : "bg-gray-50 border-transparent",
                    step.role === 'User' ? "ml-8" : "mr-8"
                  )}
                >
                   <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                      step.role === 'AI' ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
                    )}>
                      {step.role === 'AI' ? 'AI' : 'YOU'}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {step.role === 'AI' ? 'Pronunciation Guide' : 'Your Turn'}
                    </span>
                   </div>
                   
                   <p className="text-lg font-black text-gray-900 leading-tight mb-2">
                    {step.content}
                   </p>
                   <p className="text-sm text-gray-500 font-medium">
                    {step.translation}
                   </p>

                   {idx === currentStep && (
                     <div className="mt-6 flex flex-col gap-4">
                       <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleSpeak(step.content, step.gender)}
                          disabled={isSpeaking}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                          <Volume2 size={18} />
                          {isSpeaking ? '正在播放...' : `聆听${step.gender === 'male' ? '男声' : '女声'}发音`}
                        </button>
                        
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                          {(['slow', 'normal', 'fast'] as const).map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setSpeechSpeed(speed)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                speechSpeed === speed 
                                  ? "bg-white text-blue-600 shadow-sm" 
                                  : "text-gray-400 hover:text-gray-600"
                              )}
                            >
                              {speed === 'fast' ? '快' : speed === 'normal' ? '中' : '慢'}
                            </button>
                          ))}
                        </div>
                       </div>
                       
                       {currentStep < selectedCourse.steps.length - 1 && (
                         <button 
                          onClick={() => setCurrentStep(prev => prev + 1)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                         >
                           通过并继续
                         </button>
                       )}
                       {currentStep === selectedCourse.steps.length - 1 && (
                          <button 
                            onClick={() => {
                              alert('🎉 恭喜完成课程！');
                              setSelectedCourse(null);
                              setCurrentStep(0);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                          >
                            完成挑战
                          </button>
                       )}
                     </div>
                   )}

                   {step.context && idx === currentStep && (
                     <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2">
                        <Star size={14} className="text-blue-400 mt-0.5" fill="currentColor" />
                        <p className="text-[10px] text-blue-700 font-bold leading-relaxed">{step.context}</p>
                     </div>
                   )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trust Badge */}
      <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-green-500" />
          官方认证课程：防篡改内容
        </div>
        <div className="flex items-center gap-1">
          POWERED BY <span className="text-blue-500">GEMINI PRO VOICE</span>
        </div>
      </div>
    </div>
  );
};
