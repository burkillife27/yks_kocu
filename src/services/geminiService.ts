import { GoogleGenAI, Type } from "@google/genai";
import { Book, Trial, Task, AppSettings, UserRoutine, Camp, DailyNote, ChatSession } from "../types.ts";
import { storage } from "../lib/storage.ts";

export class GeminiService {
  private settings: AppSettings | null = null;
  private modelName: string = "gemini-3-flash-preview";

  constructor(settings?: AppSettings, modelName?: string) {
    this.settings = settings || null;
    let requestedModel = "gemini-3-flash-preview";

    if (this.settings?.aiCoreMode === 'gemma') {
      requestedModel = 'gemma-2-9b-it';
    } else {
      requestedModel = modelName || settings?.aiModel || "gemini-3-flash-preview";
    }

    // Internal mapping to fix 404 errors for non-existent public IDs
    // while keeping the UI consistent and adhering to skill guidelines.
    const modelMappings: Record<string, string> = {
      'gemini-3.5-flash': 'gemini-3.5-flash',
      'gemini-1.5-pro': 'gemini-3.1-pro-preview',
      'gemini-1.5-flash': 'gemini-3-flash-preview',
      'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
      'gemini-2.5-flash': 'gemini-3-flash-preview',
      'gemini-2.0-flash-exp': 'gemini-3-flash-preview', // Fallback for experimental
      'gemma-2-9b-it': 'gemma-2-9b-it',
    };

    this.modelName = modelMappings[requestedModel] || requestedModel;
  }

  private optimizeBooks(books: Book[]): any[] {
    return books
      .filter(b => !b.isCompleted && !b.isDisabled)
      .map(b => {
        const filtered: any = {
          id: b.id,
          title: b.title,
          type: b.type,
          branch: b.branch,
          totalUnits: b.totalUnits,
          unitType: b.unitType,
          completedUnits: b.completedUnits,
          remainingUnits: b.totalUnits - b.completedUnits,
          minutesPerUnit: b.minutesPerUnit,
          dailyLimit: b.dailyLimit,
          allowedDays: b.allowedDays,
          notes: b.notes
        };
        if (b.priority) filtered.priority = true;
        return filtered;
      });
  }

  private optimizeTrials(trials: Trial[]): any[] {
    const trialsByBranch: Record<string, Trial[]> = {};
    trials.forEach(t => {
      const key = t.branch || `${t.type} GENEL`;
      if (!trialsByBranch[key]) trialsByBranch[key] = [];
      trialsByBranch[key].push(t);
    });

    const result: any[] = [];
    Object.values(trialsByBranch).forEach(group => {
      const branchTrials = group
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
      
      result.push(...branchTrials.map(t => ({
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
        bransDetaylari: t.subjects?.map(s => `${s.name}: ${this.calculateNet(s.correct, s.wrong)} net (${s.correct}D ${s.wrong}Y)`),
        hatalar: t.mistakes.map(m => `${m.topic} (${m.count})`)
      })));
    });
    return result;
  }

  private calculateNet(d: number, y: number) {
    return (d - (y * 0.25)).toFixed(2);
  }

  private optimizeDailyNotes(notes: DailyNote[]): any[] {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString().split('T')[0];

    return notes
      .filter(n => n.date >= dateStr)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private optimizeChatSessions(sessions: ChatSession[]): any[] {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const messages: any[] = [];

    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.timestamp >= sevenDaysAgo || msg.isImportant) {
          messages.push({
            rol: msg.role === 'user' ? 'Öğrenci' : 'Koç',
            mesaj: msg.content,
            onemli: msg.isImportant ? 'Evet' : 'Hayır',
            tarih: new Date(msg.timestamp).toLocaleString('tr-TR'),
          });
        }
      });
    });

    // En güncel mesajları en üstte tut
    return messages
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
      .slice(0, 25);
  }

  private optimizeRecentTasks(tasks: Task[], books: Book[]): any[] {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateStr = fourteenDaysAgo.toISOString().split('T')[0];

    return tasks
      .filter(t => t.date >= dateStr && (t.status === 'completed' || (t.unitsCompleted !== undefined && t.unitsCompleted > 0)))
      .map(t => {
        const book = t.bookId ? books.find(b => b.id === t.bookId) : null;
        // If it was a book task but book no longer exists, skip it to avoid "Unknown Book" confusion
        if (t.bookId && !book) return null;
        
        return {
          date: t.date,
          title: book ? book.title : (t.title || "Genel Çalışma"),
          note: t.userNote,
          status: t.status === 'completed' ? 'Tamamlandı' : 'Kısmen Tamamlandı'
        };
      })
      .filter(Boolean);
  }

  private static rotationIndex: number = 0;

  private async generate(prompt: string, schema?: any, systemInstruction?: string): Promise<string> {
    const apiKeys = [
      this.settings?.apiKey,
      this.settings?.apiKey2,
      this.settings?.apiKey3
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      throw new Error("API Anahtarı ayarlanmamış.");
    }

    // PDR & AI Expert Persona
    const basePdrInstruction = `Sen hem uzman bir PDR (Psikolojik Danışmanlık ve Rehberlik) uzmanı hem de stratejik bir YKS koçusun.
    
    TEMEL PRENSİPLERİN:
    1. PROAKTİF ANALİZ: Öğrencinin deneme netleri düşüyorsa, çalışma sürekliliği azaldıysa veya günlük notları negatif bir ruh hali yansıtıyorsa, öğrenci dile getirmese bile bu sorunu nazikçe fark et ve çözüm sun.
    2. EMPATİK GERÇEKÇİLİK: Öğrencinin duygularını anla (Sınav stresi, tükenmişlik, kaygı) ama çözümleri veriye dayandır.
    3. BÜTÜNCÜL YAKLAŞIM: Sadece "ne çalışmalıyım" sorusuna değil, "nasıl daha iyi hissederim ve odağımı toplarım" sorusuna da cevap ver.
    4. GİZLİ SORUNLAR: Verilerdeki tutarsızlıkları (örn: çok çalışıp düşük net almak) fark et ve bunun kök nedenini (örn: konu eksiği yerine dikkat eksikliği) bulmaya çalış.`;

    const finalSystemInstruction = systemInstruction 
      ? `${basePdrInstruction}\n\n${systemInstruction}`
      : basePdrInstruction;

    let lastError: any = null;
    const startIndex = GeminiService.rotationIndex % apiKeys.length;
    GeminiService.rotationIndex++;

    for (let i = 0; i < apiKeys.length; i++) {
      const currentKeyIndex = (startIndex + i) % apiKeys.length;
      const currentKey = apiKeys[currentKeyIndex];
      
      if (i > 0) {
        window.dispatchEvent(new CustomEvent('app-success', { 
          detail: `${currentKeyIndex + 1} numaralı API Anahtarı ile tekrar deneniyor...` 
        }));
      }

      try {
        if (this.modelName.startsWith('deepseek')) {
          return await this.generateDeepSeek(currentKey, prompt, schema, systemInstruction);
        }

        const ai = new GoogleGenAI({ apiKey: currentKey });
        const response = await ai.models.generateContent({
          model: this.modelName,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction,
            responseMimeType: schema ? "application/json" : "text/plain",
            responseSchema: schema,
            temperature: 0.7,
          }
        });

        await storage.incrementUsage();
        return response.text || "";
      } catch (e: any) {
        console.error(`API Key ${currentKeyIndex + 1} Error:`, e);
        lastError = e;
        
        // If it's a 401/403 (Unauthorized) or 429 (Quota), we should try the next key
        const errorStr = (e.message || "").toLowerCase();
        const shouldRetry = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("unauthorized") || errorStr.includes("invalid") || errorStr.includes("resource_exhausted");
        
        if (!shouldRetry && i === apiKeys.length - 1) {
          // If we've tried all keys, break
        }
      }
    }

    const errorMessage = lastError?.message || "Tüm API anahtarları başarısız oldu.";
    window.dispatchEvent(new CustomEvent('ai-error', { detail: errorMessage }));
    throw lastError;
  }

  private async generateDeepSeek(apiKey: string, prompt: string, schema?: any, systemInstruction?: string): Promise<string> {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: "system", content: systemInstruction || "Sen bir YKS koçusun." },
          { role: "user", content: prompt }
        ],
        response_format: schema ? { type: "json_object" } : { type: "text" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`DeepSeek API Hatası: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    await storage.incrementUsage();
    return data.choices[0].message.content || "";
  }

  private getSystemInstruction(settings: AppSettings, context: string = ""): string {
    const basePersona = `Sen uzman, tecrübeli ve stratejik düşünen bir YKS Koçusun. Aynı zamanda öğrencinin her türlü akademik ve psikolojik sorununda yanında olan bir PDR uzmanısın.
Öğrenciye rehberlik ederken hem motivasyon sağla hem de gerçekçi, veriye dayalı analizler yap. 
ÖNEMLİ: TYT ve AYT farkını asla karıştırma. Verilerdeki düşüşleri veya aksamaları PROAKTİF olarak yakala.
Öğrenci bir sorun söylemese bile sen verilerden (düşen netler, verimsiz çalışma seansları) sorunları süz ve "Böyle bir durum fark ettim, gel bunu çözelim" yaklaşımıyla gel.`;

    const customInstructions = settings.aiInstructions ? `\nKULLANICI ÖZEL TALİMATLARI:\n${settings.aiInstructions}` : "";
    const specificContext = context ? `\nŞU ANKİ GÖREV:\n${context}` : "";

    return `${basePersona}${customInstructions}${specificContext}`;
  }

  async generateProgram(
    books: Book[],
    trials: Trial[],
    settings: AppSettings,
    history: Task[],
    routines: UserRoutine[],
    targetDate: string,
    camps: Camp[],
    customRequest?: string,
    targetMinutes?: number
  ): Promise<{ tasks: Task[], reasoning: string, thought: string }> {
    const activeCamp = camps.find(c => targetDate >= c.startDate && targetDate <= c.endDate && c.isActive);
    const allDailyNotes = await storage.getDailyNotes();
    const chatSessions = await storage.getChatSessions();
    const currentNote = allDailyNotes.find(n => n.date === targetDate);
    
    const optimizedBooks = this.optimizeBooks(books);
    const optimizedTrials = this.optimizeTrials(trials);
    const optimizedNotes = this.optimizeDailyNotes(allDailyNotes);
    const optimizedTasks = this.optimizeRecentTasks(history, books);
    const optimizedChats = this.optimizeChatSessions(chatSessions);

    // Tamamlanan kitapları isim, ders ve tür formatında bir liste olarak topla
    const completedBooksListText = books
      .filter(b => b.isCompleted)
      .map(b => `- ${b.title} (Ders: ${b.branch || "Belirtilmemiş"}, Tür: ${b.type || "Belirtilmemiş"})`)
      .join('\n');

    const performanceAnalysis = books.filter(b => !b.isDisabled).map(book => {
      const bookTasks = history.filter(t => t.bookId === book.id && t.status === 'completed' && t.actualMinutes && t.unitsCompleted);
      if (bookTasks.length === 0) return null;
      const totalActualMinutes = bookTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
      const totalUnits = bookTasks.reduce((sum, t) => sum + (t.unitsCompleted || 0), 0);
      return {
        bookId: book.id,
        title: book.title,
        actualMinutesPerUnit: (totalActualMinutes / totalUnits).toFixed(1)
      };
    }).filter(Boolean);

    const userTasksToday = history.filter(t => t.date === targetDate && t.isManual);
    const userTasksTime = userTasksToday.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const daysToYks = Math.ceil((new Date(settings.yksDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    const campInfo = activeCamp ? {
      title: activeCamp.title,
      books: activeCamp.selectedBooks.map(id => books.find(b => b.id === id)?.title).filter(Boolean),
      allowOverwork: activeCamp.allowOverwork,
      bitisTarihi: activeCamp.endDate
    } : null;

    const prompt = `
          ÖĞRENCİ BİLGİLERİ VE TERCİHLERİ:
          - Branş/Alan: ${settings.studentField || "Belirtilmemiş"}
          - Biyografi: ${settings.personalBio || "Belirtilmemiş"}
          - Özel Talimatlar: ${settings.aiInstructions || "Belirtilmemiş"}
          - Hedef Netler: ${JSON.stringify(settings.targetNets)}
 
          SINAV SİSTEMİ BİLGİSİ (ÖNEMLİ):
          - TYT GENEL: Türkçe (40), Matematik (40), Sosyal (20), Fen (20) sorudan oluşur. (Toplam 120)
          - AYT GENEL: Matematik (40), Fen (40 [Fiz:14, Kim:13, Bio:13]), Sosyal-1 (40), Sosyal-2 (40) sorudan oluşur.
 
      ÖĞRENCİ VERİLERİ (BUGÜNÜN TARİHİ: ${new Date().toLocaleDateString('tr-TR')}):
      - Planlanan Gün: ${targetDate}
      - Planlanan Toplam Süre: ${targetMinutes || "Belirtilmemiş"} dakika (Bu süreye sadık kalmaya çalış)
      - Planlanan Günün Mevcut Kullanıcı Görevleri (SİLİNMEYECEK, BUNLARIN ÜZERİNE EK EGZERSİZ PLANLAYACAKSIN): ${JSON.stringify(userTasksToday.map(t => ({ title: t.title || books.find(b => b.id === t.bookId)?.title || "Başlıksız Görev", estimatedMinutes: t.estimatedMinutes, branch: t.branch || books.find(b => b.id === t.bookId)?.branch, description: t.description, unitsToStudy: t.unitsToStudy })))}
      - Mevcut Kullanıcı Görevleri Toplam Süresi: ${userTasksTime} dakika
      - YKS'ye Kalan Süre: ${daysToYks} gün
      - Tamamlanmayan Kitaplar (Sadece Bunlardan Görev Atanabilir): ${JSON.stringify(optimizedBooks)}
      - TAMAMLANAN KİTAPLAR LİSTESİ (Öğrenci bu kitapları bitirdi, BUNLARDAN KESİNLİKLE GÖREV VERME):
${completedBooksListText || "Yok"}
      - Hız Analizi: ${JSON.stringify(performanceAnalysis)}
      - Son Deneme Performansları (Tarih ve Branş Bazlı): ${JSON.stringify(optimizedTrials)}
      - Planlanan Gün İçin Not: ${currentNote?.content || "Yok"}
      - Son 3 Günlük Geri Feedback / Soru Geçmişi: ${JSON.stringify(optimizedTasks)}
      - Son 3 Günlük Notlar: ${JSON.stringify(optimizedNotes)}
      - Kritik Sohbet Mesajları (Son 7 Gün + Önemli İşaretlenenler): ${JSON.stringify(optimizedChats)}
      - Rutinler: ${JSON.stringify(routines)}
      - Özel İstek: ${customRequest || "Dengeli bir program yap."}
      - Planlanan Günün Mevcut Kullanıcı Görevleri varsa buna göre ekleme yapılması istendi mi: Evet, mevcut görevleri silmeyip geriye kalan süreyi ekstra görevlerle tamamlama istendi.
      - Aktif Kamp Bilgisi: ${campInfo ? JSON.stringify(campInfo) : "Yok"}
 
      BİR PDR VE KOÇ OLARAK GÖREVİN:
      1. Verilerdeki anormallikleri (net düşüşü, aksayan görevler, karamsar notlar) tespit et.
      2. Sohbet mesajlarındaki duygusal durumu, öğrencinin bahsettiği zorlukları veya talepleri (tarih ve saate dikkat ederek) analiz et ve programa yansıt.
      3. AKTİF KAMP VARSA: Programda bu kampa dahil edilen kitaplara MUTKALA öncelik ver. ÖNEMLİ: Eğer bir görevi 'Aktif Kamp' kapsamına alacaksan, o görev için SADECE 'Aktif Kamp Bilgisi' içindeki 'books' listesinde bulunan kitapları kullan. Kamp dışındaki normal çalışma kısımlarında ise diğer tüm kitaplarını kullanabilirsin. Kamp görevlerini başlığında '(Kamp)' olarak belirt.
      4. Öğrenci sessiz kalsa bile "Bugünlerde biraz enerjin düşük görünüyor" veya "Son yaptığımız konuşmada şundan bahsetmiştin" gibi bir yaklaşımla destek ol.
      5. Hedefleri gerçekçi tut ve gerekirse dinlenme/iyileşme molaları öner.
      6. ÖNEMLİ KİTAP KOŞULU: Yeni görevler oluştururken KESİNLİKLE öğrencinin tamamlamış olduğu kitaplardan veya kütüphanesinde bulunmayan kitaplardan görev planlama. SADECE 'Tamamlanmayan Kitaplar' listesinde bulunan kitapları ve bunların birebir 'id' değerlerini 'bookId' olarak kullanacaksın. Eğer kitap 'Tamamlanmayan Kitaplar' listesinde yoksa o kitaptan görev verme! Tamamlanan kitaplardan KESİNLİKLE görev planlama! Eğer genel bir çalışma veya kitapsız çalışma eklenecekse 'bookId' kısmını boş bırak.
      7. ÖNEMLİ GÖREV PLANLAMA KURALI: Öğrencinin planlanan gün için kendi eklediği hazır görevler (Mevcut Kullanıcı Görevleri listesi) vardır. Bu görevleri kesinlikle silmeyeceğiz, değiştirmeyeceğiz ve bunlara saygı duyacağız. Bu hazır görevlerin toplam süresi (${userTasksTime} dakika) kadardır. Toplam hedef süreden (${targetMinutes || 300} dakika) bu mevcut süreyi çıkararak geriye kalan süre için ekstra yeni görevler planlamalısın. Dönüş formatındaki 'tasks' listesinde SADECE kendi tavsiye edeceğin EKSTRA YENİ görevleri döndürmelisin (kullanıcının mevcut hazır görevlerini 'tasks' listesine dahil etme, onlar kod tarafında otomatik olarak korunur ve senin ekleyeceğin yeni görevlerle birleştirilir).
 
      DÖNÜŞ JSON FORMATI (SADECE JSON):
      {
        "tasks": [ { "bookId": "string", "unitsToStudy": number, "estimatedMinutes": number, "date": "string", "title": "string", "description": "string" } ],
        "reasoning": "PDR yaklaşımıyla hazırlanan stratejik özet",
        "thought": "Senin teknik düşünce zincirin"
      }
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        tasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              bookId: { type: Type.STRING },
              unitsToStudy: { type: Type.NUMBER },
              estimatedMinutes: { type: Type.NUMBER },
              date: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["bookId", "unitsToStudy", "estimatedMinutes", "date", "title", "description"]
          }
        },
        reasoning: { type: Type.STRING },
        thought: { type: Type.STRING }
      },
      required: ["tasks", "reasoning", "thought"]
    };

    try {
      const sysInst = this.getSystemInstruction(settings, `Program yapıyorsun. Tarih: ${targetDate}`);
      const jsonText = await this.generate(prompt, schema, sysInst);
      if (!jsonText) return { tasks: [], reasoning: "", thought: "" };
      const parsed = JSON.parse(jsonText);
      
      const activeBooks = books.filter(b => !b.isCompleted && !b.isDisabled);
      const completedBookTitles = new Set(books.filter(b => b.isCompleted).map(b => b.title.toLowerCase().trim()));
      const completedBookIds = new Set(books.filter(b => b.isCompleted).map(b => b.id));

      // Post-process the tasks returned by AI to guarantee no mismatch occurs
      const processedTasks = (parsed.tasks || []).map((t: any) => {
        // Drop completely if it explicitly refers to a completed book
        const isCompletedBookById = t.bookId && completedBookIds.has(t.bookId);
        const isCompletedBookByTitle = t.title && completedBookTitles.has(t.title.toLowerCase().trim());
        if (isCompletedBookById || isCompletedBookByTitle) {
          return null; // Skip task from completed book
        }

        let matchedBook = activeBooks.find(b => b.id === t.bookId);

        // 1. Try case-insensitive matching by title if bookId didn't match directly
        if (!matchedBook && t.title) {
          const tTitleLower = t.title.toLowerCase().trim();
          matchedBook = activeBooks.find(b => {
            const bTitleLower = b.title.toLowerCase().trim();
            return bTitleLower === tTitleLower || tTitleLower.includes(bTitleLower) || bTitleLower.includes(tTitleLower);
          });
        }

        // 2. Try matching by returned bookId if AI wrote the title or ID
        if (!matchedBook && t.bookId) {
          const tBookIdLower = t.bookId.toLowerCase().trim();
          matchedBook = activeBooks.find(b => {
            const bTitleLower = b.title.toLowerCase().trim();
            return bTitleLower === tBookIdLower || tBookIdLower.includes(bTitleLower) || bTitleLower.includes(tBookIdLower);
          });
        }

        // 3. Fallback: Intelligent word-level overlap matching
        if (!matchedBook && t.title) {
          const tWords = t.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          matchedBook = activeBooks.find(b => {
            const bWords = b.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
            const overlapCount = tWords.filter((w: string) => bWords.includes(w)).length;
            return overlapCount >= 2 || (overlapCount >= 1 && (bWords.length <= 2 || tWords.length <= 2));
          });
        }

        // 4. If matched, overwrite bookId with real ID to associate correctly!
        if (matchedBook) {
          return {
            ...t,
            id: crypto.randomUUID(),
            bookId: matchedBook.id,
            title: matchedBook.title, // Keep clean and exact book title
            branch: matchedBook.branch,
            status: 'pending' as const
          };
        }

        // 5. If it is a generic task or refers to a book not in user's library, clear bookId to avoid broken references
        return {
          ...t,
          id: crypto.randomUUID(),
          bookId: undefined, // Safely render as manual/general study task
          status: 'pending' as const
        };
      }).filter(Boolean) as Task[];

      return { tasks: processedTasks, reasoning: parsed.reasoning || "", thought: parsed.thought || "" };
    } catch (e) {
      console.error("Error in generateProgram:", e);
      return { tasks: [], reasoning: "", thought: "" };
    }
  }

  async getMentorAdvice(
    books: Book[],
    trials: Trial[],
    history: Task[],
    settings: AppSettings,
    camps: Camp[]
  ): Promise<Array<{ message: string, type: "warning" | "tip" | "motivation" | "suggestion" }>> {
    const daysToYks = Math.ceil((new Date(settings.yksDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    const trialSummary = this.optimizeTrials(trials);
    const optimizedBooks = this.optimizeBooks(books);

    // Tamamlanan kitapları isim, ders ve tür listesine çevir
    const completedBooksListText = books
      .filter(b => b.isCompleted)
      .map(b => `- ${b.title} (Ders: ${b.branch || "Belirtilmemiş"}, Tür: ${b.type || "Belirtilmemiş"})`)
      .join('\n');

    const today = new Date().toISOString().split('T')[0];
    const startedCamps = camps
      .filter(c => c.startDate <= today && c.isActive)
      .map(c => ({
        title: c.title,
        status: (c.startDate <= today && c.endDate >= today) ? "Devam Ediyor" : "Tamamlandı",
        bitisTarihi: c.endDate
      }));

    const prompt = `
      BUGÜNÜN TARİHİ: ${today}
      YKS'ye Kalan Süre: ${daysToYks} day
      Öğrenci Alanı: ${settings.studentField || "Belirtilmemiş"}
      Öğrenci Kısıtı/Biyo: ${settings.personalBio || "Yok"}
      Öğrenci Özel Talimatı: ${settings.aiInstructions || "Yok"}
      Aktif/Başlamış Kamplar: ${JSON.stringify(startedCamps)}
      Son Deneme Verileri (Tarih ve Branş Bazlı Son Sonuçlar): ${JSON.stringify(trialSummary)}
      Tamamlanmayan Kitap Şeması: ${JSON.stringify(optimizedBooks)}
      TAMAMLANAN KİTAPLAR LİSTESİ (Öğrenci bu kitapları başarıyla bitirdi, bunlardan yeni görev tavsiye etme):
${completedBooksListText || "Yok"}
      Hedef Netler: ${JSON.stringify(settings.targetNets)}
      Lütfen öğrenciye bu verilere bakarak mentor tavsiyeleri ver. TYT ve AYT farkını gözet.
    `;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["warning", "tip", "motivation", "suggestion"] }
        },
        required: ["message", "type"]
      }
    };

    try {
      const sysInst = this.getSystemInstruction(settings, "Öğrenciye mentorluk yap.");
      const jsonText = await this.generate(prompt, schema, sysInst);
      if (!jsonText) return [];
      return JSON.parse(jsonText);
    } catch (e) {
      return [];
    }
  }

  async chat(prompt: string, settings: AppSettings, contextData?: any): Promise<string> {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    
    // Filter history in context if it exists
    if (contextData && contextData.history) {
      contextData.history = contextData.history.filter((m: any) => m.timestamp >= threeDaysAgo);
    }

    const contextPrompt = `
      BUGÜNÜN TARİHİ: ${new Date().toLocaleDateString('tr-TR')}
      ÖĞRENCİ ALANI: ${settings.studentField || "Belirtilmemiş"}
      ÖĞRENCİ HAKKINDA: ${settings.personalBio || "Belirtilmemiş"}
      ÖZEL TALİMATLARIN: ${settings.aiInstructions || "Belirtilmemiş"}
      
      SINAV SİSTEMİ BİLGİSİ (ÖNEMLİ):
      - TYT GENEL: Türkçe (40), Matematik (40), Sosyal (20), Fen (20) sorudan oluşur. (Toplam 120)
      - AYT GENEL: Matematik (40), Fen (40 [Fiz:14, Kim:13, Bio:13]), Sosyal-1 (40), Sosyal-2 (40) sorudan oluşur.
 
       DİĞER VERİLER (Son 3 Günlük Sohbet/Görevler ve Son 5 Branş Denemesi): ${JSON.stringify(contextData)}
       MESAJ: ${prompt}
       JSON formatında cevap ver: { "text": "cevap", "thought": "düşünce" }
     `;
 
     try {
       const sysInst = this.getSystemInstruction(settings, "Öğrenciyle sohbet et.");
       const responseText = await this.generate(contextPrompt, true, sysInst);
 
       const parsed = JSON.parse(responseText || "{}");
       return JSON.stringify({ text: parsed.text || responseText, thought: parsed.thought || "" });
     } catch (e) {
       return JSON.stringify({ text: "Hata oluştu veya model yanıtı geçersiz.", thought: "" });
     }
   }
 
   async getTrialAnalysis(trials: Trial[], settings: AppSettings): Promise<string> {
    const trialData = this.optimizeTrials(trials);

     const prompt = `Son deneme verilerini analiz et ve öğrenciye yol göster. 
     TYT ve AYT netlerini birbirine karıştırma. 
     Öğrenci Alanı: ${settings.studentField || "Belirtilmemiş"}
     Öğrenci Profili: ${settings.personalBio || "Bilinmiyor"}
     Kullanıcı Talimatları: ${settings.aiInstructions || "Yok"}
     Veriler (Son 5 Branş Denemesi): ${JSON.stringify(trialData)}. 
     
     YAZIM KURALLARI:
     1. Sadece "analysis" alanına markdown formatında kullanıcı raporunu yaz.
     2. "thought" alanına ise teknik analiz sürecini yaz.
     3. İKİ ALANI BİRBİRİNE KESİNLİKLE KARIŞTIRMA.
 
     JSON FORMATI: { "analysis": "...", "thought": "..." }`;
 
     try {
       const sysInst = this.getSystemInstruction(settings, "Öğrencinin deneme sonuçlarını analiz ediyorsun.");
       const responseText = await this.generate(prompt, true, sysInst);
       const parsed = JSON.parse(responseText || "{}");
       return JSON.stringify({ analysis: parsed.analysis || responseText, thought: parsed.thought || "" });
     } catch (e) {
       return JSON.stringify({ analysis: "Hata oluştu.", thought: "" });
     }
   }
 
   async getComprehensiveReport(
     settings: AppSettings,
     trials: Trial[],
     books: Book[],
     dailyNotes: DailyNote[]
   ): Promise<string> {


    const trialData = this.optimizeTrials(trials);
     const optimizedBooks = this.optimizeBooks(books);
     const completedBooksListText = books.filter(b => b.isCompleted).map(b => `- ${b.title} (Ders: ${b.branch || "Belirtilmemiş"}, Tür: ${b.type || "Belirtilmemiş"})`).join('\n');
     const optimizedNotes = this.optimizeDailyNotes(dailyNotes);
 
     const prompt = `Öğrenci için 360 Derece Kapsamlı Gelişim Raporu hazırla. 
     
     ÖNEMLİ: TYT ve AYT netlerini, konularını ve hedeflerini asla birbirine karıştırma. 
     AYT Matematik ve TYT Matematik farklıdır.
     
     Öğrenci Alanı: ${settings.studentField || "Belirtilmemiş"}
     Öğrenci Kısıtı: ${settings.personalBio || "Yok"}
     Özel Talimatlar: ${settings.aiInstructions || "Yok"}
     Kitap Durumları (Tamamlanmayanlar): ${JSON.stringify(optimizedBooks)}
     TAMAMLANAN KİTAPLAR LİSTESİ (Öğrenci bu kitapları bitirdi, bunlardan yeni görev tavsiye etme):
${completedBooksListText || "Yok"}
     Denemeler (Branş Bazlı Son 5): ${JSON.stringify(trialData)}
     Günlük Notlar (Son 3 Gün): ${JSON.stringify(optimizedNotes)}
     
     YAZIM KURALLARI:
     1. Sadece "analysis" alanına markdown formatında profesyonel raporu yaz.
     2. "thought" alanına ise analiz sürecindeki teknik düşüncelerini yaz.
     3. İKİ ALANI BİRBİRİNE KESİNLİKLE KARIŞTIRMA.
 
     JSON FORMATI: { "analysis": "...", "thought": "..." }`;
 
     try {
       const sysInst = this.getSystemInstruction(settings, "Kapsamlı öğrenci raporu hazırlıyorsun.");
       const responseText = await this.generate(prompt, true, sysInst);
       const parsed = JSON.parse(responseText || "{}");
       return JSON.stringify({ analysis: parsed.analysis || responseText, thought: parsed.thought || "" });
     } catch (e) {
       return JSON.stringify({ analysis: "Hata", thought: "" });
     }
   }
}
