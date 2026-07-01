import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  LayoutGrid,
  Calendar, 
  BookOpen, 
  BarChart3, 
  Settings as SettingsIcon, 
  Timer, 
  MessageSquare,
  Eye,
  X,
  Menu,
  Rocket,
  ShieldCheck,
  ClipboardCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from './lib/storage.ts';
import { Book, Trial, Task, AppSettings, AIWarning, UserRoutine, Camp } from './types.ts';
import { cn } from './lib/utils.ts';

// View Components
import Dashboard from './views/Dashboard.tsx';
import Program from './views/Program.tsx';
import Books from './views/Books.tsx';
import Trials from './views/Trials.tsx';
import Pomodoro from './views/Pomodoro.tsx';
import Chat from './views/Chat.tsx';
import Settings from './views/Settings.tsx';
import Camps from './views/Camps.tsx';
import Heatmap from './views/Heatmap.tsx';
import Analytics from './views/Analytics.tsx';
import AboutAI from './views/AboutAI.tsx';
import AIContext from './views/AIContext.tsx';

type View = 'dashboard' | 'program' | 'books' | 'trials' | 'pomodoro' | 'chat' | 'settings' | 'camps' | 'heatmap' | 'analytics' | 'about-ai' | 'ai-context';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [books, setBooks] = useState<Book[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [warnings, setWarnings] = useState<AIWarning[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsSidebarOpen(window.innerWidth >= 1024);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleAiError = (e: any) => {
      setNotification({ message: e.detail, type: 'error' });
      setTimeout(() => setNotification(null), 1500);
    };
    const handleSuccess = (e: any) => {
      setNotification({ message: e.detail, type: 'success' });
      setTimeout(() => setNotification(null), 1500);
    };
    window.addEventListener('ai-error', handleAiError);
    window.addEventListener('app-success', handleSuccess);
    return () => {
      window.removeEventListener('ai-error', handleAiError);
      window.removeEventListener('app-success', handleSuccess);
    };
  }, []);

  const applyTheme = useCallback((s: AppSettings) => {
    document.documentElement.setAttribute('data-theme', s.theme);
    const root = document.documentElement;
    if (s.theme === 'custom' && s.customThemeColors) {
      root.style.setProperty('--primary', s.customThemeColors.primary);
      root.style.setProperty('--background', s.customThemeColors.background);
      root.style.setProperty('--card', s.customThemeColors.card);
      root.style.setProperty('--foreground', s.customThemeColors.foreground);
      root.style.setProperty('--border', s.customThemeColors.border);
      root.style.setProperty('--secondary', s.customThemeColors.background === '#ffffff' ? '#f1f5f9' : '#1e293b');
      root.style.setProperty('--accent', s.customThemeColors.background === '#ffffff' ? '#eff6ff' : '#0f172a');
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--background');
      root.style.removeProperty('--card');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--border');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
    }
  }, []);

  const isSyncingRef = useRef(false);

  const refreshData = useCallback(async () => {
    const [b, t, taskList, r, s, w, cp] = await Promise.all([
      storage.getBooks(),
      storage.getTrials(),
      storage.getTasks(),
      storage.getRoutines(),
      storage.getSettings(),
      storage.getWarnings(),
      storage.getCamps()
    ]);
    setBooks(b);
    setTrials(t);
    setTasks(taskList);
    setRoutines(r);
    const updatedSettings = s || settings;
    if (updatedSettings) {
      setSettings(updatedSettings);
      applyTheme(updatedSettings);
    }
    setWarnings(w);
    setCamps(cp);
  }, [settings, applyTheme]);

  const performSync = useCallback(async (currentSettings?: AppSettings) => {
    const s = currentSettings || settings;
    if (!s || !s.multiDeviceModeEnabled || !s.enteredSyncPassword) {
      return;
    }
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const dbBooks = await storage.getBooks();
      const dbTrials = await storage.getTrials();
      const dbTasks = await storage.getTasks();
      const dbRoutines = await storage.getRoutines();
      const dbWarnings = await storage.getWarnings();
      const dbCamps = await storage.getCamps();
      const dbChatSessions = await storage.getChatSessions();
      const dbStudySessions = await storage.getStudySessions();
      const dbDailyNotes = await storage.getDailyNotes();
      const dbAiKnowledge = await storage.getAiKnowledge();
      const localLastAction = await storage.getLastAction();

      const syncPayload = {
        books: dbBooks,
        trials: dbTrials,
        tasks: dbTasks,
        settings: s,
        routines: dbRoutines,
        warnings: dbWarnings,
        camps: dbCamps,
        chatSessions: dbChatSessions,
        studySessions: dbStudySessions,
        dailyNotes: dbDailyNotes,
        aiKnowledge: dbAiKnowledge
      };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: s.enteredSyncPassword,
          lastActionTime: localLastAction,
          data: syncPayload
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'downloaded' && result.data) {
          const remote = result.data;
          
          storage.isSyncing = true;
          try {
            if (remote.books) await storage.saveBooks(remote.books);
            if (remote.trials) await storage.saveTrials(remote.trials);
            if (remote.tasks) await storage.saveTasks(remote.tasks);
            if (remote.routines) await storage.saveRoutines(remote.routines);
            if (remote.warnings) await storage.saveWarnings(remote.warnings);
            if (remote.camps) await storage.saveCamps(remote.camps);
            if (remote.chatSessions) await storage.saveChatSessions(remote.chatSessions);
            if (remote.studySessions) await storage.saveStudySessions(remote.studySessions);
            if (remote.dailyNotes) await storage.saveDailyNotes(remote.dailyNotes);
            if (remote.aiKnowledge) await storage.saveAiKnowledge(remote.aiKnowledge);

            if (remote.settings) {
              const currentGlobalSettings = await storage.getSettings();
              const merged = {
                ...remote.settings,
                multiDevicePassword: currentGlobalSettings.multiDevicePassword,
                enteredSyncPassword: currentGlobalSettings.enteredSyncPassword,
                multiDeviceModeEnabled: currentGlobalSettings.multiDeviceModeEnabled
              };
              await storage.saveSettings(merged);
            }
          } finally {
            storage.isSyncing = false;
          }

          const { set: idbSet } = await import('idb-keyval');
          await idbSet('yks_last_action_timestamp', result.lastActionTime);

          await refreshData();
          window.dispatchEvent(new CustomEvent('app-success', { detail: 'Veriler diğer cihazdan başarıyla aktarıldı!' }));
        }
      }
    } catch (err) {
      console.error('Data synchronization failed:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [settings, refreshData]);

  useEffect(() => {
    async function loadData() {
      const [b, t, taskList, r, s, w, cp] = await Promise.all([
        storage.getBooks(),
        storage.getTrials(),
        storage.getTasks(),
        storage.getRoutines(),
        storage.getSettings(),
        storage.getWarnings(),
        storage.getCamps()
      ]);
      setBooks(b);
      setTrials(t);
      setTasks(taskList);
      setRoutines(r);
      setSettings(s);
      setWarnings(w);
      setCamps(cp);
      setIsLoading(false);
      
      applyTheme(s);

      if (s.multiDeviceModeEnabled && s.enteredSyncPassword) {
        setTimeout(() => {
          performSync(s);
        }, 500);
      }
    }
    loadData();

    const handleViewChange = (e: any) => {
      setActiveView(e.detail);
    };
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, [applyTheme, performSync]);

  useEffect(() => {
    const handleYksAction = () => {
      if (settings?.multiDeviceModeEnabled && settings?.enteredSyncPassword) {
        performSync();
      }
    };
    window.addEventListener('yks-action-performed', handleYksAction);
    return () => {
      window.removeEventListener('yks-action-performed', handleYksAction);
    };
  }, [settings, performSync]);

  if (isLoading || !settings) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground">Yükleniyor...</div>;
  }

  const navItems = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'program', label: 'Program', icon: Calendar },
    { id: 'analytics', label: 'Grafikler', icon: BarChart3 },
    { id: 'heatmap', label: 'Isı Haritası', icon: LayoutGrid }, 
    { id: 'camps', label: 'Kamplar', icon: Rocket },
    { id: 'books', label: 'Kitaplarım', icon: BookOpen },
    { id: 'trials', label: 'Denemeler', icon: ClipboardCheck },
    { id: 'pomodoro', label: 'Sayaç', icon: Timer },
    { id: 'chat', label: 'AI Mentör', icon: MessageSquare },
    { id: 'ai-context', label: 'AI Veri Akışı', icon: Eye },
    { id: 'settings', label: 'Ayarlar', icon: SettingsIcon },
    { id: 'about-ai', label: 'YZ Hakkında', icon: ShieldCheck },
  ];

  const mobileTabs = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'program', label: 'Program', icon: Calendar },
    { id: 'chat', label: 'AI Mentör', icon: MessageSquare },
    { id: 'analytics', label: 'Grafikler', icon: BarChart3 },
    { id: 'more', label: 'Menü', icon: Menu }
  ];

  const isSecondaryActive = !['dashboard', 'program', 'chat', 'analytics'].includes(activeView);

  return (
    <div className="flex h-screen overflow-hidden bg-background pb-16 lg:pb-0">
      {/* Mobile Menu Close Toggle (Only shown when sidebar is open on mobile) */}
      {isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed top-4 right-4 z-[60] lg:hidden p-2.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 shadow-md active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
      )}

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-72 h-full border-r border-border bg-card flex flex-col z-50 fixed shadow-2xl lg:shadow-none"
          >
            <div className="p-6">
              <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <span className="min-w-[40px] px-2 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-mono text-sm shadow-lg shadow-primary/30">YKS</span>
                Mentor AI
              </h1>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id as View);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-sm font-bold relative overflow-hidden",
                    activeView === item.id 
                      ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" 
                      : "text-foreground/60 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <item.icon size={20} className={cn(
                    "transition-all duration-300 z-10",
                    activeView === item.id ? "scale-110 rotate-12" : "group-hover:scale-110 group-hover:rotate-6"
                  )} />
                  <span className="z-10">{item.label}</span>
                  {activeView === item.id && (
                    <motion.div 
                      layoutId="active-nav"
                      className="absolute left-0 w-1 h-6 bg-white rounded-full z-20"
                    />
                  )}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-border mb-16 lg:mb-0">
              <div className="p-4 rounded-xl bg-accent/50 border border-border">
                <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wider mb-1">Kalan Süre</p>
                <div className="text-base font-bold text-foreground">
                  {Math.ceil((new Date(settings.yksDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Gün
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 h-full overflow-y-auto relative p-4 lg:p-8 pt-6 lg:pt-8 pb-32 lg:pb-16 custom-scrollbar transition-all duration-300",
        isSidebarOpen && "lg:pl-80"
      )}>
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className={cn(
                "fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 backdrop-blur-md border",
                notification.type === 'error' ? "bg-red-500 text-white border-red-600" : "bg-emerald-500 text-white border-emerald-600"
              )}
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Info size={14} />
              </div>
              <span className="text-sm tracking-tight">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto h-full"
          >
            {activeView === 'dashboard' && <Dashboard books={books} trials={trials} tasks={tasks} settings={settings} camps={camps} onRefresh={refreshData} onViewAnalytics={() => setActiveView('analytics')} />}
            {activeView === 'program' && <Program books={books} tasks={tasks} settings={settings} routines={routines} camps={camps} onRefresh={refreshData} />}
            {activeView === 'heatmap' && <Heatmap tasks={tasks} settings={settings} />}
            {activeView === 'analytics' && <Analytics trials={trials} tasks={tasks} settings={settings} books={books} />}
            {activeView === 'camps' && <Camps books={books} camps={camps} onRefresh={refreshData} />}
            {activeView === 'books' && <Books books={books} tasks={tasks} settings={settings} onRefresh={refreshData} />}
            {activeView === 'trials' && <Trials trials={trials} settings={settings} onRefresh={refreshData} />}
            {activeView === 'pomodoro' && <Pomodoro tasks={tasks} settings={settings} onRefresh={refreshData} />}
            {activeView === 'chat' && <Chat books={books} trials={trials} tasks={tasks} settings={settings} camps={camps} onRefresh={refreshData} />}
            {activeView === 'settings' && <Settings settings={settings} routines={routines} books={books} onRefresh={refreshData} />}
            {activeView === 'about-ai' && <AboutAI />}
            {activeView === 'ai-context' && <AIContext />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar styled perfectly with negative space and shadows */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border/80 z-40 flex items-center justify-around px-2 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.2)] lg:hidden">
        {mobileTabs.map((item) => {
          const isActive = item.id === 'more' ? isSecondaryActive : activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  setIsSidebarOpen(!isSidebarOpen);
                } else {
                  setActiveView(item.id as View);
                  setIsSidebarOpen(false);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-bold transition-all relative",
                isActive ? "text-primary scale-105" : "text-foreground/50 hover:text-foreground"
              )}
            >
              <item.icon size={20} className={cn("mb-0.5 transition-all", isActive && "scale-110 text-primary")} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-mobile-tab"
                  className="absolute bottom-1 w-5 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
