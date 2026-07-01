import { useEffect, useState } from 'react';
import { storage } from '../lib/storage.ts';
import { GeminiService } from '../services/geminiService.ts';
import { Book, Trial, Task, AppSettings, Camp } from '../types.ts';

export function useAIMentor(
  books: Book[],
  trials: Trial[],
  tasks: Task[],
  settings: AppSettings | null,
  camps: Camp[]
) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    if (!settings?.apiKey || books.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const gemini = new GeminiService(settings!, settings!.aiModel);
      const adviceList = await gemini.getMentorAdvice(books, trials, tasks, settings!, camps);
      
      const currentWarnings = await storage.getWarnings();
      
      const newWarnings = adviceList.map(advice => ({
        id: crypto.randomUUID(),
        ...advice,
        createdAt: Date.now()
      }));

      // Filter out duplicate messages and keep unique ones
      const combined = [...newWarnings, ...currentWarnings]
        .filter((v, i, a) => a.findIndex(t => t.message === v.message) === i)
        .slice(0, 15);

      await storage.saveWarnings(combined);
      
      localStorage.setItem('last_ai_analysis', Date.now().toString());
    } catch (e: any) {
      if (e.message?.includes("limit") || e.message?.includes("aşım")) {
        window.dispatchEvent(new CustomEvent('ai-error', { detail: e.message }));
      }
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { isAnalyzing, analyze };
}
