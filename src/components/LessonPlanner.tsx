import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Brain,
  Search,
  Save,
  ChevronRight,
  RefreshCw,
  Zap,
  HelpCircle,
  Target,
  GraduationCap,
  Download,
  Share2,
  Gamepad2,
  Library
} from 'lucide-react';

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
    date: string;
    unitNumber: number;
    unitName: string;
    topic: string;
    teacherNotes: string;
  }>;
  teacherNotes: string[];
  recentDifficulties: string[];
  coveredOutcomes: string[];
}

interface LessonPlanResult {
  planId: string;
  classId: string;
  title: string;
  durationMinutes: number;
  unitNumber: number;
  unitName: string;
  topic: string;
  goals: string[];
  outcomes: string[];
  difficulty: string;
  reasoning: string;
  timeline: Array<{
    phase: string;
    durationMinutes: number;
    title: string;
    description: string;
    teacherRole: string;
    studentRole: string;
    materialsNeeded: string[];
  }>;
  differentiation: {
    strugglingStudents: string;
    advancedStudents: string;
  };
  assessment: {
    exitTicket: string;
    quickCheckQuestions: string[];
  };
  suggestedMaterials: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

interface LessonPlannerProps {
  selectedClassId?: string;
  onClassChange?: (classId: string) => void;
  onOpenGeneratedMaterial?: (type: string, data: any) => void;
  onPrepareFullStudioPackage?: (preset: any) => void;
}

export const LessonPlanner: React.FC<LessonPlannerProps> = ({
  selectedClassId,
  onClassChange,
  onOpenGeneratedMaterial,
  onPrepareFullStudioPackage
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>(selectedClassId || '');
  const [context, setContext] = useState<LessonContext | null>(null);
  const [loadingContext, setLoadingContext] = useState<boolean>(false);

  // Form options
  const [durationMinutes, setDurationMinutes] = useState<number>(40);
  const [customGoals, setCustomGoals] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('MEB Standart (Orta)');
  const [useWebResearch, setUseWebResearch] = useState<boolean>(true);

  // Generation state
  const [generating, setGenerating] = useState<boolean>(false);
  const [suggesting, setSuggesting] = useState<boolean>(false);
  const [suggestionText, setSuggestionText] = useState<string>('');
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResult | null>(null);
  const [savingPlan, setSavingPlan] = useState<boolean>(false);
  const [planSavedSuccess, setPlanSavedSuccess] = useState<boolean>(false);
  const [preparingMaterial, setPreparingMaterial] = useState<string | null>(null);

  // Fetch classes on mount
  useEffect(() => {
    fetch('/api/classes')
      .then(res => res.json())
      .then((data: ClassItem[]) => {
        if (Array.isArray(data)) {
          setClasses(data);
          if (!activeClassId && data.length > 0) {
            setActiveClassId(data[0].id);
          }
        }
      })
      .catch(err => console.error('Error loading classes:', err));
  }, []);

  // Sync prop changes
  useEffect(() => {
    if (selectedClassId) {
      setActiveClassId(selectedClassId);
    }
  }, [selectedClassId]);

  // Fetch context whenever activeClassId changes
  useEffect(() => {
    if (!activeClassId) return;
    setLoadingContext(true);
    setLessonPlan(null);
    setPlanSavedSuccess(false);

    fetch(`/api/classes/${activeClassId}/next-lesson-context`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setContext(data);
        } else {
          setContext(null);
        }
      })
      .catch(err => console.error('Context fetch error:', err))
      .finally(() => setLoadingContext(false));
  }, [activeClassId]);

  const handleClassSelect = (id: string) => {
    setActiveClassId(id);
    if (onClassChange) onClassChange(id);
  };

  // Get AI Suggestion
  const handleGetSuggestion = async () => {
    if (!activeClassId) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/jarvis/suggest-next-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: activeClassId })
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

  // Generate Lesson Plan
  const handleGeneratePlan = async () => {
    if (!activeClassId) return;
    setGenerating(true);
    setPlanSavedSuccess(false);

    try {
      const res = await fetch('/api/jarvis/plan-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: activeClassId,
          durationMinutes,
          goals: customGoals,
          difficulty,
          useWebResearch
        })
      });
      const data = await res.json();
      if (data.title && data.timeline) {
        setLessonPlan(data);
      }
    } catch (err) {
      console.error('Plan generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Save Plan & Execute Lesson (WRITE Guard Confirmation)
  const handleSavePlan = async () => {
    if (!lessonPlan) return;
    setSavingPlan(true);

    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lesson_plan',
          args: {
            classId: lessonPlan.classId,
            planId: lessonPlan.planId,
            title: lessonPlan.title,
            topic: lessonPlan.topic,
            unitNumber: lessonPlan.unitNumber,
            unitName: lessonPlan.unitName,
            planJson: JSON.stringify(lessonPlan)
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlanSavedSuccess(true);
      }
    } catch (err) {
      console.error('Save plan error:', err);
    } finally {
      setSavingPlan(false);
    }
  };

  // Prepare specific materials
  const handlePrepareMaterials = async (type: string) => {
    if (!lessonPlan) return;
    setPreparingMaterial(type);

    try {
      const res = await fetch('/api/jarvis/prepare-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: lessonPlan.classId,
          planId: lessonPlan.planId,
          materialTypes: [type]
        })
      });
      const data = await res.json();
      if (data && onOpenGeneratedMaterial) {
        onOpenGeneratedMaterial(type, data);
      }
    } catch (err) {
      console.error('Prepare material error:', err);
    } finally {
      setPreparingMaterial(null);
    }
  };

  const activeClass = classes.find(c => c.id === activeClassId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Brain className="w-3.5 h-3.5" />
              JARVIS Proaktif Ders Planlama
            </div>
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Akıllı Ders Planı & Sınıf Hafızası
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Geçmiş ders notları, öğrenci zorlanmaları ve MEB müfredatına tam uyumlu proaktif ders hazırlığı.
            </p>
          </div>

          {/* Class selector pills */}
          <div className="flex flex-wrap items-center gap-2">
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => handleClassSelect(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeClassId === c.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 scale-105'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {c.name} ({c.gradeLevel}. Sınıf)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CLASS MEMORY SUMMARY & PROACTIVE SUGGESTION */}
      {activeClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sınıf Hafızası Kartı */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Sınıf Hafızası Özeti ({activeClass?.name})
              </h3>
              {loadingContext && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Yükleniyor...
                </span>
              )}
            </div>

            {context ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block font-medium">Mevcut Ünite & Konu</span>
                  <p className="text-slate-200 font-semibold text-sm">
                    Ünite {context.currentUnit}: {context.currentTopic || 'Konu Henüz Belirtilmedi'}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 block font-medium">Son İşlenen Ders</span>
                  <p className="text-slate-200 font-semibold text-sm">
                    {context.recentLessons[0] ? context.recentLessons[0].topic : 'Kayıtlı son ders yok'}
                  </p>
                </div>

                {/* Zorlanılan Alanlar */}
                <div className="sm:col-span-2 bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Hafızadaki Öğrenci Zorlanmaları & Notlar
                  </span>
                  {context.recentDifficulties && context.recentDifficulties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {context.recentDifficulties.map((diff, idx) => (
                        <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {diff}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Henüz özel zorlanma notu kaydedilmemiş.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic">Sınıf verisi bulunamadı.</p>
            )}
          </div>

          {/* JARVIS Proaktif Öneri Kartı */}
          <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/20 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  JARVIS Akıllı Öneri
                </span>
                <button
                  onClick={handleGetSuggestion}
                  disabled={suggesting}
                  className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${suggesting ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>

              {suggestionText ? (
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-cyan-500/30 text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto">
                  {suggestionText}
                </div>
              ) : (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-center space-y-2">
                  <Sparkles className="w-6 h-6 text-cyan-400 mx-auto" />
                  <p>JARVIS'ten bir sonraki ders için geçmiş notlara dayalı pedagojik öneri alın.</p>
                  <button
                    onClick={handleGetSuggestion}
                    disabled={suggesting}
                    className="mt-2 text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    {suggesting ? 'Analiz Yapılıyor...' : 'Şimdi Öneri İste'}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Sınıf: {activeClass?.name || 'Seçilmedi'}</span>
              <span>40 Dakika Standart</span>
            </div>
          </div>
        </div>
      )}

      {/* PLAN GENERATION PARAMETERS FORM */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          Ders Planı Parametreleri
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Süre */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ders Süresi (Dakika)
            </label>
            <div className="flex items-center gap-2">
              {[40, 80, 30].map(m => (
                <button
                  key={m}
                  onClick={() => setDurationMinutes(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                    durationMinutes === m
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m} Dk
                </button>
              ))}
            </div>
          </div>

          {/* Zorluk */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Hedef Seviye / Zorluk
            </label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="Temel (Destek Odaklı)">Temel (Destek Odaklı)</option>
              <option value="MEB Standart (Orta)">MEB Standart (Orta)</option>
              <option value="İleri Düzey (PISA / LGS Tipi)">İleri Düzey (PISA / LGS Tipi)</option>
            </select>
          </div>

          {/* MEB Web Araştırması Toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              MEB Kaynak Araştırması
            </label>
            <button
              onClick={() => setUseWebResearch(!useWebResearch)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-between transition ${
                useWebResearch
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                {useWebResearch ? 'EBA/MEBİ Entegre' : 'Yalnızca Müfredat'}
              </span>
              <span className={`w-2 h-2 rounded-full ${useWebResearch ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>

          {/* Özel Hedefler / Notlar */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Öğretmenin Özel İstek veya Hedefleri (Opsiyonel)
            </label>
            <input
              type="text"
              value={customGoals}
              onChange={e => setCustomGoals(e.target.value)}
              placeholder="Örn: Görsel ağırlıklı olsun, son dersteki kelime eksikliğini kapatsın..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleGeneratePlan}
            disabled={generating || !activeClassId}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                JARVIS Pedagojik Plan Hazırlıyor...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                40 Dakikalık Tam Ders Planı Oluştur
              </>
            )}
          </button>
        </div>
      </div>

      {/* GENERATED LESSON PLAN VIEW */}
      {lessonPlan && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                {lessonPlan.unitName} (Ünite {lessonPlan.unitNumber})
              </span>
              <h3 className="text-xl font-bold text-slate-100 mt-1">
                {lessonPlan.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sınıf: <strong className="text-slate-200">{activeClass?.name}</strong> | Konu: <strong className="text-slate-200">{lessonPlan.topic}</strong> | Süre: <strong className="text-slate-200">{lessonPlan.durationMinutes} Dakika</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSavePlan}
                disabled={savingPlan || planSavedSuccess}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  planSavedSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                }`}
              >
                {savingPlan ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : planSavedSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {planSavedSuccess ? 'Plan Veritabanına Kaydedildi' : 'Planı Kaydet & Dersi İşle'}
              </button>
            </div>
          </div>

          {/* "NEDEN BU PLAN?" - REASONING BOX */}
          <div className="bg-gradient-to-r from-cyan-950/60 via-slate-950 to-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Neden Bu Plan? (JARVIS Pedagojik Gerekçelendirme)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{lessonPlan.reasoning}"
            </p>
          </div>

          {/* Kazanımlar & Hedefler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Ders Hedefleri
              </h5>
              <ul className="space-y-1">
                {lessonPlan.goals?.map((g, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                MEB Kazanımları
              </h5>
              <ul className="space-y-1">
                {lessonPlan.outcomes?.map((o, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* TIMELINE (AKIS) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Dakika Dakika Ders Akışı ({lessonPlan.durationMinutes} Dk)
            </h4>

            <div className="space-y-3">
              {lessonPlan.timeline?.map((step, idx) => (
                <div key={idx} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-shrink-0 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg text-center min-w-[80px]">
                    <span className="text-cyan-300 font-bold text-xs block">{step.durationMinutes} Dk</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{step.phase}</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <h5 className="text-sm font-semibold text-slate-100">{step.title}</h5>
                    <p className="text-xs text-slate-300">{step.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
                      <div>
                        <strong className="text-slate-300">Öğretmen Rolü:</strong> {step.teacherRole}
                      </div>
                      <div>
                        <strong className="text-slate-300">Öğrenci Rolü:</strong> {step.studentRole}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FARKLILASTIRMA & DEĞERLENDİRME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Farklılaştırma Stratejileri
              </h5>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-amber-400 font-medium">Desteğe İhtiyacı Olanlar:</span>
                  <p className="text-slate-400 mt-0.5">{lessonPlan.differentiation?.strugglingStudents}</p>
                </div>
                <div>
                  <span className="text-emerald-400 font-medium">Hızlı Öğrenenler:</span>
                  <p className="text-slate-400 mt-0.5">{lessonPlan.differentiation?.advancedStudents}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Değerlendirme & Exit Ticket
              </h5>
              <p className="text-xs text-slate-300">{lessonPlan.assessment?.exitTicket}</p>
            </div>
          </div>

          {/* AUTOMATED MATERIAL PREPARATION BUTTONS */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Bu Plan İçin Otomatik Materyal Üret
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handlePrepareMaterials('worksheet')}
                disabled={preparingMaterial !== null}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition space-y-1 text-xs group disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-200 block">Worksheet</span>
                <span className="text-[10px] text-slate-400 block">Çalışma Kağıdı Üret</span>
              </button>

              <button
                onClick={() => handlePrepareMaterials('flashcards')}
                disabled={preparingMaterial !== null}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition space-y-1 text-xs group disabled:opacity-50"
              >
                <Library className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-200 block">Flashcards</span>
                <span className="text-[10px] text-slate-400 block">Kelime Kartları</span>
              </button>

              <button
                onClick={() => handlePrepareMaterials('game')}
                disabled={preparingMaterial !== null}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition space-y-1 text-xs group disabled:opacity-50"
              >
                <Gamepad2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-200 block">Sınıf Oyunu</span>
                <span className="text-[10px] text-slate-400 block">Etkinlik & Oyun Kılavuzu</span>
              </button>

              <button
                onClick={() => handlePrepareMaterials('exit_ticket')}
                disabled={preparingMaterial !== null}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition space-y-1 text-xs group disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-slate-200 block">Exit Ticket</span>
                <span className="text-[10px] text-slate-400 block">Çıkış Kartı Soru Seti</span>
              </button>
            </div>
          </div>

          {/* DERSİ HAZIRLA STÜDYO GEÇİŞ CALLOUT */}
          {onPrepareFullStudioPackage && (
            <div className="p-6 mt-4 bg-[#1A1932] rounded-2xl border border-[#2D2B55] text-center space-y-4 shadow-[0_0_20px_rgba(108,99,255,0.1)]">
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-black text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  Ders Akışı Hazır! Tüm Materyalleri Hazırlamak İster misiniz?
                </h4>
                <p className="text-xs text-[#A7A9BE] mt-1.5 leading-relaxed">
                  Harika bir pedagojik akış oluşturuldu. Şimdi bu akışa tam uyumlu MEB etkinlik rehberi, çalışma kağıdı, 3D kelime kartları ve değerlendirme araçları üretmek için stüdyoya aktarabilirsiniz.
                </p>
              </div>
              <button
                onClick={() => {
                  onPrepareFullStudioPackage({
                    grade: String(activeClass?.gradeLevel) as any,
                    unitNumber: lessonPlan.unitNumber,
                    unitName: lessonPlan.unitName,
                    skill: 'Bütünleşik (Integrated - 4 Beceriler)',
                    activityType: 'Oyun',
                    durationMinutes: lessonPlan.durationMinutes,
                    extraVocabulary: lessonPlan.suggestedMaterials?.map((m: any) => m.title).join(', ') || ''
                  });
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white font-black text-sm rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>✨ Dersi Hazırla Stüdyosuna Aktar</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
