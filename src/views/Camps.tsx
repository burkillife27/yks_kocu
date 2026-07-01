import React, { useState } from 'react';
import { 
  Rocket, 
  Plus, 
  Trash2, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Circle,
  Clock,
  History,
  TrendingUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/storage.ts';
import { Book, Camp } from '../types.ts';
import { cn } from '../lib/utils.ts';

interface CampsProps {
  books: Book[];
  camps: Camp[];
  onRefresh: () => void;
}

export default function Camps({ books, camps, onRefresh }: CampsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [allowOverwork, setAllowOverwork] = useState(true);

  const activeCamps = camps.filter(c => c.isActive);
  const pastCamps = camps.filter(c => !c.isActive).sort((a, b) => b.createdAt - a.createdAt);

  const handleAddCamp = async () => {
    if (!newTitle || selectedBooks.length === 0) return;

    const newId = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Date.now().toString(36) + Math.random().toString(36).substring(2);

    const newCamp: Camp = {
      id: newId,
      title: newTitle,
      startDate,
      endDate,
      selectedBooks,
      allowOverwork,
      isActive: true,
      createdAt: Date.now()
    };

    await storage.saveCamps([...camps, newCamp]);
    setShowAddModal(false);
    resetForm();
    onRefresh();
  };

  const resetForm = () => {
    setNewTitle('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);
    setSelectedBooks([]);
    setAllowOverwork(true);
  };

  const toggleCampStatus = async (id: string) => {
    const updated = camps.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    await storage.saveCamps(updated);
    onRefresh();
  };

  const deleteCamp = async (id: string) => {
    if (window.confirm('Bu kampı silmek istediğinize emin misiniz?')) {
      await storage.saveCamps(camps.filter(c => c.id !== id));
      onRefresh();
    }
  };

  const toggleBook = (id: string) => {
    setSelectedBooks(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Rocket className="text-primary animate-pulse" size={32} />
            Kamplar
          </h2>
          <p className="text-foreground/60 font-medium">Yoğunlaştırılmış çalışma dönemleri oluşturun ve yönetin.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} /> Yeni Kamp Oluştur
        </button>
      </div>

      {activeCamps.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeCamps.map(camp => (
            <motion.div 
              key={camp.id}
              layoutId={camp.id}
              className="bg-card border border-primary/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                {camp.selectedBooks.every(bid => books.find(b => b.id === bid)?.isCompleted) && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20">
                    Tamamlandı
                  </span>
                )}
                <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-primary/20">
                  Aktif
                </span>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold">{camp.title}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-sm text-foreground/60">
                    <Calendar size={18} className="text-primary" />
                    <span>{camp.startDate} - {camp.endDate}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/60">
                    <BookOpen size={18} className="text-primary" />
                    <span>{camp.selectedBooks.length} Kitap</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {camp.selectedBooks.map(bid => {
                    const book = books.find(b => b.id === bid);
                    const isDone = book?.isCompleted;
                    return book ? (
                      <span key={bid} className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full flex items-center gap-1.5",
                        isDone ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary"
                      )}>
                        {isDone && <CheckCircle2 size={10} />}
                        {book.title}
                      </span>
                    ) : null;
                  })}
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => toggleCampStatus(camp.id)}
                    className="flex-1 bg-secondary hover:bg-secondary/80 py-3 rounded-xl text-sm font-bold transition-colors"
                  >
                    Kampı Bitir
                  </button>
                  <button 
                    onClick={() => deleteCamp(camp.id)}
                    className="p-3 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <History size={20} className="text-foreground/40" />
          Geçmiş Kamplar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastCamps.map(camp => {
            const allDone = camp.selectedBooks.length > 0 && camp.selectedBooks.every(bid => books.find(b => b.id === bid)?.isCompleted);
            return (
              <div key={camp.id} className="bg-card border border-border rounded-2xl p-4 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold">{camp.title}</h4>
                  {allDone && <CheckCircle2 size={18} className="text-emerald-500" />}
                </div>
                <div className="text-xs text-foreground/60 flex items-center gap-2 mb-3">
                  <Calendar size={14} />
                  {camp.startDate} - {camp.endDate}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleCampStatus(camp.id)}
                    className="text-[10px] font-bold px-3 py-1 bg-primary/10 text-primary rounded-full transition-colors hover:bg-primary/20"
                  >
                    Yeniden Aktifleştir
                  </button>
                  <button 
                    onClick={() => deleteCamp(camp.id)}
                    className="text-foreground/20 hover:text-red-500 ml-auto transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          {pastCamps.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-3xl text-foreground/40 font-medium">
              Geçmiş kamp bulunmuyor.
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-[40px] shadow-2xl p-8 lg:p-12 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 p-3 rounded-2xl bg-secondary text-foreground/40 hover:text-foreground transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black tracking-tight mb-2">Kamp Başlat</h3>
                  <p className="text-foreground/60 font-medium">Hedeflerini belirle ve sınırlarını zorla.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Kamp Adı</label>
                    <input 
                      type="text"
                      placeholder="Yarıyıl Kampı, Matematik Maratonu..."
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full px-6 py-5 rounded-2xl border border-border bg-background outline-none focus:ring-4 focus:ring-primary/20 font-bold text-lg transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Başlangıç</label>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl border border-border bg-background outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Bitiş</label>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl border border-border bg-background outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">Kamp Kitapları</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {books.map(book => {
                        const isSelected = selectedBooks.includes(book.id);
                        return (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => toggleBook(book.id)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2",
                              isSelected
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20"
                                : "bg-rose-500 text-white border-rose-600 hover:bg-rose-600"
                            )}
                          >
                            {isSelected ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                            {book.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-secondary/50 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="font-bold">Yoğun Çalışma İzni</p>
                        <p className="text-xs text-foreground/60">Günlük süreyi %50'ye kadar aşabilir.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAllowOverwork(!allowOverwork)}
                      className={cn(
                        "w-14 h-8 rounded-full border-2 transition-all relative",
                        allowOverwork ? "bg-primary border-primary" : "bg-card border-border"
                      )}
                    >
                      <motion.div 
                        animate={{ x: allowOverwork ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  <button 
                    onClick={handleAddCamp}
                    disabled={!newTitle || selectedBooks.length === 0}
                    className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                  >
                    Kampı Başlat
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
