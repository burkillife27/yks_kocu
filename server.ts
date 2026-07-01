import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// Simple in-memory storage for pending analysis
// In production, this should be Firestore
const analysisTasks = new Map<string, { status: 'processing' | 'completed' | 'error', result?: any, error?: string }>();
let globalRotationIndex = 0;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/analyze/trial", async (req, res) => {
    const { apiKey, apiKey2, apiKey3, modelName, trials, settings, taskId } = req.body;
    
    if (!apiKey && !apiKey2 && !apiKey3) return res.status(400).json({ error: "API Key required" });
    if (!taskId) return res.status(400).json({ error: "Task ID required" });

    // Mark as processing
    analysisTasks.set(taskId, { status: 'processing' });
    res.json({ status: 'accepted' });

    // Background processing
    (async () => {
      const apiKeys = [apiKey, apiKey2, apiKey3].filter(Boolean) as string[];
      let lastError: any = null;
      
      const startIndex = globalRotationIndex % apiKeys.length;
      globalRotationIndex++;

      for (let i = 0; i < apiKeys.length; i++) {
        const currentKeyIndex = (startIndex + i) % apiKeys.length;
        const currentKey = apiKeys[currentKeyIndex];
        
        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          
          // Group trials by branch and take last 5 for each
          const trialsByBranch: Record<string, any[]> = {};
          trials.forEach((t: any) => {
            const key = t.branch || t.type;
            if (!trialsByBranch[key]) trialsByBranch[key] = [];
            trialsByBranch[key].push(t);
          });

          const optimizedTrials: any[] = [];
          Object.values(trialsByBranch).forEach(group => {
            const sorted = group.sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 5);
            optimizedTrials.push(...sorted.map((t: any) => ({
              tarih: t.date,
              tip: t.type,
              brans: t.branch,
              net: t.net,
              dogru: t.correct,
              yanlis: t.wrong,
              bos: t.empty,
              not: t.notes,
              hatalar: t.mistakes.map((m: any) => `${m.topic} (${m.count})`)
            })));
          });

          const modelMappings: Record<string, string> = {
            'gemini-1.5-pro': 'gemini-3.1-pro-preview',
            'gemini-1.5-flash': 'gemini-3-flash-preview',
            'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
            'gemini-2.5-flash': 'gemini-3-flash-preview',
            'gemini-2.0-flash-exp': 'gemini-3-flash-preview',
          };

          const finalModel = modelMappings[modelName] || modelName || "gemini-3-flash-preview";

          const prompt = `Sen bir YKS koçusun. Aşağıdaki son deneme verilerini analiz et ve öğrenciye yol göster. 
          ÖNEMLİ: TYT ve AYT netlerini birbirine karıştırma. 
          ÖĞRENCİ ALANI: ${settings.studentField || "Belirtilmemiş"}
          ÖĞRENCİ BİLGİSİ: ${settings.personalBio || "Yok"}
          ÖZEL TALİMATLAR: ${settings.aiInstructions || "Yok"}

          SINAV SİSTEMİ BİLGİSİ:
          - TYT GENEL: Türkçe (40), Matematik (40), Sosyal (20), Fen (20) sorudan oluşur.
          - AYT GENEL: Matematik (40), Fen (40 [Fiz:14, Kim:13, Bio:13]), Sosyal-1 (40), Sosyal-2 (40) sorudan oluşur.

          AYRIŞTIRMA KURALLARI: 
          1. Sadece "analysis" alanına markdown formatında kullanıcı raporunu yaz. 
          2. "thought" alanına ise analiz yaparken kurduğun mantık zincirini yaz. 
          3. İKİ ALANI BİRBİRİNE KARIŞTIRMA.
          
          Veriler (Branş Bazlı Son 5 Deneme): ${JSON.stringify(optimizedTrials)}. 
          DÖNÜŞ JSON FORMATI: { "analysis": "...", "thought": "..." }`;

          // Using a more standard way to call generateContent
          const response = await ai.models.generateContent({
             model: finalModel,
             contents: [{ role: "user", parts: [{ text: prompt }] }],
             config: {
               responseMimeType: "application/json",
               temperature: 0.7
             }
          });
          
          const text = response.text || "";
          
          analysisTasks.set(taskId, { 
            status: 'completed', 
            result: JSON.parse(text) 
          });
          return; // Success, exit the loop
        } catch (e: any) {
          console.error(`Server Side Analysis Error Key ${currentKeyIndex + 1}:`, e);
          lastError = e;
          // Continue to next key
        }
      }

      // If we reached here, all keys failed
      let errorMsg = lastError?.message || "Bilinmeyen bir hata oluştu.";
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Tüm API anahtarlarınızın kullanım limiti doldu. Lütfen daha sonra tekrar deneyin.";
      }
      analysisTasks.set(taskId, { 
        status: 'error', 
        error: errorMsg
      });
    })();
  });

  app.post("/api/analyze/comprehensive", async (req, res) => {
    const { apiKey, apiKey2, apiKey3, modelName, trials, books, tasks, chats, settings, taskId } = req.body;
    
    if (!apiKey && !apiKey2 && !apiKey3) return res.status(400).json({ error: "API Key required" });
    if (!taskId) return res.status(400).json({ error: "Task ID required" });

    analysisTasks.set(taskId, { status: 'processing' });
    res.json({ status: 'accepted' });

    (async () => {
      const apiKeys = [apiKey, apiKey2, apiKey3].filter(Boolean) as string[];
      let lastError: any = null;
      
      const startIndex = globalRotationIndex % apiKeys.length;
      globalRotationIndex++;

      for (let i = 0; i < apiKeys.length; i++) {
        const currentKeyIndex = (startIndex + i) % apiKeys.length;
        const currentKey = apiKeys[currentKeyIndex];
        
        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          
          // Group trials by branch
          const trialsByBranch: Record<string, any[]> = {};
          trials.forEach((t: any) => {
            const key = t.branch || t.type;
            if (!trialsByBranch[key]) trialsByBranch[key] = [];
            trialsByBranch[key].push(t);
          });
          const optimizedTrials: any[] = [];
          Object.values(trialsByBranch).forEach(group => {
            const sorted = group.sort((a: any, b: any) => b.date.localeCompare(a.date));
            optimizedTrials.push(...sorted.map((t: any) => ({
              tarih: t.date,
              tip: t.type,
              brans: t.branch,
              net: t.net,
              not: t.notes,
              hatalar: t.mistakes.map((m: any) => m.topic)
            })));
          });

          const bookData = books
            .filter((b: any) => !b.isCompleted)
            .map((b: any) => {
              const item: any = {
                ad: b.title,
                brans: b.branch,
                ilerleme: `%${Math.round((b.completedUnits/b.totalUnits)*100)}`
              };
              if (b.priority) item.oncelik = true;
              return item;
            });

          const studyData = (tasks || []).map((t: any) => ({
            tarih: t.date,
            baslik: t.bookId ? books.find((b: any) => b.id === t.bookId)?.title : t.title,
            durum: t.status === 'completed' ? 'Tamamlandı' : 'Eksik',
            sure: `${t.actualMinutes || 0} dk`,
            not: t.userNote
          }));

          const modelMappings: Record<string, string> = {
            'gemini-1.5-pro': 'gemini-3.1-pro-preview',
            'gemini-1.5-flash': 'gemini-3-flash-preview',
            'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
            'gemini-2.5-flash': 'gemini-3-flash-preview',
            'gemini-2.0-flash-exp': 'gemini-3-flash-preview',
          };

          const finalModel = modelMappings[modelName] || modelName || "gemini-3-flash-preview";

          const prompt = `Öğrenci için 360 Derece Kapsamlı Gelişim Raporu hazırla. 
          
          GÖREVİN VE PERSONAN:
          Sen kıdemli bir PDR uzmanı ve YKS stratejistisin. Sadece sayıları değil, öğrencinin psikolojik durumunu da analiz etmelisiniz.
          
          ÖNEMLİ: TYT ve AYT verilerini asla karıştırma. 
          
          SINAV SİSTEMİ BİLGİSİ:
          - TYT GENEL: Türkçe (40), Matematik (40), Sosyal (20), Fen (20) sorudan oluşur.
          - AYT GENEL: Matematik (40), Fen (40 [Fiz:14, Kim:13, Bio:13]), Sosyal-1 (40), Sosyal-2 (40) sorudan oluşur.

          Öğrenci Alanı: ${settings.studentField || "Belirtilmemiş"}
          Öğrenci Profili: ${settings.personalBio || "Belirtilmemiş"}
          Kullanıcı Talimatları: ${settings.aiInstructions || "Yok"}
          Hedef Netler: ${JSON.stringify(settings.targetNets)}
          
          VERİLER:
          1. Kitap Durumları: ${JSON.stringify(bookData)}
          2. Denemeler (Branş Bazlı): ${JSON.stringify(optimizedTrials)}
          3. Çalışma Kayıtları: ${JSON.stringify(studyData)}
          4. Kritik Mesajlar ve Görüşmeler: ${JSON.stringify(chats)}
          
          PROAKTİF PDR ANALİZİ:
          - Öğrenci bir sorundan bahsetmese dahi, verilerdeki "tehlikeli" sinyalleri (örn: 3 gündür aksayan program, TYT denemelerindeki ani net kaybı, çalışma temposundaki düşüş) yakala.
          - Chat mesajlarındaki duygu durumunu ve önemli işaretlenen konuları dikkate al.
          - Bu sorunları "Gözden kaçırdığın veya belki farkında olmadığın bir şey gördüm" diyerek dile getir.
          - Somut stratejik ve psikolojik öneriler sun.
          
          AYRIŞTIRMA KURALLARI:
          1. Sadece "analysis" alanına markdown formatında profesyonel raporu yaz.
          2. "thought" alanına ise analiz sürecindeki düşüncelerini yaz.
          3. İKİ ALANI BİRBİRİNE KARIŞTIRMA.

          DÖNÜŞ JSON FORMATI: { "analysis": "...", "thought": "..." }`;

          const response = await ai.models.generateContent({
             model: finalModel,
             contents: [{ role: "user", parts: [{ text: prompt }] }],
             config: {
               responseMimeType: "application/json",
               temperature: 0.7
             }
          });
          
          const text = response.text || "";
          
          analysisTasks.set(taskId, { 
            status: 'completed', 
            result: JSON.parse(text) 
          });
          return;
        } catch (e: any) {
          console.error(`Server Side Comprehensive Report Error Key ${currentKeyIndex + 1}:`, e);
          lastError = e;
        }
      }

      let errorMsg = lastError?.message || "Bilinmeyen bir hata oluştu.";
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Tüm API anahtarlarınızın kullanım limiti doldu. Lütfen daha sonra tekrar deneyin.";
      }
      analysisTasks.set(taskId, { 
        status: 'error', 
        error: errorMsg
      });
    })();
  });

  app.get("/api/analyze/status/:taskId", (req, res) => {
    const task = analysisTasks.get(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  const syncSessions = new Map<string, { lastActionTime: number, data: any }>();

  app.post("/api/sync", (req, res) => {
    const { password, lastActionTime, data } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Şifre gereklidir." });
    }
    const trimmedPassword = password.trim().toUpperCase();
    const existing = syncSessions.get(trimmedPassword);

    if (!existing) {
      syncSessions.set(trimmedPassword, { lastActionTime: lastActionTime || 0, data });
      return res.json({ status: "stored", lastActionTime: lastActionTime || 0 });
    }

    if (lastActionTime > existing.lastActionTime) {
      syncSessions.set(trimmedPassword, { lastActionTime, data });
      return res.json({ status: "uploaded", lastActionTime });
    } else if (lastActionTime < existing.lastActionTime) {
      return res.json({ status: "downloaded", lastActionTime: existing.lastActionTime, data: existing.data });
    } else {
      return res.json({ status: "synced", lastActionTime });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
