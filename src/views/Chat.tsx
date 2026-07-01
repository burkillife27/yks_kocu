import React, { useState, useRef, useEffect, memo } from 'react';
import { Book, Trial, Task, AppSettings, Camp, ChatSession, ChatMessage, AICoreMode } from '../types.ts';
import { GeminiService } from '../services/geminiService.ts';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Brain,
  RotateCcw,
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils.ts';
import { storage } from '../lib/storage.ts';

const MessageItem = memo(({ m, onShowThought, onToggleImportant }: { m: ChatMessage, onShowThought?: (thought: string) => void, onToggleImportant?: () => void }) => {
  const date = new Date(m.timestamp);
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  let content = m.content;
  let thought = "";

  if (m.role === 'assistant') {
    try {
      const parsed = JSON.parse(m.content);
      if (parsed.text) {
        content = parsed.text;
        thought = parsed.thought || "";
      }
    } catch (e) {
      // Not JSON, use as is
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex gap-4 max-w-[85%] group",
        m.role === 'user' ? "ml-auto flex-row-reverse" : ""
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform",
        m.role === 'assistant' ? "bg-primary text-primary-foreground" : "bg-card border border-border"
      )}>
        {m.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
      </div>
      <div className="flex flex-col gap-1 w-full">
        <div className={cn(
          "p-4 rounded-2xl text-sm leading-relaxed relative",
          m.role === 'assistant' ? "bg-secondary/80 text-foreground" : "bg-primary text-primary-foreground"
        )}>
          <div className="absolute -top-2 -right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {thought && onShowThought && (
              <button 
                onClick={() => onShowThought(thought)}
                className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                title="AI Düşünce Zincirini Gör"
              >
                <Brain size={12} />
              </button>
            )}
            {onToggleImportant && (
              <button 
                onClick={onToggleImportant}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform",
                  m.isImportant ? "bg-yellow-400 text-yellow-900" : "bg-card text-foreground/40 border border-border"
                )}
                title={m.isImportant ? "Önemli İşaretini Kaldır" : "Önemli Olarak İşaretle"}
              >
                <Star size={12} fill={m.isImportant ? "currentColor" : "none"} />
              </button>
            )}
          </div>
          <div className="markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-2",
          m.role === 'user' ? "justify-end" : "justify-start"
        )}>
           {m.isImportant && (
             <Star size={10} className="text-yellow-500 fill-yellow-500" />
           )}
           <span className="text-[10px] font-bold opacity-30">
            {timeStr}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

export default function Chat({ books, trials, tasks, settings, camps, onRefresh }: { 
  books: Book[], 
  trials: Trial[], 
  tasks: Task[], 
  settings: AppSettings,
  camps: Camp[],
  onRefresh: () => void 
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load sessions from storage
  useEffect(() => {
    const loadSessions = async () => {
      const saved = await storage.getChatSessions();
      setSessions(saved.sort((a, b) => b.updatedAt - a.updatedAt));
    };
    loadSessions();
  }, []);

  // Update messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      const active = sessions.find(s => s.id === activeSessionId);
      if (active) {
        setMessages(active.messages);
      }
    } else {
      setMessages([{ 
        role: 'assistant', 
        content: 'Merhaba, ben senin YKS asistanınım.',
        timestamp: Date.now()
      }]);
    }
  }, [activeSessionId, sessions]);

  // Use a ref to track if we should auto-scroll
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If we are close to the bottom, auto-scroll is enabled
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  const createNewSession = (title = "Yeni Sohbet") => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      messages: [{ 
        role: 'assistant', 
        content: 'Merhaba, ben senin YKS asistanınım.',
        timestamp: Date.now()
      }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const newSessions = [newSession, ...sessions];
    setSessions(newSessions);
    setActiveSessionId(newSession.id);
    storage.saveChatSessions(newSessions);
  };

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) setActiveSessionId(null);
    setDeletingSessionId(null);
    await storage.saveChatSessions(newSessions);
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearAllSessions = async () => {
    setSessions([]);
    setActiveSessionId(null);
    setShowClearConfirm(false);
    await storage.saveChatSessions([]);
  };

  const deleteLastMessage = async () => {
    if (messages.length <= 1) return; // Don't delete the initial greeting if it's the only one

    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);

    if (activeSessionId) {
      const active = sessions.find(s => s.id === activeSessionId);
      if (active) {
        const updatedSession = {
          ...active,
          messages: newMessages,
          updatedAt: Date.now()
        };
        const newSessions = sessions.map(s => s.id === activeSessionId ? updatedSession : s);
        setSessions(newSessions);
        await storage.saveChatSessions(newSessions);
      }
    }
  };

  const toggleSessionImportance = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSessions = sessions.map(s => 
      s.id === id ? { ...s, isImportant: !s.isImportant } : s
    );
    setSessions(newSessions);
    await storage.saveChatSessions(newSessions);
  };

  const toggleMessageImportance = async (messageTimestamp: number) => {
    if (!activeSessionId) return;

    const newMessages = messages.map(m => 
      m.timestamp === messageTimestamp ? { ...m, isImportant: !m.isImportant } : m
    );
    setMessages(newMessages);

    const active = sessions.find(s => s.id === activeSessionId);
    if (active) {
      const updatedSession = {
        ...active,
        messages: newMessages,
        updatedAt: Date.now()
      };
      const newSessions = sessions.map(s => s.id === activeSessionId ? updatedSession : s);
      setSessions(newSessions);
      await storage.saveChatSessions(newSessions);
    }
  };

  const handleSend = async () => {
    const effectiveMode = 'cloud';
    if (!input.trim()) return;
    if (!settings.apiKey) return;
    
    const userMsg: ChatMessage = { 
      role: 'user', 
      content: input,
      timestamp: Date.now()
    };

    let sessionToUpdate: ChatSession | null = null;
    let currentSessionId = activeSessionId;

    if (!currentSessionId) {
      const newId = crypto.randomUUID();
      const newSession: ChatSession = {
        id: newId,
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [...messages.filter(m => m.timestamp), userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      sessionToUpdate = newSession;
      currentSessionId = newId;
    } else {
      const active = sessions.find(s => s.id === currentSessionId);
      if (active) {
        sessionToUpdate = {
          ...active,
          messages: [...active.messages, userMsg],
          updatedAt: Date.now()
        };
      }
    }

    if (!sessionToUpdate) return;

    const newMessages = sessionToUpdate.messages;
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      let responseText = "";
      
      const gemini = new GeminiService(settings, settings.aiModel);
      const today = new Date().toISOString().split('T')[0];
      const startedCamps = camps
        .filter(c => c.startDate <= today && c.isActive)
        .map(c => ({
          title: c.title,
          isCurrent: c.startDate <= today && c.endDate >= today,
          endDate: c.endDate
        }));
      
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

      // Group trials by branch and take last 5
      const trialsByBranch: Record<string, Trial[]> = {};
      trials.forEach(t => {
        const key = t.branch || `${t.type} GENEL`;
        if (!trialsByBranch[key]) trialsByBranch[key] = [];
        trialsByBranch[key].push(t);
      });
      const optimizedTrials: any[] = [];
      Object.values(trialsByBranch).forEach(group => {
        const sorted = group.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
        optimizedTrials.push(...sorted.map(t => ({
          date: t.date,
          tarih: t.date,
          tip: t.type === 'Branş' ? 'Branş Denemesi' : 'Genel Deneme',
          sinav: t.type,
          brans: t.branch || 'Genel',
          net: t.net,
          dogru: t.correct,
          yanlis: t.wrong,
          bos: t.empty,
          not: t.notes,
          detaylar: t.subjects?.map(s => `${s.name}: ${(s.correct - (s.wrong * 0.25)).toFixed(2)} net`),
          hatalar: t.mistakes.map(m => m.topic)
        })));
      });

      // Get all important messages from ALL sessions
      const allImportantMessages: string[] = [];
      sessions.forEach(s => {
        s.messages.forEach(m => {
          if (m.isImportant) {
            allImportantMessages.push(`${m.role === 'user' ? 'Öğrenci' : 'Hoca'}: ${m.content}`);
          }
        });
      });

      // Filter current session's recent or important messages
      const recentAndImportantFromCurrent = newMessages
        .filter(m => m.isImportant || m.timestamp >= threeDaysAgo)
        .map(m => `${m.role === 'user' ? 'Öğrenci' : 'Hoca'}: ${m.content}`);

      const uniqueContextMessages = Array.from(new Set([...allImportantMessages, ...recentAndImportantFromCurrent]));

      // Tamamlanan kitapları isim, ders ve tür formatında bir liste olarak topla
      const completedBooksText = books
        .filter(b => b.isCompleted)
        .map(b => `- ${b.title} (Ders: ${b.branch || "Belirtilmemiş"}, Tür: ${b.type || "Belirtilmemiş"})`)
        .join('\n');

      const contextData = {
        personalBio: settings.personalBio,
        aiInstructions: settings.aiInstructions,
        trials: optimizedTrials,
        books: books.filter(b => !b.isCompleted && !b.isDisabled).map(b => {
          const item: any = {
            title: b.title,
            branch: b.branch,
            totalUnits: b.totalUnits,
            completedUnits: b.completedUnits,
            remainingUnits: b.totalUnits - b.completedUnits,
            unitType: b.unitType,
            progress: `${Math.round((b.completedUnits/b.totalUnits)*100)}%`,
            notes: b.notes 
          };
          if (b.priority) item.priority = true;
          return item;
        }),
        completedBooksNotification: `Tamamlanan Kitaplar Listesi (Öğrenci bu kitapları bitirdi, bunlardan yeni görev kesinlikle önerme/atama):\n${completedBooksText || "Yok"}`,
        recentTasks: tasks
          .filter(t => (t.status === 'completed' || t.userNote) && new Date(t.date).getTime() >= threeDaysAgo)
          .map(t => {
            const book = t.bookId ? books.find(b => b.id === t.bookId) : null;
            if (t.bookId && !book) return null;
            return {
              title: book ? book.title : (t.title || "Genel Çalışma"),
              date: t.date,
              status: t.status,
              userNote: t.userNote
            };
          })
          .filter(Boolean),
        branchNotes: settings.branchNotes || {},
        activeCamps: startedCamps,
        daysToYks: Math.ceil((new Date(settings.yksDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        recentMessages: uniqueContextMessages
      };

      responseText = await gemini.chat(input, settings, contextData);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      };

      // Save context for Program generation
      await storage.saveAiContext(responseText);

      const finalSession = {
        ...sessionToUpdate,
        messages: [...sessionToUpdate.messages, assistantMsg],
        updatedAt: Date.now()
      };

      const otherSessions = sessions.filter(s => s.id !== currentSessionId);
      const updatedSessions = [finalSession, ...otherSessions];
      
      setSessions(updatedSessions);
      setActiveSessionId(currentSessionId);
      await storage.saveChatSessions(updatedSessions);

    } catch (e: any) {
      const getResetTime = () => {
        const now = new Date();
        const nextReset = new Date();
        nextReset.setHours(24, 0, 0, 0);
        const diff = nextReset.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours} saat ${minutes} dakika`;
      };

      let errorMsg = "Üzgünüm, bir hata oluştu. Lütfen API anahtarını kontrol et.";
      
      if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = `API kullanım limiti aşıldı. Günlük kotanız her gece 00:00'da sıfırlanır (Kalan süre: ${getResetTime()}). Eğer dakikalık kota sınırına takıldıysanız 1 dakika sonra tekrar deneyebilirsiniz.`;
      }
      
      const assistantMsg: ChatMessage = { role: 'assistant', content: errorMsg, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Sidebar - History */}
      <motion.div 
        animate={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className={cn(
          "card overflow-hidden flex flex-col transition-all duration-300",
          !sidebarOpen && "border-none shadow-none pointer-events-none"
        )}
      >
        <div className="p-4 border-b border-border flex flex-col gap-3 bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="font-bold text-xs uppercase tracking-widest text-foreground/40">Geçmiş Sohbetler</h3>
              {sessions.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  {showClearConfirm ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={clearAllSessions}
                        className="text-[9px] font-bold text-red-500 hover:scale-110 transition-transform uppercase"
                      >
                        Evet, Sil
                      </button>
                      <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="text-[9px] font-bold text-foreground/40 hover:text-foreground uppercase"
                      >
                        Vazgeç
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="text-[9px] font-bold text-red-500/60 hover:text-red-500 uppercase tracking-tighter transition-colors"
                    >
                      Tümünü Temizle
                    </button>
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={() => createNewSession()}
              className="p-2 hover:bg-primary/10 rounded-xl text-primary transition-colors"
              title="Yeni Sohbet"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex p-1 bg-background/50 rounded-lg border border-border/50">
            <button 
              onClick={() => setShowImportantOnly(false)}
              className={cn(
                "flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                !showImportantOnly ? "bg-card text-primary shadow-sm" : "text-foreground/40 hover:text-foreground"
              )}
            >
              Tümü
            </button>
            <button 
              onClick={() => setShowImportantOnly(true)}
              className={cn(
                "flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1",
                showImportantOnly ? "bg-yellow-400 text-yellow-900 shadow-sm" : "text-foreground/40 hover:text-foreground"
              )}
            >
              <Star size={10} fill={showImportantOnly ? "currentColor" : "none"} /> Önemli
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-4">
               <MessageSquare size={32} />
               <p className="text-[10px] font-bold mt-2 uppercase">Henüz sohbet yok</p>
            </div>
          ) : (
            sessions
              .filter(s => !showImportantOnly || s.isImportant || s.messages.some(m => m.isImportant))
              .map(s => (
              <div
                key={s.id}
                className={cn(
                  "w-full rounded-xl text-left transition-all group relative overflow-hidden mb-1",
                  activeSessionId === s.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-secondary text-foreground/60 border border-transparent"
                )}
              >
                <button
                  onClick={() => setActiveSessionId(s.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    {s.isImportant && <Star size={10} className="text-yellow-500 fill-yellow-500 shrink-0" />}
                    <p className="text-xs font-bold truncate pr-16">{s.title}</p>
                  </div>
                  <p className="text-[10px] opacity-40 mt-1">{new Date(s.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                  <button 
                    onClick={(e) => toggleSessionImportance(s.id, e)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      s.isImportant 
                        ? "text-yellow-500 hover:bg-yellow-500/10" 
                        : "opacity-0 group-hover:opacity-100 text-foreground/20 hover:text-yellow-500 hover:bg-yellow-500/10"
                    )}
                    title={s.isImportant ? "Önemli İşaretini Kaldır" : "Önemli Olarak İşaretle"}
                  >
                    <Star size={12} fill={s.isImportant ? "currentColor" : "none"} />
                  </button>
                  {deletingSessionId === s.id ? (
                    <div className="flex items-center gap-1 bg-red-500 rounded-lg p-0.5 shadow-lg">
                      <button 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="p-1 text-[10px] font-bold text-white hover:bg-white/10 rounded mr-1"
                      >
                        Sil
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeletingSessionId(null); }}
                        className="p-1 text-[10px] font-bold text-white/60 hover:text-white"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingSessionId(s.id); }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        activeSessionId === s.id 
                          ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
                          : "opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white text-foreground/20"
                      )}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setSidebarOpen(!sidebarOpen)}
               className="p-2 bg-card border border-border rounded-xl text-foreground/40 hover:text-primary transition-colors"
             >
               {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
             </button>
             <div>
               <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-bold flex items-center gap-2">
                   <Brain className="text-primary" size={28} /> AI Mentör Chat
                 </h2>
                 {activeSessionId && (
                   <button
                     onClick={() => toggleSessionImportance(activeSessionId)}
                     className={cn(
                       "p-1.5 rounded-lg transition-all",
                       sessions.find(s => s.id === activeSessionId)?.isImportant 
                        ? "text-yellow-500 bg-yellow-500/10" 
                        : "text-foreground/20 hover:text-yellow-500 hover:bg-yellow-500/10"
                     )}
                   >
                     <Star size={18} fill={sessions.find(s => s.id === activeSessionId)?.isImportant ? "currentColor" : "none"} />
                   </button>
                 )}
               </div>
               <p className="text-xs text-foreground/40 font-medium">Uzman PDR görüşleri ve program müdahale merkezi.</p>
             </div>
          </div>
          <button 
            onClick={() => setActiveSessionId(null)}
            className="px-4 py-2 bg-secondary text-foreground/60 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Yeni Konuşma Başlat
          </button>
        </div>

        <div className="flex-1 card overflow-hidden flex flex-col">
          {/* Messages */}
          <div 
            ref={scrollRef} 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const prevMsg = messages[i - 1];
                const showDate = !prevMsg || new Date(prevMsg.timestamp).toDateString() !== new Date(m.timestamp).toDateString();
                
                return (
                  <React.Fragment key={m.timestamp || i}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-secondary rounded-full text-[10px] font-black uppercase tracking-widest text-foreground/40">
                          {new Date(m.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <MessageItem 
                      m={m} 
                      onShowThought={(t) => setSelectedThought(t)} 
                      onToggleImportant={() => toggleMessageImportance(m.timestamp)}
                    />
                  </React.Fragment>
                );
              })}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                     <Bot size={20} />
                  </div>
                  <div className="bg-secondary/80 p-4 rounded-2xl flex gap-1 items-center">
                     <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="p-4 bg-secondary/30 border-t border-border">
            <div className="flex gap-3 bg-card border border-border rounded-2xl p-2 shadow-lg focus-within:ring-2 focus-within:ring-primary transition-all">
              <button 
                onClick={deleteLastMessage}
                disabled={messages.length <= 1 || isTyping}
                className="p-2 text-foreground/40 hover:text-red-500 transition-colors disabled:opacity-20"
                title="Son mesajı sil"
              >
                <RotateCcw size={20} />
              </button>
              <input 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 onKeyDown={e => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                   }
                 }}
                 placeholder="Mentörüne sor..."
                 className="flex-1 bg-transparent border-none outline-none text-sm px-2 placeholder:text-foreground/20"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
            {!settings.apiKey && (
              <p className="text-[10px] text-red-500 font-bold mt-2 text-center uppercase tracking-widest">⚠️ AI Özellikleri için API Key Gerekli</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Thought Process Modal */}
      <AnimatePresence>
        {selectedThought && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedThought(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg card p-8 shadow-2xl border-t-4 border-orange-500"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Brain size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Mentör Düşünce Süreci</h2>
                  <p className="text-sm text-foreground/60">Yapay zekanın bu cevaba nasıl ulaştığını incele.</p>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-xs text-foreground/70 leading-relaxed font-mono whitespace-pre-wrap">
                    {selectedThought}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setSelectedThought(null)}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all font-sans"
                >
                  Anladım
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
