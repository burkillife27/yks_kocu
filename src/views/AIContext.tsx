import React, { useState, useEffect } from 'react';
import { storage } from '../lib/storage.ts';
import { Book, Trial, Task, DailyNote, AppSettings, ChatSession, Camp } from '../types.ts';
import { motion } from 'motion/react';
import { Eye, Code, Database, Terminal, ShieldCheck } from 'lucide-react';

export default function AIContext() {
  const [data, setData] = useState<{
    books: Book[];
    trials: Trial[];
    tasks: Task[];
    dailyNotes: DailyNote[];
    settings: AppSettings | null;
    chatSessions: ChatSession[];
    camps: Camp[];
  }>({
    books: [],
    trials: [],
    tasks: [],
    dailyNotes: [],
    settings: null,
    chatSessions: [],
    camps: []
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prompt' | 'data' | 'system'>('prompt');

  useEffect(() => {
    async function loadAll() {
      const [b, tr, ts, n, s, ch, ca] = await Promise.all([
        storage.getBooks(),
        storage.getTrials(),
        storage.getTasks(),
        storage.getDailyNotes(),
        storage.getSettings(),
        storage.getChatSessions(),
        storage.getCamps()
      ]);
      setData({ books: b, trials: tr, tasks: ts, dailyNotes: n, settings: s, chatSessions: ch, camps: ca });
      setLoading(false);
    }
    loadAll();
  }, []);

  if (loading) return <div className="p-8 text-center opacity-40 font-mono">Veri katmanı yükleniyor...</div>;

  const systemInstructions = `
SINAV SİSTEMİ BİLGİSİ:
- TYT GENEL: Türkçe (40), Matematik (40), Sosyal (20), Fen (20) sorudan oluşur. (Toplam 120)
- AYT GENEL: Matematik (40), Fen (40 [Fiz:14, Kim:13, Bio:13]), Sosyal-1 (40), Sosyal-2 (40) sorudan oluşur.

KAMP KURALLARI:
- Aktif kamp varsa, kampa dahil edilen görevlerde sadece kamp kitapları kullanılır.
- Kamp dışı görevlerde diğer kitaplar kullanılabilir.
- Kamp görevleri başlığında '(Kamp)' etiketi bulunur.

ÖĞRENCİ PROFİLİ:
- Alan: ${data.settings?.studentField || 'Belirtilmemiş'}
- Hedef Netler: ${JSON.stringify(data.settings?.targetNets)}
- Özel Talimat: ${data.settings?.aiInstructions || 'Yok'}
  `.trim();

  const todayStr = new Date().toISOString().split('T')[0];

  const rawDataPayload = JSON.stringify({
    unfinishedBooks: data.books.filter(b => !b.isCompleted && !b.isDisabled).map(b => ({ title: b.title, progress: `${b.completedUnits}/${b.totalUnits}` })),
    recentTrials: data.trials.slice(-5).map(t => ({ date: t.date, net: t.net, type: t.type, mistakes: t.mistakes.length, notes: t.notes })),
    dailyNotes: data.dailyNotes.slice(-3).map(n => ({ date: n.date, content: n.content })),
    lastTasksStatus: data.tasks.slice(-10).map(t => ({ title: t.title, status: t.status })),
    activeOrStartedCamps: data.camps
      .filter(c => c.startDate <= todayStr && c.isActive)
      .map(c => ({ title: c.title, bitis: c.endDate, booksCount: c.selectedBooks.length }))
  }, null, 2);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
            <Eye size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">AI Veri Katmanı</h1>
            <p className="text-sm text-foreground/40 font-medium">Yapay zekaya gönderilen ham verileri ve sistem talimatlarını izleyin.</p>
          </div>
        </div>
      </header>

      <div className="flex p-1.5 bg-secondary rounded-2xl w-fit">
        {[
          { id: 'prompt', label: 'Sistem İstemi', icon: Terminal },
          { id: 'data', label: 'Ham Veri (JSON)', icon: Database },
          { id: 'system', label: 'Güvenlik & Kurallar', icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight transition-all ${
              activeTab === tab.id ? 'bg-background shadow-sm text-primary' : 'text-foreground/40 hover:text-foreground/60'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden border-border/50"
      >
        <div className="bg-secondary/50 border-b border-border/50 px-6 py-3 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 font-mono">
            {activeTab === 'prompt' ? 'ai_system_instructions.md' : activeTab === 'data' ? 'context_payload.json' : 'safety_guidelines.txt'}
          </span>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
          </div>
        </div>
        
        <pre className="p-6 overflow-auto max-h-[60vh] font-mono text-sm leading-relaxed whitespace-pre-wrap scrollbar-elegant">
          {activeTab === 'prompt' && (
            <div className="text-primary/80">
              {systemInstructions}
              <div className="mt-8 pt-8 border-t border-border/50">
                <h3 className="text-xs font-bold text-foreground/40 mb-4 uppercase">Aktif İstemi (Prompt Template):</h3>
                {`"Merhaba! Bir PDR ve eğitim koçu olarak görev yapıyorsun..."`}
              </div>
            </div>
          )}
          {activeTab === 'data' && (
            <code className="text-sky-600 dark:text-sky-400">
              {rawDataPayload}
            </code>
          )}
          {activeTab === 'system' && (
            <div className="text-foreground/60 space-y-4">
              <p>1. Kullanıcı verileri (API Anahtarı hariç) sunucu tarafında işlenir.</p>
              <p>2. Kitaplar, denemeler ve notlar şifrelenmiş veya anonimleştirilmiş olarak iletilmez, tamamen şeffaftır.</p>
              <p>3. AI modeline sadece analiz için gerekli olan son 3-7 günlük veriler ve gelişim grafikleri gönderilir.</p>
              <p>4. Yerel AI (Offline Mod) seçildiğinde bu veriler tarayıcıdan dışarı çıkmaz.</p>
            </div>
          )}
        </pre>
      </motion.div>

      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="p-4 bg-primary/10 text-primary rounded-2xl shrink-0">
          <Code size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold">Geliştirici Notu</h3>
          <p className="text-sm text-foreground/60 leading-relaxed">
            Bu içerik, her AI sorgusu yapıldığında dinamik olarak oluşturulur. Yapay zeka senin netlerini "Uydurmaz", burada gördüğün 
            JSON objesini süzgeçten geçirerek çıkarım yapar. Eksik veya hatalı bilgi varsa, ilgili sekmelerden veriyi kontrol edebilirsin.
          </p>
        </div>
      </div>
    </div>
  );
}
