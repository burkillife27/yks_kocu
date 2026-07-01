import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Book, Task, AppSettings, ExamBranch, UserRoutine, Camp } from '../types.ts';
import { storage } from '../lib/storage.ts';
import { GeminiService } from '../services/geminiService.ts';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Play, 
  Trash2, 
  RotateCcw,
  Zap,
  Info,
  Plus,
  Book as BookIcon,
  Activity,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils.ts';

const BRANCHES: ExamBranch[] = [
  "TYT Türkçe", "TYT Matematik", "TYT Fizik", "TYT Kimya", "TYT Biyoloji", "TYT Sosyal", "TYT Fen", "TYT GENEL",
  "AYT Matematik", "AYT Fizik", "AYT Kimya", "AYT Biyoloji", "AYT Fen", "AYT Edebiyat", "AYT Tarih-1", "AYT Coğrafya-1", "AYT Tarih-2", "AYT Coğrafya-2", "AYT Felsefe Grubu", "AYT Din Kültürü", "AYT GENEL",
  "Paragraf", "Problem", "Yabancı Dil (YDT)"
];

import { BookDetailModal } from '../components/BookDetailModal.tsx';

const TaskItem = React.memo(({ 
  task, 
  book, 
  onToggle, 
  onDelete, 
  onStart, 
  deletingTaskId, 
  setDeletingTaskId,
  onUpdateNote,
  onShowBook
}: { 
  task: Task, 
  book?: Book, 
  onToggle: (id: string) => void, 
  onDelete: (id: string) => void, 
  onStart: (task: Task) => void,
  deletingTaskId: string | null,
  setDeletingTaskId: (id: string | null) => void,
  onUpdateNote: (id: string, note: string) => void,
  onShowBook: (book: Book) => void
}) => {
  const isCompleted = task.status === 'completed';
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(task.userNote || '');

  const handleNoteSave = () => {
    onUpdateNote(task.id, noteValue);
    setIsEditingNote(false);
  };

  return (
    <motion.div 
      layout
      className={cn(
        "card p-6 flex flex-col gap-4 transition-all cursor-pointer hover:border-primary/30 group/task",
        isCompleted && "opacity-60 bg-secondary/30"
      )}
      onClick={() => {
        if (book) onShowBook(book);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
              isCompleted ? "bg-green-500 border-green-500 text-white" : "border-foreground/20 hover:border-primary"
            )}
          >
            {isCompleted && <CheckCircle2 size={16} />}
          </button>
          <div>
            <h3 className={cn("font-bold flex items-center gap-2", isCompleted && "line-through")}>
                {book?.title || (task.title || 'Başlıksız Görev')}
                {task.isManual && <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-secondary text-foreground/40 rounded uppercase tracking-tighter">Manuel</span>}
                {!isCompleted && book && (book.completedUnits + (task.unitsToStudy || 0)) >= book.totalUnits && (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 text-[9px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm"
                  >
                    <Trophy size={10} /> Kitap Bitiyor!
                  </motion.span>
                )}
            </h3>
            <p className="text-xs text-foreground/40 font-medium mt-1">
              {task.bookId ? `${task.unitsCompleted || 0}/${task.unitsToStudy} ${book?.unitType} · ` : ''}
              {task.actualMinutes ? (
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span className="opacity-60">Hedef: {task.estimatedMinutes} dk</span>
                  <span className="text-green-500 font-bold">Gerçekleşen: {task.actualMinutes} dk</span>
                </span>
              ) : (
                <span>{task.estimatedMinutes} dk tahmini</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isCompleted && (
            <button 
               className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
               onClick={(e) => {
                 e.stopPropagation();
                 onStart(task);
               }}
            >
              <Play size={18} fill="currentColor" />
            </button>
          )}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingNote(!isEditingNote);
            }}
            className={cn(
              "p-3 rounded-xl transition-all",
              (task.userNote || isEditingNote) ? "bg-orange-500/10 text-orange-500" : "text-foreground/20 hover:text-orange-500 hover:bg-orange-500/10"
            )}
            title="Not Ekle/Düzenle"
          >
             <Info size={18} />
          </button>

          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setDeletingTaskId(deletingTaskId === task.id ? null : task.id);
              }}
              className={cn(
                "p-3 rounded-xl transition-all",
                deletingTaskId === task.id ? "bg-red-500 text-white" : "text-foreground/20 hover:text-red-500 hover:bg-red-500/10"
              )}
            >
              <Trash2 size={18} />
            </button>
            <AnimatePresence>
              {deletingTaskId === task.id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-card border border-border rounded-lg shadow-2xl z-20 flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => onDelete(task.id)}
                    className="flex-1 py-1 bg-red-500 text-white text-[10px] font-bold rounded-md"
                  >
                    Sil
                  </button>
                  <button 
                    onClick={() => setDeletingTaskId(null)}
                    className="flex-1 py-1 bg-secondary text-[10px] font-bold rounded-md"
                  >
                    Vazgeç
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-right min-w-[80px] space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Branş</p>
            <p className="text-xs font-bold">{task.branch || book?.branch || 'Genel'}</p>
            {task.unitsToStudy && (task.unitsCompleted || 0) > 0 && !isCompleted && (
              <div className="w-full h-1 bg-red-500 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-green-500 transition-all duration-500" 
                   style={{ width: `${Math.min(100, ((task.unitsCompleted || 0) / task.unitsToStudy) * 100)}%` }}
                 />
              </div>
            )}
          </div>
        </div>
      </div>

      {(task.description || isEditingNote || task.userNote) && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {task.description && (
            <div>
              <p className="text-[10px] font-black uppercase text-primary/40 tracking-widest mb-1">AI Açıklaması</p>
              <p className="text-xs text-foreground/50 italic bg-secondary/30 p-2 rounded-lg border-l-2 border-primary/30">
                {task.description}
              </p>
            </div>
          )}
          
          {(isEditingNote || task.userNote) && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase text-orange-500/40 tracking-widest">Senin Notun</p>
                {isEditingNote && (
                  <button 
                    onClick={handleNoteSave}
                    className="text-[10px] font-bold text-orange-500 hover:underline"
                  >
                    Kaydet
                  </button>
                )}
              </div>
              
              {isEditingNote ? (
                <textarea
                  autoFocus
                  value={noteValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onBlur={handleNoteSave}
                  className="w-full p-2 text-xs bg-orange-500/5 rounded-lg border border-orange-500/20 outline-none focus:ring-1 focus:ring-orange-500 min-h-[60px]"
                  placeholder="Doğru/yanlış sayısı, çalışma ortamı, neden aksadığı vb. not alabilirsin..."
                />
              ) : (
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingNote(true);
                  }}
                  className="text-xs text-orange-500/70 bg-orange-500/5 p-2 rounded-lg border-l-2 border-orange-500/30 cursor-pointer hover:bg-orange-500/10 transition-colors"
                >
                  {task.userNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default function Program({ books, tasks, settings, routines, camps, onRefresh }: { 
  books: Book[], 
  tasks: Task[], 
  settings: AppSettings, 
  routines: UserRoutine[],
  camps: Camp[],
  onRefresh: () => void 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(300);
  const [showConfig, setShowConfig] = useState(false);
  const [dailyNote, setDailyNote] = useState('');
  const [aiReasoning, setAiReasoning] = useState<{ reasoning: string, thought?: string } | null>(null);
  const [showReasoningModal, setShowReasoningModal] = useState(false);
  const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);
  const [showAIChoice, setShowAIChoice] = useState(false);

  useEffect(() => {
    storage.getDailyNoteByDate(selectedDate).then(note => {
      setDailyNote(note?.content || '');
    });
    storage.getAiReasoning(selectedDate).then(reasoning => {
      setAiReasoning(reasoning);
    });
  }, [selectedDate]);
  
  // Sync targetMinutes with settings when selectedDate or showConfig changes
  useEffect(() => {
    if (showConfig) {
      const dayOfWeek = new Date(selectedDate).getDay();
      const defaultMinutes = settings.dailyStudyMinutes?.[dayOfWeek] || 300;
      setTargetMinutes(defaultMinutes);
    }
  }, [selectedDate, showConfig, settings.dailyStudyMinutes]);
  
  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  
  // Manual Task Form State
  const [showManualModal, setShowManualModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [actualMinutesInput, setActualMinutesInput] = useState(30);
  const [completedUnitsInput, setCompletedUnitsInput] = useState(1);
  const [manualType, setManualType] = useState<'book' | 'custom'>('book');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualBranch, setManualBranch] = useState<ExamBranch>('TYT Matematik');
  const [manualUnits, setManualUnits] = useState(1);
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualDescription, setManualDescription] = useState('');
  const [manualStatus, setManualStatus] = useState<'pending' | 'completed'>('pending');

  const dailyTasks = useMemo(() => tasks.filter(t => t.date === selectedDate), [tasks, selectedDate]);

  const dailySummary = useMemo(() => {
    const totalTarget = dailyTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
    const totalActual = dailyTasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);
    
    const formatTime = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
    };

    return {
      target: formatTime(totalTarget),
      actual: formatTime(totalActual),
      targetMinutes: totalTarget,
      actualMinutes: totalActual,
      progress: totalTarget > 0 ? Math.min(100, (totalActual / totalTarget) * 100) : 0
    };
  }, [dailyTasks]);

  const generateAIProgram = async () => {
    if (!settings.apiKey) {
      window.dispatchEvent(new CustomEvent('ai-error', { detail: "Lütfen önce ayarlar kısmından Gemini API Key girin." }));
      return;
    }

    setIsGenerating(true);
    setShowAIChoice(false);
    try {
      const trials = await storage.getTrials();
      const gemini = new GeminiService(settings, settings.aiModel);
      
      const { tasks: newTasks, reasoning, thought } = await gemini.generateProgram(books, trials, settings, tasks, routines, selectedDate, camps, customPrompt, targetMinutes);
      
      // Preserve tasks for other dates, as well as pre-existing user manual tasks of the selectedDate
      const existingManualTasks = tasks.filter(t => t.date === selectedDate && t.isManual);
      const otherTasks = tasks.filter(t => t.date !== selectedDate);
      await storage.saveTasks([...otherTasks, ...existingManualTasks, ...newTasks]);
      
      if (reasoning) {
        await storage.saveAiReasoning(selectedDate, reasoning, thought);
        setAiReasoning({ reasoning, thought });
      }
      
      onRefresh();
      setShowConfig(false);
      setCustomPrompt('');
    } catch (e: any) {
      const getResetTime = () => {
        const now = new Date();
        const nextReset = new Date();
        nextReset.setHours(24, 0, 0, 0);
        const diff = nextReset.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours} saat ${minutes} dakika`;
      };

      if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
        window.dispatchEvent(new CustomEvent('ai-error', { detail: `API kullanım limiti aşıldı. Kalan süre: ${getResetTime()}` }));
      } else {
        window.dispatchEvent(new CustomEvent('ai-error', { detail: e.message || 'Yapay zeka programı oluştururken hata oluştu.' }));
      }
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === 'completed') {
      const updatedTasks = tasks.map(t => {
        if (t.id === taskId) {
          const book = books.find(b => b.id === t.bookId);
          if (book) {
            // Undo all sessions from the book
            const sessionUnits = (t.sessions || []).reduce((acc, s) => acc + s.completedUnits, 0);
            const taskUnits = t.unitsToStudy || 0;
            // If it was completed but sessions sum is 0 (old data), use unitsToStudy
            const unitsToRemove = sessionUnits > 0 ? sessionUnits : taskUnits;
            
            const newCompleted = Math.max(0, book.completedUnits - unitsToRemove);
            storage.saveBooks(books.map(b => b.id === book.id ? { 
              ...b, 
              completedUnits: newCompleted,
              isCompleted: newCompleted >= b.totalUnits 
            } : b));
          }
          return { ...t, status: 'pending' as any, completedAt: undefined, actualMinutes: undefined, unitsCompleted: 0, sessions: [] };
        }
        return t;
      });
      await storage.saveTasks(updatedTasks);
      onRefresh();
    } else {
      setCompletingTask(task);
      const book = books.find(b => b.id === task.bookId);
      const remaining = (task.unitsToStudy || 0) - (task.unitsCompleted || 0);
      const unitsToSet = Math.max(1, remaining);
      
      setCompletedUnitsInput(unitsToSet);
      
      const defaultMinutes = book 
        ? Math.round(unitsToSet * book.minutesPerUnit)
        : task.estimatedMinutes;
        
      setActualMinutesInput(defaultMinutes);
      setShowReviewModal(true);
    }
  }, [tasks, books, onRefresh]);

  const confirmTaskCompletion = async () => {
    if (!completingTask) return;

    const actual = actualMinutesInput;
    const units = completedUnitsInput;
    const taskId = completingTask.id;
    const taskDate = new Date(completingTask.date);
    const dayOfWeek = taskDate.getDay();

    const newSession = {
      completedUnits: units,
      minutesSpent: actual,
      at: Date.now()
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const book = books.find(b => b.id === t.bookId);
        const currentUnitsCompleted = (t.unitsCompleted || 0) + units;
        const currentSessions = [...(t.sessions || []), newSession];
        const isFullyCompleted = currentUnitsCompleted >= (t.unitsToStudy || 1);

        if (book) {
          const newCompleted = Math.min(book.totalUnits, book.completedUnits + units);
          const bookIsEnding = newCompleted >= book.totalUnits;
          
          if (bookIsEnding && !book.isCompleted) {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#f97316', '#22c55e', '#3b82f6', '#eab308']
            });
          }

          storage.saveBooks(books.map(b => b.id === book.id ? { 
            ...b, 
            completedUnits: newCompleted,
            isCompleted: bookIsEnding 
          } : b));
        }

        return { 
          ...t, 
          unitsCompleted: currentUnitsCompleted,
          sessions: currentSessions,
          status: isFullyCompleted ? 'completed' : 'pending' as any, 
          completedAt: isFullyCompleted ? Date.now() : t.completedAt,
          actualMinutes: (t.actualMinutes || 0) + actual
        };
      }
      return t;
    });

    const updatedSettings = { ...settings };
    // Recalculate daily minutes based on all sessions today
    const sessionsToday = updatedTasks
      .filter(t => t.date === completingTask.date)
      .flatMap(t => t.sessions || []);
    
    const totalActualToday = sessionsToday.reduce((acc, s) => acc + s.minutesSpent, 0);
    
    updatedSettings.dailyStudyMinutes = {
      ...updatedSettings.dailyStudyMinutes,
      [dayOfWeek]: Math.max(updatedSettings.dailyStudyMinutes[dayOfWeek] || 0, totalActualToday)
    };

    await storage.saveSettings(updatedSettings);
    await storage.saveTasks(updatedTasks);

    setShowReviewModal(false);
    setCompletingTask(null);
    onRefresh();
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearDate = async () => {
    await storage.saveTasks(tasks.filter(t => t.date !== selectedDate));
    await storage.saveDailyNote(selectedDate, '');
    await storage.deleteAiReasoning(selectedDate);
    setDailyNote('');
    setAiReasoning(null);
    setShowClearConfirm(false);
    onRefresh();
  };

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const deleteTask = useCallback(async (taskId: string) => {
    await storage.saveTasks(tasks.filter(t => t.id !== taskId));
    setDeletingTaskId(null);
    onRefresh();
  }, [tasks, onRefresh]);

  const handleStartTask = useCallback((task: Task) => {
    window.dispatchEvent(new CustomEvent('start-task', { detail: task }));
  }, []);

  const updateTaskNote = async (taskId: string, note: string) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, userNote: note } : t);
    await storage.saveTasks(updatedTasks);
    onRefresh();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: crypto.randomUUID(),
      date: selectedDate,
      status: manualStatus,
      estimatedMinutes: manualMinutes,
      unitsCompleted: manualStatus === 'completed' ? manualUnits : 0,
      sessions: manualStatus === 'completed' ? [{
        completedUnits: manualUnits,
        minutesSpent: manualMinutes,
        at: Date.now()
      }] : [],
      isManual: true,
      description: manualDescription.trim() || undefined,
      completedAt: manualStatus === 'completed' ? Date.now() : undefined,
      actualMinutes: manualStatus === 'completed' ? manualMinutes : undefined
    };

    if (manualType === 'book') {
      const book = books.find(b => b.id === selectedBookId);
      if (!book) return;
      newTask.bookId = book.id;
      newTask.unitsToStudy = manualUnits;
      newTask.branch = book.branch;
      
      // Update book progress if completing
      if (manualStatus === 'completed') {
        const newCompleted = Math.min(book.totalUnits, book.completedUnits + manualUnits);
        const bookIsEnding = newCompleted >= book.totalUnits;

        if (bookIsEnding && !book.isCompleted) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#22c55e', '#3b82f6', '#eab308']
          });
        }

        await storage.saveBooks(books.map(b => b.id === book.id ? { 
          ...b, 
          completedUnits: newCompleted,
          isCompleted: bookIsEnding 
        } : b));
      }
    } else {
      newTask.title = manualTitle;
      newTask.branch = manualBranch;
    }

    await storage.saveTasks([...tasks, newTask]);
    setShowManualModal(false);
    resetManualForm();
    onRefresh();
  };

  const resetManualForm = () => {
    const firstBook = books[0];
    setSelectedBookId(firstBook?.id || '');
    setBookSearch('');
    setManualTitle('');
    setManualDescription('');
    setManualUnits(1);
    setManualMinutes(firstBook ? Math.round(1 * firstBook.minutesPerUnit) : 30);
    setManualStatus('pending');
  };

  // Auto-calculate minutes for manual book tasks
  useEffect(() => {
    if (manualType === 'book' && manualStatus === 'pending') {
      const book = books.find(b => b.id === selectedBookId);
      if (book) {
        setManualMinutes(Math.round(manualUnits * book.minutesPerUnit));
      }
    }
  }, [manualType, selectedBookId, manualUnits, manualStatus, books]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Çalışma Programı</h2>
          <p className="text-foreground/60">Yapay zeka asistanın senin için en verimli planı hazırlar.</p>
        </div>
        <div className="flex gap-2">
           {aiReasoning && (
             <button 
               onClick={() => setShowReasoningModal(true)}
               className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl font-bold hover:bg-orange-500/20 transition-all shadow-sm"
               title="Program Stratejisini Gör"
             >
               <Activity size={20} /> <span className="hidden md:inline">Mentör Analizi</span>
             </button>
           )}
           <button 
             onClick={() => { resetManualForm(); setShowManualModal(true); }}
             className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors"
           >
             <Plus size={20} /> Görev Ekle
           </button>
           <button 
            onClick={() => setShowConfig(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/20"
          >
            <Sparkles size={20} /> AI Program
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowClearConfirm(!showClearConfirm)}
              className={cn(
                "p-3 border border-border rounded-xl transition-colors",
                showClearConfirm ? "bg-red-500 text-white border-red-500" : "text-foreground/40 hover:text-red-500 hover:bg-red-500/10"
              )}
              title="Günü Temizle"
            >
              <Trash2 size={20} />
            </button>
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-card border border-border rounded-xl shadow-2xl z-20"
                >
                  <p className="text-[10px] font-bold text-center mb-2 uppercase tracking-widest opacity-60">Emin misiniz?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-secondary text-xs font-bold"
                    >
                      Hayır
                    </button>
                    <button 
                      onClick={clearDate}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold"
                    >
                      Evet
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 bg-card border border-border p-2 rounded-[28px] max-w-md mx-auto shadow-sm">
        <button 
          onClick={() => navigateDate(-1)}
          className="p-3 hover:bg-secondary rounded-2xl transition-all active:scale-90"
        >
          <ChevronLeft size={24} className="text-foreground/60" />
        </button>
        
        <div className="relative flex-1 group">
          <div className="w-full flex flex-col items-center px-4 py-2 bg-secondary/50 rounded-2xl group-hover:bg-secondary transition-all">
             <span className="text-[10px] font-black uppercase opacity-40 tracking-tighter">
               {new Date(selectedDate || Date.now()).toLocaleDateString('tr-TR', { weekday: 'long' })}
             </span>
             <span className="text-sm font-black whitespace-nowrap">
               {new Date(selectedDate || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
             </span>
          </div>
          <input 
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <button 
          onClick={() => navigateDate(1)}
          className="p-3 hover:bg-secondary rounded-2xl transition-all active:scale-90"
        >
          <ChevronRight size={24} className="text-foreground/60" />
        </button>
      </div>

      <div className="space-y-4">
        {dailyTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div className="card p-4 flex items-center gap-4 bg-primary/5 border-primary/10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Hedeflenen Süre</p>
                <p className="text-xl font-black">{dailySummary.target}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4 bg-green-500/5 border-green-500/10">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-500/40">Tamamlanan Süre</p>
                <div className="flex items-center justify-between gap-4">
                   <p className="text-xl font-black">{dailySummary.actual}</p>
                   {dailySummary.targetMinutes > 0 && (
                     <div className="flex items-center gap-2">
                       <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden hidden sm:block">
                         <div className="h-full bg-green-500" style={{ width: `${dailySummary.progress}%` }} />
                       </div>
                       <span className="text-xs font-black text-green-500">%{Math.round(dailySummary.progress)}</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {dailyTasks.length > 0 ? (
          dailyTasks.map(task => (
            <TaskItem 
              key={task.id}
              task={task}
              book={books.find(b => b.id === task.bookId)}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onStart={handleStartTask}
              deletingTaskId={deletingTaskId}
              setDeletingTaskId={setDeletingTaskId}
              onUpdateNote={updateTaskNote}
              onShowBook={(book) => setSelectedBookDetail(book)}
            />
          ))
        ) : (
          <div className="card p-20 text-center space-y-6">
            <div className="w-20 h-20 bg-secondary flex items-center justify-center rounded-full mx-auto">
              <CalendarIcon className="text-foreground/20" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Planlanmış Görev Yok</h3>
              <p className="text-foreground/40 max-w-xs mx-auto">
                Bu tarih için henüz bir program oluşturulmamış. AI Asistanın senin için bir rota çizebilir.
              </p>
            </div>
            <button 
              onClick={() => setShowConfig(true)}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20"
            >
              Yapay Zeka ile Planla
            </button>
          </div>
        )}
      </div>

      {/* Günlük Notlar (AI Bilgilendirme) */}
      <div className="card p-6 bg-orange-500/5 border-dashed border-2 border-orange-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Info size={20} />
          </div>
          <div>
            <h3 className="font-bold">Günün Özeti & AI Notu</h3>
            <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">Yapay Zekayı Bilgilendir</p>
          </div>
        </div>
        <textarea
          value={dailyNote}
          onChange={(e) => {
            const val = e.target.value;
            setDailyNote(val);
            storage.saveDailyNote(selectedDate, val);
          }}
          placeholder="Bugün program neden aksadı? Engeller neydi? (Örn: Hastaydım, gürültü vardı, odaklanamadım...)"
          className="w-full h-24 p-4 rounded-xl bg-card border border-border outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-sm transition-all"
        />
        <p className="mt-2 text-[10px] text-foreground/40 italic">
          * Bu notlar bir sonraki günün programı hazırlanırken AI asistanın tarafından dikkate alınacaktır.
        </p>
      </div>

      {/* AI Config Modal */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfig(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg card p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Program Ayarları</h2>
                  <p className="text-sm text-foreground/60">{selectedDate} için planlama yapılacaktır.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-accent/50 border border-border flex gap-3 text-sm italic text-foreground/80">
                  <Info className="shrink-0 text-primary" size={20} />
                  Yapay zeka; mevcut kitaplarını, deneme netlerini ve geçmiş çalışma hızını analiz ederek sana özel bir plan çıkaracaktır.
                </div>

                <div className="space-y-4 p-5 rounded-2xl bg-primary/5 border border-primary/20 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Hedeflenen Süre (Dakika)</label>
                    <span className="text-sm font-black text-white px-3 py-1 bg-primary rounded-lg shadow-lg shadow-primary/20">
                      {Math.floor(targetMinutes / 60)} sa {targetMinutes % 60} dk
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setTargetMinutes(prev => Math.max(30, prev - 30))}
                      className="w-10 h-10 rounded-xl bg-background border border-border hover:bg-secondary flex items-center justify-center font-bold transition-colors shadow-sm"
                    >
                      -30
                    </button>
                    <input 
                      type="range"
                      min="30"
                      max="1080"
                      step="15"
                      value={targetMinutes}
                      onChange={e => setTargetMinutes(parseInt(e.target.value))}
                      className="flex-1 accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                    <button 
                      onClick={() => setTargetMinutes(prev => Math.min(1080, prev + 30))}
                      className="w-10 h-10 rounded-xl bg-background border border-border hover:bg-secondary flex items-center justify-center font-bold transition-colors shadow-sm"
                    >
                      +30
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-foreground/40 px-1">
                    <span>30 dk</span>
                    <span>18 sa</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">Özel İstekler (Opsiyonel)</label>
                  </div>
                  <textarea 
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Örn: Sadece matematik odaklı olsun or Kamp modu: Matematik kitabını 5 günde bitir."
                    className="w-full h-32 p-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    disabled={isGenerating}
                    onClick={() => setShowConfig(false)}
                    className="flex-1 px-6 py-4 border border-border rounded-xl font-bold hover:bg-secondary transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button 
                    disabled={isGenerating}
                    onClick={() => generateAIProgram()}
                    className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isGenerating ? <RotateCcw className="animate-spin" size={20} /> : <Zap size={20} />}
                    {isGenerating ? 'Oluşturuluyor...' : 'Pogramı Oluştur'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Task Modal */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowManualModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg card p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Manuel Görev/Çalışma Ekle</h2>
                  <p className="text-sm text-foreground/60">{selectedDate} için yeni bir girdi.</p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="flex p-1 bg-secondary rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setManualType('book')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      manualType === 'book' ? "bg-card shadow-sm text-primary" : "text-foreground/40"
                    )}
                  >
                    <BookIcon size={14} /> Kütüphaneden
                  </button>
                  <button 
                    type="button"
                    onClick={() => setManualType('custom')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      manualType === 'custom' ? "bg-card shadow-sm text-primary" : "text-foreground/40"
                    )}
                  >
                    <Activity size={14} /> Serbest Çalışma
                  </button>
                </div>

                {manualType === 'book' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-center block">HIZLI KİTAP ARAMA</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
                        <input 
                          type="text"
                          placeholder="Kitap veya branş adı yazın..."
                          value={bookSearch}
                          onChange={e => setBookSearch(e.target.value)}
                          className="w-full pl-10 p-3 rounded-xl border border-border bg-secondary/30 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Kitap Seçin</label>
                      <select 
                        required
                        value={selectedBookId}
                        onChange={e => setSelectedBookId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-border bg-background"
                      >
                        <option value="" disabled>Kitap seçiniz...</option>
                        {books
                          .filter(b => 
                            !b.isCompleted && (
                              b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
                              b.branch.toLowerCase().includes(bookSearch.toLowerCase())
                            )
                          )
                          .map(b => <option key={b.id} value={b.id}>{b.title} ({b.branch})</option>)}
                      </select>
                    </div>
                    <div className={cn("grid gap-4", manualStatus === 'completed' ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Miktar</label>
                        <input 
                          type="number"
                          value={manualUnits || 0}
                          onChange={e => setManualUnits(parseInt(e.target.value) || 0)}
                          className="w-full p-3 rounded-xl border border-border bg-background"
                        />
                      </div>
                      {manualStatus === 'completed' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Süre (Dakika)</label>
                          <input 
                            type="number"
                            value={manualMinutes || 0}
                            onChange={e => setManualMinutes(parseInt(e.target.value) || 0)}
                            className="w-full p-3 rounded-xl border border-border bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Çalışma Başlığı</label>
                      <input 
                        required
                        value={manualTitle}
                        onChange={e => setManualTitle(e.target.value)}
                        placeholder="Örn: Paragraf Rutini, Fizik Tekrarı..."
                        className="w-full p-3 rounded-xl border border-border bg-background"
                      />
                    </div>
                    <div className={cn("grid gap-4", manualStatus === 'completed' ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Branş</label>
                        <select 
                          value={manualBranch}
                          onChange={e => setManualBranch(e.target.value as ExamBranch)}
                          className="w-full p-3 rounded-xl border border-border bg-background"
                        >
                          <optgroup label="TYT">
                            {BRANCHES.filter(b => b.startsWith('TYT')).map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </optgroup>
                          <optgroup label="AYT">
                            {BRANCHES.filter(b => b.startsWith('AYT')).map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </optgroup>
                          <optgroup label="DİĞER">
                            {BRANCHES.filter(b => !b.startsWith('TYT') && !b.startsWith('AYT')).map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      {manualStatus === 'completed' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Süre (Dakika)</label>
                          <input 
                            type="number"
                            value={manualMinutes || 0}
                            onChange={e => setManualMinutes(parseInt(e.target.value) || 0)}
                            className="w-full p-3 rounded-xl border border-border bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Zengin Açıklama / Not</label>
                    <textarea 
                      value={manualDescription}
                      onChange={e => setManualDescription(e.target.value)}
                      placeholder="Örn: Bu görevde şu konulara bakacağım..."
                      className="w-full h-20 p-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Durum</label>
                   <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setManualStatus('pending')}
                        className={cn(
                          "flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm",
                          manualStatus === 'pending' ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/40"
                        )}
                      >
                        Planla
                      </button>
                      <button 
                        type="button"
                        onClick={() => setManualStatus('completed')}
                        className={cn(
                          "flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm",
                          manualStatus === 'completed' ? "border-green-500 bg-green-500/10 text-green-500" : "border-border text-foreground/40"
                        )}
                      >
                        Tamamlandı Kaydet
                      </button>
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="flex-1 px-6 py-4 border border-border rounded-xl font-bold hover:bg-secondary transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20"
                  >
                    Ekle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Completion Modal */}
      <AnimatePresence>
        {showReviewModal && completingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md card p-8 shadow-2xl border-2 border-primary/20"
            >
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Harika İş!</h2>
                  <p className="text-sm text-foreground/60 italic">"{books.find(b => b.id === completingTask.bookId)?.title || completingTask.title}" görevini bitirdin.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 text-center block w-full">
                    NE KADARINI TAMAMLADIN? ({books.find(b => b.id === completingTask.bookId)?.unitType || 'birim'})
                  </label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        const newVal = Math.max(1, completedUnitsInput - 1);
                        setCompletedUnitsInput(newVal);
                        const book = books.find(b => b.id === completingTask.bookId);
                        if (book) setActualMinutesInput(Math.round(newVal * book.minutesPerUnit));
                      }}
                      className="w-12 h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold"
                    >
                      -1
                    </button>
                    <input 
                      type="number"
                      value={completedUnitsInput || 0}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setCompletedUnitsInput(val);
                        const book = books.find(b => b.id === completingTask.bookId);
                        if (book) setActualMinutesInput(Math.round(val * book.minutesPerUnit));
                      }}
                      className="flex-1 text-4xl font-black text-center bg-transparent outline-none text-primary"
                    />
                    <button 
                      onClick={() => {
                        const newVal = completedUnitsInput + 1;
                        setCompletedUnitsInput(newVal);
                        const book = books.find(b => b.id === completingTask.bookId);
                        if (book) setActualMinutesInput(Math.round(newVal * book.minutesPerUnit));
                      }}
                      className="w-12 h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold"
                    >
                      +1
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-foreground/40 font-bold">
                    Hedef: {completingTask.unitsToStudy} | Kalan: {Math.max(0, (completingTask.unitsToStudy || 0) - (completingTask.unitsCompleted || 0))}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 text-center block w-full">
                    BU ÇALIŞMA KAÇ DAKİKA SÜRDÜ?
                  </label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setActualMinutesInput(prev => Math.max(1, prev - 5))}
                      className="w-12 h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold"
                    >
                      -5
                    </button>
                    <input 
                      type="number"
                      value={actualMinutesInput || 0}
                      onChange={e => setActualMinutesInput(parseInt(e.target.value) || 0)}
                      className="flex-1 text-4xl font-black text-center bg-transparent outline-none text-primary"
                    />
                    <button 
                      onClick={() => setActualMinutesInput(prev => prev + 5)}
                      className="w-12 h-12 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center font-bold"
                    >
                      +5
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-foreground/40 font-bold">Tahminimiz {completingTask.estimatedMinutes} dakikaydı.</p>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-[10px] font-bold text-center leading-relaxed">
                  İpucu: Gerçek sürelerini girmek AI asistanının seni daha iyi tanımasını ve sana daha uygun programlar yapmasını sağlar.
                </div>

                <button 
                  onClick={confirmTaskCompletion}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] transition-all active:scale-95"
                >
                  Verileri Kaydet ve Bitir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Reasoning Modal */}
      <AnimatePresence>
        {showReasoningModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReasoningModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg card p-8 shadow-2xl border-t-4 border-orange-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Activity size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Mentör Stratejisi</h2>
                  <p className="text-sm text-foreground/60">Bu programı hazırlarken AI Mentörünün düşünceleri.</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-6 rounded-2xl bg-secondary/30 border border-border relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">Strateji Özeti</h4>
                  <p className="text-foreground/80 leading-relaxed font-medium italic">
                    "{aiReasoning?.reasoning}"
                  </p>
                </div>

                {aiReasoning?.thought && (
                  <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3">AI Derin Analizi (Düşünce Zinciri)</h4>
                    <p className="text-xs text-foreground/70 leading-relaxed font-mono whitespace-pre-wrap">
                      {aiReasoning.thought}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => setShowReasoningModal(false)}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Anladım, Teşekkürler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Book Detail Modal */}
      <AnimatePresence>
        {selectedBookDetail && (
          <BookDetailModal 
            book={selectedBookDetail} 
            onClose={() => setSelectedBookDetail(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
