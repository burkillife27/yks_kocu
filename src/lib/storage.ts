import { get, set } from 'idb-keyval';
import { Book, Trial, Task, AppSettings, AIWarning, UserRoutine, ApiUsage, Camp, ChatSession, StudySession, DailyNote } from '../types.ts';

const KEYS = {
  BOOKS: 'yks_books',
  TRIALS: 'yks_trials',
  TASKS: 'yks_tasks',
  SETTINGS: 'yks_settings',
  WARNINGS: 'yks_ai_warnings',
  ROUTINES: 'yks_routines',
  USAGE: 'yks_api_usage',
  CAMPS: 'yks_camps',
  CHAT_SESSIONS: 'yks_chat_sessions',
  STUDY_SESSIONS: 'yks_study_sessions',
  AI_CONTEXT: 'yks_ai_context',
  DAILY_NOTES: 'yks_daily_notes',
  AI_REASONING: 'yks_ai_reasoning',
  ANALYSIS_PERSISTENCE: 'yks_analysis_persistence',
  AI_KNOWLEDGE: 'yks_ai_knowledge',
};

export interface AnalysisState {
  result: { analysis: string, thought: string } | null;
  timestamp: number;
  isProcessing: boolean;
  taskId?: string | null;
}

export const storage = {
  async getAnalysisState(type: 'trial' | 'comprehensive'): Promise<AnalysisState> {
    const all = (await get(KEYS.ANALYSIS_PERSISTENCE)) || {};
    return all[type] || { result: null, timestamp: 0, isProcessing: false };
  },
  async saveAnalysisState(type: 'trial' | 'comprehensive', state: Partial<AnalysisState>) {
    const all = (await get(KEYS.ANALYSIS_PERSISTENCE)) || {};
    all[type] = { ...(all[type] || { result: null, timestamp: 0, isProcessing: false }), ...state };
    await set(KEYS.ANALYSIS_PERSISTENCE, all);
  },
  async getUsage(): Promise<ApiUsage> {
    const today = new Date().toISOString().split('T')[0];
    const saved: ApiUsage | undefined = await get(KEYS.USAGE);
    
    if (!saved || saved.lastResetDate !== today) {
      const reset = { requestsToday: 0, lastResetDate: today };
      await set(KEYS.USAGE, reset);
      return reset;
    }
    return saved;
  },
  async incrementUsage() {
    const current = await this.getUsage();
    await set(KEYS.USAGE, {
      ...current,
      requestsToday: current.requestsToday + 1
    });
  },
  async getBooks(): Promise<Book[]> {
    return (await get(KEYS.BOOKS)) || [];
  },
  async saveBooks(books: Book[]) {
    await set(KEYS.BOOKS, books);
    await this.updateLastAction();
  },
  async getTrials(): Promise<Trial[]> {
    return (await get(KEYS.TRIALS)) || [];
  },
  async saveTrials(trials: Trial[]) {
    await set(KEYS.TRIALS, trials);
    await this.updateLastAction();
  },
  async getTasks(): Promise<Task[]> {
    return (await get(KEYS.TASKS)) || [];
  },
  async saveTasks(tasks: Task[]) {
    await set(KEYS.TASKS, tasks);
    await this.updateLastAction();
  },
  async getRoutines(): Promise<UserRoutine[]> {
    const raw = await get(KEYS.ROUTINES);
    if (!raw) return [];
    
    // Migration check
    return (raw as any[]).map(r => {
      // If it doesn't have an ID or 'days' property, it's an old routine
      if (!r.id || !r.days) {
        return {
          id: r.id || crypto.randomUUID(),
          days: r.dayOfWeek !== undefined ? [r.dayOfWeek] : [1,2,3,4,5],
          startTime: r.startTime || '08:00',
          durationMinutes: r.durationMinutes || 60,
          title: r.title || 'İsimsiz Rutin',
          description: r.description || '',
          selectedBookIds: r.selectedBookIds || []
        };
      }
      return r;
    });
  },
  async saveRoutines(routines: UserRoutine[]) {
    await set(KEYS.ROUTINES, routines);
    await this.updateLastAction();
  },
  async getSettings(): Promise<AppSettings> {
    const defaults: AppSettings = {
      theme: 'dark',
      yksDate: '2026-06-20',
      studyStartDate: new Date().toISOString().split('T')[0],
      targetNets: { tyt: 100, ayt: 75 },
      dailyStudyMinutes: { 0: 300, 1: 300, 2: 300, 3: 300, 4: 300, 5: 360, 6: 360 },
      aiModel: 'gemini-3-flash-preview',
      aiCoreMode: 'ask',
      aiInstructions: "Öğrenciyi sürekli onaylayan bir 'yankı odası' olma. Gerektiğinde mevcut çalışma planının yetersizliğini yüzüne vur ve onu daha yüksek bir performansa zorla. Bir adım önde olduğunu hissettir.",
      personalBio: '',
      adaptiveStudyPlan: {
        isEnabled: false,
        maxDailyHours: 12,
        weeklyIncrementMinutes: 15,
        daysToApply: [1, 2, 3, 4, 5],
        startDate: new Date().toISOString().split('T')[0]
      },
      pomodoro: {
        workTime: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        soundEnabled: true
      },
      remindersEnabled: true
    };
    const saved = await get(KEYS.SETTINGS);
    const result = saved ? { ...defaults, ...saved, targetNets: { ...defaults.targetNets, ...(saved.targetNets || {}) } } : defaults;
    if (!result.multiDevicePassword) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'YKS-';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      code += '-';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      result.multiDevicePassword = code;
      await set(KEYS.SETTINGS, result);
    }
    return result;
  },
  async saveSettings(settings: AppSettings) {
    await set(KEYS.SETTINGS, settings);
    await this.updateLastAction();
  },
  async getWarnings(): Promise<AIWarning[]> {
    return (await get(KEYS.WARNINGS)) || [];
  },
  async saveWarnings(warnings: AIWarning[]) {
    await set(KEYS.WARNINGS, warnings);
    await this.updateLastAction();
  },
  async getCamps(): Promise<Camp[]> {
    return (await get(KEYS.CAMPS)) || [];
  },
  async saveCamps(camps: Camp[]) {
    await set(KEYS.CAMPS, camps);
    await this.updateLastAction();
  },
  async getChatSessions(): Promise<ChatSession[]> {
    return (await get(KEYS.CHAT_SESSIONS)) || [];
  },
  async saveChatSessions(sessions: ChatSession[]) {
    await set(KEYS.CHAT_SESSIONS, sessions);
    await this.updateLastAction();
  },
  async getStudySessions(): Promise<StudySession[]> {
    return (await get(KEYS.STUDY_SESSIONS)) || [];
  },
  async saveStudySessions(sessions: StudySession[]) {
    await set(KEYS.STUDY_SESSIONS, sessions);
    await this.updateLastAction();
  },
  async addStudySession(session: StudySession) {
    const sessions = await this.getStudySessions();
    await this.saveStudySessions([session, ...sessions]);
    await this.updateLastAction();
  },
  async saveAiContext(context: string) {
    await set(KEYS.AI_CONTEXT, context);
  },
  async getAiContext(): Promise<string> {
    const saved = await get(KEYS.AI_CONTEXT);
    if (saved) return saved;
    
    // Fallback to latest assistant message from latest session
    const sessions = await this.getChatSessions();
    if (sessions.length > 0) {
      const latest = sessions.sort((a,b) => b.updatedAt - a.updatedAt)[0];
      const last = [...latest.messages].reverse().find(m => m.role === 'assistant');
      return last ? last.content : '';
    }
    return '';
  },
  async getDailyNotes(): Promise<DailyNote[]> {
    return (await get(KEYS.DAILY_NOTES)) || [];
  },
  async saveDailyNotes(notes: DailyNote[]) {
    await set(KEYS.DAILY_NOTES, notes);
    await this.updateLastAction();
  },
  async getDailyNoteByDate(date: string): Promise<DailyNote | undefined> {
    const notes = await this.getDailyNotes();
    return notes.find(n => n.date === date);
  },
  async saveDailyNote(date: string, content: string) {
    let notes = await this.getDailyNotes();
    const index = notes.findIndex(n => n.date === date);
    if (index > -1) {
      notes[index].content = content;
    } else {
      notes.push({ date, content });
    }
    await this.saveDailyNotes(notes);
    await this.updateLastAction();
  },
  async getAiReasoning(date: string): Promise<{ reasoning: string, thought?: string } | null> {
    const reasonings = (await get(KEYS.AI_REASONING)) || {};
    return reasonings[date] || null;
  },
  async saveAiReasoning(date: string, reasoning: string, thought?: string) {
    const reasonings = (await get(KEYS.AI_REASONING)) || {};
    reasonings[date] = { reasoning, thought };
    await set(KEYS.AI_REASONING, reasonings);
  },
  async deleteAiReasoning(date: string) {
    const reasonings = (await get(KEYS.AI_REASONING)) || {};
    delete reasonings[date];
    await set(KEYS.AI_REASONING, reasonings);
  },
  async getAllAiReasonings(): Promise<Record<string, { reasoning: string, thought?: string }>> {
    return (await get(KEYS.AI_REASONING)) || {};
  },
  async getAiKnowledge(): Promise<import('../types.ts').LearnedKnowledge> {
    const defaults: import('../types.ts').LearnedKnowledge = {
      topicMastery: {},
      preferredStudyTimes: {},
      branchDifficultyRank: [],
      lastStudySessionRating: 0,
      aiInteractionCount: 0,
      selfTrainedContext: []
    };
    const saved = await get(KEYS.AI_KNOWLEDGE);
    return saved || defaults;
  },
  async saveAiKnowledge(knowledge: import('../types.ts').LearnedKnowledge) {
    await set(KEYS.AI_KNOWLEDGE, knowledge);
    await this.updateLastAction();
  },
  isSyncing: false,
  async updateLastAction() {
    const ts = Date.now();
    await set('yks_last_action_timestamp', ts);
    if (!this.isSyncing) {
      await set('yks_device_last_action_timestamp', ts);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('yks-action-performed', { detail: ts }));
    }
  },
  async getLastAction(): Promise<number> {
    return (await get('yks_last_action_timestamp')) || 0;
  },
  async getDeviceLastAction(): Promise<number> {
    return (await get('yks_device_last_action_timestamp')) || 0;
  }
};
