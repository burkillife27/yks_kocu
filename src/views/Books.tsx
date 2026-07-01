import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, Target, Clock, BookOpen, Filter, ArrowUpDown, CheckCircle2, Circle, AlertCircle, Info, StickyNote, Star, Ban } from 'lucide-react';
import { Book, BookType, ExamBranch, AppSettings } from '../types.ts';
import { storage } from '../lib/storage.ts';
import { cn, formatDuration } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

const BRANCHES: ExamBranch[] = [
  "TYT Türkçe", "TYT Matematik", "TYT Fizik", "TYT Kimya", "TYT Biyoloji", "TYT Sosyal", "TYT Fen", "TYT GENEL",
  "AYT Matematik", "AYT Fizik", "AYT Kimya", "AYT Biyoloji", "AYT Fen", "AYT Edebiyat", "AYT Tarih-1", "AYT Coğrafya-1", "AYT Tarih-2", "AYT Coğrafya-2", "AYT Felsefe Grubu", "AYT Din Kültürü", "AYT GENEL",
  "Paragraf", "Problem", "Yabancı Dil (YDT)"
];

const TYPES: BookType[] = ["Konu Anlatım", "Soru Bankası", "Deneme"];

type SortOption = 'name' | 'progress' | 'date' | 'branch';
type FilterStatus = 'all' | 'completed' | 'in-progress';
type FilterForecast = 'all' | 'delayed' | 'on-track';

const BookCard = React.memo(({ 
  book, 
  daysUntilExam, 
  onNotes, 
  onEdit, 
  onDelete, 
  onToggleDisable,
  deletingId, 
  setDeletingId 
}: { 
  book: Book, 
  daysUntilExam: number, 
  onNotes: (b: Book) => void, 
  onEdit: (b: Book) => void, 
  onDelete: (id: string) => void,
  onToggleDisable: (id: string) => void,
  deletingId: string | null,
  setDeletingId: (id: string | null) => void
}) => {
  const progress = useMemo(() => (book.completedUnits / book.totalUnits) * 100, [book.completedUnits, book.totalUnits]);
  const remaining = book.totalUnits - book.completedUnits;
  const requiredPerDay = useMemo(() => remaining / daysUntilExam, [remaining, daysUntilExam]);
  const isDelayed = !book.isCompleted && requiredPerDay > 5;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "card p-6 space-y-4 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col",
        book.isDisabled && "opacity-60 border-rose-500/20"
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1.5 overflow-hidden">
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary rounded-lg border border-primary/10">
              {book.branch}
            </span>
            {book.priority && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
                KRİTİK
              </span>
            )}
            {isDelayed && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
                HIZLAN!
              </span>
            )}
            {book.isDisabled && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-rose-500 text-white rounded-lg border border-rose-600 shadow-sm animate-pulse">
                DEVRE DIŞI
              </span>
            )}
          </div>
          <h3 className="font-black text-xl leading-tight truncate">{book.title}</h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => onNotes(book)} 
            className={cn(
              "p-2.5 rounded-xl transition-colors shadow-sm",
              book.notes ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-primary/20 text-foreground/60 hover:text-primary"
            )}
            title="Çalışma Planı & Notlar"
          >
            <StickyNote size={16} />
          </button>
          <button 
            onClick={() => onToggleDisable(book.id)} 
            className={cn(
              "p-2.5 rounded-xl transition-colors shadow-sm",
              book.isDisabled ? "bg-rose-500 text-white shadow-rose-500/10" : "bg-secondary hover:bg-rose-500/20 text-foreground/60 hover:text-rose-500"
            )}
            title={book.isDisabled ? "Aktifleştir" : "Devre Dışı Bırak"}
          >
            <Ban size={16} />
          </button>
          <button 
            onClick={() => onEdit(book)} 
            className="p-2.5 bg-secondary hover:bg-primary/20 rounded-xl text-foreground/60 hover:text-primary transition-colors shadow-sm"
            title="Düzenle"
          >
            <Edit2 size={16} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setDeletingId(deletingId === book.id ? null : book.id)} 
              className={cn(
                "p-2.5 rounded-xl transition-colors shadow-sm",
                deletingId === book.id ? "bg-red-500 text-white" : "bg-secondary hover:bg-red-500/20 text-foreground/60 hover:text-red-500"
              )}
              title="Sil"
            >
              <Trash2 size={16} />
            </button>
            <AnimatePresence>
              {deletingId === book.id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-40 p-2 bg-card border border-border rounded-xl shadow-2xl z-20 space-y-2"
                >
                  <p className="text-[10px] font-bold text-center uppercase tracking-widest opacity-60">Emin misiniz?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDelete(book.id)}
                      className="flex-1 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg"
                    >
                      Sil
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="flex-1 py-1.5 bg-secondary text-[10px] font-bold rounded-lg"
                    >
                      Hayır
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-bold text-foreground/60 bg-secondary/30 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5">
          < BookOpen size={14} className="text-primary" />
          {book.type}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock size={14} className="text-primary" />
          ~{formatDuration(book.totalUnits * book.minutesPerUnit)}
        </div>
      </div>

      {book.notes && (
        <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl cursor-help" onClick={() => onNotes(book)}>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
            <StickyNote size={10} /> Özel Talimat
          </p>
          <p className="text-xs text-foreground/70 italic line-clamp-2">"{book.notes}"</p>
        </div>
      )}

      <div className="space-y-3 pt-2 mt-auto">
        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-foreground/40">
          <span>İlerleme DURUMU</span>
          <span className="text-green-500">
            {book.isCompleted ? 'BİTTİ' : `%${Math.round(progress)}`}
          </span>
        </div>
        <div className="h-3 w-full bg-red-500 rounded-full overflow-hidden p-0.5 border border-red-600/20 shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full rounded-full transition-all duration-500 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-foreground/30">
          <span>{book.completedUnits} {book.unitType} BİTTİ</span>
          <span>{book.totalUnits} {book.unitType} HEDEF</span>
        </div>
      </div>

      {isDelayed && (
        <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse">
          <AlertCircle size={12} />
          Günde ~{requiredPerDay.toFixed(1)} {book.unitType} çözülmeli
        </div>
      )}
    </motion.div>
  );
});

export default function Books({ books, tasks, settings, onRefresh }: { books: Book[], tasks: any[], settings: AppSettings, onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book|null>(null);
  const [isBranchNotesModalOpen, setIsBranchNotesModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedBookForNotes, setSelectedBookForNotes] = useState<Book|null>(null);
  const [bookNoteText, setBookNoteText] = useState('');
  const [tempNotes, setTempNotes] = useState<Partial<Record<ExamBranch, string>>>(settings.branchNotes || {});

  // Filter & Sort State
  const [filterBranch, setFilterBranch] = useState<ExamBranch | 'all'>('all');
  const [filterType, setFilterType] = useState<BookType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterForecast, setFilterForecast] = useState<FilterForecast>('all');
  const [filterPriority, setFilterPriority] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<BookType>('Soru Bankası');
  const [branch, setBranch] = useState<ExamBranch>('TYT Matematik');
  const [totalUnits, setTotalUnits] = useState(100);
  const [completedUnits, setCompletedUnits] = useState(0);
  const [unitType, setUnitType] = useState<'sayfa' | 'test'>('test');
  const [minutesPerUnit, setMinutesPerUnit] = useState(5);
  const [priority, setPriority] = useState(false);
  const [isDisabledState, setIsDisabledState] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [notes, setNotes] = useState('');

  const daysUntilExam = useMemo(() => {
    const diff = new Date(settings.yksDate).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [settings.yksDate]);

  const sortedAndFilteredBooks = useMemo(() => {
    let result = books.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = filterBranch === 'all' || b.branch === filterBranch;
      const matchesType = filterType === 'all' || b.type === filterType;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'completed' ? b.isCompleted : !b.isCompleted);
      
      let matchesForecast = true;
      if (filterForecast !== 'all') {
        const remaining = b.totalUnits - b.completedUnits;
        const requiredPerDay = remaining / daysUntilExam;
        const isOnTrack = b.isCompleted || requiredPerDay <= 5; // Basit eşik değeri
        matchesForecast = filterForecast === 'on-track' ? isOnTrack : !isOnTrack;
      }

      const matchesPriority = !filterPriority || b.priority;

      return matchesSearch && matchesBranch && matchesType && matchesStatus && matchesForecast && matchesPriority;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'progress':
          comparison = (a.completedUnits / a.totalUnits) - (b.completedUnits / b.totalUnits);
          break;
        case 'date':
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        case 'branch':
          comparison = a.branch.localeCompare(b.branch);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [books, searchTerm, filterBranch, filterType, filterStatus, filterForecast, filterPriority, sortBy, sortOrder, daysUntilExam]);

  const toggleDay = (day: number) => {
    setAllowedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBook: Book = {
      id: editingBook?.id || crypto.randomUUID(),
      title,
      type,
      branch,
      totalUnits,
      unitType,
      completedUnits,
      minutesPerUnit,
      createdAt: editingBook?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isCompleted: completedUnits >= totalUnits,
      priority,
      isDisabled: isDisabledState,
      dailyLimit,
      allowedDays,
      notes: notes.trim() || undefined
    };

    const updatedBooks = editingBook 
      ? books.map(b => b.id === editingBook.id ? newBook : b)
      : [...books, newBook];

    await storage.saveBooks(updatedBooks);
    setIsModalOpen(false);
    setEditingBook(null);
    onRefresh();
    // Sıfırla
    setTitle("");
    setPriority(false);
    setIsDisabledState(false);
    setDailyLimit(0);
    setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
    setNotes('');
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    await storage.saveBooks(books.filter(b => b.id !== id));
    setDeletingId(null);
    onRefresh();
  }, [books, onRefresh]);

  const handleToggleDisable = useCallback(async (id: string) => {
    const updatedBooks = books.map(b => 
      b.id === id ? { ...b, isDisabled: !b.isDisabled } : b
    );
    await storage.saveBooks(updatedBooks);
    onRefresh();
  }, [books, onRefresh]);

  const bulkDisable = useCallback(async () => {
    const filteredIds = sortedAndFilteredBooks.map(b => b.id);
    const updatedBooks = books.map(b => 
      filteredIds.includes(b.id) ? { ...b, isDisabled: true } : b
    );
    await storage.saveBooks(updatedBooks);
    onRefresh();
  }, [books, sortedAndFilteredBooks, onRefresh]);

  const bulkEnable = useCallback(async () => {
    const filteredIds = sortedAndFilteredBooks.map(b => b.id);
    const updatedBooks = books.map(b => 
      filteredIds.includes(b.id) ? { ...b, isDisabled: false } : b
    );
    await storage.saveBooks(updatedBooks);
    onRefresh();
  }, [books, sortedAndFilteredBooks, onRefresh]);

  const handleSaveBranchNotes = async () => {
    const updatedSettings = {
      ...settings,
      branchNotes: tempNotes
    };
    await storage.saveSettings(updatedSettings);
    setIsBranchNotesModalOpen(false);
    onRefresh();
  };

  const handleSaveBookNote = async () => {
    if (!selectedBookForNotes) return;
    const updatedBooks = books.map(b => 
      b.id === selectedBookForNotes.id ? { ...b, notes: bookNoteText.trim() || undefined } : b
    );
    await storage.saveBooks(updatedBooks);
    setIsNotesModalOpen(false);
    setSelectedBookForNotes(null);
    onRefresh();
  };

  const openBookNotes = useCallback((book: Book) => {
    setSelectedBookForNotes(book);
    setBookNoteText(book.notes || '');
    setIsNotesModalOpen(true);
  }, []);

  const openEdit = useCallback((book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setType(book.type);
    setBranch(book.branch);
    setTotalUnits(book.totalUnits);
    setCompletedUnits(book.completedUnits || 0);
    setUnitType(book.unitType);
    setMinutesPerUnit(book.minutesPerUnit);
    setPriority(book.priority || false);
    setIsDisabledState(book.isDisabled || false);
    setDailyLimit(book.dailyLimit || 0);
    setAllowedDays(book.allowedDays || [0, 1, 2, 3, 4, 5, 6]);
    setNotes(book.notes || '');
    setIsModalOpen(true);
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Kütüphanem</h2>
          <p className="text-foreground/60">YKS yolculuğundaki kaynaklarını buradan yönetebilirsin.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setTempNotes(settings.branchNotes || {});
              setIsBranchNotesModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-2xl font-bold hover:bg-secondary transition-all active:scale-95"
          >
            <Info size={20} /> Branş Analizleri
          </button>
          <button 
            onClick={() => { 
            setEditingBook(null); 
            setTitle(''); 
            setType('Soru Bankası');
            setBranch('TYT Matematik');
            setTotalUnits(100);
            setCompletedUnits(0);
            setUnitType('test');
            setMinutesPerUnit(5);
            setPriority(false);
            setIsDisabledState(false);
            setDailyLimit(0);
            setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
            setNotes('');
            setIsModalOpen(true); 
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={20} /> Kitap Ekle
        </button>
      </div>
    </div>

      <div className="space-y-4">
        {/* Arama ve Ana Kontroller */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
            <input 
              type="text" 
              placeholder="Kitap ismine göre ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-3xl border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-foreground/20"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-2xl shadow-sm">
                <div className="flex px-2 items-center gap-2 text-xs font-bold text-foreground/40 uppercase tracking-widest border-r border-border pr-2">
                  <ArrowUpDown size={14} /> Sırala
                </div>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs font-bold outline-none px-2 py-2 cursor-pointer"
                >
                  <option value="date">Eklenme Tarihi</option>
                  <option value="name">Alfabetik</option>
                  <option value="progress">Tamamlanma %</option>
                  <option value="branch">Derse Göre</option>
                </select>
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors"
                >
                  <ArrowUpDown size={14} className={cn(sortOrder === 'desc' ? 'rotate-180' : '')} />
                </button>
             </div>

             <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-2xl shadow-sm">
                <div className="flex px-2 items-center gap-2 text-xs font-bold text-foreground/40 uppercase tracking-widest border-r border-border pr-2">
                  <Filter size={14} /> Branş
                </div>
                <select 
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value as ExamBranch | 'all')}
                  className="bg-transparent text-xs font-bold outline-none px-2 py-2 cursor-pointer max-w-[120px]"
                >
                  <option value="all">Hepsi</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>

             <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-2xl shadow-sm">
                <div className="flex px-2 items-center gap-2 text-xs font-bold text-foreground/40 uppercase tracking-widest border-r border-border pr-2">
                  <BookOpen size={14} /> Kitap Türü
                </div>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as BookType | 'all')}
                  className="bg-transparent text-xs font-bold outline-none px-2 py-2 cursor-pointer max-w-[120px]"
                >
                  <option value="all">Hepsi</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
          </div>
        </div>

        {/* İkincil Filtreler */}
        <div className="flex flex-wrap gap-2">
           {[
             { id: 'all', label: 'Tüm Kitaplar', icon: BookOpen },
             { id: 'in-progress', label: 'Devam Edenler', icon: Circle },
             { id: 'completed', label: 'Bitenler', icon: CheckCircle2 }
           ].map(item => (
             <button
               key={item.id}
               onClick={() => setFilterStatus(item.id as FilterStatus)}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                 filterStatus === item.id 
                  ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20" 
                  : "bg-card text-foreground/60 border-border hover:border-green-500/40"
               )}
             >
               <item.icon size={14} />
               {item.label}
             </button>
           ))}

           <div className="w-px h-8 bg-border mx-2 hidden md:block" />

           {[
             { id: 'all', label: 'Tüm Zamanlar', icon: Calendar },
             { id: 'on-track', label: 'Yetişiyor', icon: Target },
             { id: 'delayed', label: 'Gecikmede', icon: AlertCircle }
           ].map(item => (
             <button
               key={item.id}
               onClick={() => setFilterForecast(item.id as FilterForecast)}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                 filterForecast === item.id 
                  ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20" 
                  : "bg-card text-foreground/60 border-border hover:border-green-500/40"
               )}
             >
               <item.icon size={14} />
               {item.label}
             </button>
           ))}

           <div className="w-px h-8 bg-border mx-2 hidden md:block" />

           <button
             onClick={() => setFilterPriority(!filterPriority)}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
               filterPriority 
                ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20" 
                : "bg-card text-foreground/60 border-border hover:border-amber-500/40"
             )}
           >
             <Star size={14} fill={filterPriority ? "currentColor" : "none"} />
             Sadece Öncelikliler
           </button>
        </div>
      </div>

      {sortedAndFilteredBooks.length > 0 && (searchTerm || filterBranch !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterForecast !== 'all' || filterPriority) && (
        <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-foreground">Toplu İşlemler</h4>
            <p className="text-xs text-foreground/60 leading-relaxed font-medium">
              Filtrelenmiş olan <span className="text-primary font-black">{sortedAndFilteredBooks.length}</span> kaynak için toplu eylem gerçekleştirebilirsiniz. Devre dışı bırakılan kaynaklar yapay zekaya gönderilmez.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={bulkDisable}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/10 active:scale-95 transition-all"
            >
              Tümünü Devre Dışı Bırak
            </button>
            <button
              onClick={bulkEnable}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
            >
              Tümünü Aktifleştir
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAndFilteredBooks.map((book) => (
          <BookCard 
            key={book.id}
            book={book}
            daysUntilExam={daysUntilExam}
            onNotes={openBookNotes}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleDisable={handleToggleDisable}
            deletingId={deletingId}
            setDeletingId={setDeletingId}
          />
        ))}
        
        {sortedAndFilteredBooks.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <Search size={40} className="text-foreground/20" />
             </div>
             <h3 className="text-xl font-bold opacity-40">Kitap bulunamadı</h3>
             <p className="text-sm text-foreground/40">Filtrelerinizi değiştirerek tekrar deneyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-xl card p-8 shadow-2xl border border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black">{editingBook ? 'Kitabı Güncelle' : 'Yeni Kaynak Ekle'}</h2>
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="text-primary" size={24} />
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Kitabın Adı</label>
                  <input 
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-border bg-background focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold"
                    placeholder="Örn: 3-4-5 TYT Matematik"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Kaynak Türü</label>
                    <select 
                      value={type}
                      onChange={e => setType(e.target.value as BookType)}
                      className="w-full px-5 py-4 rounded-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Branş / Ders</label>
                    <select 
                      value={branch}
                      onChange={e => setBranch(e.target.value as ExamBranch)}
                      className="w-full px-5 py-4 rounded-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Toplam Kapsam</label>
                    <div className="flex">
                      <input 
                        type="number"
                        min="1"
                        value={totalUnits || 0}
                        onChange={e => setTotalUnits(parseInt(e.target.value) || 0)}
                        className="w-full px-5 py-4 rounded-l-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                      />
                      <select 
                        value={unitType}
                        onChange={e => setUnitType(e.target.value as 'sayfa' | 'test')}
                        className="px-5 border border-l-0 border-border bg-secondary rounded-r-2xl outline-none text-xs font-black uppercase tracking-widest"
                      >
                        <option value="test">Test</option>
                        <option value="sayfa">Sayfa</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Tamamlanan ({unitType})</label>
                    <input 
                      type="number"
                      min="0"
                      max={totalUnits}
                      value={completedUnits || 0}
                      onChange={e => setCompletedUnits(parseInt(e.target.value) || 0)}
                      className="w-full px-5 py-4 rounded-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Birim Süre (Dakika)</label>
                    <input 
                      type="number"
                      min="1"
                      value={minutesPerUnit || 0}
                      onChange={e => setMinutesPerUnit(parseInt(e.target.value) || 0)}
                      className="w-full px-5 py-4 rounded-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Günlük Limit (0=Sınırsız)</label>
                    <input 
                      type="number"
                      min="0"
                      value={dailyLimit || 0}
                      onChange={e => setDailyLimit(parseInt(e.target.value) || 0)}
                      className="w-full px-5 py-4 rounded-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 bg-secondary/50 p-4 rounded-2xl border border-border">
                    <input 
                      type="checkbox"
                      id="priority"
                      checked={priority}
                      onChange={e => setPriority(e.target.checked)}
                      className="w-6 h-6 rounded-lg border-border bg-background text-primary focus:ring-primary accent-primary"
                    />
                    <div className="flex flex-col">
                      <label htmlFor="priority" className="text-sm font-black uppercase tracking-widest cursor-pointer">KRİTİK HEDEF</label>
                      <span className="text-[10px] text-foreground/40 font-bold">MUTLAKA BİTİRİLECEK</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-secondary/50 p-4 rounded-2xl border border-border">
                    <input 
                      type="checkbox"
                      id="isDisabled"
                      checked={isDisabledState}
                      onChange={e => setIsDisabledState(e.target.checked)}
                      className="w-6 h-6 rounded-lg border-rose-500/20 bg-background text-rose-500 focus:ring-rose-500 accent-rose-500"
                    />
                    <div className="flex flex-col">
                      <label htmlFor="isDisabled" className="text-sm font-black uppercase tracking-widest text-rose-500 cursor-pointer">DEVRE DIŞI BIRAK</label>
                      <span className="text-[10px] text-rose-500/60 font-bold">YAPAY ZEKAYA İLETİLMESİN</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Hangi Günler Çalışılacak?</label>
                    <button 
                      type="button"
                      onClick={() => {
                        if (allowedDays.length === 7) setAllowedDays([]);
                        else setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
                    >
                      {allowedDays.length === 7 ? 'TÜMÜNÜ BIRAK' : 'TÜMÜNÜ SEÇ'}
                    </button>
                  </div>
                  <div className="flex justify-between gap-1">
                    {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day, i) => {
                      const dayIdx = i === 6 ? 0 : i + 1; // 1: Monday ... 6: Saturday, 0: Sunday
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(dayIdx)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all active:scale-90",
                            allowedDays.includes(dayIdx) 
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20 scale-105 z-10" 
                              : "bg-rose-500 text-white border-rose-600 hover:bg-rose-600"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 border border-border rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary transition-all active:scale-95"
                  >
                    Vazgeç
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 hover:opacity-90 transition-all active:scale-95"
                  >
                    Sisteme Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Book Specific Notes Modal */}
      <AnimatePresence>
        {isNotesModalOpen && selectedBookForNotes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotesModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-lg card p-8 shadow-2xl border border-primary/20"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black truncate max-w-[300px]">{selectedBookForNotes.title}</h2>
                  <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest mt-1">Özel Çalışma Talimatları</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <StickyNote className="text-primary" size={24} />
                </div>
              </div>

              <div className="space-y-4">
                 <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
                    <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Nasıl Yapılır?</p>
                    <p className="text-xs text-foreground/60 leading-relaxed font-medium">
                      Buraya bu kitabı nasıl bitirmek istediğini yazabilirsin. Örn: <br/>
                      <span className="text-primary font-bold">"Her gün 2 test çözerek turlama yapacağım."</span><br/>
                      <span className="text-primary font-bold">"Sondan başa doğru çözüyorum."</span><br/>
                      <span className="text-primary font-bold">"Zorlandığım konuları atlayarak gidiyorum."</span>
                    </p>
                 </div>

                 <textarea 
                    value={bookNoteText}
                    onChange={e => setBookNoteText(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-border bg-background focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm min-h-[150px]"
                    placeholder="Bu kitap için AI mentörüne özel talimatlarını yaz..."
                 />

                 <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setIsNotesModalOpen(false)}
                      className="flex-1 px-6 py-4 border border-border rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary transition-all active:scale-95"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={handleSaveBookNote}
                      className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 hover:opacity-90 transition-all active:scale-95"
                    >
                      Kaydet
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Branch Notes Modal */}
      <AnimatePresence>
        {isBranchNotesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBranchNotesModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl card p-8 shadow-2xl border border-primary/20 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black">Branş Bazlı Analizler</h2>
                  <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest mt-1">AI Mentörün bu notları programlamada kullanacak</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Info className="text-primary" size={24} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar mb-6">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] text-amber-500 font-black uppercase leading-tight italic">
                    İPUCU: Buraya o Branştaki durumunu yazabilirsin. Örn: "Matematikte temel kavramlarım iyi ama problemlerde yavaşım" veya "Türkçe branş denemesi eksiğim var".
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {BRANCHES.map(branch => (
                    <div key={branch} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/60 px-1">{branch}</label>
                      <textarea 
                        value={tempNotes[branch] || ''}
                        onChange={e => setTempNotes(prev => ({ ...prev, [branch]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:ring-4 focus:ring-primary/20 outline-none transition-all text-sm font-medium min-h-[80px] resize-none"
                        placeholder={`${branch} hakkındaki özel durumun ve ihtiyacın...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsBranchNotesModalOpen(false)}
                  className="flex-1 px-6 py-4 border border-border rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary transition-all active:scale-95"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={handleSaveBranchNotes}
                  className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 hover:opacity-90 transition-all active:scale-95"
                >
                  Analizleri Kaydet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
