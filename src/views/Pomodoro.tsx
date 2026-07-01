import { useState, useEffect, useRef } from 'react';
import { Task, AppSettings, ExamBranch } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer as Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Coffee, 
  Brain,
  CheckCircle2,
  Bell,
  Clock as StopwatchIcon,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  X,
  Save,
  Trophy,
  ChevronDown
} from 'lucide-react';
import { cn, formatDuration } from '../lib/utils.ts';
import { storage } from '../lib/storage.ts';

type Mode = 'focus' | 'short-break' | 'long-break';
type TimerType = 'pomodoro' | 'stopwatch';

const BRANCHES: ExamBranch[] = [
  "TYT Türkçe", "TYT Matematik", "TYT Fizik", "TYT Kimya", "TYT Biyoloji", "TYT Sosyal", "TYT Fen", "TYT GENEL",
  "AYT Matematik", "AYT Fizik", "AYT Kimya", "AYT Biyoloji", "AYT Fen", "AYT Edebiyat", "AYT Tarih-1", "AYT Coğrafya-1", "AYT Tarih-2", "AYT Coğrafya-2", "AYT Felsefe Grubu", "AYT Din Kültürü", "AYT GENEL",
  "Paragraf", "Problem", "Yabancı Dil (YDT)"
];

export default function Pomodoro({ tasks, settings, onRefresh }: { tasks: Task[], settings: AppSettings, onRefresh: () => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<ExamBranch | null>(null);
  const timerConfig = settings.pomodoro || {
    workTime: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartWork: false,
    soundEnabled: true
  };

  const [localWorkTime, setLocalWorkTime] = useState(timerConfig.workTime);
  const [localShortBreak, setLocalShortBreak] = useState(timerConfig.shortBreak);
  const [localLongBreak, setLocalLongBreak] = useState(timerConfig.longBreak);
  const [localInterval, setLocalInterval] = useState(timerConfig.longBreakInterval);
  const [localAutoBreaks, setLocalAutoBreaks] = useState(timerConfig.autoStartBreaks);
  const [localAutoWork, setLocalAutoWork] = useState(timerConfig.autoStartWork);
  const [localSound, setLocalSound] = useState(timerConfig.soundEnabled);

  const STORAGE_KEY = 'yks_timer_persistent_state';

  // State initialization with Persistence
  const [timerType, setTimerType] = useState<TimerType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).timerType : 'pomodoro';
  });

  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).mode : 'focus';
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.timerType === 'pomodoro') {
        if (data.isActive) {
          const elapsed = Math.floor((Date.now() - data.lastUpdated) / 1000);
          return Math.max(0, data.timeLeft - elapsed);
        }
        return data.timeLeft;
      }
    }
    return timerConfig.workTime * 60;
  });

  const [stopwatchTime, setStopwatchTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.timerType === 'stopwatch') {
        if (data.isActive) {
          const elapsed = Math.floor((Date.now() - data.lastUpdated) / 1000);
          return data.stopwatchTime + elapsed;
        }
        return data.stopwatchTime;
      }
    }
    return 0;
  });

  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).isActive : false;
  });

  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).sessionsCompleted : 0;
  });

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).sessionStartTime : null;
  });

  const [activeTask, setActiveTask] = useState<Task | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : null;
    if (data?.activeTaskId) {
      return tasks.find(t => t.id === data.activeTaskId) || null;
    }
    return null;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence Effect
  useEffect(() => {
    const state = {
      timerType,
      mode,
      timeLeft,
      stopwatchTime,
      isActive,
      sessionsCompleted,
      sessionStartTime,
      activeTaskId: activeTask?.id || null,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [timerType, mode, timeLeft, stopwatchTime, isActive, sessionsCompleted, activeTask]);

  const configs = {
    'focus': { label: 'Odaklanma', time: timerConfig.workTime * 60, icon: <Brain size={24} />, color: 'bg-primary' },
    'short-break': { label: 'Kısa Mola', time: timerConfig.shortBreak * 60, icon: <Coffee size={24} />, color: 'bg-green-500' },
    'long-break': { label: 'Uzun Mola', time: timerConfig.longBreak * 60, icon: <Coffee size={24} />, color: 'bg-blue-500' },
  };

  useEffect(() => {
    const handleStartTask = (e: any) => {
      setActiveTask(e.detail);
      setTimerType('pomodoro');
      setMode('focus');
      setTimeLeft(timerConfig.workTime * 60);
      setIsActive(true);
    };

    window.addEventListener('start-task', handleStartTask);
    return () => window.removeEventListener('start-task', handleStartTask);
  }, [timerConfig.workTime]);

  const saveTimerSettings = async () => {
    const updatedSettings: AppSettings = {
      ...settings,
      pomodoro: {
        workTime: localWorkTime,
        shortBreak: localShortBreak,
        longBreak: localLongBreak,
        longBreakInterval: localInterval,
        autoStartBreaks: localAutoBreaks,
        autoStartWork: localAutoWork,
        soundEnabled: localSound
      }
    };
    await storage.saveSettings(updatedSettings);
    onRefresh();
    setShowSettings(false);
  };

  // Audio for completion
  const playSound = () => {
    if (!timerConfig.soundEnabled) return;
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Ses çalınamadı", e);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (timerType === 'pomodoro') {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleComplete();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setStopwatchTime(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timerType]);

  const handleComplete = async () => {
    setIsActive(false);
    playSound();
    
    // Save session to history
    if (sessionStartTime) {
      const endTime = Date.now();
      const finalBranch = activeTask?.branch || selectedBranch;
      const session = {
        id: crypto.randomUUID(),
        taskId: activeTask?.id,
        taskTitle: activeTask?.title || (finalBranch ? `${finalBranch} Çalışması` : 'Genel Çalışma'),
        branch: finalBranch,
        startTime: sessionStartTime,
        endTime: endTime,
        type: timerType
      };
      await storage.addStudySession(session as any);

      // Update task total minutes and sessions
      if (activeTask) {
        const minutesSpent = Math.max(1, Math.round((endTime - sessionStartTime) / 60000));
        const updatedTasks = tasks.map(t => {
          if (t.id === activeTask.id) {
            const newSessions = [...(t.sessions || []), {
              completedUnits: 0, // we don't know this exactly from pomodoro yet
              minutesSpent,
              at: endTime
            }];
            return {
              ...t,
              actualMinutes: (t.actualMinutes || 0) + minutesSpent,
              sessions: newSessions
            };
          }
          return t;
        });
        await storage.saveTasks(updatedTasks);
        onRefresh();
      }

      setSessionStartTime(null);
    }
    
    if (timerType === 'pomodoro') {
      let nextMode: Mode = 'focus';
      if (mode === 'focus') {
        const newSessions = sessionsCompleted + 1;
        setSessionsCompleted(newSessions);
        if (newSessions % (timerConfig.longBreakInterval || 4) === 0) nextMode = 'long-break';
        else nextMode = 'short-break';
      } else {
        nextMode = 'focus';
      }
      
      setMode(nextMode);
      
      // Auto start logic
      if (mode === 'focus' && timerConfig.autoStartBreaks) {
        setIsActive(true);
      } else if (mode !== 'focus' && timerConfig.autoStartWork) {
        setIsActive(true);
      }

      if (Notification.permission === 'granted') {
        new Notification('YKS Mentor AI', { body: 'Süre bitti!' });
      }
    }
  };

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (timerType === 'pomodoro') {
      setTimeLeft(configs[mode].time);
    }
  }, [mode, timerType, settings.pomodoro]);

  const toggle = () => {
    if (!isActive && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
    setIsActive(!isActive);
  };
  const reset = () => {
    setIsActive(false);
    setSessionStartTime(null);
    if (timerType === 'pomodoro') {
      setTimeLeft(configs[mode].time);
    } else {
      setStopwatchTime(0);
    }
  };

  const displayTime = timerType === 'pomodoro' ? timeLeft : stopwatchTime;
  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col items-center justify-start space-y-12 pb-20 pt-8 relative">
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-6 relative"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <SettingsIcon className="text-primary" /> Süre Ayarları
                </h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-secondary rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Odaklanma (dk)</label>
                  <input type="number" value={localWorkTime} onChange={e => setLocalWorkTime(parseInt(e.target.value) || 0)} className="w-full p-3 rounded-xl border border-border bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Kısa Mola (dk)</label>
                  <input type="number" value={localShortBreak} onChange={e => setLocalShortBreak(parseInt(e.target.value) || 0)} className="w-full p-3 rounded-xl border border-border bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Uzun Mola (dk)</label>
                  <input type="number" value={localLongBreak} onChange={e => setLocalLongBreak(parseInt(e.target.value) || 0)} className="w-full p-3 rounded-xl border border-border bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Mola Aralığı</label>
                  <input type="number" value={localInterval} onChange={e => setLocalInterval(parseInt(e.target.value) || 1)} className="w-full p-3 rounded-xl border border-border bg-background" />
                  <p className="text-[9px] text-foreground/40 italic">Kaç seans sonra uzun mola olacağını belirle.</p>
                </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                    <span className="text-sm font-medium">Bitiş Sesi</span>
                    <button onClick={() => setLocalSound(!localSound)} className={cn("inline-flex h-5 w-10 items-center rounded-full transition-colors", localSound ? "bg-primary" : "bg-secondary")}>
                      <span className={cn("h-4 w-4 bg-white rounded-full transition-all", localSound ? "translate-x-5" : "translate-x-1")} />
                    </button>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                    <span className="text-sm font-medium">Molayı Otomatik Başlat</span>
                    <button onClick={() => setLocalAutoBreaks(!localAutoBreaks)} className={cn("inline-flex h-5 w-10 items-center rounded-full transition-colors", localAutoBreaks ? "bg-primary" : "bg-secondary")}>
                      <span className={cn("h-4 w-4 bg-white rounded-full transition-all", localAutoBreaks ? "translate-x-5" : "translate-x-1")} />
                    </button>
                 </div>
              </div>

              <button 
                onClick={saveTimerSettings}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <Save size={20} /> Ayarları Kaydet
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setShowSettings(true)}
        className="absolute top-8 right-8 p-3 bg-secondary/50 hover:bg-secondary rounded-2xl border border-border/50 text-foreground/60 transition-all active:scale-95"
        title="Ayarlar"
      >
        <SettingsIcon size={24} />
      </button>

      <div className="flex flex-col items-center gap-8">
        {/* Timer Type Switcher */}
        <div className="flex p-1.5 bg-secondary/50 rounded-2xl border border-border">
          <button
            onClick={() => { setTimerType('pomodoro'); setIsActive(false); }}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              timerType === 'pomodoro' ? "bg-card shadow-sm text-foreground ring-1 ring-border" : "text-foreground/40 hover:text-foreground/60"
            )}
          >
            <Clock size={16} /> Pomodoro
          </button>
          <button
            onClick={() => { setTimerType('stopwatch'); setIsActive(false); }}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              timerType === 'stopwatch' ? "bg-card shadow-sm text-foreground ring-1 ring-border" : "text-foreground/40 hover:text-foreground/60"
            )}
          >
            <StopwatchIcon size={16} /> Kronometre
          </button>
        </div>

        {timerType === 'pomodoro' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex p-1.5 bg-secondary/30 rounded-2xl border border-border/50"
          >
            {(Object.keys(configs) as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setIsActive(false); }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  mode === m ? "bg-card shadow-sm text-primary" : "text-foreground/40 hover:text-foreground/60"
                )}
              >
                {configs[m].label}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Main Timer Display */}
      <div className="relative group">
         <motion.div 
           className="w-80 h-80 rounded-full border-8 border-secondary flex items-center justify-center relative bg-card shadow-2xl"
           animate={{ scale: isActive ? [1, 1.02, 1] : 1 }}
           transition={{ repeat: Infinity, duration: 4 }}
         >
            <div className="text-center space-y-2">
                <div className="text-7xl font-mono font-black tracking-tighter text-foreground">
                  {hours > 0 ? String(hours).padStart(2, '0') + ':' : ''}
                  {String(displayMinutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 flex items-center justify-center gap-2">
                  {timerType === 'pomodoro' ? (
                    <>{configs[mode].icon} {configs[mode].label}</>
                  ) : (
                    <><StopwatchIcon size={24} /> Kronometre</>
                  )}
                </div>
            </div>
            
            {/* Round progress indicator */}
            <svg className="absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] -rotate-90 pointer-events-none">
              <circle
                cx="50%" cy="50%" r="48%"
                fill="transparent"
                stroke={timerType === 'pomodoro' ? "var(--primary)" : "var(--foreground)"}
                strokeWidth="8"
                strokeDasharray="301.5"
                strokeDashoffset={timerType === 'pomodoro' 
                  ? 301.5 * (1 - timeLeft / configs[mode].time)
                  : isActive ? 301.5 * (1 - (stopwatchTime % 60) / 60) : 0
                }
                className="transition-all duration-1000"
              />
            </svg>
         </motion.div>

         {/* Center Top Badge for Sessions */}
         {timerType === 'pomodoro' && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full"
           >
             <Trophy size={14} className="text-primary" />
             <span className="text-[10px] font-black uppercase tracking-tighter text-primary">
               Tamamlanan: {sessionsCompleted} Seans
             </span>
           </motion.div>
         )}
      </div>

      {/* Branch Selection */}
      {!activeTask && (
        <div className="relative">
          <button 
            onClick={() => setShowBranchSelector(!showBranchSelector)}
            className="flex items-center gap-3 px-6 py-3 bg-secondary/30 hover:bg-secondary/50 border border-border rounded-2xl transition-all"
          >
            <div className={cn(
              "w-3 h-3 rounded-full",
              selectedBranch ? "bg-primary" : "bg-foreground/20"
            )} />
            <span className="text-sm font-bold uppercase tracking-widest text-foreground/60">
              {selectedBranch || 'Ders Seçilmedi'}
            </span>
            <ChevronDown size={16} className={cn("transition-transform", showBranchSelector ? "rotate-180" : "")} />
          </button>

          <AnimatePresence>
            {showBranchSelector && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-card border border-border rounded-2xl shadow-2xl p-2 z-40 grid grid-cols-1 gap-1 max-h-64 overflow-y-auto"
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="px-3 text-[10px] font-black text-foreground/30 uppercase tracking-widest">Temel</p>
                    <button 
                      onClick={() => { setSelectedBranch(null); setShowBranchSelector(false); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-secondary/50 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Genel / Diğer
                    </button>
                    {BRANCHES.filter(b => !b.startsWith('TYT') && !b.startsWith('AYT')).map(branch => (
                      <button 
                        key={branch}
                        onClick={() => { setSelectedBranch(branch); setShowBranchSelector(false); }}
                        className={cn(
                          "w-full text-left p-3 rounded-xl hover:bg-secondary/50 text-xs font-bold uppercase tracking-widest transition-all",
                          selectedBranch === branch ? "bg-primary/10 text-primary" : ""
                        )}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>

                  {['TYT', 'AYT'].map(group => (
                    <div key={group} className="space-y-1">
                      <p className="px-3 text-[10px] font-black text-foreground/30 uppercase tracking-widest">{group}</p>
                      {BRANCHES.filter(b => b.startsWith(group)).map(branch => (
                        <button 
                          key={branch}
                          onClick={() => { setSelectedBranch(branch); setShowBranchSelector(false); }}
                          className={cn(
                            "w-full text-left p-2.5 rounded-xl hover:bg-secondary/50 text-[10px] font-bold uppercase tracking-widest transition-all",
                            selectedBranch === branch ? "bg-primary/10 text-primary" : ""
                          )}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeTask && (
        <div className="card p-4 w-full max-w-md flex items-center gap-4 bg-primary/5 border-primary/20">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Brain size={20} />
          </div>
          <div className="flex-1">
             <p className="text-[10px] font-bold uppercase text-primary tracking-widest">{activeTask.branch || 'Görev'}</p>
             <p className="font-bold text-sm">{activeTask.title}</p>
          </div>
          <button onClick={() => setActiveTask(null)} className="text-foreground/20 hover:text-foreground/60 p-2">
            <RotateCcw size={16} />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-8">
          <button onClick={reset} className="p-4 rounded-2xl bg-secondary text-foreground/60 hover:text-foreground transition-colors outline-none shrink-0" title="Sıfırla">
            <RotateCcw size={24} />
          </button>
          
          <button 
            onClick={toggle}
            className={cn(
              "w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl transition-all active:scale-95 outline-none",
              isActive ? "bg-red-500 text-white shadow-red-500/30" : "bg-primary text-white shadow-primary/30"
            )}
          >
            {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
          </button>

          {timerType === 'pomodoro' && (
            <button onClick={handleComplete} className="p-4 rounded-2xl bg-secondary text-foreground/60 hover:text-foreground transition-colors outline-none shrink-0" title="Atla">
              <SkipForward size={24} />
            </button>
          )}
        </div>

        {timerType === 'pomodoro' && (
          <div className="flex gap-4">
            {Array.from({ length: timerConfig.longBreakInterval || 4 }).map((_, i) => (
              <div key={i} className={cn(
                "w-3 h-3 rounded-full transition-all duration-500",
                (sessionsCompleted % (timerConfig.longBreakInterval || 4)) >= (i + 1) ? "bg-primary scale-125 shadow-lg shadow-primary/50" : "bg-secondary"
              )} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
