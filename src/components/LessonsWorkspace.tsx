import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Sparkles,
  ChevronDown,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Book,
  FileText,
  Search,
  Bot,
  ChevronRight,
  ArrowLeft,
  X,
  History,
  Info,
  Loader2,
  RefreshCw,
  ThumbsUp,
  Lightbulb,
  RotateCcw,
  GraduationCap,
  Target,
  Layers,
  Check,
  Zap,
  HelpCircle
} from 'lucide-react';
import { GradeLevel, LanguageSkill, ActivityType, GenerateRequest, GeneratedContent } from '../types';
import { LessonPlanner } from './LessonPlanner';
import { MascotWelcome } from './MascotWelcome';
import { TeacherForm } from './TeacherForm';
import { LessonPlanView } from './LessonPlanView';
import { WorksheetView } from './WorksheetView';
import { FlashcardsView } from './FlashcardsView';
import { ClassAnalyticsView } from './ClassAnalyticsView';

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  currentUnit: number;
  currentTopic: string;
}

interface LessonContext {
  classInfo: ClassItem;
  currentUnit: number;
  currentTopic: string;
  recentLessons: Array<{
    id?: string;
    date: string;
    unitNumber: number;
    unitName: string;
    topic: string;
    teacherNotes: string;
    activity?: string;
  }>;
  teacherNotes: string[];
  recentDifficulties: string[];
  coveredOutcomes: string[];
}

interface LessonsWorkspaceProps {
  currentPackage: GeneratedContent | null;
  setCurrentPackage: (pkg: GeneratedContent | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;
  handleGenerate: (request: GenerateRequest) => Promise<void>;
  onNavigateToResources: (classId: string, grade: string, unit: string, topic: string) => void;
  onNavigateToJarvis: (classId: string | null) => void;
  savedPackages: GeneratedContent[];
  onSaveToFavorites: () => void;
  onOpenFeedback: () => void;
  onOpenSaveToClass: () => void;
  externalGrade: string | null;
  externalUnitIndex: number | null;
  setExternalGrade: (grade: string | null) => void;
  setExternalUnitIndex: (index: number | null) => void;
  activeTab: 'plan' | 'worksheet' | 'cards';
  setActiveTab: (tab: 'plan' | 'worksheet' | 'cards') => void;
  initialFlow?: 'none' | 'planner' | 'studio' | 'analytics';
  initialClassId?: string | null;
}

export const LessonsWorkspace: React.FC<LessonsWorkspaceProps> = ({
  currentPackage,
  setCurrentPackage,
  isLoading,
  setIsLoading,
  error,
  setError,
  handleGenerate,
  onNavigateToResources,
  onNavigateToJarvis,
  savedPackages,
  onSaveToFavorites,
  onOpenFeedback,
  onOpenSaveToClass,
  externalGrade,
  externalUnitIndex,
  setExternalGrade,
  setExternalUnitIndex,
  activeTab,
  setActiveTab,
  initialFlow,
  initialClassId
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId || null);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);

  // New Class Form State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassGrade, setNewClassGrade] = useState<number>(5);

  // Selected Class Context/Dashboard
  const [context, setContext] = useState<LessonContext | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(false);

  // JARVIS Proactive Suggestion
  const [suggestionText, setSuggestionText] = useState<string>('');
  const [suggesting, setSuggesting] = useState<boolean>(false);

  // Active workspace workflow: 'none' | 'planner' | 'studio' | 'analytics'
  const [activeFlow, setActiveFlow] = useState<'none' | 'planner' | 'studio' | 'analytics'>(initialFlow || 'none');

  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);

  useEffect(() => {
    if (initialFlow) {
      setActiveFlow(initialFlow);
    }
  }, [initialFlow]);

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch('/api/classes');
      if (!res.ok) throw new Error('Failed to fetch classes');
      const data = await res.json();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId((prev) => prev || data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch contextual details when selectedClassId changes
  useEffect(() => {
    if (!selectedClassId) {
      setContext(null);
      setSuggestionText('');
      return;
    }

    setLoadingContext(true);
    setSuggestionText('');

    // Fetch next-lesson-context
    fetch(`/api/classes/${selectedClassId}/next-lesson-context`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setContext(data);
        } else {
          setContext(null);
        }
      })
      .catch((err) => console.error('Context fetch error:', err))
      .finally(() => setLoadingContext(false));
  }, [selectedClassId]);

  // Load JARVIS proactive suggestion
  const handleGetSuggestion = async () => {
    if (!selectedClassId) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/jarvis/suggest-next-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId })
      });
      const data = await res.json();
      if (data.suggestion) {
        setSuggestionText(data.suggestion);
      }
    } catch (err) {
      console.error('Suggestion error:', err);
    } finally {
      setSuggesting(false);
    }
  };

  // Trigger loading proactive suggestion automatically once context is fetched
  useEffect(() => {
    if (context && selectedClassId) {
      handleGetSuggestion();
    }
  }, [context]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          gradeLevel: newClassGrade,
        }),
      });
      if (!res.ok) throw new Error('Sınıf oluşturulamadı.');
      const newClass = await res.json();
      setClasses([newClass, ...classes]);
      setSelectedClassId(newClass.id);
      setIsCreating(false);
      setNewClassName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu sınıfı silmek istediğinize emin misiniz? Sınıfa ait tüm ders geçmişi silinecektir.')) return;

    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Sınıf silinemedi.');
      setClasses(classes.filter((c) => c.id !== id));
      if (selectedClassId === id) {
        setSelectedClassId(classes.length > 1 ? classes.filter((c) => c.id !== id)[0].id : null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePrepareFromPlanner = (preset: GenerateRequest) => {
    // Fill the studio form preset and change view
    setExternalGrade(preset.grade);
    // Find unit index from MEB curriculum
    setExternalUnitIndex(preset.unitNumber - 1);
    setActiveFlow('studio');
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* HEADER BAR WITH CLASS SELECTOR AND NEW CLASS BTN */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#1A1932] p-4 rounded-2xl border border-[#2D2B55] shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#A7A9BE] font-bold text-xs sm:text-sm">
            <Users className="w-4 h-4 text-[#6C63FF]" />
            <span>Aktif Sınıf:</span>
          </div>

          {loadingClasses ? (
            <div className="flex items-center gap-2 text-xs text-[#A7A9BE] animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6C63FF]" />
              Sınıflar yükleniyor...
            </div>
          ) : classes.length === 0 ? (
            <span className="text-xs font-bold text-[#FF6584]">Henüz Sınıf Yok</span>
          ) : (
            <div className="relative">
              <select
                value={selectedClassId || ''}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setActiveFlow('none'); // Return to summary dashboard on switch
                }}
                className="appearance-none bg-[#161524] hover:bg-[#201F3B] border border-[#2D2B55] text-white px-4 py-2 pr-10 rounded-xl font-extrabold text-xs sm:text-sm focus:outline-none focus:border-[#6C63FF] transition-all cursor-pointer shadow-inner"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel}. Sınıf)
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#A7A9BE]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {activeFlow !== 'none' && (
            <button
              onClick={() => setActiveFlow('none')}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#201F3B] hover:bg-[#2D2B55] text-white rounded-xl font-extrabold text-xs transition-all border border-[#2D2B55]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Sınıf Özetine Dön
            </button>
          )}

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white rounded-xl font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(108,99,255,0.3)] w-full md:w-auto ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Sınıf Ekle
          </button>
        </div>
      </div>

      {/* NEW CLASS POPUP INLINE FORM */}
      {isCreating && (
        <form onSubmit={handleCreateClass} className="bg-[#1A1932] p-5 rounded-2xl border border-[#2D2B55] shadow-2xl animate-fade-in-down space-y-4">
          <div className="flex justify-between items-center border-b border-[#2D2B55]/50 pb-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#6C63FF]" />
              Yeni Sınıf Oluştur
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-[#A7A9BE] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#A7A9BE] mb-1.5 uppercase tracking-wider">Sınıf Şubesi (Örn: 6/A)</label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Şube adı..."
                className="w-full bg-[#161524] border border-[#2D2B55] text-white rounded-xl p-2.5 focus:outline-none focus:border-[#6C63FF] transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#A7A9BE] mb-1.5 uppercase tracking-wider">Sınıf Kademesi (Müfredat Seviyesi)</label>
              <select
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(Number(e.target.value))}
                className="w-full bg-[#161524] border border-[#2D2B55] text-white rounded-xl p-2.5 focus:outline-none focus:border-[#6C63FF] transition-all text-sm"
              >
                {[5, 6, 7, 8].map((g) => (
                  <option key={g} value={g}>{g}. Sınıf Müfredatı</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#2D2B55]/50">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 text-[#A7A9BE] hover:text-white text-xs font-bold transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#6C63FF] text-white rounded-xl text-xs font-bold hover:bg-[#5a52d6] transition-colors"
            >
              Kaydet
            </button>
          </div>
        </form>
      )}

      {/* RENDER ACTIVE FLOW BASED ON SELECTION */}
      {activeFlow === 'analytics' && selectedClassId && selectedClass ? (
        <ClassAnalyticsView
          classInfo={selectedClass}
          onBack={() => setActiveFlow('none')}
        />
      ) : activeFlow === 'planner' && selectedClassId ? (
        <div className="animate-fade-in">
          <LessonPlanner
            selectedClassId={selectedClassId}
            onClassChange={(id) => setSelectedClassId(id)}
            onPrepareFullStudioPackage={handlePrepareFromPlanner}
          />
        </div>
      ) : activeFlow === 'studio' && selectedClassId ? (
        <div className="space-y-6 animate-fade-in">
          {/* Mascot Welcome */}
          <MascotWelcome />

          {/* Stüdyo Form & Results columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start pt-2">
            {/* Left form (30% / 4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              <TeacherForm
                onSubmit={handleGenerate}
                isLoading={isLoading}
                externalGrade={(externalGrade as any) || undefined}
                externalUnitIndex={externalUnitIndex !== null ? externalUnitIndex : undefined}
                onExternalLoadHandled={() => {
                  setExternalGrade(null);
                  setExternalUnitIndex(null);
                }}
              />
            </div>

            {/* Right generated results (70% / 8 columns) */}
            <div className="lg:col-span-8 space-y-6">
              {currentPackage ? (
                <div className="space-y-6 animate-fade-in-up-results">
                  {/* Results Header */}
                  <div className="glass-card p-6 md:p-8 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2D2B55] pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#6C63FF]/20 text-purple-200 border border-[#6C63FF]/40 shadow-[0_0_10px_rgba(108,99,255,0.2)]">
                            {currentPackage.request?.grade}. Sınıf
                          </span>
                          <span className="text-xs font-bold text-[#A7A9BE]">
                            {currentPackage.request?.unitName}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent mt-1 glow-text">
                          {currentPackage.lessonPlan?.title || `${currentPackage.request?.unitName} Ders Paketi`}
                        </h2>
                      </div>

                      {/* WRITE Guard Verified Save Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={onOpenSaveToClass}
                          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-bold text-xs sm:text-sm btn-premium shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="hidden sm:inline">Taslağı Onayla & Sınıfa Kaydet</span>
                        </button>

                        <button
                          onClick={onSaveToFavorites}
                          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#FF6584]/20 hover:bg-[#FF6584]/30 text-pink-200 border border-[#FF6584]/40 font-bold text-xs sm:text-sm btn-premium shadow-[0_0_15px_rgba(255,101,132,0.2)]"
                        >
                          <ThumbsUp className="w-4 h-4 text-[#FF6584]" />
                          <span className="hidden sm:inline">Favorilere Ekle</span>
                        </button>

                        <button
                          onClick={onOpenFeedback}
                          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 text-purple-200 border border-[#6C63FF]/40 font-bold text-xs sm:text-sm btn-premium"
                        >
                          <Lightbulb className="w-4 h-4 text-amber-300" />
                          <span>Geliştir 💡</span>
                        </button>
                      </div>
                    </div>

                    {/* Tabs switcher */}
                    <div className="bg-[#1A1932] rounded-t-2xl border-b border-[#2D2B55] flex overflow-x-auto px-2 pt-2 gap-2">
                      <button
                        onClick={() => setActiveTab('plan')}
                        className={`pb-3 px-4 sm:px-6 text-xs sm:text-sm flex items-center space-x-2 transition-all border-b-2 ${
                          activeTab === 'plan'
                            ? 'border-[#6C63FF] text-white font-extrabold shadow-[0_0_20px_rgba(108,99,255,0.4)]'
                            : 'border-transparent text-[#A7A9BE] hover:text-white font-medium'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 text-[#6C63FF]" />
                        <span>Ders Planı (MEB)</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('worksheet')}
                        className={`pb-3 px-4 sm:px-6 text-xs sm:text-sm flex items-center space-x-2 transition-all border-b-2 ${
                          activeTab === 'worksheet'
                            ? 'border-[#6C63FF] text-white font-extrabold shadow-[0_0_20px_rgba(108,99,255,0.4)]'
                            : 'border-transparent text-[#A7A9BE] hover:text-white font-medium'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-[#FF6584]" />
                        <span>Etkinlik & Çalışma Kağıdı</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('cards')}
                        className={`pb-3 px-4 sm:px-6 text-xs sm:text-sm flex items-center space-x-2 transition-all border-b-2 ${
                          activeTab === 'cards'
                            ? 'border-[#6C63FF] text-white font-extrabold shadow-[0_0_20px_rgba(108,99,255,0.4)]'
                            : 'border-transparent text-[#A7A9BE] hover:text-white font-medium'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>3D Kelime Kartları</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Renderers */}
                  <div key={activeTab} className="glass-card p-6 md:p-8 animate-slide-left">
                    {activeTab === 'plan' && (
                      <LessonPlanView
                        plan={currentPackage.lessonPlan}
                        unitName={currentPackage.request?.unitName}
                        grade={currentPackage.request?.grade}
                        onCopy={() => navigator.clipboard.writeText(JSON.stringify(currentPackage.lessonPlan, null, 2))}
                        onPrint={() => window.print()}
                      />
                    )}

                    {activeTab === 'worksheet' && (
                      <WorksheetView
                        activityGuide={currentPackage.activityGuide}
                        worksheet={currentPackage.worksheet}
                        unitName={currentPackage.request?.unitName}
                        grade={currentPackage.request?.grade}
                        onCopy={() => navigator.clipboard.writeText(JSON.stringify(currentPackage.worksheet, null, 2))}
                        onPrint={() => window.print()}
                      />
                    )}

                    {activeTab === 'cards' && (
                      <FlashcardsView
                        cards={currentPackage.flashcards}
                        unitName={currentPackage.request?.unitName}
                        grade={currentPackage.request?.grade}
                        onPrint={() => window.print()}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-card p-6 md:p-8 text-center space-y-6 flex flex-col items-center justify-center min-h-[480px]">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#6C63FF]/20 to-[#FF6584]/20 border border-[#6C63FF]/30 flex items-center justify-center text-2xl shadow-glow animate-pulse">
                    ✨
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-lg font-black text-white glow-text">Yapay Zeka Ders Materyali Hazırlama Paneli</h3>
                    <p className="text-xs text-[#A7A9BE] font-medium leading-relaxed">
                      Sol taraftaki formdan sınıf düzeyi, ünite ve etkinlik türünü seçin. Yapay zeka MEB müfredatına tam uyumlu ders paketi, basılabilir kılavuzlar ve materyaller üretecektir.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* UNIFIED CLASS DASHBOARD & OVERVIEW (none flow) */
        <div className="space-y-6 animate-fade-in">
          {classes.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-3xl border border-[#2D2B55]/50 flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
              <Users className="w-16 h-16 text-[#6C63FF]/50" />
              <div>
                <h3 className="text-lg font-black text-white">Sınıfınız Bulunmuyor</h3>
                <p className="text-xs text-[#A7A9BE] mt-1">
                  Derslerinizi ve sınıf hafızasını yönetmek için yukarıdaki butondan ilk sınıfınızı oluşturun.
                </p>
              </div>
            </div>
          ) : selectedClassId && selectedClass ? (
            <>
              {/* PRIMARY HIGH-CONTRAST FOUR ACTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ACTION 1: SONRAKİ DERSİ PLANLA */}
                <button
                  onClick={() => setActiveFlow('planner')}
                  className="p-5 rounded-2xl bg-[#1A1932] border border-[#2D2B55] hover:border-[#6C63FF] hover:bg-[#1A1932]/80 transition-all text-left space-y-3 group shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/20 border border-[#6C63FF]/40 flex items-center justify-center text-lg text-[#6C63FF] group-hover:scale-105 transition-all">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      Sonraki Dersi Planla
                      <ChevronRight className="w-3.5 h-3.5 text-[#A7A9BE] group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-[11px] text-[#A7A9BE] font-medium leading-relaxed mt-1">
                      Sınıf geçmişini ve öğrenci zorluklarını analiz ederek 40 dakikalık MEB kazanımlı pedagojik ders akışı (Ne yapacağım?) kurgular.
                    </p>
                  </div>
                </button>

                {/* ACTION 2: DERSİ HAZIRLA */}
                <button
                  onClick={() => setActiveFlow('studio')}
                  className="p-5 rounded-2xl bg-[#1A1932] border border-[#2D2B55] hover:border-[#FF6584] hover:bg-[#1A1932]/80 transition-all text-left space-y-3 group shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF6584]/20 border border-[#FF6584]/40 flex items-center justify-center text-lg text-[#FF6584] group-hover:scale-105 transition-all">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      Dersi Hazırla (Stüdyo)
                      <ChevronRight className="w-3.5 h-3.5 text-[#A7A9BE] group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-[11px] text-[#A7A9BE] font-medium leading-relaxed mt-1">
                      Özgün ders planı, MEB oyun rehberi, basılabilir çalışma kağıdı ve 3D dönebilen interaktif kelime kartlarını tek akışta oluşturur.
                    </p>
                  </div>
                </button>

                {/* ACTION 3: KAYNAK BUL */}
                <button
                  onClick={() => {
                    if (context) {
                      onNavigateToResources(
                        selectedClassId,
                        String(selectedClass.gradeLevel),
                        String(context.currentUnit),
                        context.currentTopic || ''
                      );
                    } else {
                      onNavigateToResources(selectedClassId, String(selectedClass.gradeLevel), '1', '');
                    }
                  }}
                  className="p-5 rounded-2xl bg-[#1A1932] border border-[#2D2B55] hover:border-[#FFD700] hover:bg-[#1A1932]/80 transition-all text-left space-y-3 group shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center text-lg text-[#FFD700] group-hover:scale-105 transition-all">
                    📖
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      Kaynak Bul
                      <ChevronRight className="w-3.5 h-3.5 text-[#A7A9BE] group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-[11px] text-[#A7A9BE] font-medium leading-relaxed mt-1">
                      Sınıfın aktif ünite ve konu bağlamını doğrudan Kaynaklar merkezine aktararak MEB müfredat havuzunda ve web'de akıllı araştırma yapar.
                    </p>
                  </div>
                </button>

                {/* ACTION 4: DÖNEMSEL GELİŞİM ANALİZİ */}
                <button
                  onClick={() => setActiveFlow('analytics')}
                  className="p-5 rounded-2xl bg-[#1A1932] border border-[#2D2B55] hover:border-emerald-400 hover:bg-[#1A1932]/80 transition-all text-left space-y-3 group shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg text-emerald-400 group-hover:scale-105 transition-all">
                    📊
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      Dönemsel Gelişim Analizi
                      <ChevronRight className="w-3.5 h-3.5 text-[#A7A9BE] group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-[11px] text-[#A7A9BE] font-medium leading-relaxed mt-1">
                      Sınıfın işlenen ünitelerini, öğrenci zorlanmalarını, MEB kazanım takibini ve grafiksel dönem raporunu sunar.
                    </p>
                  </div>
                </button>
              </div>

              {/* BENTO GRID: DETAILS & HISTORY & SUGGESTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT BLOCK: MEMORY CONTEXT DASHBOARD (7 COLUMNS) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* SINIF HAFIZASI ÖZETİ */}
                  <div className="glass-card p-5 rounded-2xl border border-[#2D2B55] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#2D2B55]/50 pb-2.5">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#6C63FF]" />
                        Sınıf Hafızası & Durum Özeti ({selectedClass.name})
                      </h3>
                      {loadingContext && (
                        <span className="text-[10px] text-[#A7A9BE] flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-[#6C63FF]" />
                          Yükleniyor...
                        </span>
                      )}
                    </div>

                    {context ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-[#161524] p-3.5 rounded-xl border border-[#2D2B55]/80 space-y-1">
                          <span className="text-[#A7A9BE] block font-semibold text-[10px] uppercase">Mevcut Ünite & Konu</span>
                          <p className="text-white font-extrabold text-sm">
                            Ünite {context.currentUnit}: {context.currentTopic || 'Mevcut ünite henüz işlenmedi'}
                          </p>
                        </div>

                        <div className="bg-[#161524] p-3.5 rounded-xl border border-[#2D2B55]/80 space-y-1">
                          <span className="text-[#A7A9BE] block font-semibold text-[10px] uppercase">Son İşlenen Ders</span>
                          <p className="text-white font-extrabold text-sm">
                            {context.recentLessons && context.recentLessons[0] ? context.recentLessons[0].topic : 'Kayıtlı son ders yok'}
                          </p>
                        </div>

                        {/* ÖĞRETMEN NOTLARI & ZORLANILAN ALANLAR */}
                        <div className="sm:col-span-2 space-y-2 bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl">
                          <span className="text-amber-300 font-extrabold flex items-center gap-1.5 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            Öğrenci Zorlanmaları & Sınıf Hafıza Notları
                          </span>
                          {context.recentDifficulties && context.recentDifficulties.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {context.recentDifficulties.map((diff, idx) => (
                                <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
                                  {diff}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[#A7A9BE] italic text-[11px]">Bu sınıf için henüz kaydedilmiş zorlanma notu yok.</p>
                          )}
                        </div>

                        {/* MÜFREDAT KAZANIMLARI (COVERED OUTCOMES) */}
                        <div className="sm:col-span-2 space-y-2 bg-indigo-500/5 border border-[#2D2B55] p-3.5 rounded-xl">
                          <span className="text-[#6C63FF] font-extrabold flex items-center gap-1.5 text-xs">
                            <Target className="w-3.5 h-3.5 text-[#6C63FF]" />
                            İşlenen / Kapsanan MEB Kazanımları
                          </span>
                          {context.coveredOutcomes && context.coveredOutcomes.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {context.coveredOutcomes.map((out, idx) => (
                                <span key={idx} className="bg-[#6C63FF]/10 text-purple-200 border border-[#6C63FF]/20 px-2 py-0.5 rounded text-[11px] font-bold">
                                  🎯 {out}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[#A7A9BE] italic text-[11px]">Sınıfın henüz işlenmiş kazanım geçmişi bulunmuyor.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#A7A9BE] text-xs italic">Sınıf hafıza verisi yüklenemedi.</p>
                    )}
                  </div>

                  {/* DERS GEÇMİŞİ (NATIVE LIST - NO SEPARATE TAB) */}
                  <div className="glass-card p-5 rounded-2xl border border-[#2D2B55] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#2D2B55]/50 pb-2.5">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-[#FF6584]" />
                        Ders Kayıtları & Geçmiş ({selectedClass.name})
                      </h3>
                      <button
                        onClick={(e) => handleDeleteClass(selectedClass.id, e)}
                        className="text-xs text-rose-500/60 hover:text-rose-400 font-bold hover:underline"
                      >
                        Sınıfı Tamamen Sil
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {!context || !context.recentLessons || context.recentLessons.length === 0 ? (
                        <div className="text-center py-6 text-[#A7A9BE] text-xs">
                          Bu sınıf için henüz işlenmiş ders geçmişi bulunmuyor.
                        </div>
                      ) : (
                        context.recentLessons.map((lesson, idx) => (
                          <div key={idx} className="bg-[#161524] border border-[#2D2B55] p-3 rounded-xl flex gap-3 hover:border-[#6C63FF]/30 transition-colors">
                            <div className="flex flex-col items-center justify-center bg-[#1A1932] px-2.5 py-1.5 rounded-lg min-w-[64px]">
                              <span className="text-[9px] font-bold text-[#A7A9BE] uppercase">Tarih</span>
                              <span className="text-xs font-black text-white">
                                {new Date(lesson.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-extrabold text-white truncate">{lesson.topic}</h4>
                              <p className="text-[11px] text-[#A7A9BE] mt-0.5 line-clamp-1">{lesson.teacherNotes || 'Not girilmedi'}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  İşlendi
                                </span>
                                <span className="text-[9px] text-[#A7A9BE] bg-[#2D2B55]/50 px-1.5 py-0.5 rounded">
                                  Ünite {lesson.unitNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT BLOCK: JARVIS PROACTIVE AI SUGGESTIONS (5 COLUMNS) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-gradient-to-br from-[#1A1932] via-[#161524] to-[#201F3B] border border-[#6C63FF]/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#2D2B55]/50 pb-2.5">
                        <span className="text-xs font-extrabold text-[#6C63FF] flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#6C63FF] animate-pulse" />
                          JARVIS Akıllı Öneri & Tavsiye
                        </span>
                        <button
                          onClick={handleGetSuggestion}
                          disabled={suggesting}
                          className="text-[10px] text-[#A7A9BE] hover:text-white bg-[#201F3B] hover:bg-[#2D2B55] px-2.5 py-1 rounded-lg border border-[#2D2B55] transition flex items-center gap-1 disabled:opacity-50 font-bold"
                        >
                          <RefreshCw className={`w-3 h-3 ${suggesting ? 'animate-spin' : ''}`} />
                          Yenile
                        </button>
                      </div>

                      {suggesting ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#6C63FF]" />
                          <p className="text-[11px] text-[#A7A9BE] animate-pulse font-medium">Sınıf hafızası analiz ediliyor...</p>
                        </div>
                      ) : suggestionText ? (
                        <div className="bg-[#161524]/60 p-4 rounded-xl border border-[#2D2B55] text-xs text-slate-200 leading-relaxed space-y-3">
                          <p className="italic">"{suggestionText}"</p>
                        </div>
                      ) : (
                        <div className="bg-[#161524]/40 p-4 rounded-xl border border-dashed border-[#2D2B55] text-center space-y-2 py-8">
                          <Sparkles className="w-8 h-8 text-[#6C63FF]/60 mx-auto" />
                          <p className="text-xs text-[#A7A9BE] font-semibold">Tavsiye Oluşturuluyor</p>
                          <p className="text-[10px] text-[#A7A9BE]">Öğrenme geçmişi ve son notları tarayarak öneri hazırlar.</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#2D2B55]/50">
                      <button
                        onClick={() => onNavigateToJarvis(selectedClassId)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#6C63FF]/10 hover:bg-[#6C63FF]/20 text-purple-200 hover:text-white border border-[#6C63FF]/30 hover:border-[#6C63FF] rounded-xl text-xs font-extrabold transition-all"
                      >
                        <Bot className="w-4 h-4 text-[#6C63FF]" />
                        <span>Sınıf Bağlamıyla Jarvis'e Sor 💬</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
