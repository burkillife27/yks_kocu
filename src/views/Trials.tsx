import React, { useState, useMemo, useCallback } from 'react';
import { Trial, ExamBranch, TrialMistake, AppSettings } from '../types.ts';
import { storage } from '../lib/storage.ts';
import { Plus, BarChart3, Trash2, Info, ChevronDown, ChevronUp, Target, PieChart, TrendingUp, Zap, Pencil, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateNets, cn } from '../lib/utils.ts';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line
} from 'recharts';

const BRANCHES: ExamBranch[] = [
  "TYT Türkçe", "TYT Matematik", "TYT Fizik", "TYT Kimya", "TYT Biyoloji", "TYT Sosyal", "TYT Fen", "TYT GENEL",
  "AYT Matematik", "AYT Fizik", "AYT Kimya", "AYT Biyoloji", "AYT Fen", "AYT Edebiyat", "AYT Tarih-1", "AYT Coğrafya-1", "AYT Tarih-2", "AYT Coğrafya-2", "AYT Felsefe Grubu", "AYT Din Kültürü", "AYT GENEL",
  "Paragraf", "Problem", "Yabancı Dil (YDT)"
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const TYT_SUBJECTS = ["Türkçe", "Matematik", "Sosyal", "Fen"];
const AYT_SUBJECTS = ["Matematik", "Fizik", "Kimya", "Biyoloji", "Edebiyat", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü"];

const TrialItem = React.memo(({ 
  trial, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  deletingId, 
  setDeletingId 
}: { 
  trial: Trial, 
  isExpanded: boolean, 
  onToggle: (id: string) => void, 
  onEdit: (t: Trial, e: React.MouseEvent) => void, 
  onDelete: (id: string, e: React.MouseEvent) => void,
  deletingId: string | null,
  setDeletingId: (id: string | null) => void
}) => {
  return (
    <div className="card overflow-hidden transition-all hover:border-primary/30">
      <div 
        onClick={() => onToggle(trial.id)}
        className="p-6 cursor-pointer flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              {trial.net}
            </div>
            {trial.priority && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg">
                <Star size={10} fill="currentColor" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold">{trial.title}</h3>
            <p className="text-xs text-foreground/40 font-medium flex items-center gap-2">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                trial.difficulty === 'Kolay' ? "bg-green-500/10 text-green-500" :
                trial.difficulty === 'Zor' ? "bg-red-500/10 text-red-500" :
                "bg-blue-500/10 text-blue-500"
              )}>
                {trial.difficulty}
              </span>
              <span>{trial.type} {trial.branch ? `· ${trial.branch}` : ''} · {new Date(trial.date).toLocaleDateString('tr-TR')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
            <div className="text-green-500 text-center">
              <p className="opacity-40 text-[10px]">Doğru</p>
              <p>{trial.correct}</p>
            </div>
            <div className="text-red-500 text-center">
              <p className="opacity-40 text-[10px]">Yanlış</p>
              <p>{trial.wrong}</p>
            </div>
            <div className="text-foreground/40 text-center">
              <p className="opacity-40 text-[10px]">Boş</p>
              <p>{trial.empty}</p>
            </div>
            <div className="text-primary text-center">
              <p className="opacity-40 text-[10px]">Net</p>
              <p>{trial.net % 1 === 0 ? trial.net : trial.net.toFixed(2)}</p>
            </div>
            {trial.durationMinutes && (
              <div className="text-blue-500 text-center">
                <p className="opacity-40 text-[10px]">Süre</p>
                <p className="flex items-center gap-1 justify-center">{trial.durationMinutes} <span className="text-[8px]">dk</span></p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => onEdit(trial, e)}
              className="p-2 rounded-lg hover:bg-primary/10 text-foreground/20 hover:text-primary transition-colors"
            >
              <Pencil size={16} />
            </button>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(deletingId === trial.id ? null : trial.id);
                }} 
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  deletingId === trial.id ? "bg-red-500 text-white" : "hover:bg-red-500/10 text-foreground/20 hover:text-red-500"
                )}
              >
                <Trash2 size={16} />
              </button>
              {deletingId === trial.id && (
                <div className="absolute right-full mr-2 top-0 bg-card border border-border shadow-2xl rounded-xl p-2 flex gap-2 items-center min-w-[150px] z-20">
                   <span className="text-[10px] font-bold px-2">Emin misiniz?</span>
                   <button 
                     onClick={(e) => onDelete(trial.id, e)}
                     className="px-3 py-1 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors text-[10px]"
                   >
                     Evet
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                     className="px-3 py-1 bg-secondary text-foreground rounded-lg font-bold text-[10px]"
                   >
                     Hayır
                   </button>
                </div>
              )}
            </div>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 pt-2 border-t border-border bg-secondary/20 space-y-4"
          >
            {trial.subjects && trial.subjects.length > 0 && (
              <div className="overflow-x-auto">
                <h4 className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest mb-3 flex items-center gap-2">
                  <BarChart3 size={12} /> Detaylı Konu Analizi (Hata Odaklı Sıralama)
                </h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase text-foreground/40 font-bold border-b border-border/50">
                      <th className="pb-2">Branş</th>
                      <th className="pb-2 text-center">Doğru</th>
                      <th className="pb-2 text-center">Yanlış</th>
                      <th className="pb-2 text-center">Boş</th>
                      <th className="pb-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trial.subjects]
                      .sort((a, b) => (b.wrong + b.empty) - (a.wrong + a.empty))
                      .map((s, i) => {
                        const net = calculateNets(s.correct, s.wrong);
                        const totalErrors = s.wrong + s.empty;
                        return (
                          <tr key={i} className={cn(
                            "text-xs border-b border-border/30 last:border-0",
                            totalErrors > 5 ? "bg-red-500/5" : ""
                          )}>
                            <td className="py-3 font-bold pr-2">{s.name}</td>
                            <td className="py-3 text-center text-green-500 font-bold">{s.correct}</td>
                            <td className="py-3 text-center text-red-500 font-bold">{s.wrong}</td>
                            <td className="py-3 text-center text-foreground/40">{s.empty}</td>
                            <td className="py-3 text-right font-bold text-primary">{net.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {trial.mistakes.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest mb-3 flex items-center gap-2">
                  <Info size={12} /> Hata Yapılan Konular
                </h4>
                <div className="flex flex-wrap gap-2">
                  {trial.mistakes.map((m, i) => (
                    <span key={i} className="px-3 py-1 bg-card border border-border rounded-lg text-xs font-semibold flex items-center gap-2">
                      {m.topic} <span className="bg-red-500/10 text-red-500 px-1.5 rounded">{m.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {trial.notes && (
              <div>
                <h4 className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest mb-3 flex items-center gap-2">
                  <Pencil size={12} /> Deneme Notları
                </h4>
                <div className="p-4 rounded-xl bg-card border border-border text-xs leading-relaxed text-foreground/80">
                  {trial.notes}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function Trials({ trials, onRefresh, settings }: { trials: Trial[], onRefresh: () => void, settings: AppSettings }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrialId, setEditingTrialId] = useState<string | null>(null);
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [examTypeView, setExamTypeView] = useState<'TYT' | 'AYT'>('TYT');
  const [metricView, setMetricView] = useState<'net' | 'duration'>('net');
  const [sortField, setSortField] = useState<'date' | 'net' | 'branch'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBranch, setFilterBranch] = useState<ExamBranch | 'All'>('All');
  const [visibleCount, setVisibleCount] = useState(15);
  const [filterPriority, setFilterPriority] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<"TYT" | "AYT" | "Branş">('TYT');
  const [branch, setBranch] = useState<ExamBranch>("TYT Matematik");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [empty, setEmpty] = useState(0);
  const [duration, setDuration] = useState(135);
  const [difficulty, setDifficulty] = useState<"Kolay" | "Orta" | "Zor">('Orta');
  const [priority, setPriority] = useState(false);
  const [notes, setNotes] = useState('');
  const [mistakes, setMistakes] = useState<TrialMistake[]>([]);
  const [newMistakeTopic, setNewMistakeTopic] = useState('');
  const [newMistakeCount, setNewMistakeCount] = useState(1);
  const [mistakeWarning, setMistakeWarning] = useState<string | null>(null);

  const [subjectData, setSubjectData] = useState<Record<string, { correct: number, wrong: number, empty: number }>>({});

  // Get unique topics from previous trials for suggestions
  const topicSuggestions = useMemo(() => {
    const uniqueTopics = new Set<string>();
    trials.forEach(t => t.mistakes.forEach(m => uniqueTopics.add(m.topic)));
    return Array.from(uniqueTopics);
  }, [trials]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCorrect = correct;
    let finalWrong = wrong;
    let finalEmpty = empty;
    let subjects: Trial['subjects'] = undefined;

    if (type !== 'Branş') {
      const currentSubjects = type === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS;
      subjects = currentSubjects.map(name => ({
        name,
        correct: subjectData[name]?.correct || 0,
        wrong: subjectData[name]?.wrong || 0,
        empty: subjectData[name]?.empty || 0,
      }));
      
      finalCorrect = subjects.reduce((acc, s) => acc + s.correct, 0);
      finalWrong = subjects.reduce((acc, s) => acc + s.wrong, 0);
      finalEmpty = subjects.reduce((acc, s) => acc + s.empty, 0);
    }

    const net = calculateNets(finalCorrect, finalWrong);
    const trialData: Trial = {
      id: editingTrialId || crypto.randomUUID(),
      title,
      type,
      difficulty,
      branch: type === 'Branş' ? branch : undefined,
      date,
      correct: finalCorrect,
      wrong: finalWrong,
      empty: finalEmpty,
      net,
      durationMinutes: duration,
      priority,
      notes,
      subjects,
      mistakes
    };

    if (editingTrialId) {
      await storage.saveTrials(trials.map(t => t.id === editingTrialId ? trialData : t));
    } else {
      await storage.saveTrials([...trials, trialData]);
    }

    closeModal();
    onRefresh();
  };

  const openEditModal = useCallback((trial: Trial, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrialId(trial.id);
    setTitle(trial.title);
    setType(trial.type);
    if (trial.branch) setBranch(trial.branch);
    setDate(trial.date);
    setCorrect(trial.correct);
    setWrong(trial.wrong);
    setEmpty(trial.empty);
    setDuration(trial.durationMinutes || 0);
    setDifficulty(trial.difficulty);
    setPriority(trial.priority || false);
    setNotes(trial.notes || '');
    setMistakes(trial.mistakes);
    
    const subData: Record<string, { correct: number, wrong: number, empty: number }> = {};
    trial.subjects?.forEach(s => {
      subData[s.name] = { correct: s.correct, wrong: s.wrong, empty: s.empty };
    });
    setSubjectData(subData);
    
    setIsModalOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setEditingTrialId(null);
    setTitle('');
    setType('TYT');
    setBranch('TYT Matematik');
    setDate(new Date().toISOString().split('T')[0]);
    setCorrect(0);
    setWrong(0);
    setEmpty(0);
    setDuration(135);
    setDifficulty('Orta');
    setPriority(false);
    setNotes('');
    setMistakes([]);
    setSubjectData({});
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const addMistake = () => {
    if (!newMistakeTopic) return;
    
    // Check for duplicates
    if (mistakes.some(m => m.topic.toLowerCase() === newMistakeTopic.toLowerCase())) {
      setMistakeWarning(`"${newMistakeTopic}" konusu zaten listede var!`);
      setTimeout(() => setMistakeWarning(null), 3000);
      return;
    }

    setMistakes([...mistakes, { topic: newMistakeTopic, count: newMistakeCount }]);
    setNewMistakeTopic('');
    setNewMistakeCount(1);
  };

  const removeMistake = (index: number) => {
    setMistakes(mistakes.filter((_, i) => i !== index));
  };

  const deleteTrial = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await storage.saveTrials(trials.filter(t => t.id !== id));
    setDeletingId(null);
    onRefresh();
  }, [trials, onRefresh]);

  const handleToggle = useCallback((id: string) => {
    setExpandedTrial(prev => prev === id ? null : id);
  }, []);

  const tytHistory = useMemo(() => trials.filter(t => t.type === 'TYT').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [trials]);
  const aytHistory = useMemo(() => trials.filter(t => t.type === 'AYT').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [trials]);

  const tytTrials = useMemo(() => [...tytHistory].slice(-3), [tytHistory]);
  const aytTrials = useMemo(() => [...aytHistory].slice(-3), [aytHistory]);
  
  const avgTytNet = useMemo(() => tytTrials.length > 0 ? tytTrials.reduce((acc, t) => acc + t.net, 0) / tytTrials.length : 0, [tytTrials]);
  const avgAytNet = useMemo(() => aytTrials.length > 0 ? aytTrials.reduce((acc, t) => acc + t.net, 0) / aytTrials.length : 0, [aytTrials]);
  
  const tytProgress = useMemo(() => Math.min(100, (avgTytNet / (settings.targetNets?.tyt || 1)) * 100), [avgTytNet, settings.targetNets]);
  const aytProgress = useMemo(() => Math.min(100, (avgAytNet / (settings.targetNets?.ayt || 1)) * 100), [avgAytNet, settings.targetNets]);

  const chartData = useMemo(() => {
    const history = examTypeView === 'TYT' ? tytHistory : aytHistory;
    return history.map(t => ({
      date: new Date(t.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      net: t.net,
      duration: t.durationMinutes || 0,
      title: t.title
    }));
  }, [examTypeView, tytHistory, aytHistory]);

  const filteredAndSortedTrials = useMemo(() => {
    let result = [...trials];
    
    // Filter
    if (filterBranch !== 'All') {
      result = result.filter(t => (t.branch === filterBranch) || (t.type === filterBranch as any) || (t.type === 'Branş' && t.branch === filterBranch));
    }

    if (filterPriority) {
      result = result.filter(t => t.priority);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'net') {
        comparison = a.net - b.net;
      } else if (sortField === 'branch') {
        const branchA = a.branch || a.type;
        const branchB = b.branch || b.type;
        comparison = branchA.localeCompare(branchB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [trials, sortField, sortOrder, filterBranch, filterPriority]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Denemelerim</h2>
          <p className="text-foreground/60">Girdiğin tüm denemeleri buradan yönetebilirsin.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Plus size={20} /> Deneme Ekle
          </button>
        </div>
      </div>

      {/* Analytics Shortcut */}
      <div 
        onClick={() => window.dispatchEvent(new CustomEvent('change-view', { detail: 'analytics' }))}
        className="card p-6 bg-gradient-to-r from-primary/10 to-transparent border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer hover:border-primary/40 transition-all group"
      >
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
               <TrendingUp size={24} />
            </div>
            <div>
               <h3 className="font-bold">Detaylı Gelişim Analizi</h3>
               <p className="text-sm text-foreground/60">Grafikler, branş analizleri ve süre takibi artık tek bir yerde.</p>
            </div>
         </div>
         <div className="flex items-center gap-2 text-xs font-bold text-primary animate-pulse group-hover:translate-x-1 transition-transform">
            Grafikler Sekmesine Bak <Zap size={14} />
         </div>
      </div>

      {/* Filters & Sorting Controls */}
      <div className="flex flex-wrap items-center gap-4 bg-secondary/10 p-4 rounded-2xl border border-border/50">
        <div className="flex flex-col gap-1.5 grow">
          <label className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest px-1">Ders Filtresi</label>
          <select 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value as any)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="All">Tüm Dersler</option>
            <optgroup label="Genel Denemeler">
              <option value="TYT">TYT Genel</option>
              <option value="AYT">AYT Genel</option>
            </optgroup>
            <optgroup label="Branş Denemeleri">
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest px-1">Sıralama Ölçütü</label>
          <select 
            value={sortField} 
            onChange={(e) => setSortField(e.target.value as any)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="date">Tarih</option>
            <option value="net">Net Sayısı</option>
            <option value="branch">Branş Adı</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <label className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest px-1">Yön</label>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-between px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold hover:bg-secondary/30 transition-colors"
          >
            {sortOrder === 'asc' ? 'Artan' : 'Azalan'}
            {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <label className="text-[10px] font-bold uppercase text-foreground/40 tracking-widest px-1">Öncelik</label>
          <button 
            onClick={() => setFilterPriority(!filterPriority)}
            className={cn(
              "flex items-center justify-between px-4 py-2 border rounded-xl text-sm font-bold transition-all",
              filterPriority ? "bg-amber-500/10 border-amber-500 text-amber-600" : "bg-card border-border hover:bg-secondary/30"
            )}
          >
            Öncelikli
            <Star size={16} fill={filterPriority ? "currentColor" : "none"} className={filterPriority ? "text-amber-500" : "text-foreground/40"} />
          </button>
        </div>

        {filterBranch !== 'All' || filterPriority && (
          <button 
            onClick={() => { setFilterBranch('All'); setFilterPriority(false); setSortField('date'); setSortOrder('desc'); }}
            className="mt-5 text-[10px] font-bold uppercase text-primary hover:underline"
          >
            Sıfırla
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredAndSortedTrials.slice(0, visibleCount).map((trial) => (
          <TrialItem 
            key={trial.id}
            trial={trial}
            isExpanded={expandedTrial === trial.id}
            onToggle={handleToggle}
            onEdit={openEditModal}
            onDelete={deleteTrial}
            deletingId={deletingId}
            setDeletingId={setDeletingId}
          />
        ))}

        {filteredAndSortedTrials.length > visibleCount && (
          <div className="pt-4 flex justify-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 15)}
              className="flex items-center gap-2 px-8 py-3 bg-secondary/50 hover:bg-secondary border border-border rounded-xl text-sm font-bold transition-all"
            >
              Daha Fazla Göster ({filteredAndSortedTrials.length - visibleCount} kaldı)
            </button>
          </div>
        )}

        {trials.length === 0 && (
          <div className="card p-20 text-center space-y-4">
             <div className="w-20 h-20 bg-secondary flex items-center justify-center rounded-full mx-auto">
                <BarChart3 className="text-foreground/20" size={40} />
             </div>
             <p className="text-foreground/40 font-medium">Henüz deneme kaydı girmedin. İlk denemeni eklemek için yukarıdaki butonu kullan.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl card p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">{editingTrialId ? 'Denemeyi Düzenle' : 'Deneme Sonucu Gir'}</h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-foreground/40">Deneme Adı</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" placeholder="Örn: 3D Türkiye Geneli" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                     <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-foreground/40">Tür</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none">
                           <option value="TYT">TYT</option>
                           <option value="AYT">AYT</option>
                           <option value="Branş">Branş</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-foreground/40">Zorluk</label>
                        <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none">
                           <option value="Kolay">Kolay</option>
                           <option value="Orta">Orta</option>
                           <option value="Zor">Zor</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-foreground/40">Tarih</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-foreground/40 flex items-center gap-2">
                       Çözme Süresi (Dakika)
                    </label>
                    <input 
                      type="number" 
                      value={duration || ""} 
                      onChange={e => setDuration(parseInt(e.target.value) || 0)} 
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" 
                      placeholder="Dakika cinsinden süre..." 
                    />
                  </div>
                  {type === 'Branş' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-foreground/40">Branş Seçimi</label>
                      <select value={branch} onChange={e => setBranch(e.target.value as ExamBranch)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none">
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
                  )}
                </div>

                <div className="flex items-center gap-3 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                  <input 
                    type="checkbox" 
                    id="priority-checkbox" 
                    checked={priority} 
                    onChange={e => setPriority(e.target.checked)} 
                    className="w-5 h-5 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="priority-checkbox" className="text-sm font-bold text-amber-700 cursor-pointer flex items-center gap-2">
                    <Star size={16} fill="currentColor" /> Bu denemeyi öncelikli olarak işaretle
                  </label>
                </div>

                {type === 'Branş' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-foreground/40 text-green-500">Doğru</label>
                      <input type="number" value={correct || 0} onChange={e => setCorrect(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-foreground/40 text-red-500">Yanlış</label>
                      <input type="number" value={wrong || 0} onChange={e => setWrong(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-foreground/40">Boş</label>
                      <input type="number" value={empty || 0} onChange={e => setEmpty(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-foreground/40 text-primary">Net</label>
                      <div className="w-full px-4 py-3 rounded-xl border border-border bg-primary/10 text-primary font-bold text-center">
                        {calculateNets(correct, wrong).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase text-foreground/40">Ders Bazlı Sonuçlar</label>
                    <div className="space-y-3">
                      {(type === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS).map(sub => (
                        <div key={sub} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 rounded-xl bg-secondary/30 border border-border">
                          <span className="text-sm font-bold truncate">{sub}</span>
                          <div className="flex gap-2 col-span-3">
                            <div className="flex-1 space-y-1">
                               <p className="text-[10px] font-bold text-green-500 uppercase text-center">D</p>
                               <input 
                                 type="number" 
                                 placeholder="D"
                                 value={subjectData[sub]?.correct ?? ""} 
                                 onChange={e => setSubjectData(prev => ({ ...prev, [sub]: { ...(prev[sub] || { correct: 0, wrong: 0, empty: 0 }), correct: parseInt(e.target.value) || 0 } }))}
                                 className="w-full px-2 py-2 rounded-lg border border-border bg-background outline-none text-sm text-center" 
                               />
                            </div>
                            <div className="flex-1 space-y-1">
                               <p className="text-[10px] font-bold text-red-500 uppercase text-center">Y</p>
                               <input 
                                 type="number" 
                                 placeholder="Y"
                                 value={subjectData[sub]?.wrong ?? ""} 
                                 onChange={e => setSubjectData(prev => ({ ...prev, [sub]: { ...(prev[sub] || { correct: 0, wrong: 0, empty: 0 }), wrong: parseInt(e.target.value) || 0 } }))}
                                 className="w-full px-2 py-2 rounded-lg border border-border bg-background outline-none text-sm text-center" 
                               />
                            </div>
                            <div className="flex-1 space-y-1">
                               <p className="text-[10px] font-bold text-foreground/40 uppercase text-center">B</p>
                               <input 
                                 type="number" 
                                 placeholder="B"
                                 value={subjectData[sub]?.empty ?? ""} 
                                 onChange={e => setSubjectData(prev => ({ ...prev, [sub]: { ...(prev[sub] || { correct: 0, wrong: 0, empty: 0 }), empty: parseInt(e.target.value) || 0 } }))}
                                 className="w-full px-2 py-2 rounded-lg border border-border bg-background outline-none text-sm text-center" 
                               />
                            </div>
                            <div className="flex-1 space-y-1">
                               <p className="text-[10px] font-bold text-primary uppercase text-center">Net</p>
                               <div className="w-full px-2 py-2 rounded-lg border border-border bg-primary/10 text-primary font-bold text-sm text-center">
                                 {calculateNets(subjectData[sub]?.correct || 0, subjectData[sub]?.wrong || 0).toFixed(2)}
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase text-foreground/40">Notlar</label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none min-h-[100px] resize-y" 
                    placeholder="Deneme ile ilgili kritik notlar, hissettiklerin veya analizlerin..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase text-foreground/40">Hata Analizi (Opsiyonel)</label>
                  {mistakeWarning && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-2 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20">
                      {mistakeWarning}
                    </motion.div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input 
                        list="topic-suggestions"
                        value={newMistakeTopic} 
                        onChange={e => setNewMistakeTopic(e.target.value)} 
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none" 
                        placeholder="Konu başlığı..." 
                      />
                      <datalist id="topic-suggestions">
                        {topicSuggestions.map(topic => (
                          <option key={topic} value={topic} />
                        ))}
                      </datalist>
                    </div>
                    <input type="number" value={newMistakeCount || 0} onChange={e => setNewMistakeCount(parseInt(e.target.value) || 0)} className="w-20 px-4 py-3 rounded-xl border border-border bg-background outline-none" />
                    <button type="button" onClick={addMistake} className="px-6 py-3 bg-secondary rounded-xl font-bold hover:bg-secondary/80">+</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mistakes.map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-secondary rounded-lg text-xs font-semibold flex items-center gap-2">
                        {m.topic} ({m.count})
                        <button type="button" onClick={() => removeMistake(i)} className="text-foreground/40 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors text-sm">Vazgeç</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 transition-opacity text-sm">
                    {editingTrialId ? 'Değişiklikleri Kaydet' : 'Denemeyi Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
