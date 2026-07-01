import { useMemo } from 'react';
import { Task, AppSettings } from '../types.ts';
import { motion } from 'motion/react';
import { Info, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export default function Heatmap({ tasks, settings }: { 
  tasks: Task[], 
  settings: AppSettings 
}) {
  const today = new Date();

  const tytDateStr = useMemo(() => {
    try {
      const d = new Date(settings.yksDate);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  }, [settings.yksDate]);

  const aytDateStr = useMemo(() => {
    try {
      const d = new Date(settings.yksDate);
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  }, [settings.yksDate]);
  
  // Calculate stats for the last 6 months
  const months = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      result.push(d);
    }
    return result;
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getDayStudyData = (dateStr: string) => {
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const actual = dayTasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const target = settings.dailyStudyMinutes[dayOfWeek] || 300; // fallback 5h
    return { actual, target };
  };

  const getColor = (actual: number, target: number) => {
    if (actual === 0) return 'bg-secondary/20';
    
    const percentage = Math.min(100, (actual / target) * 100);
    
    // Transition from Blue to Red
    // 0-25%: Light Blue
    // 25-50%: Blue
    // 50-75%: Purple/Magenta
    // 75-100%+: Red
    
    if (percentage < 20) return 'bg-blue-200 text-blue-800';
    if (percentage < 40) return 'bg-blue-400 text-white';
    if (percentage < 60) return 'bg-indigo-500 text-white';
    if (percentage < 80) return 'bg-purple-600 text-white';
    return 'bg-red-600 text-white';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Isı Haritası</h2>
          <p className="text-foreground/60 font-medium">Çalışma yoğunluğunu ve disiplinini takip et.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-3 h-3 rounded bg-blue-200" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Düşük</span>
            <div className="w-3 h-3 rounded bg-red-600 ml-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Hedef Odaklı</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[8px] font-black text-amber-600">TYT</div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">TYT Günü</span>
            <div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[8px] font-black text-rose-500 ml-2">AYT</div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">AYT Günü</span>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {months.map((monthDate, mIdx) => {
          const daysArray = getDaysInMonth(monthDate);
          const monthName = monthDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
          const startDayCode = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay(); // 0(Sun)-6(Sat)
          // Adjust for Mon start: (startDayCode + 6) % 7
          const offset = (startDayCode + 6) % 7;

          return (
            <section key={mIdx} className="card p-6 space-y-4">
              <h3 className="font-bold text-sm capitalize border-b border-border pb-2">{monthName}</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d, i) => (
                  <div key={i} className="text-[10px] font-black uppercase text-foreground/40 text-center mb-1">
                    {d}
                  </div>
                ))}
                
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`offset-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysArray }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const { actual, target } = getDayStudyData(dateStr);
                  const colorClass = getColor(actual, target);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  
                  const isTYT = dateStr === tytDateStr;
                  const isAYT = dateStr === aytDateStr;

                  return (
                    <motion.div
                      key={day}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: (mIdx * 0.05) + (i * 0.005) }}
                      className={cn(
                        "aspect-square rounded-md text-[9px] font-bold flex flex-col items-center justify-center transition-all cursor-help relative group shadow-sm",
                        isTYT ? "bg-amber-500/20 text-amber-600 border border-amber-500/40" :
                        isAYT ? "bg-rose-500/20 text-rose-500 border border-rose-500/40" : colorClass,
                        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background z-10",
                        (isTYT || isAYT) && "ring-2 ring-offset-1 " + (isTYT ? "ring-amber-500/50" : "ring-rose-500/50")
                      )}
                    >
                      <span className={cn(isTYT || isAYT ? "text-[8px] leading-none" : "")}>{day}</span>
                      {isTYT && <span className="text-[7px] font-extrabold text-amber-600 leading-none scale-90 mt-0.5">TYT</span>}
                      {isAYT && <span className="text-[7px] font-extrabold text-rose-500 leading-none scale-90 mt-0.5">AYT</span>}
                      
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-card border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-all scale-90 group-hover:scale-100">
                        <p className="font-bold text-[10px] text-foreground">{day} {monthName}</p>
                        {isTYT && <p className="text-[10px] font-black text-amber-500">🏆 TYT Sınav Günü</p>}
                        {isAYT && <p className="text-[10px] font-black text-rose-500">🔥 AYT Sınav Günü</p>}
                        <p className="text-[10px] text-foreground/60">{actual} dk / {target} dk</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card p-6 bg-primary/5 border-primary/20">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Info className="text-primary" size={24} />
          </div>
          <div>
            <h4 className="font-bold flex items-center gap-2">
              İpucu: Renkler Ne Anlatıyor?
            </h4>
            <p className="text-sm text-foreground/60 mt-1 leading-relaxed">
              Kutucukların rengi, o gün için belirlediğin hedef çalışma süresine ne kadar yaklaştığını gösterir. 
              Maviden kırmızıya doğru giden renk paleti, düşük tempodan yüksek tempoya geçişini simgeler. 
              Kırmızı olan günler, hedefine tam ulaştığın veya geçtiğin en verimli günlerindir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
