export type GradeLevel = '5' | '6' | '7' | '8';

export type LanguageSkill =
  | 'Bütünleşik (Integrated - 4 Beceriler)'
  | 'Dinleme (Listening)'
  | 'Kelime Bilgisi (Vocabulary)'
  | 'Konuşma (Speaking)'
  | 'Okuma (Reading)'
  | 'Yazma (Writing)';

export type ActivityType =
  | 'Oyun & Yarışma'
  | 'Ezberletme & Kelime Pratiği'
  | 'Drama & Rol Yapma'
  | 'Şarkı & Ritimli Chant'
  | 'Flashcard & Kes-Eşleştir'
  | 'Tabu & Sessiz Sinema (Miming)'
  | 'Tombala & Kelime Bingo'
  | 'Grup Çalışması'
  | 'Proje & Tasarım'
  | 'Bireysel Çalışma'
  | 'Oyun'
  | 'Proje'
  | 'Yarışma';

export interface GenerateRequest {
  grade: GradeLevel;
  unitNumber: number;
  unitName: string;
  skill: LanguageSkill;
  activityType: ActivityType;
  durationMinutes: number;
  extraVocabulary?: string;
  specialConditions?: string;
  learningOutcomeCode?: string;
  learningOutcomes?: string[];
}

export interface WarmUp {
  duration: string;
  content: string;
  teacherScript: string;
}

export interface MainTask {
  duration: string;
  content: string;
  stepByStep: string[];
  teacherScript: string;
}

export interface WrapUp {
  duration: string;
  content: string;
}

export interface Assessment {
  methods: string[];
  questions: string[];
}

export interface Differentiation {
  support: string;
  extension: string;
}

export interface StageMethodDetail {
  stageName: string; // e.g. "1. Warm-up / Isınma", "2. Presentation / Sunum", "3. Controlled Practice", etc.
  methodUsed: string; // e.g. "TPR (Total Physical Response) & Audio-Lingual"
  technique: string; // e.g. "Choral Repetition & Physical Gesture Association"
  targetSkill: string; // e.g. "Listening & Speaking"
}

export interface PedagogicalResearchSource {
  title: string;
  url?: string;
  sourceTier: 'Tier 1 (MEB Resmi)' | 'Tier 2 (Akademik/Eğitim)' | 'Doğrulanmış Müfredat Rehberi' | string;
}

export interface PedagogicalApproach {
  selectedMethods: string[]; // e.g. ["Eclectic Method", "Communicative Language Teaching (CLT)"]
  justification: string; // Justification based on grade, outcomes, skill, and class memory
  researchSources?: PedagogicalResearchSource[];
  stageMethods: StageMethodDetail[];
}

export interface LessonPlan {
  title: string;
  mebKazanımKodları: string[];
  maarifModeliDeğerler: string[];
  beceriler: string[];
  sure: string;
  materyaller: string[];
  pedagogicalApproach?: PedagogicalApproach;
  isinismaWarmUp: WarmUp;
  anaEtkinlikMainTask: MainTask;
  kapanisWrapUp: WrapUp;
  degerlendirmeAssessment: Assessment;
  farklilastirmaDifferentiation: Differentiation;
}

export interface PrintableMaterialItem {
  header?: string;
  content: string;
  subtext?: string;
}

export interface PrintableMaterial {
  title: string;
  materialType: string; // e.g. "Rol Kartları", "Kes-Kullan Cümle Şeritleri", "Eşleştirme Kartları", "Görev Fişleri"
  instructions: string;
  items: PrintableMaterialItem[];
}

export interface ActivityGuide {
  title: string;
  gameType: string;
  objective: string;
  rules: string[];
  materialsNeeded: string[];
  writtenMaterials?: PrintableMaterial[];
  stepByStepInstructions: string[];
  classroomSetup: string;
  teacherTips: string[];
}

export interface Question {
  id: string;
  prompt: string;
  options?: string[];
  answer: string;
}

export interface WorksheetSection {
  type: 'matching' | 'fillInBlanks' | 'readingComprehension' | 'multipleChoice' | 'creativeWriting' | string;
  sectionTitle: string;
  instructions: string;
  questions: Question[];
}

export interface AnswerKeySection {
  sectionIndex: number;
  sectionTitle: string;
  answers: string[];
}

export interface Worksheet {
  title: string;
  instructions: string;
  gradeAndUnit: string;
  sections: WorksheetSection[];
  answerKey: AnswerKeySection[];
}

export interface Flashcard {
  id: string;
  word: string;
  trTranslation: string;
  exampleSentence: string;
  pronunciationPhonetic?: string;
  emojiOrIcon: string;
  category: string;
}

export interface GeneratedContent {
  id: string;
  createdAt: string;
  request: GenerateRequest;
  lessonPlan: LessonPlan;
  activityGuide: ActivityGuide;
  worksheet: Worksheet;
  flashcards: Flashcard[];
  feedback?: {
    type: 'like' | 'needs_improvement';
    comment?: string;
  };
}

export interface UnitInfo {
  unitNumber: number;
  titleEn: string;
  titleTr: string;
  outcomes: string[];
  sampleVocabulary: string[];
}

export interface GradeCurriculum {
  grade: GradeLevel;
  gradeTitle: string;
  units: UnitInfo[];
}
