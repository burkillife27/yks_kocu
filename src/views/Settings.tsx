import { useState, useEffect } from 'react';
import { AppSettings, UserRoutine, ApiUsage, StudentField } from '../types.ts';
import { storage } from '../lib/storage.ts';
import { Save, Trash2, Download, Upload, Key, Palette, Calendar, Clock, Plus, Timer, Info, Activity, HelpCircle, X, Eye, EyeOff, RotateCcw, Zap, Database, Cpu } from 'lucide-react';
// Gemma model has been removed from local loading in favor of a fast browser TensorFlow.js neural network prediction simulator.
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils.ts';

const THEMES: Array<{id: any, name: string, colors: string[]}> = [
  { id: 'light', name: 'Açık', colors: ['#ffffff', '#3b82f6'] },
  { id: 'dark', name: 'Koyu', colors: ['#020617', '#3b82f6'] },
  { id: 'blue', name: 'Gök Mavi', colors: ['#f0f9ff', '#0284c7'] },
  { id: 'red', name: 'Mercan', colors: ['#000000', '#ef2020'] },
  { id: 'oled', name: 'OLED Siyah', colors: ['#000000', '#ffffff'] },
  { id: 'custom', name: 'Özel', colors: ['#f1f5f9', '#3b82f6'] },
];

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const TABS = [
  { id: 'general', name: 'Görünüm', icon: Palette },
  { id: 'ai', name: 'Yapay Zeka', icon: Zap },
  { id: 'academic', name: 'Akademik', icon: Calendar },
  { id: 'routines', name: 'Rutinler', icon: Timer },
  { id: 'personal', name: 'Kişisel', icon: Info },
  { id: 'multidevice', name: 'Çoklu Cihaz', icon: Cpu },
  { id: 'data', name: 'Veri', icon: Trash2 },
];

const modelDetailsMap: Record<string, {
  name: string,
  keyRequired: string,
  rateLimit: string,
  cost: string,
  description: string,
  type: string
}> = {
  'gemini-3.5-flash': {
    name: 'Gemini 3.5 Flash',
    keyRequired: 'Evet (Birincil veya Yedek Gemini API Anahtarı kullanılmalıdır)',
    rateLimit: '1.500 İstek / Gün (Dakikada maks 15)',
    cost: 'Ücretsiz Tier / Google AI Studio',
    description: 'En gelişmiş hızlı ve akıllı model. YKS program hazırlama ve her türlü analizde en iyi performansı gösterir.',
    type: 'gemini'
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash (Preview)',
    keyRequired: 'Evet (Birincil veya Yedek Gemini API Anahtarı kullanılmalıdır)',
    rateLimit: '1.500 İstek / Gün (Dakikada maks 15)',
    cost: 'Ücretsiz Tier / Google AI Studio',
    description: 'Hızlı, verimli ve yeni nesil önizleme sürümü.',
    type: 'gemini'
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    keyRequired: 'Evet (Birincil veya Yedek Gemini API Anahtarı kullanılmalıdır)',
    rateLimit: '1.500 İstek / Gün (Dakikada maks 15)',
    cost: 'Ücretsiz Tier / Google AI Studio',
    description: 'Ultra hızlı ve pratik çalışma sürelerine sahip, verimli çıkarım modeli.',
    type: 'gemini'
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    keyRequired: 'Evet (Birincil veya Yedek Gemini API Anahtarı kullanılmalıdır)',
    rateLimit: '1.500 İstek / Gün (Dakikada maks 15)',
    cost: 'Ücretsiz Tier / Google AI Studio',
    description: 'Popüler temel model, uzun bağlam pencerelerini destekler ve oldukça kararlıdır.',
    type: 'gemini'
  },
  'gemini-3-pro-preview': {
    name: 'Gemini 3 Pro',
    keyRequired: 'Evet (Gemini API Anahtarı - Pro kotalı/ücretli hesap önerilir)',
    rateLimit: '50 İstek / Gün (Dakikada maks 2)',
    cost: 'Ücretli Tier / Pro Kota',
    description: 'Üst düzey mantık, derinlemesine analiz, planlama ve kodlama senaryoları için uygundur.',
    type: 'gemini-pro'
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro',
    keyRequired: 'Evet (Gemini API Anahtarı - Pro kotalı/ücretli hesap önerilir)',
    rateLimit: '50 İstek / Gün (Dakikada maks 2)',
    cost: 'Ücretli Tier / Pro Kota',
    description: 'Gelecek nesil en güçlü akıl yürütme modeli, karmaşık YKS verilerini derinlemesine inceler.',
    type: 'gemini-pro'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    keyRequired: 'Evet (Gemini API Anahtarı - Pro kotalı/ücretli hesap)',
    rateLimit: '50 İstek / Gün (Dakikada maks 2)',
    cost: 'Ücretli Tier / Pro Kota',
    description: 'Kararlı derin analiz, planlama ve yüksek performanslı Pro modeli.',
    type: 'gemini-pro'
  },
  'deepseek-chat': {
    name: 'DeepSeek-V3',
    keyRequired: 'Evet (DeepSeek API Anahtarı - Yedek Anahtar 3 alanına girilir)',
    rateLimit: 'Sınırsız (DeepSeek Bakiye limitinize bağlıdır)',
    cost: 'Kullandıkça Öde (Bakiye Bazlı)',
    description: 'Yedek Anahtar 3 alanına girdiğiniz DeepSeek API anahtarı ile çalışan, son derece bütçe dostu, hızıyla öne çıkan alternatif model.',
    type: 'deepseek'
  },
  'deepseek-reasoner': {
    name: 'DeepSeek-R1 (Reasoner)',
    keyRequired: 'Evet (DeepSeek API Anahtarı - Yedek Anahtar 3 alanına girilir)',
    rateLimit: 'Sınırsız (DeepSeek Bakiye limitinize bağlıdır)',
    cost: 'Kullandıkça Öde (Düşünme Bakiye Bazlı)',
    description: 'Derin düşünme (reasoning) yetenekleriyle donatılmış, zincirleme mantık kuran son seviye akıl yürütücü model.',
    type: 'deepseek'
  },
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash (Experimental)',
    keyRequired: 'Evet (Birincil veya Yedek Gemini API Anahtarı kullanılmalıdır)',
    rateLimit: '1.500 İstek / Gün (Dakikada maks 15)',
    cost: 'Ücretsiz Tier (Deneysel)',
    description: 'Hızlı ve deneysel model denemeleri için geliştirilmiş sürüm.',
    type: 'gemini'
  }
};

export default function Settings({ settings, routines, books, onRefresh }: { settings: AppSettings, routines: UserRoutine[], books: any[], onRefresh: () => void }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [apiKey2, setApiKey2] = useState(settings.apiKey2 || '');
  const [apiKey3, setApiKey3] = useState(settings.apiKey3 || '');
  const [aiModel, setAiModel] = useState(settings.aiModel || 'gemini-3-flash-preview');
  const [aiCoreMode, setAiCoreMode] = useState(() => {
    return (settings.aiCoreMode === 'local') ? 'ask' : (settings.aiCoreMode || 'ask');
  });
  const [aiInstructions, setAiInstructions] = useState(settings.aiInstructions || '');
  const [personalBio, setPersonalBio] = useState(settings.personalBio || '');
  const [adaptiveStudyPlan, setAdaptiveStudyPlan] = useState(settings.adaptiveStudyPlan || {
    isEnabled: false,
    maxDailyHours: 12,
    weeklyIncrementMinutes: 15,
    daysToApply: [1, 2, 3, 4, 5],
    startDate: new Date().toISOString().split('T')[0]
  });
  const [targetNets, setTargetNets] = useState(settings.targetNets || { tyt: 0, ayt: 0 });
  const [yksDate, setYksDate] = useState(settings.yksDate);
  const [studyStartDate, setStudyStartDate] = useState(settings.studyStartDate || '');
  const [dailyMinutes, setDailyMinutes] = useState(settings.dailyStudyMinutes);
  const [maxDailyBooks, setMaxDailyBooks] = useState(settings.maxDailyBooks || 3);
  const [studentField, setStudentField] = useState<StudentField>(settings.studentField || 'Sayısal');
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [multiDeviceModeEnabled, setMultiDeviceModeEnabled] = useState(settings.multiDeviceModeEnabled || false);
  const [enteredSyncPassword, setEnteredSyncPassword] = useState(settings.enteredSyncPassword || '');
  const [lastActionTime, setLastActionTime] = useState<number | null>(null);
  const [deviceLastActionTime, setDeviceLastActionTime] = useState<number | null>(null);

  useEffect(() => {
    storage.getLastAction().then(setLastActionTime);
    storage.getDeviceLastAction().then(setDeviceLastActionTime);
  }, []);

  // Gemma parameters are removed. Local intelligence is now driven synchronously via a local backpropagation neural network powered by TensorFlow.js

  const [customThemeColors, setCustomThemeColors] = useState(settings.customThemeColors || {
    primary: '#3b82f6',
    background: '#ffffff',
    card: '#ffffff',
    foreground: '#0f172a',
    border: '#e2e8f0'
  });

  useEffect(() => {
    storage.getUsage().then(setUsage);
  }, []);

  // Routine Form
  const [newRoutineDays, setNewRoutineDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newRoutineTime, setNewRoutineTime] = useState('08:00');
  const [newRoutineDuration, setNewRoutineDuration] = useState(60);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineDescription, setNewRoutineDescription] = useState('');
  const [selectedRoutineBookIds, setSelectedRoutineBookIds] = useState<string[]>([]);

  const addRoutine = async () => {
    if (!newRoutineTitle || newRoutineDays.length === 0) return;
    const newRoutine: UserRoutine = {
      id: crypto.randomUUID(),
      days: [...newRoutineDays],
      startTime: newRoutineTime,
      durationMinutes: newRoutineDuration,
      title: newRoutineTitle,
      description: newRoutineDescription,
      selectedBookIds: selectedRoutineBookIds
    };
    await storage.saveRoutines([...routines, newRoutine]);
    setNewRoutineTitle('');
    setNewRoutineDescription('');
    setSelectedRoutineBookIds([]);
    onRefresh();
  };

  const deleteRoutine = async (index: number) => {
    const updated = routines.filter((_, i) => i !== index);
    await storage.saveRoutines(updated);
    onRefresh();
  };

  const handleSave = async () => {
    const updated = { 
      ...settings, 
      apiKey, 
      apiKey2, 
      apiKey3, 
      aiModel, 
      aiCoreMode, 
      aiInstructions, 
      personalBio, 
      adaptiveStudyPlan, 
      yksDate, 
      studyStartDate, 
      dailyStudyMinutes: dailyMinutes, 
      maxDailyBooks, 
      targetNets, 
      customThemeColors, 
      studentField,
      multiDeviceModeEnabled,
      enteredSyncPassword
    };
    await storage.saveSettings(updated);
    if (settings.theme === 'custom') {
      applyThemeProperties(customThemeColors);
    }
    onRefresh();
    // Dispatch instant sync if enabled
    if (multiDeviceModeEnabled && enteredSyncPassword) {
      window.dispatchEvent(new CustomEvent('yks-action-performed'));
    }
    window.dispatchEvent(new CustomEvent('app-success', { detail: 'Ayarlar kaydedildi.' }));
  };

  const applyThemeProperties = (colors: any) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--border', colors.border);
    // Derived colors
    root.style.setProperty('--secondary', colors.background === '#ffffff' ? '#f1f5f9' : '#1e293b');
    root.style.setProperty('--accent', colors.background === '#ffffff' ? '#eff6ff' : '#0f172a');
  };

  const handleThemeChange = async (theme: any) => {
    const updated = { ...settings, theme };
    await storage.saveSettings(updated);
    
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'custom') {
      applyThemeProperties(customThemeColors);
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--background');
      root.style.removeProperty('--card');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--border');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
    }
    onRefresh();
  };

  const exportData = async () => {
    const data = {
      books: await storage.getBooks(),
      trials: await storage.getTrials(),
      tasks: await storage.getTasks(),
      settings: await storage.getSettings(),
      routines: await storage.getRoutines(),
      warnings: await storage.getWarnings(),
      camps: await storage.getCamps(),
      chatSessions: await storage.getChatSessions(),
      studySessions: await storage.getStudySessions(),
      aiContext: await storage.getAiContext(),
      dailyNotes: await storage.getDailyNotes(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yks_mentor_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.books) await storage.saveBooks(data.books);
        if (data.trials) await storage.saveTrials(data.trials);
        if (data.tasks) await storage.saveTasks(data.tasks);
        if (data.settings) await storage.saveSettings(data.settings);
        if (data.routines) await storage.saveRoutines(data.routines);
        if (data.warnings) await storage.saveWarnings(data.warnings);
        if (data.camps) await storage.saveCamps(data.camps);
        if (data.chatSessions) await storage.saveChatSessions(data.chatSessions);
        if (data.studySessions) await storage.saveStudySessions(data.studySessions);
        if (data.aiContext) await storage.saveAiContext(data.aiContext);
        if (data.dailyNotes) await storage.saveDailyNotes(data.dailyNotes);
        
        onRefresh();
        window.dispatchEvent(new CustomEvent('app-success', { detail: 'Veriler başarıyla içe aktarıldı.' }));
      } catch (err) {
        window.dispatchEvent(new CustomEvent('ai-error', { detail: 'Geçersiz dosya formatı.' }));
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (confirm('TÜM VERİLERİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? Bu işlem geri alınamaz.')) {
      localStorage.clear();
      // indexedDB side:
      await storage.saveBooks([]);
      await storage.saveTrials([]);
      await storage.saveTasks([]);
      onRefresh();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-10">
      <header>
        <h2 className="text-3xl font-bold">Ayarlar</h2>
        <p className="text-foreground/60">Uygulama deneyimini özelleştirmek için bu bölümü kullanabilirsin.</p>
      </header>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-none sticky top-16 bg-background/80 backdrop-blur-md z-40 py-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-border/50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                : "bg-secondary text-foreground/40 hover:text-foreground/60"
            )}
          >
            <tab.icon size={18} />
            {tab.name}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showModelInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-8 space-y-6 relative"
            >
              <button 
                onClick={() => setShowModelInfo(false)}
                className="absolute top-6 right-6 p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="text-primary" /> Model Detayları
                </h3>
                <p className="text-sm text-foreground/60">İhtiyacına uygun modeli seçerek en iyi verimi alabilirsin.</p>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">Gemini 1.5 Flash</span>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded uppercase">Tavsiye Edilen (Hızlı & Güncel)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    En güncel stabil sürüm. Çok hızlı yanıt süresi ve yüksek kapasite ile günlük planlamalar için idealdir.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Gemini 3 Pro</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded uppercase">Gelişmiş Zeka</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Karmaşık mantık yürütme, derinlemesine strateji ve detaylı akademik analizler için en üst düzey tercihtir.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Yeni Nesil Flash Modelleri</span>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase">Hızlı & Zeki</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Gemini 2.0/2.5 Flash gibi yeni nesil mimariler, ultra düşük gecikme ve gelişmiş mantık yürütme yetenekleri sunar.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">DeepSeek Modelleri</span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded uppercase">Rakiplerinden Üstün</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    DeepSeek-V3 ve DeepSeek-R1 (Reasoner) modelleri, özellikle matematik ve mantık yürütme görevlerinde yüksek performans sergiler. Bu modeller için DeepSeek API anahtarı gereklidir.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-600/80 leading-normal italic">
                  Not: Modellerin kullanımı kendi kotalarınıza ve API sağlayıcınızın (Google veya DeepSeek) kullanım şartlarına bağlıdır. Ücretsiz kotalar dâhilinde kalmaya özen gösterin.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'general' && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 space-y-6"
        >
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Palette className="text-primary" size={24} /> Görünüm & Tema
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                  settings.theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"
                )}
              >
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: t.id === 'custom' ? customThemeColors.background : t.colors[0] }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.id === 'custom' ? customThemeColors.primary : t.colors[1] }} />
                </div>
                <span className="text-xs font-bold">{t.name}</span>
              </button>
            ))}
          </div>

          {settings.theme === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 border border-border rounded-2xl bg-background/50 space-y-6"
            >
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground/40">Tema Özelleştir</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block">Ana Renk (Primary)</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={customThemeColors.primary}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, primary: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-border"
                    />
                    <input 
                      type="text" 
                      value={customThemeColors.primary}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, primary: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block">Arka Plan (Background)</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={customThemeColors.background}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, background: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-border"
                    />
                    <input 
                      type="text" 
                      value={customThemeColors.background}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, background: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block">Yazı Rengi (Foreground)</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={customThemeColors.foreground}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, foreground: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-border"
                    />
                    <input 
                      type="text" 
                      value={customThemeColors.foreground}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, foreground: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block">Kart Rengi (Card)</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={customThemeColors.card}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, card: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-border"
                    />
                    <input 
                      type="text" 
                      value={customThemeColors.card}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, card: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block">Kenarlık Rengi (Border)</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={customThemeColors.border}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, border: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-border"
                    />
                    <input 
                      type="text" 
                      value={customThemeColors.border}
                      onChange={e => setCustomThemeColors({ ...customThemeColors, border: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={handleSave}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold transition-all hover:bg-primary/90"
              >
                Renkleri Kaydet ve Uygula
              </button>
            </motion.div>
          )}
        </motion.section>
      )}

      {activeTab === 'ai' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          <section className="card p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Key className="text-primary" size={24} /> Yapay Zeka (Kendi Modelin)
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-foreground/60">
                Yapay zekanın nasıl çalışacağını seç.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'ask', name: 'Her Zaman Sor', icon: <HelpCircle size={16} />, activeClass: "border-amber-500 bg-amber-500/10 text-amber-600 shadow-amber-500/20" },
                  { id: 'cloud', name: 'Cloud (Gemini)', icon: <Activity size={16} />, activeClass: "border-sky-500 bg-sky-500/10 text-sky-600 shadow-sky-500/20" },
                  { id: 'gemma', name: 'Gemma 2 (Google)', icon: <Cpu size={16} />, activeClass: "border-indigo-500 bg-indigo-500/10 text-indigo-600 shadow-indigo-500/20" },
                ].map((mode) => (
                  <motion.button
                    key={mode.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAiCoreMode(mode.id as any)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden group cursor-pointer",
                      aiCoreMode === mode.id 
                        ? `${mode.activeClass} shadow-lg ring-1 ring-inset ring-white/20` 
                        : "border-border hover:border-foreground/10 bg-secondary/20 text-foreground/40"
                    )}
                  >
                    {aiCoreMode === mode.id && (
                      <motion.div 
                        layoutId="active-ai-bg"
                        className="absolute inset-0 bg-white/5 dark:bg-white/10"
                      />
                    )}
                    <div className="z-10 flex flex-col items-center gap-2">
                       {mode.icon}
                      <span className="text-[11px] font-black uppercase tracking-tight">{mode.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {aiCoreMode === 'gemma' ? (
                <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                    <Cpu size={18} />
                    <span>Gemma 2 (9B-IT) Akıllı Açık Kaynak Alternatifi</span>
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed">
                    Google'ın son derece güçlü ve optimize edilmiş açık kaynaklı <strong>Gemma 2 9B Instruction-Tuned (gemma-2-9b-it)</strong> modelini kullanır. YKS koçluğu verilerine ve PDR kısıtlamalarına mükemmel uyum sağlar.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-xs space-y-1">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px]">API Key Gereksinimi</div>
                      <div className="text-foreground/80 font-medium">
                        <strong>Evet, Gemini API Key gereklidir.</strong> Gemma 2 modeli, sunucu tarafında Google AI Studio altyapısı üzerinden çalıştırılmaktadır. Ayrı bir anahtara gerek yoktur, aşağıdaki varsayılan Gemini API anahtarınızı kullanır.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-xs space-y-1">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px]">Günlük İstek Limitleri (Free Tier)</div>
                      <div className="text-foreground/80 leading-relaxed">
                        • <strong>Dakika Başına (RPM):</strong> 15 İstek<br />
                        • <strong>Günlük Kotalar (RPD):</strong> 1.500 İstek
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/60">
                  Program oluşturma ve mentörlük özellikleri için Google AI Studio'dan alacağın API Key'i buraya girmelisin. 
                  Hangi modeli kullanmak istediğini de seçebilirsin (Flash modelleri daha hızlı ve ücretsiz kotalıdır).
                </p>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-primary">Birincil API Key (Varsayılan)</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? "text" : "password"}
                      placeholder={aiModel.startsWith('deepseek') ? "DeepSeek API Key..." : "Gemini API Key..."}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-foreground/40 hover:text-primary transition-colors focus:outline-none"
                      title={showApiKey ? "Gizle" : "Göster"}
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Yedek API Key 1</label>
                    <input 
                      type={showApiKey ? "text" : "password"}
                      placeholder="Yedek anahtar 1..."
                      value={apiKey2}
                      onChange={e => setApiKey2(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Yedek API Key 2</label>
                    <input 
                      type={showApiKey ? "text" : "password"}
                      placeholder="Yedek anahtar 2..."
                      value={apiKey3}
                      onChange={e => setApiKey3(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Yapay Zeka Modeli</label>
                    <button 
                      onClick={() => setShowModelInfo(true)}
                      className="text-primary hover:text-primary/70 transition-colors"
                      title="Modeller hakkında bilgi al"
                    >
                      <HelpCircle size={14} />
                    </button>
                  </div>
                  <select 
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary h-[46px]"
                  >
                    <optgroup label="Süper Hızlı Modeller">
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (En Yeni & En Gelişmiş Hızlı Model - Tavsiye Edilen)</option>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Yeni ve Hızlı)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Hızlı & Gelişmiş Mantık)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Stabil & Hızlı)</option>
                    </optgroup>
                    <optgroup label="Stratejik & Zeki Modeller">
                      <option value="gemini-3-pro-preview">Gemini 3 Pro (Yüksek Zekâ & Stratejik Analiz)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Gelecek Nesil Zeka)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Derin Analiz)</option>
                    </optgroup>
                    <optgroup label="DeepSeek (Alternatif)">
                      <option value="deepseek-chat">DeepSeek-V3 (Düşük Maliyet & Yüksek Performans)</option>
                      <option value="deepseek-reasoner">DeepSeek-R1 (Derin Düşünme & Mantık)</option>
                    </optgroup>
                    <optgroup label="Deneysel">
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Hızlı & Deneysel)</option>
                    </optgroup>
                  </select>

                  {/* Dinamik Model Detay Bilgi Kartı */}
                  {modelDetailsMap[aiModel] && (
                    <motion.div
                      key={aiModel}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-xl border text-xs mt-3 space-y-2",
                        modelDetailsMap[aiModel].type === 'gemini' 
                          ? "bg-sky-500/5 border-sky-500/20 text-foreground"
                          : modelDetailsMap[aiModel].type === 'gemini-pro'
                          ? "bg-amber-500/5 border-amber-500/20 text-foreground"
                          : "bg-teal-500/5 border-teal-500/20 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Zap size={14} className={cn(
                          modelDetailsMap[aiModel].type === 'gemini' ? "text-sky-500" : modelDetailsMap[aiModel].type === 'gemini-pro' ? "text-amber-500" : "text-teal-500"
                        )} />
                        <span>{modelDetailsMap[aiModel].name} Teknik Detayları</span>
                      </div>
                      
                      <p className="text-[11px] text-foreground/70 leading-relaxed font-medium">
                        {modelDetailsMap[aiModel].description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2.5 rounded-lg bg-background/60 border border-border/60">
                          <div className="text-[9px] font-black text-foreground/45 uppercase tracking-widest leading-none mb-1">API Anahtarı Durumu</div>
                          <div className="font-semibold text-foreground/85 leading-snug">{modelDetailsMap[aiModel].keyRequired}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background/60 border border-border/60">
                          <div className="text-[9px] font-black text-foreground/45 uppercase tracking-widest leading-none mb-1">Günlük İstek Sınırı</div>
                          <div className="font-semibold text-foreground/85 leading-snug">{modelDetailsMap[aiModel].rateLimit}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-foreground/45 font-semibold pt-1 border-t border-border/30">
                        Sınıflandırma ve Maliyet: <span className="font-bold text-foreground/75">{modelDetailsMap[aiModel].cost}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-primary">Yapay Zeka Kişiliği & Özel Talimatlar</label>
                  <div className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-black text-primary uppercase tracking-tighter">İleri Düzey</div>
                </div>
                <textarea 
                  value={aiInstructions}
                  onChange={e => setAiInstructions(e.target.value)}
                  placeholder="Örn: Sert bir üslup kullan, hatalarımı yüzüme vur, beni sürekli daha fazlasına zorla..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary min-h-[140px] text-sm leading-relaxed"
                />
                <p className="text-[10px] text-foreground/40 font-medium leading-relaxed italic">
                  Bu talimatlar yapay zekanın "sesini" ve "tavrını" belirler. Program hazırlarken veya chatte konuşurken bu direktiflere sadık kalır.
                </p>
              </div>

              <button 
                onClick={handleSave}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </section>

          {settings.apiKey && (
            <section className="card p-8 space-y-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <Activity size={24} /> API Kullanım Kotası
                </h3>
                <div className="px-3 py-1 bg-primary/10 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
                  Ücretsiz Tier
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Günlük İstek (Tahmini Limit: 1500)</span>
                      <span>{usage?.requestsToday || 0} / 1500</span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((usage?.requestsToday || 0) / 1500) * 100)}%` }}
                        className={cn(
                          "h-full transition-all",
                          (usage?.requestsToday || 0) > 1200 ? "bg-red-500" : (usage?.requestsToday || 0) > 800 ? "bg-amber-500" : "bg-primary"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
                    <Info size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium leading-relaxed">
                        Gemini 1.5 Flash (Free Tier) dakikada 15 istek sınırı uygular.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-card border border-border rounded-xl space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Aktif Model</h4>
                    <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-mono uppercase font-bold shadow-sm inline-block">
                      {settings.aiModel || 'gemini-1.5-flash'}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Local Browser Artificial Neural Network Info (TensorFlow.js) */}
          <section className="card p-8 space-y-6 border-sky-500/20 bg-sky-500/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-sky-700 dark:text-sky-400">
                    <Database size={24} /> Yapay Sinir Ağı Tahmin Motoru (TensorFlow.js)
                  </h3>
                  <span className="px-2 py-0.5 bg-sky-500 text-white text-[9px] font-black rounded uppercase tracking-wider">Aktif (Yerel)</span>
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  Lokal makine öğrenimi modeli, ders çalışma saatinizi, çözdüğünüz soru sayısını ve mevcut deneme netlerinizi 3 katmanlı (Giriş: 3, Gizli 1: 12, Gizli 2: 6, Çıkış: 1) bir Yapay Sinir Ağı (Neural Network) üzerinden eğiterek gelişim analizi yapar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Model Mimarisi ve Parametreleri</h4>
                  <ul className="space-y-2 text-xs text-foreground/70">
                    <li className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="font-medium text-foreground/50">Kütüphane Sürümü:</span>
                      <span className="font-mono font-bold text-sky-600">TensorFlow.js Ready</span>
                    </li>
                    <li className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="font-medium text-foreground/50">Öğrenme Hızı (Learning Rate):</span>
                      <span className="font-mono font-bold">0.015 (Adam Optimizer)</span>
                    </li>
                    <li className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="font-medium text-foreground/50">Eğitim Devri (Epochs):</span>
                      <span className="font-mono font-bold">200 Devir (Hızlı Optimizasyon)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="font-medium text-foreground/50">Donanım Hızlandırma:</span>
                      <span className="font-bold text-emerald-600">WebGL / WebGPU (Otomatik)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-3 bg-card p-6 border border-border rounded-2xl">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-sky-500/10 text-sky-600 rounded-full">
                    <Cpu size={32} />
                  </div>
                  <h5 className="font-bold text-sm text-foreground">Yerel TensorFlow Motoru Hazır!</h5>
                  <p className="text-xs text-foreground/50 leading-relaxed">
                    Tamamen cihazınızda çalışan yapay sinir ağı tahmin modülünü "Grafikler" sekmesinde yer alan "Yapay Sinir Ağı ile Sürüş Analizi" panelinden deneyimleyebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      )}



      {activeTab === 'routines' && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 space-y-6"
        >
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Clock className="text-primary" size={24} /> Kişisel Rutinler
          </h3>
          <p className="text-sm text-foreground/60">Günlük sabit rutinlerini (dershane, spor, uyku vb.) ekleyerek AI'ın daha gerçekçi plan yapmasını sağla.</p>
          
          <div className="space-y-6 p-6 bg-secondary/20 rounded-3xl border border-border/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Rutin Adı</label>
                  <input 
                    type="text"
                    placeholder="Örn: Dershane, Basketbol Antrenmanı"
                    value={newRoutineTitle}
                    onChange={e => setNewRoutineTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Yapay Zeka İçin Açıklama</label>
                  <textarea 
                    placeholder="Örn: Bu sürede sadece soru çözebilirim, konu anlatımı istemiyorum."
                    value={newRoutineDescription}
                    onChange={e => setNewRoutineDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary h-20 resize-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Başlangıç Saati</label>
                     <input 
                       type="time"
                       value={newRoutineTime}
                       onChange={e => setNewRoutineTime(e.target.value)}
                       className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Süre (Dakika)</label>
                     <input 
                       type="number"
                       value={newRoutineDuration}
                       onChange={e => setNewRoutineDuration(parseInt(e.target.value) || 0)}
                       className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                     />
                   </div>
                 </div>
                 <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-center block mb-2">Uygulanacak Günler</label>
                  <div className="flex justify-between gap-1">
                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((day, i) => {
                      const dayIdx = i === 6 ? 0 : i + 1;
                      const isActive = newRoutineDays.includes(dayIdx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const newDays = isActive 
                              ? newRoutineDays.filter(d => d !== dayIdx)
                              : [...newRoutineDays, dayIdx];
                            setNewRoutineDays(newDays);
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] font-black border transition-all duration-200 cursor-pointer select-none",
                            isActive 
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Bu Rutinde Kullanılacak Kitaplar (Opsiyonel)</label>
              <div className="flex flex-wrap gap-2">
                {books.map(book => {
                  const isSelected = selectedRoutineBookIds.includes(book.id);
                  return (
                    <button
                      key={book.id}
                      onClick={() => {
                        setSelectedRoutineBookIds(prev => 
                          prev.includes(book.id) ? prev.filter(id => id !== book.id) : [...prev, book.id]
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                        isSelected 
                          ? "bg-primary/20 text-primary border-primary" 
                          : "bg-secondary text-foreground/60 border-transparent hover:border-border"
                      )}
                    >
                      {book.title}
                    </button>
                  );
                })}
                {books.length === 0 && <p className="text-[10px] text-foreground/30 italic">Henüz kitap eklenmemiş.</p>}
              </div>
            </div>

            <button 
              onClick={addRoutine}
              className="w-full p-4 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
            >
              <Plus size={20} strokeWidth={3} /> Rutini Listeye Ekle
            </button>
          </div>

          <div className="space-y-3 mt-8">
            {routines.sort((a,b) => {
              const firstDayA = a.days[0] ?? 0;
              const firstDayB = b.days[0] ?? 0;
              return firstDayA - firstDayB || a.startTime.localeCompare(b.startTime);
            }).map((r, i) => (
              <div key={r.id || i} className="group flex items-center justify-between p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Timer size={24} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-base">{r.title}</p>
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-foreground/60">{r.durationMinutes} dk</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} /> {r.startTime}
                      </p>
                      <span className="text-foreground/20 text-[10px]">•</span>
                      <div className="flex gap-1">
                        {r.days.map(d => (
                          <span key={d} className="text-[9px] font-black text-primary uppercase">
                            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'][d === 0 ? 6 : d - 1]}
                          </span>
                        ))}
                      </div>
                    </div>
                    {r.description && <p className="text-xs text-foreground/50 italic line-clamp-1">{r.description}</p>}
                  </div>
                </div>
                <button 
                  onClick={() => deleteRoutine(i)}
                  className="p-2 text-foreground/20 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            {routines.length === 0 && (
              <div className="text-center py-16 px-10 border-2 border-dashed border-border rounded-3xl text-foreground/30 italic text-sm">
                <div className="mb-2 flex justify-center"><Info size={24} opacity={0.3} /></div>
                Henüz bir rutin eklenmemiş. AI bu zamanlarda ders çalışma planlamaz.
              </div>
            )}
          </div>
        </motion.section>
      )}

      {activeTab === 'academic' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          <section className="card p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-primary" size={24} /> Akademik Alan & Hedefler
            </h3>
            
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">Sınav Alanı (Alan Seçimi)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Dil'] as StudentField[]).map((field) => (
                  <button
                    key={field}
                    onClick={() => setStudentField(field)}
                    className={cn(
                      "px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all",
                      studentField === field 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-lg shadow-emerald-500/20" 
                        : "border-border hover:border-foreground/20 text-foreground/60"
                    )}
                  >
                    {field}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-foreground/40 italic">Bu seçim, yapay zekanın senin için hazırlayacağı ders programını ve deneme analizlerini doğrudan etkiler.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">TYT Net Hedefi</label>
                  <input 
                    type="number"
                    value={targetNets.tyt}
                    onChange={e => setTargetNets({ ...targetNets, tyt: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">AYT Net Hedefi</label>
                  <input 
                    type="number"
                    value={targetNets.ayt}
                    onChange={e => setTargetNets({ ...targetNets, ayt: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">YKS Çalışmaya Başlama Tarihi</label>
                  <input 
                    type="date"
                    value={studyStartDate}
                    onChange={e => setStudyStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">YKS Sınav Tarihi</label>
                  <input 
                    type="date"
                    value={yksDate}
                    onChange={e => setYksDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">Günlük Maks. Kitap Sayısı</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={maxDailyBooks}
                    onChange={e => setMaxDailyBooks(parseInt(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary rounded-xl font-bold">
                    {maxDailyBooks}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/40">Günlük Hedef Çalışma Süreleri</label>
                <div className="grid grid-cols-7 gap-2">
                  {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((day, i) => (
                    <div key={day} className="space-y-2 text-center">
                      <span className="text-[10px] font-bold">{day}</span>
                      <input 
                        type="number"
                        value={dailyMinutes[i === 6 ? 0 : i + 1] || 0}
                        onChange={e => setDailyMinutes({ ...dailyMinutes, [i === 6 ? 0 : i + 1]: parseInt(e.target.value) || 0 })}
                        className="w-full px-1 py-2 text-center text-xs rounded-lg border border-border bg-background outline-none"
                        placeholder="dk"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={handleSave}
              className="w-full px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-bold text-sm transition-all"
            >
              Sınav Hedeflerini Kaydet
            </button>
          </section>

          <section className="card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Timer className="text-primary" size={24} /> Kademeli Süre Artışı
              </h3>
              <button 
                onClick={() => setAdaptiveStudyPlan({ ...adaptiveStudyPlan, isEnabled: !adaptiveStudyPlan.isEnabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  adaptiveStudyPlan.isEnabled ? "bg-primary" : "bg-secondary"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  adaptiveStudyPlan.isEnabled ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>
            <p className="text-sm text-foreground/60">
              Bu özellik açık olduğunda, seçtiğin günlerde çalışma süren her hafta otomatik olarak artırılır.
            </p>
            
            {adaptiveStudyPlan.isEnabled && (
              <div className="space-y-6 pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/40 text-center block">Uygulanacak Günler</label>
                    <div className="flex justify-between gap-1">
                      {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((day, i) => {
                        const dayIdx = i === 6 ? 0 : i + 1;
                        const isActive = (adaptiveStudyPlan.daysToApply || []).includes(dayIdx);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const currentDays = adaptiveStudyPlan.daysToApply || [];
                              const newDays = isActive 
                                ? currentDays.filter(d => d !== dayIdx)
                                : [...currentDays, dayIdx];
                              setAdaptiveStudyPlan({ ...adaptiveStudyPlan, daysToApply: newDays });
                            }}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all duration-200 cursor-pointer select-none active:scale-95",
                              isActive 
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105 z-10" 
                                : "bg-rose-500 text-white border-rose-600 hover:bg-rose-600"
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Hedef Maks. Saat</label>
                      <input 
                        type="number"
                        value={adaptiveStudyPlan.maxDailyHours || 0}
                        onChange={e => setAdaptiveStudyPlan({ ...adaptiveStudyPlan, maxDailyHours: parseFloat(e.target.value) || 0 })}
                        className="w-full p-3 rounded-xl border border-border bg-background text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Haftalık Artış (dk)</label>
                      <input 
                        type="number"
                        value={adaptiveStudyPlan.weeklyIncrementMinutes || 0}
                        onChange={e => setAdaptiveStudyPlan({ ...adaptiveStudyPlan, weeklyIncrementMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full p-3 rounded-xl border border-border bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-bold text-sm transition-all"
                >
                  Planı Güncelle
                </button>
              </div>
            )}
          </section>
        </motion.div>
      )}

      {activeTab === 'personal' && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 space-y-6"
        >
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Info className="text-primary" size={24} /> Kişisel Bilgiler & Hedefler
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">
              Kendin hakkında ne kadar çok bilgi verirsen (hedefler, hobiler, varsa psikolojik/fiziksel rahatsızlıklar), AI mentörün seni o kadar iyi tanır ve planlarını ona göre optimize eder.
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Öğrenci Profili</label>
              <textarea 
                placeholder="Örn: Sayısal öğrencisiyim, hedefim ilk 10k. Gece çalışmayı severim ama sabahları odaklanmakta zorlanıyorum. Hafif bir bel fıtığım var bu yüzden uzun süre hareketsiz oturamıyorum..."
                value={personalBio}
                onChange={e => setPersonalBio(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary h-32 resize-none text-sm transition-all"
              />
              <p className="text-[10px] text-foreground/40 italic">Not: Bu bilgileradece Gemini API'ye ve Yerel AI'a gönderilerek sana özel tavsiyeler üretmek için kullanılır.</p>
            </div>
            <button 
              onClick={handleSave}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95"
            >
              Profili Güncelle
            </button>
          </div>
        </motion.section>
      )}

      {activeTab === 'multidevice' && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Çoklu Cihaz Modu</h3>
              <p className="text-sm text-foreground/60">Verilerinizi birden fazla cihaz arasında yerel ağ üzerinden otomatik olarak senkronize edin.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Nasıl Çalışır?</h4>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Bu seçeneği açtığınızda cihazınız için benzersiz bir şifre üretilir. Aynı yerel ağ üzerinde bulunan diğer cihazınızın eşleştirme şifresi kısmına buradaki şifreyi girin. 
              Sistem, her yeni işlem yapıldığında veya uygulama açıldığında en son güncellenen verileri (görevler, kitaplar, denemeler ve sohbet geçmişi) otomatik olarak diğer cihaza aktaracaktır.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border">
              <div>
                <span className="font-bold text-sm block">Çoklu Cihaz Modu Aktif</span>
                <span className="text-xs text-foreground/50">Yerel ağ senkronizasyonunu etkinleştirir veya devre dışı bırakır.</span>
              </div>
              <button
                onClick={() => setMultiDeviceModeEnabled(!multiDeviceModeEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                  multiDeviceModeEnabled ? "bg-primary" : "bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    multiDeviceModeEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {multiDeviceModeEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6 pt-2"
              >
                {/* Last action times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 text-sm gap-1">
                    <span className="font-bold text-foreground/70">Bu Cihazdan Yapılan Son Değişiklik:</span>
                    <span className="font-mono font-black text-primary text-xs">
                      {deviceLastActionTime ? new Date(deviceLastActionTime).toLocaleString('tr-TR') : 'Henüz bu cihazdan değişiklik yapılmadı'}
                    </span>
                  </div>
                  <div className="flex flex-col justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 text-sm gap-1">
                    <span className="font-bold text-foreground/70">Ortak Senkron Zamanı (En Son Veri):</span>
                    <span className="font-mono font-black text-emerald-500 text-xs">
                      {lastActionTime ? new Date(lastActionTime).toLocaleString('tr-TR') : 'Henüz senkronize edilmedi'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Your Device Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Bu Cihazın Şifresi (Sana Özel)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 rounded-xl border border-border bg-secondary/20 font-mono font-bold text-center tracking-wider text-foreground">
                        {settings.multiDevicePassword}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(settings.multiDevicePassword || '');
                          window.dispatchEvent(new CustomEvent('app-success', { detail: 'Şifre kopyalandı!' }));
                        }}
                        className="px-4 bg-secondary border border-border rounded-xl font-bold text-xs hover:bg-secondary/85 transition-all text-foreground"
                      >
                        Kopyala
                      </button>
                    </div>
                    <p className="text-[10px] text-foreground/40 font-medium">Eşitlemek istediğin diğer cihaza bu şifreyi girmelisin.</p>
                  </div>

                  {/* Target Match Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Eşleştirilecek Şifre (Giriş Kutusu)</label>
                    <input
                      type="text"
                      placeholder="Örn: YKS-A1B2-C3D4"
                      value={enteredSyncPassword}
                      onChange={e => setEnteredSyncPassword(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background font-mono outline-none focus:ring-2 focus:ring-primary text-sm transition-all text-center tracking-wider"
                    />
                    <p className="text-[10px] text-foreground/40 font-medium font-medium">Bu cihaza aktarmak istediğin diğer cihazın şifresini buraya yaz.</p>
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95"
                >
                  Çoklu Cihaz Ayarlarını Güncelle ve Senkronize Et
                </button>
              </motion.div>
            )}
          </div>
        </motion.section>
      )}

      {activeTab === 'data' && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 space-y-6"
        >
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Download className="text-primary" size={24} /> Veri Yönetimi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={exportData}
              className="flex items-center justify-center gap-2 p-4 border border-border rounded-2xl hover:bg-secondary transition-colors font-bold text-sm"
            >
              <Download size={18} /> Verileri Yedekle
            </button>
            <label className="flex items-center justify-center gap-2 p-4 border border-border rounded-2xl hover:bg-secondary transition-colors font-bold text-sm cursor-pointer">
              <Upload size={18} /> Verileri Geri Yükle
              <input type="file" className="hidden" accept=".json" onChange={importData} />
            </label>
            <button 
              onClick={clearAllData}
              className="flex items-center justify-center gap-2 p-4 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/10 transition-colors font-bold text-sm"
            >
              <Trash2 size={18} /> Tüm Verileri Sil
            </button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
