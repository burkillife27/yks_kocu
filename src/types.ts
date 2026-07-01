export interface StudySession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  branch?: ExamBranch;
  startTime: number; // timestamp
  endTime: number; // timestamp
  type: 'pomodoro' | 'stopwatch';
}

export type BookType = "Konu Anlatım" | "Soru Bankası" | "Deneme";
export type ExamBranch = 
  "TYT Matematik" | "TYT Türkçe" | "TYT Fizik" | "TYT Kimya" | "TYT Biyoloji" | "TYT Fen" | "TYT Sosyal" | "TYT GENEL" |
  "AYT Matematik" | "AYT Fizik" | "AYT Kimya" | "AYT Biyoloji" | "AYT Fen" | "AYT Edebiyat" | "AYT Tarih-1" | "AYT Coğrafya-1" | "AYT Tarih-2" | "AYT Coğrafya-2" | "AYT Felsefe Grubu" | "AYT Din Kültürü" | "AYT Sosyal-2" | "AYT Edebiyat-Sosyal" | "AYT GENEL" |
  "Paragraf" | "Problem" | "Yabancı Dil (YDT)";

export interface Book {
  id: string;
  title: string;
  type: BookType;
  branch: ExamBranch;
  totalUnits: number; // sayfa veya test
  unitType: "sayfa" | "test";
  completedUnits: number;
  minutesPerUnit: number; // Tahmini bitirme süresi
  createdAt: number;
  updatedAt: number;
  isCompleted: boolean;
  priority: boolean; // Kesin bitirilecek
  isDisabled?: boolean; // Devre dışı bırakıldı mı
  dailyLimit: number; // Maksimum günlük birim (0 = sınırsız)
  allowedDays: number[]; // 0-6 (Pazar-Cumartesi)
  notes?: string; // Kitaba özel çalışma notları
}

export interface WorkSession {
  completedUnits: number;
  minutesSpent: number;
  at: number;
}

export interface Task {
  id: string;
  bookId?: string;
  title?: string;
  description?: string;
  branch?: ExamBranch;
  unitsToStudy?: number;
  unitsCompleted?: number;
  sessions?: WorkSession[];
  estimatedMinutes: number;
  actualMinutes?: number;
  date: string; // YYYY-MM-DD
  status: "pending" | "completed" | "skipped";
  completedAt?: number;
  isManual?: boolean;
  userNote?: string;
}

export interface TrialMistake {
  topic: string;
  count: number;
}

export interface TrialSubject {
  name: string;
  correct: number;
  wrong: number;
  empty: number;
  totalQuestions?: number;
}

export interface Trial {
  id: string;
  title: string;
  type: "TYT" | "AYT" | "Branş";
  branch?: ExamBranch;
  date: string;
  correct: number;
  wrong: number;
  empty: number;
  net: number;
  durationMinutes?: number;
  subjects?: TrialSubject[];
  mistakes: TrialMistake[];
  difficulty: "Kolay" | "Orta" | "Zor";
  priority?: boolean;
  notes?: string;
}

export interface UserRoutine {
  id: string;
  days: number[]; // 0-6
  startTime: string; // HH:mm
  durationMinutes: number;
  title: string;
  description?: string;
  selectedBookIds?: string[];
}

export interface Camp {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  selectedBooks: string[]; // IDs
  allowOverwork: boolean;
  isActive: boolean;
  createdAt: number;
}

export type StudentField = "Sayısal" | "Eşit Ağırlık" | "Sözel" | "Dil";

export type AICoreMode = "ask" | "cloud" | "local" | "gemma";

export interface DatasetEntry {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

export interface LearnedKnowledge {
  topicMastery: Record<string, number>; // Topic -> 0.0 to 1.0
  preferredStudyTimes: Record<number, string[]>; // DayOfWeek -> ["09:00", "14:00"]
  branchDifficultyRank: ExamBranch[];
  lastStudySessionRating: number;
  aiInteractionCount: number;
  selfTrainedContext: string[]; // Self-evolving knowledge base
  customDatasets?: DatasetEntry[]; // User provided training data
}

export interface AppSettings {
  apiKey?: string;
  apiKey2?: string;
  apiKey3?: string;
  theme: "light" | "dark" | "blue" | "red" | "oled" | "custom";
  customThemeColors?: {
    primary: string;
    background: string;
    card: string;
    foreground: string;
    border: string;
  };
  yksDate: string; // YYYY-MM-DD
  studyStartDate?: string; // YKS çalışmaya başlama tarihi
  targetNets: {
    tyt: number;
    ayt: number;
  };
  adaptiveStudyPlan?: {
    isEnabled: boolean;
    maxDailyHours: number; // Hedeflenen maksimum saat
    weeklyIncrementMinutes: number; // Haftalık artış miktarı
    daysToApply: number[]; // 0-6
    startDate?: string; // Artışın başladığı tarih
  };
  pomodoro?: {
    workTime: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
    soundEnabled: boolean;
  };
  dailyStudyMinutes: Record<number, number>; // 0-6 -> minutes
  maxDailyBooks?: number;
  aiModel?: string; // e.g. "gemini-1.5-flash"
  aiInstructions?: string; // Information about how AI should behave
  personalBio?: string; // Information about the student
  branchNotes?: Partial<Record<ExamBranch, string>>;
  studentField?: StudentField;
  aiCoreMode: AICoreMode;
  remindersEnabled: boolean;
  multiDeviceModeEnabled?: boolean;
  multiDevicePassword?: string;
  enteredSyncPassword?: string;
}

export interface ApiUsage {
  requestsToday: number;
  lastResetDate: string; // YYYY-MM-DD
}

export interface AIWarning {
  id: string;
  type: "warning" | "tip" | "motivation" | "suggestion";
  message: string;
  actionLabel?: string;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isImportant?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isImportant?: boolean;
}

export interface DailyNote {
  date: string; // YYYY-MM-DD
  content: string;
}
