import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Book as BookIcon, 
  Target, 
  Clock, 
  Layers, 
  Star,
  FileText,
  Trash2
} from 'lucide-react';
import { Book } from '../types.ts';
import { cn } from '../lib/utils.ts';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ book, onClose }) => {
  const progress = Math.round((book.completedUnits / book.totalUnits) * 100);
  const remaining = book.totalUnits - book.completedUnits;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-card border border-border rounded-[32px] overflow-hidden shadow-2xl"
      >
        {/* Header decoration */}
        <div className="h-2 bg-primary w-full" />
        
        <div className="p-8 space-y-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookIcon size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-md">
                    {book.type}
                  </span>
                  {book.priority && (
                    <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Önemli
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black tracking-tight leading-tight">{book.title}</h2>
                <p className="text-sm font-bold text-foreground/40">{book.branch}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">İlerleme Durumu</p>
                <p className="text-3xl font-black text-primary">%{progress}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Kalan</p>
                <p className="text-sm font-bold">{remaining} {book.unitType}</p>
              </div>
            </div>
            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary"
              />
            </div>
            <p className="text-xs text-foreground/40 font-bold text-center">
              {book.completedUnits} / {book.totalUnits} {book.unitType} tamamlandı
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-3xl bg-secondary/30 border border-border space-y-1">
                <div className="flex items-center gap-2 text-foreground/40 mb-1">
                   <Clock size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Hızın</span>
                </div>
                <p className="text-lg font-black">{book.minutesPerUnit} dk</p>
                <p className="text-[10px] text-foreground/40 font-bold">Her bir {book.unitType} başına</p>
             </div>
             <div className="p-4 rounded-3xl bg-secondary/30 border border-border space-y-1">
                <div className="flex items-center gap-2 text-foreground/40 mb-1">
                   <Target size={14} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Bitiş Süresi</span>
                </div>
                <p className="text-lg font-black">
                  {Math.round((remaining * book.minutesPerUnit) / 60)} sa
                </p>
                <p className="text-[10px] text-foreground/40 font-bold">Toplam tahmini</p>
             </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/30 px-1">Çalışma Tercihleri</h4>
            <div className="space-y-2">
               <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Layers size={18} className="text-foreground/40" />
                    <span className="text-sm font-bold">Günlük Limit</span>
                  </div>
                  <span className="text-sm font-black">{book.dailyLimit || 'Sınırsız'} {book.unitType}</span>
               </div>
               {book.notes && (
                 <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-2">
                   <div className="flex items-center gap-2 text-orange-500">
                     <FileText size={18} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Çalışma Notu</span>
                   </div>
                   <p className="text-sm text-foreground/70 italic leading-relaxed">
                     "{book.notes}"
                   </p>
                 </div>
               )}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-secondary font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-secondary/80 transition-all border border-border"
          >
            Kapat
          </button>
        </div>
      </motion.div>
    </div>
  );
};
