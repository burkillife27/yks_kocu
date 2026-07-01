import { useState, useMemo, useEffect } from 'react';
import { Trial, AppSettings, ExamBranch, Task, Book } from '../types.ts';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Clock, 
  Target, 
  ChevronRight,
  Filter,
  Info,
  Calendar,
  Zap,
  RotateCcw,
  AlertCircle,
  Brain,
  Sparkles,
  X,
  ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiService } from '../services/geminiService.ts';
import { storage } from '../lib/storage.ts';
import Markdown from 'react-markdown';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const BRANCHES: ExamBranch[] = [
  "TYT Türkçe", "TYT Matematik", "TYT Fizik", "TYT Kimya", "TYT Biyoloji", "TYT Sosyal", "TYT Fen", "TYT GENEL",
  "AYT Matematik", "AYT Fizik", "AYT Kimya", "AYT Biyoloji", "AYT Fen", "AYT Edebiyat", "AYT Tarih-1", "AYT Coğrafya-1", "AYT Tarih-2", "AYT Coğrafya-2", "AYT Felsefe Grubu", "AYT Din Kültürü", "AYT GENEL",
  "Paragraf", "Problem", "Yabancı Dil (YDT)"
];

export default function Analytics({ trials, tasks, settings, books }: { trials: Trial[], tasks: Task[], settings: AppSettings, books: Book[] }) {
  const [activeBranch, setActiveBranch] = useState<ExamBranch | 'GENEL'>('TYT GENEL');
  const [viewMode, setViewMode] = useState<'net' | 'duration'>('net');
  const [isMounted, setIsMounted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ analysis: string, thought: string } | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showThought, setShowThought] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Background/Persistence tracking
  const [lastStates, setLastStates] = useState<Record<'trial' | 'comprehensive', { timestamp: number, result: any, taskId?: string | null }>>({
    trial: { timestamp: 0, result: null, taskId: null },
    comprehensive: { timestamp: 0, result: null, taskId: null }
  });

  const [activeAnalysisType, setActiveAnalysisType] = useState<'trial' | 'comprehensive' | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // Load persisted analysis results
    const loadPersistence = async () => {
      const trialState = await storage.getAnalysisState('trial');
      const reportState = await storage.getAnalysisState('comprehensive');
      
      setLastStates({
        trial: { timestamp: trialState.timestamp, result: trialState.result, taskId: trialState.taskId },
        comprehensive: { timestamp: reportState.timestamp, result: reportState.result, taskId: reportState.taskId }
      });

      // Resume polling if needed
      if (trialState.isProcessing && trialState.taskId) {
        setIsAnalyzing(true);
        setActiveAnalysisType('trial');
        setActiveTaskId(trialState.taskId);
        pollStatus(trialState.taskId, 'trial');
      } else if (reportState.isProcessing && reportState.taskId) {
        setIsAnalyzing(true);
        setActiveAnalysisType('comprehensive');
        setActiveTaskId(reportState.taskId);
        pollStatus(reportState.taskId, 'comprehensive');
      }
    };
    loadPersistence();
  }, []);

  const pollStatus = async (taskId: string, type: 'trial' | 'comprehensive') => {
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/analyze/status/${taskId}`);
        if (!resp.ok) return;
        const data = await resp.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          const result = data.result;
          setAiAnalysis(result);
          setIsAnalyzing(false);
          setActiveTaskId(null);
          setActiveAnalysisType(null);
          
          const timestamp = Date.now();
          setLastStates(prev => ({ 
            ...prev, 
            [type]: { timestamp, result, taskId } 
          }));
          await storage.saveAnalysisState(type, { result, timestamp, isProcessing: false, taskId: null });
        } else if (data.status === 'error') {
          clearInterval(interval);
          setIsAnalyzing(false);
          setActiveTaskId(null);
          setActiveAnalysisType(null);
          window.dispatchEvent(new CustomEvent('ai-error', { detail: data.error || "Analiz sırasında bir hata oluştu." }));
          await storage.saveAnalysisState(type, { isProcessing: false, taskId: null });
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);
  };

  const handleAiAnalysis = async (type: 'trial' | 'comprehensive' = 'trial', forceNew: boolean = false) => {
    if (!settings.apiKey) {
      window.dispatchEvent(new CustomEvent('ai-error', { detail: "Yapay zeka analizi için ayarlardan API Anahtarı girilmelidir." }));
      return;
    }

    const state = lastStates[type];

    // If result exists and we are not forcing a new one, just show the old one
    if (state.result && !forceNew) {
      setAiAnalysis(state.result);
      setShowAiModal(true);
      setShowThought(false);
      setActiveAnalysisType(type);
      return;
    }

    const taskId = crypto.randomUUID();
    setIsAnalyzing(true);
    setActiveAnalysisType(type);
    setShowAiModal(true);
    setShowThought(false);
    setActiveTaskId(taskId);
    setAiAnalysis(null);
    
    await storage.saveAnalysisState(type, { isProcessing: true, taskId });

    try {
      const endpoint = type === 'trial' ? '/api/analyze/trial' : '/api/analyze/comprehensive';
      
      // Filter data as requested
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const dateThreeMonthsAgo = threeMonthsAgo.toISOString().split('T')[0];
      
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const dateTwoMonthsAgo = twoMonthsAgo.toISOString().split('T')[0];

      const filteredTrials = trials.filter(t => t.date >= dateThreeMonthsAgo);
      const filteredTasks = tasks.filter(t => t.date >= dateTwoMonthsAgo);

      // Fetch and filter chat messages
      const sessions = await storage.getChatSessions();
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      const filteredChats = sessions.flatMap(s => 
        s.messages
          .filter(m => m.timestamp >= threeDaysAgo || m.isImportant)
          .map(m => ({
            role: m.role,
            content: m.content,
            isImportant: m.isImportant,
            date: new Date(m.timestamp).toLocaleDateString('tr-TR')
          }))
      );

      // Sanitize settings to remove API keys
      const { apiKey: _key1, apiKey2: _key2, apiKey3: _key3, ...sanitizedSettings } = settings;

      const body: any = {
        apiKey: settings.apiKey,
        apiKey2: settings.apiKey2,
        apiKey3: settings.apiKey3,
        modelName: settings.aiCoreMode === 'gemma' ? 'gemma-2-9b-it' : settings.aiModel,
        trials: filteredTrials,
        settings: sanitizedSettings,
        taskId
      };

      if (type === 'comprehensive') {
        body.books = books;
        body.tasks = filteredTasks;
        body.chats = filteredChats;
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) throw new Error("Server communication failed");
      pollStatus(taskId, type);
    } catch (error) {
      console.error("Initiate AI Analysis error:", error);
      setIsAnalyzing(false);
      setShowAiModal(false);
      setActiveTaskId(null);
      setActiveAnalysisType(null);
      await storage.saveAnalysisState(type, { isProcessing: false, taskId: null });
      window.dispatchEvent(new CustomEvent('ai-error', { detail: "Analiz başlatılamadı. Lütfen sunucu bağlantınızı kontrol edin." }));
    }
  };

  // Study Time Calculation
  const studyTimeData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayTasks = tasks.filter(t => t.date === date);
      const minutes = dayTasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);
      return {
        date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        minutes,
        fullDate: date
      };
    });
  }, [tasks]);

  // Filtered data for the main chart
  const filteredData = useMemo(() => {
    let baseTrials = trials;

    if (activeBranch === 'GENEL') {
      baseTrials = trials.filter(t => t.type !== 'Branş');
    } else if (activeBranch === 'TYT GENEL') {
      baseTrials = trials.filter(t => t.type === 'TYT');
    } else if (activeBranch === 'AYT GENEL') {
      baseTrials = trials.filter(t => t.type === 'AYT');
    } else {
      baseTrials = trials.filter(t => t.type === 'Branş' && t.branch === activeBranch);
    }

    return baseTrials
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => ({
        date: new Date(t.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        net: t.net,
        duration: t.durationMinutes || 0,
        title: t.title,
        fullDate: t.date
      }));
  }, [trials, activeBranch]);

  // Trigger re-render of charts on mount or branch change
  const chartKey = useMemo(() => `${activeBranch}-${viewMode}-${filteredData.length}`, [activeBranch, viewMode, filteredData.length]);

  // Radar Chart Data Calculation (Last 3 trials)
  const radarData = useMemo(() => {
    if (activeBranch !== 'TYT GENEL' && activeBranch !== 'AYT GENEL') return null;
    
    const type = activeBranch === 'TYT GENEL' ? 'TYT' : 'AYT';
    const last3Trials = trials
      .filter(t => t.type === type && t.subjects && t.subjects.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    if (last3Trials.length === 0) return null;

    const subjectTotals: Record<string, { net: number, count: number, totalQuestions: number }> = {};

    last3Trials.forEach(trial => {
      trial.subjects?.forEach(s => {
        if (!subjectTotals[s.name]) {
          let totalQuestions = 40;
          if (activeBranch === 'TYT GENEL') {
            if (s.name === 'Türkçe' || s.name === 'Matematik') totalQuestions = 40;
            else if (s.name === 'Sosyal' || s.name === 'Fen') totalQuestions = 20;
          } else if (activeBranch === 'AYT GENEL') {
            if (s.name === 'Matematik' || s.name === 'Türk Dili ve Ed. - Sosyal 1' || s.name === 'Sosyal Bilimler-2') totalQuestions = 40;
            else if (s.name === 'Fizik') totalQuestions = 14;
            else if (s.name === 'Kimya' || s.name === 'Biyoloji') totalQuestions = 13;
          }
          subjectTotals[s.name] = { net: 0, count: 0, totalQuestions: s.totalQuestions || totalQuestions };
        }
        subjectTotals[s.name].net += (s.correct - (s.wrong * 0.25));
        subjectTotals[s.name].count += 1;
      });
    });

    return Object.entries(subjectTotals)
      .filter(([_, data]) => data.totalQuestions > 0 && data.count > 0)
      .map(([name, data]) => ({
        subject: name,
        // Calculate success percentage: (Total Net / (Total Trials * Total Questions)) * 100
        percent: Math.round(((data.net / (data.count * data.totalQuestions)) * 100) * 10) / 10,
        fullMark: 100
      }))
      .filter(item => {
        // Find if this subject actually had any participation in the trials
        // We only want to show subjects that the user actually filled
        const hasActivity = last3Trials.some(trial => 
          trial.subjects?.some(s => s.name === item.subject && (s.correct + s.wrong + s.empty > 0))
        );
        return hasActivity;
      });
  }, [trials, activeBranch]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const nets = filteredData.map(t => t.net);
    const durations = filteredData.map(t => t.duration).filter(d => d > 0);
    
    return {
      avgNet: nets.reduce((a, b) => a + b, 0) / nets.length,
      maxNet: Math.max(...nets),
      avgDur: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      totalCount: filteredData.length
    };
  }, [filteredData]);

  const mistakeData = useMemo(() => {
    const topicCounts: Record<string, number> = {};
    
    let filteredTrialsForMistakes = trials;
    if (activeBranch === 'GENEL') {
      filteredTrialsForMistakes = trials.filter(t => t.type !== 'Branş');
    } else if (activeBranch === 'TYT GENEL') {
      filteredTrialsForMistakes = trials.filter(t => t.type === 'TYT');
    } else if (activeBranch === 'AYT GENEL') {
      filteredTrialsForMistakes = trials.filter(t => t.type === 'AYT');
    } else {
      filteredTrialsForMistakes = trials.filter(t => t.type === 'Branş' && t.branch === activeBranch);
    }
    
    filteredTrialsForMistakes.forEach(trial => {
      trial.mistakes?.forEach(m => {
        topicCounts[m.topic] = (topicCounts[m.topic] || 0) + m.count;
      });
    });

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [trials, activeBranch]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const skipped = tasks.filter(t => t.status === 'skipped').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const branchMap: Record<string, { completed: number, pending: number, skipped: number, total: number }> = {};

    tasks.forEach(task => {
      const branchName = task.branch || books.find(b => b.id === task.bookId)?.branch || 'Genel / Diğer';
      if (!branchMap[branchName]) {
        branchMap[branchName] = { completed: 0, pending: 0, skipped: 0, total: 0 };
      }
      branchMap[branchName].total += 1;
      if (task.status === 'completed') {
        branchMap[branchName].completed += 1;
      } else if (task.status === 'skipped') {
        branchMap[branchName].skipped += 1;
      } else {
        branchMap[branchName].pending += 1;
      }
    });

    const branchData = Object.entries(branchMap).map(([branch, counts]) => ({
      branch,
      completed: counts.completed,
      pending: counts.pending,
      skipped: counts.skipped,
      total: counts.total,
      rate: Math.round((counts.completed / counts.total) * 100)
    })).sort((a, b) => b.total - a.total);

    return {
      total,
      completed,
      pending,
      skipped,
      rate,
      branchData
    };
  }, [tasks, books]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BarChartIcon className="text-primary" size={32} /> Analiz Merkezi
          </h2>
          <p className="text-foreground/60">Gelişimini ve çalışma sürekliliğini buradan takip et.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleAiAnalysis('trial')}
            disabled={trials.length === 0 || isAnalyzing}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary border border-primary/20 rounded-xl font-bold shadow-lg shadow-primary/5 hover:scale-105 transition-all text-sm min-w-[180px]",
              (trials.length === 0 || isAnalyzing) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <Zap size={18} className={cn(isAnalyzing && activeAnalysisType === 'trial' && "animate-pulse")} />
            {isAnalyzing && activeAnalysisType === 'trial' ? "Analiz devam ediyor..." : "Deneme Analizi"}
          </button>

          <button
            onClick={() => handleAiAnalysis('comprehensive')}
            disabled={trials.length === 0 || isAnalyzing}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all text-sm min-w-[200px]",
              (trials.length === 0 || isAnalyzing) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <TrendingUp size={18} className={cn(isAnalyzing && activeAnalysisType === 'comprehensive' && "animate-pulse")} />
            {isAnalyzing && activeAnalysisType === 'comprehensive' ? "Analiz devam ediyor..." : "Kapsamlı Gelişim Raporu"}
          </button>
        </div>
      </div>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl card p-0 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-border bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">YKS Koçluk Raporu</h3>
                    <p className="text-xs text-foreground/40 font-black uppercase tracking-widest">
                      Yapay Zeka Destekli Deneme Analizi
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isAnalyzing ? (
                  <div className="h-full flex flex-col items-center justify-center p-20 space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RotateCcw className="text-primary animate-pulse" size={24} />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-lg font-bold">Veriler titizlikle inceleniyor...</p>
                       <p className="text-sm text-foreground/40">
                         Son deneme sonuçların, süre yönetimin ve hata dağılımların analiz ediliyor.
                       </p>
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-orange-600 mb-1 flex items-center gap-2">
                          <Brain size={16} /> AI Düşünce Zinciri
                        </h4>
                        <p className="text-xs text-orange-600/60">Yapay zekanın analiz yaparken geçtiği mantık aşamalarını görmek ister misin?</p>
                      </div>
                      <button 
                        onClick={() => setShowThought(!showThought)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          showThought ? "bg-orange-500 text-white" : "bg-white text-orange-500 border border-orange-500/20"
                        )}
                      >
                        {showThought ? "Gizle" : "Göster"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showThought && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 font-mono text-xs leading-relaxed text-foreground/70 whitespace-pre-wrap">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3">Teknik Analiz Süreci</h5>
                            {aiAnalysis.thought}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-[0.2em] text-primary/40 border-b border-primary/10 pb-2">
                        Koçluk Değerlendirmesi
                      </h4>
                      <div className="markdown-body">
                        <Markdown>{aiAnalysis.analysis}</Markdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <Zap size={60} />
                    <p className="mt-4 font-bold">Henüz bir analiz yapılmadı.</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border bg-secondary/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-foreground/40 italic uppercase tracking-widest">
                  * Bu rapor son deneme ve çalışma verilerine dayanılarak oluşturulmuştur.
                </p>
                {aiAnalysis && !isAnalyzing && (
                  <button 
                    onClick={() => handleAiAnalysis(activeAnalysisType || 'comprehensive', true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl text-xs font-bold transition-all border border-primary/20"
                  >
                    <RotateCcw size={14} /> Yeni Analiz Başlat
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Study Time Section */}
      <div className="card p-8 space-y-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
        <div className="flex justify-between items-center">
           <h3 className="text-xl font-bold flex items-center gap-2">
             <Calendar className="text-primary" size={24} /> Çalışma Sürekliliği (Son 30 Gün)
           </h3>
           <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
              <Clock size={14} className="text-primary" />
              <span className="text-xs font-black text-primary">Toplam: {studyTimeData.reduce((a, b) => a + b.minutes, 0)} dk</span>
           </div>
        </div>

        <div className="h-[250px] w-full bg-card/50 rounded-2xl p-4 border border-border/50">
           {isMounted ? (
             <ResponsiveContainer key={`continuity-${studyTimeData.length}`} width="100%" height="100%" minHeight={200}>
               <LineChart data={studyTimeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                 <XAxis 
                   dataKey="date" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                   dy={10}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                 />
                 <Tooltip 
                   contentStyle={{ 
                     backgroundColor: '#fff', 
                     border: '1px solid #e5e7eb',
                     borderRadius: '16px',
                     fontWeight: '700',
                     fontSize: '12px',
                     color: '#1f2937'
                   }}
                 />
                 <Line 
                   type="monotone" 
                   dataKey="minutes" 
                   stroke="#3b82f6" 
                   strokeWidth={3} 
                   dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                   activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                   isAnimationActive={false}
                 />
               </LineChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
             </div>
           )}
         </div>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar / Branch List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
              <Filter size={14} /> Deneme Seçimi
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveBranch('TYT GENEL')}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all",
                  activeBranch === 'TYT GENEL' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-foreground/60 hover:bg-secondary/80"
                )}
              >
                <span>TYT Genel</span>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setActiveBranch('AYT GENEL')}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all",
                  activeBranch === 'AYT GENEL' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-foreground/60 hover:bg-secondary/80"
                )}
              >
                <span>AYT Genel</span>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {['TYT', 'AYT', 'DİĞER'].map(group => {
                const groupBranches = BRANCHES.filter(b => {
                  if (b === 'TYT GENEL' || b === 'AYT GENEL') return false;
                  if (group === 'TYT') return b.startsWith('TYT');
                  if (group === 'AYT') return b.startsWith('AYT');
                  return !b.startsWith('TYT') && !b.startsWith('AYT');
                });

                if (groupBranches.length === 0) return null;

                return (
                  <div key={group} className="space-y-1">
                    <p className="px-3 text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{group}</p>
                    {groupBranches.map(branch => {
                      const hasData = trials.some(t => t.type === 'Branş' && t.branch === branch);
                      return (
                        <button
                          key={branch}
                          onClick={() => setActiveBranch(branch)}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all",
                            activeBranch === branch 
                              ? "bg-primary/20 text-primary border border-primary/20 shadow-sm" 
                              : "hover:bg-secondary text-foreground/60",
                            !hasData && "opacity-40"
                          )}
                        >
                          <span className="truncate">{branch}</span>
                          {hasData && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="card p-6 bg-primary/5 border-primary/10">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                   <TrendingUp className="text-primary" size={20} />
                </div>
                <h4 className="font-bold text-sm tracking-tight">Kısa Özet</h4>
             </div>
             {stats ? (
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground/40 uppercase">Veri Noktası</span>
                    <span className="text-sm font-black">{stats.totalCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground/40 uppercase">Ortalama Net</span>
                    <span className="text-sm font-black text-primary">{stats.avgNet.toFixed(1)}</span>
                  </div>
                  {stats.avgDur > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground/40 uppercase">Emeğin (Ort.)</span>
                      <span className="text-sm font-black">{Math.round(stats.avgDur)} dk</span>
                    </div>
                  )}
               </div>
             ) : (
               <p className="text-xs text-foreground/40 font-medium">Bu branş için henüz veri girişi yapılmamış.</p>
             )}
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={cn("card p-8 min-h-[500px] flex flex-col transition-all", radarData ? "xl:col-span-2" : "xl:col-span-3")}>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-black text-primary">{activeBranch} İlerlemesi</h3>
                  <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest mt-1">
                    Son {filteredData.length} veri girişi
                  </p>
                </div>

                <div className="flex p-1 bg-secondary rounded-2xl border border-border shadow-inner self-start md:self-center">
                  <button
                    onClick={() => setViewMode('net')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      viewMode === 'net' ? "bg-card text-primary shadow-sm" : "text-foreground/40 hover:text-foreground"
                    )}
                  >
                    <Target size={14} /> Netler
                  </button>
                  <button
                    onClick={() => setViewMode('duration')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      viewMode === 'duration' ? "bg-card text-primary shadow-sm" : "text-foreground/40 hover:text-foreground"
                    )}
                  >
                    <Clock size={14} /> Süreler
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full bg-card/50 rounded-3xl p-6 border border-border/50 relative" style={{ minHeight: '400px' }}>
                {filteredData.length > 0 ? (
                  isMounted ? (
                    <ResponsiveContainer key={chartKey} width="100%" height="100%" minHeight={350}>
                      <LineChart data={filteredData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '16px',
                            fontWeight: '700',
                            fontSize: '12px',
                            color: '#1f2937'
                          }}
                          formatter={(value: any, name: any, props: any) => [value, name === 'net' ? 'Net' : 'Süre', props.payload.title]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={viewMode} 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          isAnimationActive={false}
                          dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                     <Target size={60} strokeWidth={1} />
                     <h4 className="mt-4 font-bold text-lg">Yeterli Veri Yok</h4>
                     <p className="text-sm">Gelişimi görmek için deneme eklemeye başla.</p>
                  </div>
                )}
              </div>


            </div>

            {/* Radar Chart (Subject Breakdown) */}
            <AnimatePresence>
              {radarData && isMounted && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card p-8 flex flex-col xl:col-span-1 border-emerald-500/10 bg-emerald-500/[0.02]"
                >
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-emerald-600 flex items-center gap-2">
                       <Target size={20} /> Ders Bazlı Görünüm
                    </h3>
                    <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-widest mt-1">
                      Son 3 deneme ortalaması (Başarı %)
                    </p>
                  </div>

                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 100]} 
                          tick={false}
                          axisLine={false}
                        />
                        <Radar
                          name="Başarı %"
                          dataKey="percent"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="#10b981"
                          fillOpacity={0.25}
                          isAnimationActive={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '16px',
                            fontWeight: '700',
                            fontSize: '12px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] font-bold text-emerald-600/60 text-center uppercase tracking-wide">
                      Her ders kendi soru sayısına göre ağırlıklandırılmıştır.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mistakes Chart */}
          <div className="card p-8 bg-red-500/[0.02] border-red-500/10">
             <div className="mb-6 flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-black text-red-600 flex items-center gap-2">
                      <AlertCircle size={20} /> En Çok Hata Yapılan Konular
                   </h3>
                   <p className="text-[10px] font-black text-red-600/40 uppercase tracking-widest mt-1">
                      {activeBranch} Verilerine Göre
                   </p>
                </div>
             </div>

             <div className="h-[300px] w-full bg-card/50 rounded-2xl p-4 border border-border/50">
                {mistakeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={mistakeData}
                      margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="topic" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 700 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '16px',
                          fontWeight: '700',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        isAnimationActive={false}
                        dot={{ fill: '#ef4444', r: 5, strokeWidth: 0 }}
                        activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                     <AlertCircle size={48} strokeWidth={1} />
                     <h4 className="mt-4 font-bold text-lg">Hata Verisi Yok</h4>
                     <p className="text-sm">Bu bölüm için henüz hata girişi yapılmamış.</p>
                  </div>
                )}
             </div>
          </div>

          {/* Görev Analizi ve Performansı */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Başarı Yüzdesi Kartı */}
            <div className="card p-8 flex flex-col items-center justify-between bg-blue-500/[0.02] border-blue-500/10">
              <div className="w-full text-left">
                <h3 className="text-xl font-black text-blue-600 flex items-center gap-2">
                  <Target size={20} /> Görev Başarı Oranı
                </h3>
                <p className="text-[10px] font-black text-blue-600/40 uppercase tracking-widest mt-1">
                  Atanan Görevlerin Tamamlanma Yüzdesi
                </p>
              </div>

              {/* Progress Ring */}
              <div className="relative flex items-center justify-center my-6">
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={376.8}
                    strokeDashoffset={376.8 - (376.8 * taskStats.rate) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black text-blue-600">%{taskStats.rate}</span>
                  <span className="block text-[10px] font-bold text-foreground/40 uppercase mt-0.5">Başarı</span>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold border-b border-border pb-2">
                  <span className="text-foreground/60 flex items-center gap-2 font-black">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Toplam Görev
                  </span>
                  <span className="font-extrabold">{taskStats.total}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold border-b border-border pb-2">
                  <span className="text-foreground/60 flex items-center gap-2 font-black">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tamamlanan
                  </span>
                  <span className="font-extrabold text-emerald-500">{taskStats.completed}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold border-b border-border pb-2">
                  <span className="text-foreground/60 flex items-center gap-2 font-black">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bekleyen
                  </span>
                  <span className="font-extrabold text-amber-500">{taskStats.pending}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-foreground/60 flex items-center gap-2 font-black">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Pas Geçilen
                  </span>
                  <span className="font-extrabold text-red-500">{taskStats.skipped}</span>
                </div>
              </div>
            </div>

            {/* Ders Bazlı Tamamlanma Dağılımı Grafiği */}
            <div className="card p-8 flex flex-col md:col-span-2 bg-emerald-500/[0.02] border-emerald-500/10">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-xl font-black text-emerald-600 flex items-center gap-2">
                     <ClipboardList size={20} /> Ders Bazlı Dağılım
                  </h3>
                  <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-widest mt-1">
                     Derslere Göre Görev Dağılımı ve Durumları
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-foreground/50">
                  <span className="flex items-center gap-1">
                     <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Tamamlanan
                  </span>
                  <span className="flex items-center gap-1">
                     <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Bekleyen
                  </span>
                  <span className="flex items-center gap-1">
                     <span className="w-2.5 h-2.5 rounded bg-red-400 inline-block" /> Pas Geçilen
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-[300px] w-full bg-card/50 rounded-2xl p-4 border border-border/50">
                {taskStats.branchData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={taskStats.branchData}
                      margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="branch" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '16px',
                          fontWeight: '700',
                          fontSize: '11px',
                          color: '#1f2937'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        name="Tamamlanan" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        isAnimationActive={false}
                        dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pending" 
                        name="Bekleyen" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        isAnimationActive={false}
                        dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="skipped" 
                        name="Pas Geçilen" 
                        stroke="#f87171" 
                        strokeWidth={3}
                        isAnimationActive={false}
                        dot={{ fill: '#f87171', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    <ClipboardList size={48} strokeWidth={1} />
                    <h4 className="mt-4 font-bold text-lg">Görev Dağılım Verisi Yok</h4>
                    <p className="text-sm">Hedeflerini oluşturmak için görevler eklemelisin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-4" />

          {/* Detailed Branch Map (Heatmap styled grid for stats) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="card p-6 flex flex-col justify-center items-center gap-2">
                <p className="text-[10px] font-black uppercase text-foreground/40 tracking-widest">En Yüksek Net</p>
                <p className="text-3xl font-black text-primary">{stats?.maxNet || 0}</p>
             </div>
             <div className="card p-6 flex flex-col justify-center items-center gap-2">
                <p className="text-[10px] font-black uppercase text-foreground/40 tracking-widest">Ortalama Süre</p>
                <p className="text-3xl font-black">{stats ? Math.round(stats.avgDur) : 0} <span className="text-sm opacity-40">dk</span></p>
             </div>
             <div className="card p-6 flex flex-col justify-center items-center gap-2">
                <p className="text-[10px] font-black uppercase text-foreground/40 tracking-widest">Deneme Sikliği</p>
                <p className="text-3xl font-black">%{Math.round((trials.length / 30) * 100)}</p>
             </div>
             <div className="card p-6 flex flex-col justify-center items-center gap-2">
                <p className="text-[10px] font-black uppercase text-foreground/40 tracking-widest">Hata Analizi</p>
                <p className="text-3xl font-black">{trials.filter(t => t.mistakes.length > 0).length}/{trials.length}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
