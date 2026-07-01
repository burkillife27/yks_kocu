import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Target, 
  Zap,
  Calendar as CalendarIcon,
  Flag
} from 'lucide-react';
import { AppSettings, Book, Trial, Task, Camp } from '../types.ts';
import { cn, formatDuration } from '../lib/utils.ts';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BookDetailModal } from '../components/BookDetailModal.tsx';
// import { useAIMentor } from '../hooks/useAIMentor.ts';

export default function Dashboard({ books, trials, tasks, settings, camps, onRefresh, onViewAnalytics }: { 
  books: Book[], 
  trials: Trial[], 
  tasks: Task[], 
  settings: AppSettings,
  camps: Camp[],
  onRefresh: () => void,
  onViewAnalytics: () => void
}) {
  const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);

  // const { isAnalyzing, analyze } = useAIMentor(books, trials, tasks, settings, camps);

  const currentTasks = useMemo(() => tasks.filter(t => t.date === new Date().toISOString().split('T')[0]), [tasks]);
  const completedToday = useMemo(() => currentTasks.filter(t => t.status === 'completed').length, [currentTasks]);
  const totalTasksToday = useMemo(() => currentTasks.length, [currentTasks]);
  
  const totalSolvedBooks = useMemo(() => books.filter(b => b.isCompleted).length, [books]);

  const lastTrial = useMemo(() => trials[trials.length - 1], [trials]);

  // Weekly/Monthly Study Time Data
  const studyTimeData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const sessionTotal = tasks
        .filter(t => t.date === dateStr)
        .flatMap(t => t.sessions || [])
        .reduce((acc, s) => acc + s.minutesSpent, 0);
      
      const fallbackTotal = tasks
        .filter(t => t.date === dateStr && t.status === 'completed' && (!t.sessions || t.sessions.length === 0))
        .reduce((acc, t) => acc + (t.actualMinutes || 0), 0);

      data.push({
        date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        minutes: sessionTotal + fallbackTotal
      });
    }
    return data;
  }, [tasks]);

  // Daily Study Progress
  const dailyTargetMinutes = useMemo(() => settings.dailyStudyMinutes[new Date().getDay()] || 300, [settings.dailyStudyMinutes]);
  const completedMinutes = useMemo(() => currentTasks
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + (t.actualMinutes || t.estimatedMinutes), 0), [currentTasks]);
  const studyProgress = useMemo(() => Math.min(100, (completedMinutes / dailyTargetMinutes) * 100), [completedMinutes, dailyTargetMinutes]);

  // Proactive Motivation
  const motivationMessage = useMemo(() => {
    if (studyProgress >= 100) return "Muazzam! Bugünün hedefini tamamladın. Yarın için enerji topla.";
    if (studyProgress >= 70) return "Büyük bir kısmını hallettin, son bir gayretle günü zaferle kapatabilirsin!";
    if (totalTasksToday > 0 && completedToday === 0) return "Henüz başlamamış görünüyorsun. İlk adımı atmak en zoru, hemen bir görev seç!";
    return "Adım adım hedefe ilerliyorsun. İstikrar en büyük anahtarındır.";
  }, [studyProgress, completedToday, totalTasksToday]);

  // YKS Progress Calculation
  const targetDate = new Date(settings.yksDate);
  const startDate = settings.studyStartDate ? new Date(settings.studyStartDate) : new Date(2025, 8, 1);
  const today = new Date();
  const totalDays = Math.max(1, (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const timeProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Hoş Geldin! 👋</h2>
          <p className="text-foreground/60">Bugün çalışma hedeflerine odaklanma zamanı.</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/50 border border-border">
          <CalendarIcon className="text-primary" size={20} />
          <span className="font-bold">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</span>
        </div>
      </div>

      {/* Motivation Card */}
      <div className="space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-primary to-primary-focus text-primary-foreground shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center justify-between gap-6"
        >
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl">
                 🚀
              </div>
              <div>
                 <h4 className="text-xl font-bold">Günün Motivasyonu</h4>
                 <p className="opacity-90 font-medium italic">"{motivationMessage}"</p>
              </div>
           </div>
           <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Günün Hedefine %{Math.round(studyProgress)} Yakınsın</span>
              <div className="w-full md:w-48 h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${studyProgress}%` }}
                   className="h-full bg-white"
                 />
              </div>
           </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          icon={<Zap className="text-yellow-500" />} 
          label="Günlük İlerleme" 
          value={`%${totalTasksToday > 0 ? Math.round((completedToday/totalTasksToday)*100) : 0}`} 
          subtext={`${completedToday}/${totalTasksToday} Görev`} 
        />
        <StatCard 
          icon={<CheckCircle2 className="text-green-500" />} 
          label="Bitirilen Kitap" 
          value={totalSolvedBooks.toString()} 
          subtext={`${books.length} Toplam Kaynak`} 
        />
        <StatCard 
          icon={<Clock className="text-purple-500" />} 
          label="Kalan Çalışma Süresi" 
          value={formatDuration(books.filter(b => !b.isCompleted).reduce((acc, b) => acc + Math.max(0, b.totalUnits - b.completedUnits) * b.minutesPerUnit, 0))} 
          subtext="Eksik Kısımlar İçin" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Redirect Placeholder */}
        <div className="lg:col-span-2 space-y-8">
          {/* YKS Goal Card */}
          <div className="card p-8 bg-primary/5 border-primary/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <Flag size={120} />
             </div>
             <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">YKS Hedef Çizelgesi</h3>
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">Hedef: {new Date(settings.yksDate).toLocaleDateString()}</span>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between text-sm font-bold uppercase tracking-wider">
                      <span>Sınava Hazırlık Süreci</span>
                      <span>%{Math.round(timeProgress)}</span>
                   </div>
                   <div className="h-4 w-full bg-secondary rounded-full overflow-hidden border border-border">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${timeProgress}%` }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="h-full bg-primary"
                      />
                   </div>
                   <div className="flex justify-between text-xs font-medium text-foreground/40">
                      <span>{settings.studyStartDate ? formatShortDate(settings.studyStartDate) : '1 Eylül'} Başlangıç</span>
                      <span>{formatShortDate(settings.yksDate)} Hedefi</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Current Tasks */}
        <div className="card p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Bugünkü Görevler</h3>
            <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg">{currentTasks.length}</span>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {currentTasks.length === 0 ? (
              <div className="text-center py-20 text-foreground/40 italic text-sm flex flex-col items-center gap-4">
                 <Target size={40} className="opacity-20" />
                 Bugün için görev planlanmadı.
              </div>
            ) : (
              currentTasks.map(task => {
                const book = books.find(b => b.id === task.bookId);
                return (
                  <div 
                    key={task.id} 
                    onClick={() => book && setSelectedBookDetail(book)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border group hover:border-primary/50 transition-colors cursor-pointer",
                      task.status === 'completed' && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                      task.status === 'completed' ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                    )}>
                      {task.status === 'completed' ? <CheckCircle2 size={20} /> : <Target size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{book?.title || (task.title || 'Genel Görev')}</p>
                      <p className="text-[10px] text-foreground/40 font-mono">{task.estimatedMinutes} dk · {task.unitsToStudy || 0} {book?.unitType || 'birim'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {currentTasks.length > 0 && (
            <div className="pt-6 border-t border-border">
              <div className="flex justify-between text-xs font-bold mb-3 uppercase tracking-widest text-foreground/40">
                <span>Tamamlanan</span>
                <span className="text-primary">{Math.round((completedToday/totalTasksToday)*100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-red-500 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedToday/totalTasksToday)*100}%` }}
                  className="h-full bg-green-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

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

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) {
  return (
    <div className="card p-6 space-y-4 hover:translate-y-[-4px] transition-transform duration-300">
      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl shadow-inner border border-border/50">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.1em]">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[10px] font-medium text-foreground/40 italic">{subtext}</p>
      </div>
    </div>
  );
}
