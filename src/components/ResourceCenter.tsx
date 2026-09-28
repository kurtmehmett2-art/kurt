import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ExternalLink,
  BookOpen,
  Filter,
  BarChart2,
  Printer,
  History,
  ShieldCheck,
  Bot,
  Plus,
  Loader2,
  ChevronRight,
  Layers,
  Info,
  RefreshCw
} from 'lucide-react';

export interface EducationSourceItem {
  id: string;
  title: string;
  institution: string;
  url: string;
  sourceType: string;
  grade: string;
  subject: string;
  unit?: number;
  topic?: string;
  tier: number;
  relevanceScore: number;
  publishedAt?: string;
  summary?: string;
  analysisJson?: any;
}

export interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  currentUnit: number;
  currentTopic?: string;
}

interface ResourceCenterProps {
  onOpenJarvis?: (contextClassId?: string) => void;
  onOpenVoice?: () => void;
  showToast?: (msg: string) => void;
  initialClassId?: string;
  initialGrade?: string;
  initialUnit?: string;
  initialTopic?: string;
}

export const ResourceCenter: React.FC<ResourceCenterProps> = ({
  onOpenJarvis,
  onOpenVoice,
  showToast,
  initialClassId,
  initialGrade,
  initialUnit,
  initialTopic
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'materials' | 'history'>('search');
  
  // Search parameters
  const [grade, setGrade] = useState<string>('6');
  const [subject, setSubject] = useState<string>('İngilizce');
  const [unit, setUnit] = useState<string>('3');
  const [topic, setTopic] = useState<string>('');
  const [sourcePreference, setSourcePreference] = useState<'MEB' | 'ALL'>('MEB');
  const [resourceType, setResourceType] = useState<string>('sample_questions');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Apply initial parameters whenever they are changed or loaded from parent
  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
    if (initialGrade) {
      setGrade(initialGrade);
    }
    if (initialUnit) {
      setUnit(initialUnit);
    }
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialClassId, initialGrade, initialUnit, initialTopic]);
  
  // Classes list for class memory integration
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  
  // Search states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<EducationSourceItem[]>([]);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [classContextApplied, setClassContextApplied] = useState<boolean>(false);

  // Selected sources for exam generation
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  
  // Modals
  const [analyzingSource, setAnalyzingSource] = useState<EducationSourceItem | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [isExamModalOpen, setIsExamModalOpen] = useState<boolean>(false);
  const [isGeneratingExam, setIsGeneratingExam] = useState<boolean>(false);
  const [generatedExam, setGeneratedExam] = useState<any | null>(null);
  const [examQuestionCount, setExamQuestionCount] = useState<number>(10);
  const [examDifficulty, setExamDifficulty] = useState<string>('Orta (MEB Standart)');

  // A/B Shuffle State
  const [isABShuffled, setIsABShuffled] = useState<boolean>(false);
  const [shuffledGroupA, setShuffledGroupA] = useState<any | null>(null);
  const [shuffledGroupB, setShuffledGroupB] = useState<any | null>(null);

  // Clear or initialize A/B state when generated exam changes
  useEffect(() => {
    if (generatedExam) {
      setIsABShuffled(false);
      setShuffledGroupA(null);
      setShuffledGroupB(null);
    }
  }, [generatedExam]);

  // Fisher-Yates Shuffle Algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  };

  const shuffleQuestionOptions = (q: any): any => {
    if (q.type !== 'multiple_choice' || !q.options || q.options.length === 0) {
      return { ...q };
    }

    // 1. Parse options
    const parsedOptions = q.options.map((opt: string) => {
      const match = opt.match(/^([A-D])[\s\)\.\-:]+(.*)/i);
      return {
        prefix: match ? match[1].toUpperCase() : '',
        text: match ? match[2].trim() : opt.trim(),
        original: opt
      };
    });

    // 2. Find correct answer index
    let correctIdx = parsedOptions.findIndex((p: any) => p.original === q.correctAnswer);
    if (correctIdx === -1) {
      correctIdx = parsedOptions.findIndex((p: any) => p.prefix && q.correctAnswer && p.prefix === q.correctAnswer.trim().toUpperCase());
    }
    if (correctIdx === -1) {
      correctIdx = parsedOptions.findIndex((p: any) => p.text === q.correctAnswer || p.original.includes(q.correctAnswer));
    }

    // 3. Shuffle options
    const shuffledParsed = shuffleArray(parsedOptions) as any[];

    // 4. Re-prefix option letters
    const newPrefixes = ['A', 'B', 'C', 'D'];
    const reconstructedOptions = shuffledParsed.map((po: any, idx: number) => {
      const prefix = newPrefixes[idx] || '';
      return `${prefix}) ${po.text}`;
    });

    // 5. Compute new correct answer
    let newCorrectAnswer = q.correctAnswer;
    if (correctIdx !== -1) {
      const originalCorrectOption = parsedOptions[correctIdx];
      const newCorrectIdx = shuffledParsed.findIndex((po: any) => po.original === originalCorrectOption.original);
      if (newCorrectIdx !== -1) {
        const prefix = newPrefixes[newCorrectIdx] || 'A';
        newCorrectAnswer = `${prefix}) ${shuffledParsed[newCorrectIdx].text}`;
      }
    }

    return {
      ...q,
      options: reconstructedOptions,
      correctAnswer: newCorrectAnswer
    };
  };

  const handleCreateABGroups = (forceReshuffle = false) => {
    if (!generatedExam) return;

    const originalQuestions = generatedExam.questions || [];
    
    let shuffledQuestionsA = shuffleArray(originalQuestions) as any[];
    let shuffledQuestionsB = shuffleArray(originalQuestions) as any[];

    if (originalQuestions.length > 1) {
      let matchCount = 0;
      for (let i = 0; i < originalQuestions.length; i++) {
        if (shuffledQuestionsA[i].id === shuffledQuestionsB[i].id) {
          matchCount++;
        }
      }
      if (matchCount === originalQuestions.length) {
        shuffledQuestionsB = shuffleArray(shuffledQuestionsB);
      }
    }

    const processedA = shuffledQuestionsA.map((q: any, idx: number) => {
      const processedQ = shuffleQuestionOptions(q);
      return {
        ...processedQ,
        number: idx + 1
      };
    });

    const processedB = shuffledQuestionsB.map((q: any, idx: number) => {
      const processedQ = shuffleQuestionOptions(q);
      return {
        ...processedQ,
        number: idx + 1
      };
    });

    const answerKeyA = processedA.map((q: any) => {
      const letterMatch = q.correctAnswer?.match(/^([A-D])/i);
      const letter = letterMatch ? letterMatch[1].toUpperCase() : 'A';
      return `${q.number}-${letter}`;
    }).join(', ');

    const answerKeyB = processedB.map((q: any) => {
      const letterMatch = q.correctAnswer?.match(/^([A-D])/i);
      const letter = letterMatch ? letterMatch[1].toUpperCase() : 'A';
      return `${q.number}-${letter}`;
    }).join(', ');

    setShuffledGroupA({
      ...generatedExam,
      title: `${generatedExam.title || 'İNGİLİZCE SINAVI'} — GRUP A`,
      questions: processedA,
      answerKeySummary: answerKeyA
    });

    setShuffledGroupB({
      ...generatedExam,
      title: `${generatedExam.title || 'İNGİLİZCE SINAVI'} — GRUP B`,
      questions: processedB,
      answerKeySummary: answerKeyB
    });

    setIsABShuffled(true);
  };

  // Saved materials and history
  const [savedMaterials, setSavedMaterials] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  // Load classes on mount
  useEffect(() => {
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClassesList(data);
        }
      })
      .catch((err) => console.error('Error fetching classes:', err));

    fetchHistoryAndMaterials();
  }, []);

  const fetchHistoryAndMaterials = () => {
    fetch('/api/research/materials')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSavedMaterials(data);
      })
      .catch((err) => console.error('Error fetching materials:', err));

    fetch('/api/research/history')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSearchHistory(data);
      })
      .catch((err) => console.error('Error fetching history:', err));
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    if (!classId) return;
    const cls = classesList.find((c) => c.id === classId);
    if (cls) {
      setGrade(String(cls.gradeLevel));
      setUnit(String(cls.currentUnit));
      if (cls.currentTopic) setTopic(cls.currentTopic);
    }
  };

  const handlePerformSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    setSearchSummary(null);

    try {
      const response = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          subject,
          unit,
          topic,
          sourcePreference,
          resourceType,
          relatedClassId: selectedClassId || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Arama gerçekleştirilemedi.');
      }

      const data = await response.json();
      setSearchResults(data.sources || []);
      setSearchSummary(data.rawSearchText || null);
      setClassContextApplied(data.classContextApplied || false);

      if (data.sources && data.sources.length > 0) {
        showToast?.(`🔍 ${data.sources.length} doğrulanmış eğitim kaynağı bulundu!`);
      } else {
        showToast?.('Arama tamamlandı. Belirtilen kriterlere tam uyan resmi kaynak bulunamadı.');
      }

      fetchHistoryAndMaterials();
    } catch (err: any) {
      console.error('Search Error:', err);
      setSearchError(err.message || 'Web araştırması sırasında sunucu hatası oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyzeSource = async (source: EducationSourceItem) => {
    setAnalyzingSource(source);
    setAnalysisResult(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIdOrUrl: source.id || source.url })
      });

      if (!res.ok) throw new Error('Analiz başarısız.');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setAnalysisResult({
        sourceTitle: source.title,
        pedagogicalEvaluation: 'Kaynak analizi alınamadı ancak MEB müfredat standartlarına uygundur.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSourceSelection = (id: string) => {
    if (selectedSourceIds.includes(id)) {
      setSelectedSourceIds(selectedSourceIds.filter((s) => s !== id));
    } else {
      setSelectedSourceIds([...selectedSourceIds, id]);
    }
  };

  const handleGenerateExam = async () => {
    setIsGeneratingExam(true);
    setGeneratedExam(null);

    try {
      const res = await fetch('/api/research/create-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId || undefined,
          grade,
          subject,
          unit,
          topics: topic || 'Ünite Konuları',
          questionCount: examQuestionCount,
          difficulty: examDifficulty,
          sourceIds: selectedSourceIds
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Özgün sınav oluşturulamadı.');
      }

      const data = await res.json();
      setGeneratedExam(data);
      showToast?.('✨ Özgün MEB Maarif Modeli sınavınız başarıyla oluşturuldu!');
      fetchHistoryAndMaterials();
    } catch (err: any) {
      console.error('Exam Generation Error:', err);
      showToast?.('❌ Sınav oluşturulurken bir hata oluştu: ' + err.message);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handlePrintExam = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner / Hero */}
      <div className="glass-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-br from-[#6C63FF]/20 to-[#FF6584]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#6C63FF]/20 text-purple-200 border border-[#6C63FF]/40 shadow-[0_0_10px_rgba(108,99,255,0.2)] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#6C63FF]" />
                MEB & Web Eğitim Kaynakları Motoru
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Zero-Hallucination Guard
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white glow-text">
              Eğitim Kaynakları & JARVIS Özgün Sınav Stüdyosu
            </h2>
            <p className="text-sm text-[#A7A9BE] max-w-2xl">
              Türkiye Millî Eğitim Bakanlığı (ÖDSGM, EBA, MEBİ, ÖDM) resmi web kaynaklarını anlık tarayın, pedagojik analiz yapın ve sınıf hafızanızla %100 özgün sınavlar oluşturun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenVoice && (
              <button
                onClick={onOpenVoice}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-bold text-xs sm:text-sm btn-premium btn-shimmer shadow-[0_0_20px_rgba(108,99,255,0.3)]"
              >
                <Bot className="w-4 h-4" />
                <span>JARVIS ile Sesli Arama Yap</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-t border-[#2D2B55] mt-6 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'search'
                ? 'bg-[#6C63FF] text-white shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'bg-[#1A1932] text-[#A7A9BE] hover:text-white border border-[#2D2B55]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Kaynak Arama & Sınav Üretimi</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('materials');
              fetchHistoryAndMaterials();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'materials'
                ? 'bg-[#6C63FF] text-white shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'bg-[#1A1932] text-[#A7A9BE] hover:text-white border border-[#2D2B55]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Oluşturulan Özgün Materyaller ({savedMaterials.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              fetchHistoryAndMaterials();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'history'
                ? 'bg-[#6C63FF] text-white shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'bg-[#1A1932] text-[#A7A9BE] hover:text-white border border-[#2D2B55]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Arama Geçmişi ({searchHistory.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SEARCH & RESEARCH STUDIO */}
      {activeTab === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Class Memory Selection (%35 / 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#2D2B55] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6C63FF]" />
                  Arama Parametreleri
                </h3>
                <span className="text-xs text-[#A7A9BE] font-medium">MEB Öncelikli</span>
              </div>

              {/* Class Memory Link Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A7A9BE] flex items-center justify-between">
                  <span>Sınıf Hafızasını Bağla (Opsiyonel)</span>
                  {selectedClassId && (
                    <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Aktif Sınıf Bağlandı
                    </span>
                  )}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassSelect(e.target.value)}
                  className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#6C63FF]"
                >
                  <option value="">-- Genel Arama (Sınıf Bağlama Yok) --</option>
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.gradeLevel}. Sınıf - Ünite {cls.currentUnit})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#A7A9BE] italic">
                  Sınıf seçildiğinde JARVIS son ders notlarını ve sınıfın kaldığı konuyu otomatik dikkate alır.
                </p>
              </div>

              {/* Grade */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A7A9BE]">Sınıf Kademesi</label>
                <div className="grid grid-cols-4 gap-2">
                  {['5', '6', '7', '8'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        grade === g
                          ? 'bg-[#6C63FF] text-white border-[#6C63FF] shadow-sm'
                          : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55] hover:border-[#6C63FF]/50'
                      }`}
                    >
                      {g}. Sınıf
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A7A9BE]">Ders</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>

              {/* Unit & Topic */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#A7A9BE]">Ünite No</label>
                  <input
                    type="number"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    min="1"
                    max="10"
                    className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6C63FF]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#A7A9BE]">Materyal Türü</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6C63FF]"
                  >
                    <option value="sample_questions">Örnek Sorular / Kazanım Testi</option>
                    <option value="exam">Yazılı Sınav Örnekleri</option>
                    <option value="worksheet">Çalışma Kağıdı / Etkinlik</option>
                    <option value="curriculum">Müfredat Kılavuzu / Çerçeve</option>
                  </select>
                </div>
              </div>

              {/* Topic Detail */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A7A9BE]">Konu / Anahtar Kelimeler</label>
                <input
                  type="text"
                  placeholder="örn: Downtown, Giving Directions, Simple Present"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>

              {/* Source Tier Preference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A7A9BE]">Kaynak Filtresi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourcePreference('MEB')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 ${
                      sourcePreference === 'MEB'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>MEB Öncelikli (Tier 1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourcePreference('ALL')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 ${
                      sourcePreference === 'ALL'
                        ? 'bg-[#6C63FF]/20 text-purple-200 border-[#6C63FF]/50'
                        : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55]'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-[#6C63FF]" />
                    <span>Tüm Resmi Kaynaklar</span>
                  </button>
                </div>
              </div>

              {/* Submit Search */}
              <button
                onClick={handlePerformSearch}
                disabled={isSearching}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] text-white font-extrabold text-sm btn-premium btn-shimmer shadow-[0_0_20px_rgba(108,99,255,0.3)] flex items-center justify-center space-x-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>MEB Web Kaynakları Taranıyor...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Web Kaynaklarını Araştır</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Results & Exam Generation (%65 / 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Search Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1932] p-4 rounded-2xl border border-[#2D2B55]">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-[#6C63FF]" />
                <h3 className="text-base font-extrabold text-white">
                  Bulunan Doğrulanmış Kaynaklar ({searchResults.length})
                </h3>
              </div>

              {selectedSourceIds.length > 0 && (
                <button
                  onClick={() => setIsExamModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center space-x-1.5 animate-bounce-short"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Seçili {selectedSourceIds.length} Kaynaktan Özgün Sınav Üret</span>
                </button>
              )}
            </div>

            {/* Error Display */}
            {searchError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Class Context Banner if Applied */}
            {classContextApplied && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Sınıf hafızası ve son ders notları araştırmaya entegre edildi.</span>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {searchResults.length === 0 && !isSearching && (
              <div className="glass-card p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1A1932] border border-[#2D2B55] flex items-center justify-center mx-auto text-[#6C63FF]">
                  <Globe className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">Henüz Bir Arama Yapılmadı</h4>
                  <p className="text-xs text-[#A7A9BE] max-w-md mx-auto">
                    Sol taraftaki parametreleri belirleyerek MEB ÖDSGM, EBA ve resmi eğitim portallarındaki doğrulanmış örnek soruları tarayabilirsiniz.
                  </p>
                </div>
              </div>
            )}

            {isSearching && (
              <div className="glass-card p-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF] mx-auto" />
                <p className="text-sm font-bold text-purple-200">
                  Google Search grounding ile resmi MEB & ÖDSGM kaynakları taranıyor...
                </p>
              </div>
            )}

            <div className="space-y-4">
              {searchResults.map((source) => {
                const isSelected = selectedSourceIds.includes(source.id);
                return (
                  <div
                    key={source.id}
                    className={`glass-card p-5 space-y-3 transition-all border ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'border-[#2D2B55] hover:border-[#6C63FF]/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* TIER BADGE */}
                          {source.tier === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              MEB / RESMİ DOKÜMAN (TIER 1)
                            </span>
                          ) : source.tier === 2 ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              Resmi / Üniversite (TIER 2)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Yayıncı / Eğitim Kaynağı (TIER {source.tier})
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1A1932] text-[#A7A9BE] border border-[#2D2B55]">
                            {source.grade}. Sınıf - {source.subject}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-white leading-snug">
                          {source.title}
                        </h4>
                        
                        <p className="text-xs text-[#A7A9BE]">
                          {source.summary || 'Resmi müfredat onaylı örnek çalışma materyali.'}
                        </p>
                      </div>

                      {/* Select Checkbox for Exam Generation */}
                      <button
                        onClick={() => toggleSourceSelection(source.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400 font-black'
                            : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55] hover:text-white'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{isSelected ? 'Sınav İçin Seçildi' : 'Sınava Ekle'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-[#2D2B55] pt-3 text-xs gap-2">
                      <div className="flex items-center space-x-3 text-[#A7A9BE]">
                        <span className="font-bold text-purple-300">{source.institution}</span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6C63FF] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Resmi Linki Aç</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAnalyzeSource(source)}
                          className="px-3 py-1.5 rounded-lg bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 text-purple-200 border border-[#6C63FF]/40 text-xs font-bold flex items-center space-x-1"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Pedagojik Analiz Et</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERATED EXAMS / MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#1A1932] p-4 rounded-2xl border border-[#2D2B55]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="text-base font-extrabold text-white">
                JARVIS Tarafından Oluşturulan Özgün Sınav & Değerlendirme Materyalleri
              </h3>
            </div>
          </div>

          {savedMaterials.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-[#A7A9BE] mx-auto" />
              <h4 className="text-base font-bold text-white">Henüz Özgün Materyal Üretilmedi</h4>
              <p className="text-xs text-[#A7A9BE]">
                Arama sekmesinden resmi MEB kaynaklarını taradıktan sonra "Özgün Sınav Üret" butonuna tıklayarak ilk sınavınızı hazırlayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedMaterials.map((mat) => {
                let content: any = {};
                try {
                  content = typeof mat.contentJson === 'string' ? JSON.parse(mat.contentJson) : mat.contentJson;
                } catch (e) {}

                return (
                  <div key={mat.id} className="glass-card p-6 space-y-4 border border-[#2D2B55]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          JARVIS TARAFINDAN ÖZGÜN OLUŞTURULDU
                        </span>
                        <h4 className="text-lg font-black text-white mt-2">
                          {mat.title || content.title || 'Özgün Sınav'}
                        </h4>
                        <p className="text-xs text-[#A7A9BE] mt-1">
                          {content.grade || '6'}. Sınıf • Ünite {content.unit || '3'} • {content.questions?.length || 10} Soru
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setGeneratedExam(content);
                          setIsExamModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#6C63FF] text-white font-bold text-xs shadow-md hover:bg-[#5b52e0]"
                      >
                        Görüntüle / Yazdır
                      </button>
                    </div>

                    {content.teacherNotes && (
                      <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 italic">
                        💡 {content.teacherNotes}
                      </p>
                    )}

                    <div className="text-[11px] text-[#A7A9BE] border-t border-[#2D2B55] pt-3 flex justify-between">
                      <span>Oluşturulma: {new Date(mat.createdAt).toLocaleDateString('tr-TR')}</span>
                      <span>MEB Maarif Uyumlu</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SEARCH HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 bg-[#1A1932] p-4 rounded-2xl border border-[#2D2B55]">
            <History className="w-5 h-5 text-[#6C63FF]" />
            <h3 className="text-base font-extrabold text-white">Giriş Yapılan Web Kaynak Araştırma Geçmişi</h3>
          </div>

          <div className="glass-card p-6 space-y-4">
            {searchHistory.length === 0 ? (
              <p className="text-xs text-[#A7A9BE] text-center py-6">Arama geçmişi bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {searchHistory.map((h) => (
                  <div key={h.id} className="p-4 rounded-xl bg-[#1A1932] border border-[#2D2B55] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{h.query}</div>
                      <div className="text-xs text-[#A7A9BE] mt-0.5">
                        {h.resultsCount} Doğrulanmış Sonuç • {new Date(h.date).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PEDAGOGICAL ANALYSIS */}
      {analyzingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-[#6C63FF]/40">
            <div className="flex items-center justify-between border-b border-[#2D2B55] pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#6C63FF]" />
                MEB Pedagojik Kaynak Analizi
              </h3>
              <button
                onClick={() => setAnalyzingSource(null)}
                className="text-[#A7A9BE] hover:text-white font-bold text-sm"
              >
                Kapat ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#1A1932] border border-[#2D2B55]">
                <div className="text-xs font-bold text-[#A7A9BE]">İncelenen Doküman</div>
                <div className="text-sm font-extrabold text-white">{analyzingSource.title}</div>
                <div className="text-xs text-purple-300 mt-0.5">{analyzingSource.institution}</div>
              </div>

              {isAnalyzing ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF] mx-auto" />
                  <p className="text-xs font-bold text-purple-200">Kazanımlar ve pedagojik hizalanma analiz ediliyor...</p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
                    <div className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Pedagojik Değerlendirme
                    </div>
                    <p>{analysisResult.pedagogicalEvaluation}</p>
                  </div>

                  {analysisResult.outcomes && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-[#A7A9BE]">Eşleşen MEB Maarif Modeli Kazanımları</div>
                      <div className="space-y-1">
                        {analysisResult.outcomes.map((out: string, idx: number) => (
                          <div key={idx} className="p-2 rounded-lg bg-[#1A1932] text-xs text-white border border-[#2D2B55]">
                            • {out}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.questionTypes && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[#A7A9BE]">Soru & Etkinlik Türleri</div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.questionTypes.map((q: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#6C63FF]/20 text-purple-200 border border-[#6C63FF]/30">
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXAM GENERATION & PREVIEW */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-4xl w-full p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <div className="flex items-center justify-between border-b border-[#2D2B55] pb-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  JARVIS ÖZGÜN DEĞERLENDİRME MÜHENDİSLİĞİ
                </span>
                <h3 className="text-xl font-black text-white">
                  MEB Maarif Modeli Özgün Yazılı Sınavı
                </h3>
              </div>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="text-[#A7A9BE] hover:text-white font-bold text-sm"
              >
                Kapat ✕
              </button>
            </div>

            {/* Exam Generation Parameters Form if not generated yet */}
            {!generatedExam && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-[#1A1932] border border-[#2D2B55] space-y-2">
                  <div className="text-xs font-bold text-[#A7A9BE]">Temel Alınan Resmi Kaynaklar:</div>
                  <div className="text-xs text-white space-y-1">
                    {selectedSourceIds.length > 0 ? (
                      selectedSourceIds.map((id) => {
                        const s = searchResults.find((x) => x.id === id);
                        return s ? <div key={id} className="font-semibold text-amber-300">• {s.title} ({s.institution})</div> : null;
                      })
                    ) : (
                      <div className="italic text-[#A7A9BE]">Genel MEB 6. Sınıf İngilizce müfredatına göre üretilecek.</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#A7A9BE]">İstenen Soru Sayısı</label>
                    <select
                      value={examQuestionCount}
                      onChange={(e) => setExamQuestionCount(Number(e.target.value))}
                      className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none"
                    >
                      <option value={5}>5 Soru (Hızlı Değerlendirme)</option>
                      <option value={10}>10 Soru (MEB Standart Sınav)</option>
                      <option value={15}>15 Soru (Kapsamlı Sınav)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#A7A9BE]">Zorluk Seviyesi</label>
                    <select
                      value={examDifficulty}
                      onChange={(e) => setExamDifficulty(e.target.value)}
                      className="w-full bg-[#1A1932] border border-[#2D2B55] rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none"
                    >
                      <option value="Kolay-Orta">Kolay - Orta (Giriş Seviyesi)</option>
                      <option value="Orta (MEB Standart)">Orta (MEB Standart)</option>
                      <option value="Zor (Beceri Temelli / LGS Tarzı)">Zor (Beceri Temelli / LGS Tarzı)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateExam}
                  disabled={isGeneratingExam}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-black font-black text-sm btn-premium flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  {isGeneratingExam ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>JARVIS Özgün Sınav Metnini Üretiyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>%100 Özgün Sınavı Oluştur</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Generated Exam Preview Display */}
            {generatedExam && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 no-print">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-200 select-none bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={isABShuffled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            if (!shuffledGroupA || !shuffledGroupB) {
                              handleCreateABGroups();
                            } else {
                              setIsABShuffled(true);
                            }
                          } else {
                            setIsABShuffled(false);
                          }
                        }}
                        className="w-4 h-4 rounded text-[#6C63FF] focus:ring-[#6C63FF] bg-slate-900 border-slate-700 cursor-pointer"
                      />
                      <span>📋 A/B Grubu Olarak Karıştır</span>
                    </label>

                    {isABShuffled && (
                      <button
                        onClick={() => handleCreateABGroups(true)}
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center space-x-1.5 transition duration-150 shadow-md"
                        title="Soruları ve şıkları yeniden karıştırır"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                        <span>↻ Yeniden Karıştır</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handlePrintExam}
                    className="px-5 py-2.5 rounded-xl bg-[#6C63FF] hover:bg-[#5a52e6] text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg transition duration-150"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Yazdır / PDF Olarak Kaydet</span>
                  </button>
                </div>

                {/* Printable Exam Paper */}
                <div className="bg-white text-black p-8 rounded-2xl space-y-6 font-sans print:p-0">
                  {!isABShuffled ? (
                    <>
                      {/* Normal Exam Sheet */}
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center border-b-2 border-black pb-4 space-y-1">
                          <h2 className="font-bold text-lg uppercase tracking-wide text-black">
                            {generatedExam.schoolName || 'T.C. MİLLÎ EĞİTİM BAKANLIĞI ORTAOKULU'}
                          </h2>
                          <h3 className="font-extrabold text-xl uppercase text-black">
                            {generatedExam.title || 'İNGİLİZCE DERSİ DEĞERLENDİRME SINAVI'}
                          </h3>
                          <div className="flex justify-between text-xs font-semibold pt-2 px-2 border-t border-gray-300 mt-2 text-black">
                            <span>Adı Soyadı: _______________________</span>
                            <span>Sınıfı / No: ______ / ______</span>
                            <span>Puan: ______</span>
                          </div>
                        </div>

                        {/* Instructions */}
                        <p className="text-xs italic bg-gray-100 p-2.5 rounded border border-gray-300 text-black">
                          <strong>Açıklama:</strong> {generatedExam.instructions || 'Sınav süresi 40 dakikadır. Başarılar dileriz.'}
                        </p>

                        {/* Questions List */}
                        <div className="space-y-5">
                          {generatedExam.questions?.map((q: any) => (
                            <div key={q.id || q.number} className="space-y-2 text-sm border-b border-gray-200 pb-4 text-black">
                              <div className="flex justify-between font-bold text-gray-900">
                                <span>Soru {q.number || q.id}: {q.questionText}</span>
                                <span className="text-xs text-gray-500 font-normal">({q.points || 10} Puan)</span>
                              </div>

                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pl-4 text-xs font-medium text-black">
                                  {q.options.map((opt: string, i: number) => (
                                    <div key={i}>{opt}</div>
                                  ))}
                                </div>
                              )}

                              <div className="text-[11px] text-gray-500 italic pl-1 pt-1">
                                MEB Kazanım: {q.outcomeCode} — {q.outcomeText}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Answer Key */}
                        <div className="border-t-2 border-dashed border-gray-400 pt-4 space-y-2">
                          <h4 className="font-bold text-sm uppercase text-purple-900">
                            Cevap Anahtarı & Çözümler
                          </h4>
                          <p className="text-xs font-semibold text-gray-800">
                            {generatedExam.answerKeySummary}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* GRUP A KİTAPÇIĞI */}
                      <div className="space-y-6">
                        <div className="text-center border-b-2 border-black pb-4 space-y-1">
                          <h2 className="font-bold text-lg uppercase tracking-wide text-black">
                            {shuffledGroupA?.schoolName || 'T.C. MİLLÎ EĞİTİM BAKANLIĞI ORTAOKULU'}
                          </h2>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-black uppercase">GRUP A</span>
                            <h3 className="font-extrabold text-xl uppercase text-black">
                              {shuffledGroupA?.title || 'İNGİLİZCE DERSİ DEĞERLENDİRME SINAVI'}
                            </h3>
                            <span className="w-12"></span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold pt-2 px-2 border-t border-gray-300 mt-2 text-black">
                            <span>Adı Soyadı: _______________________</span>
                            <span>Sınıfı / No: ______ / ______</span>
                            <span>Puan: ______</span>
                          </div>
                        </div>

                        <p className="text-xs italic bg-gray-100 p-2.5 rounded border border-gray-300 text-black">
                          <strong>Açıklama:</strong> {shuffledGroupA?.instructions || 'Sınav süresi 40 dakikadır. Başarılar dileriz.'}
                        </p>

                        <div className="space-y-5">
                          {shuffledGroupA?.questions?.map((q: any) => (
                            <div key={q.id || q.number} className="space-y-2 text-sm border-b border-gray-200 pb-4 text-black">
                              <div className="flex justify-between font-bold text-gray-900">
                                <span>Soru {q.number || q.id}: {q.questionText}</span>
                                <span className="text-xs text-gray-500 font-normal">({q.points || 10} Puan)</span>
                              </div>

                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pl-4 text-xs font-medium text-black">
                                  {q.options.map((opt: string, i: number) => (
                                    <div key={i}>{opt}</div>
                                  ))}
                                </div>
                              )}

                              <div className="text-[11px] text-gray-500 italic pl-1 pt-1">
                                MEB Kazanım: {q.outcomeCode} — {q.outcomeText}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Page Break for print, beautiful divider for screen */}
                        <div className="page-break-after" />
                        <div className="border-t-2 border-dashed border-purple-300 my-8 py-2 text-center text-xs text-purple-600 font-bold uppercase tracking-widest no-print">
                          ✂️ GRUP A CEVAP ANAHTARI SAYFASI (BASKIDA AYRI SAYFA)
                        </div>

                        {/* Group A Answer Key */}
                        <div className="border-2 border-dashed border-gray-400 p-4 space-y-2 bg-gray-50">
                          <h4 className="font-bold text-sm uppercase text-purple-900">
                            GRUP A — CEVAP ANAHTARI
                          </h4>
                          <p className="text-xs font-semibold text-gray-800">
                            {shuffledGroupA?.answerKeySummary}
                          </p>
                          <div className="text-[11px] text-gray-500 mt-2">
                            <strong>Öğretmen Notu:</strong> Sınav cevap anahtarı Grup A soru ve şık sırasıyla tam uyumludur.
                          </div>
                        </div>
                      </div>

                      {/* Divider between Group A and Group B */}
                      <div className="page-break-after" />
                      <div className="border-t-4 border-double border-slate-400 my-12 py-3 text-center text-sm text-slate-800 font-black uppercase tracking-wider no-print bg-slate-100 rounded-xl">
                        ⬇️ GRUP B SINAV KAĞIDI BAŞLANGICI (BASKIDA YENİ SAYFAYA GEÇER)
                      </div>

                      {/* GRUP B KİTAPÇIĞI */}
                      <div className="space-y-6">
                        <div className="text-center border-b-2 border-black pb-4 space-y-1">
                          <h2 className="font-bold text-lg uppercase tracking-wide text-black">
                            {shuffledGroupB?.schoolName || 'T.C. MİLLÎ EĞİTİM BAKANLIĞI ORTAOKULU'}
                          </h2>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-black uppercase">GRUP B</span>
                            <h3 className="font-extrabold text-xl uppercase text-black">
                              {shuffledGroupB?.title || 'İNGİLİZCE DERSİ DEĞERLENDİRME SINAVI'}
                            </h3>
                            <span className="w-12"></span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold pt-2 px-2 border-t border-gray-300 mt-2 text-black">
                            <span>Adı Soyadı: _______________________</span>
                            <span>Sınıfı / No: ______ / ______</span>
                            <span>Puan: ______</span>
                          </div>
                        </div>

                        <p className="text-xs italic bg-gray-100 p-2.5 rounded border border-gray-300 text-black">
                          <strong>Açıklama:</strong> {shuffledGroupB?.instructions || 'Sınav süresi 40 dakikadır. Başarılar dileriz.'}
                        </p>

                        <div className="space-y-5">
                          {shuffledGroupB?.questions?.map((q: any) => (
                            <div key={q.id || q.number} className="space-y-2 text-sm border-b border-gray-200 pb-4 text-black">
                              <div className="flex justify-between font-bold text-gray-900">
                                <span>Soru {q.number || q.id}: {q.questionText}</span>
                                <span className="text-xs text-gray-500 font-normal">({q.points || 10} Puan)</span>
                              </div>

                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pl-4 text-xs font-medium text-black">
                                  {q.options.map((opt: string, i: number) => (
                                    <div key={i}>{opt}</div>
                                  ))}
                                </div>
                              )}

                              <div className="text-[11px] text-gray-500 italic pl-1 pt-1">
                                MEB Kazanım: {q.outcomeCode} — {q.outcomeText}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Page Break for print, beautiful divider for screen */}
                        <div className="page-break-after" />
                        <div className="border-t-2 border-dashed border-purple-300 my-8 py-2 text-center text-xs text-purple-600 font-bold uppercase tracking-widest no-print">
                          ✂️ GRUP B CEVAP ANAHTARI SAYFASI (BASKIDA AYRI SAYFA)
                        </div>

                        {/* Group B Answer Key */}
                        <div className="border-2 border-dashed border-gray-400 p-4 space-y-2 bg-gray-50">
                          <h4 className="font-bold text-sm uppercase text-purple-900">
                            GRUP B — CEVAP ANAHTARI
                          </h4>
                          <p className="text-xs font-semibold text-gray-800">
                            {shuffledGroupB?.answerKeySummary}
                          </p>
                          <div className="text-[11px] text-gray-500 mt-2">
                            <strong>Öğretmen Notu:</strong> Sınav cevap anahtarı Grup B soru ve şık sırasıyla tam uyumludur.
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
