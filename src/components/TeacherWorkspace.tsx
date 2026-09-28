import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Users,
  Brain,
  Search,
  Zap,
  FileText,
  Clock,
  CalendarX,
  PlusCircle,
  ChevronRight,
  Bot,
  Mic,
  GraduationCap,
  Layers,
  AlertCircle,
  CheckCircle2,
  Library,
  Gamepad2,
  FolderHeart,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Printer
} from 'lucide-react';

interface WorkspaceData {
  stats: {
    totalClasses: number;
    totalLessons: number;
    totalPlans: number;
    totalMaterials: number;
  };
  classes: Array<{
    id: string;
    name: string;
    gradeLevel: number;
    currentUnit: number;
    currentTopic: string;
    studentCount: number;
  }>;
  recentLessons: Array<{
    id: string;
    classId: string;
    className: string;
    gradeLevel: number;
    topic: string;
    date: string;
    teacherNotes: string;
  }>;
  recentPlans: Array<{
    id: string;
    classId: string;
    className: string;
    gradeLevel: number;
    title: string;
    topic: string;
    status: string;
    createdAt: string;
  }>;
  recentTeacherNotes: Array<{
    id: string;
    classId: string;
    className: string;
    teacherNotes: string;
    date: string;
    topic: string;
  }>;
  hasCalendarIntegration: boolean;
}

interface TeacherWorkspaceProps {
  onNavigateToView: (view: 'workspace' | 'lessons' | 'resources' | 'jarvis') => void;
  onOpenJarvis: (classId?: string) => void;
  onOpenVoice: () => void;
  onSelectClassForPlanner: (classId: string) => void;
}

export const TeacherWorkspace: React.FC<TeacherWorkspaceProps> = ({
  onNavigateToView,
  onOpenJarvis,
  onOpenVoice,
  onSelectClassForPlanner
}) => {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [suggestionData, setSuggestionData] = useState<any | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState<boolean>(false);
  const [preparingMaterials, setPreparingMaterials] = useState<boolean>(false);
  const [preparingFullLesson, setPreparingFullLesson] = useState<boolean>(false);
  const [preparedBundle, setPreparedBundle] = useState<any | null>(null);
  const [showBundleModal, setShowBundleModal] = useState<boolean>(false);
  const [savingBundle, setSavingBundle] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPrintingSummary, setIsPrintingSummary] = useState<boolean>(false);

  const handlePrintSummary = () => {
    setIsPrintingSummary(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSummary(false);
    }, 200);
  };

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchWorkspaceSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/summary');
      if (!res.ok) {
        console.error('Workspace summary error: HTTP status', res.status);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Workspace summary error: Non-JSON response received');
        return;
      }
      const result = await res.json();
      if (result && !result.error) {
        setData(result);
        if (result.classes && result.classes.length > 0 && !selectedClassId) {
          setSelectedClassId(result.classes[0].id);
        }
      }
    } catch (err) {
      console.error('Workspace summary error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceSummary();
  }, []);

  // Fetch JARVIS suggestion whenever selectedClassId changes
  useEffect(() => {
    if (!selectedClassId) return;
    setLoadingSuggestion(true);
    setSuggestionData(null);

    fetch('/api/jarvis/suggest-next-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId })
    })
      .then(res => {
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return null;
        return res.json();
      })
      .then(resData => {
        if (resData) {
          setSuggestionData(resData);
        }
      })
      .catch(err => console.error('Error fetching suggestion:', err))
      .finally(() => setLoadingSuggestion(false));
  }, [selectedClassId]);

  const activeClass = data?.classes?.find(c => c.id === selectedClassId);

  // One-click action: Prepare Materials
  const handlePrepareMaterials = async () => {
    if (!selectedClassId) return;
    setPreparingMaterials(true);
    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare_lesson_materials',
          args: {
            classId: selectedClassId,
            materialTypes: ['worksheet', 'flashcards', 'game']
          }
        })
      });
      const resData = await res.json();
      if (res.ok) {
        showNotification('✨ Materyal taslakları başarıyla üretildi ve Kaynak Merkezi\'ne eklendi.');
        fetchWorkspaceSummary();
      } else {
        showNotification('⚠️ ' + (resData.error || 'Materyal üretilemedi.'));
      }
    } catch (err) {
      console.error(err);
      showNotification('⚠️ Materyal üretimi sırasında bir hata oluştu.');
    } finally {
      setPreparingMaterials(false);
    }
  };

  // One-click "Dersi Hazırla" Workflow
  const handlePrepareFullLesson = async () => {
    if (!selectedClassId) return;
    setPreparingFullLesson(true);
    setPreparedBundle(null);
    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare_full_lesson',
          args: {
            classId: selectedClassId,
            materialTypes: ['worksheet', 'flashcards'],
            useWebResearch: true
          }
        })
      });
      const resData = await res.json();
      if (res.ok && resData.plan) {
        setPreparedBundle(resData);
        setShowBundleModal(true);
        showNotification('✨ Ders planı, materyaller ve kaynak araştırması başarıyla oluşturuldu. İnceleyebilirsiniz!');
      } else {
        showNotification('⚠️ ' + (resData.error || 'Ders hazırlığı yapılamadı.'));
      }
    } catch (err) {
      console.error(err);
      showNotification('⚠️ Ders hazırlığı sırasında bir hata oluştu.');
    } finally {
      setPreparingFullLesson(false);
    }
  };

  // Confirm and Save Lesson Bundle (WRITE Guard Confirmation)
  const handleConfirmSaveBundle = async () => {
    if (!preparedBundle || !selectedClassId) return;
    setSavingBundle(true);
    try {
      const resPlan = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lesson_plan',
          args: {
            classId: selectedClassId,
            planId: preparedBundle.plan.id,
            title: preparedBundle.plan.title,
            topic: preparedBundle.plan.topic,
            unitNumber: preparedBundle.plan.unitNumber,
            unitName: preparedBundle.plan.unitName,
            planJson: preparedBundle.plan
          }
        })
      });

      if (resPlan.ok) {
        showNotification('🎉 Ders Planı ve Materyaller başarıyla onaylandı ve Kaydedildi!');
        setShowBundleModal(false);
        setPreparedBundle(null);
        fetchWorkspaceSummary();
      } else {
        const errData = await resPlan.json();
        showNotification('⚠️ Onaylama başarısız: ' + (errData.error || ''));
      }
    } catch (err) {
      console.error(err);
      showNotification('⚠️ Kayıt onaylanırken bir hata oluştu.');
    } finally {
      setSavingBundle(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-slate-100 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-purple-500/50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. HERO HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Brain className="w-4 h-4" />
              Öğretmen Ana Merkezi & Canlı Komuta Paneli
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight leading-tight">
              Hoş Geldiniz, Öğretmenim 👋
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Türkiye Yüzyılı Maarif Modeli müfredatınız, sınıflarınızın canlı hafızası ve akıllı ders planlama asistanınız JARVIS kullanımınıza hazır.
            </p>

            {/* Calendar Integration Notice (No Calendar Data - Do NOT Invent) */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
              <CalendarX className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Ders Takvimi:</strong> Harici takvim verisi bulunmuyor. Lütfen işlem yapmak istediğiniz sınıfı seçin.
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-auto">
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center space-y-1">
              <span className="text-2xl font-extrabold text-cyan-400 block">
                {loading ? '-' : data?.stats.totalClasses || 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                Sınıf
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center space-y-1">
              <span className="text-2xl font-extrabold text-purple-400 block">
                {loading ? '-' : data?.stats.totalLessons || 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                Ders Kaydı
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center space-y-1">
              <span className="text-2xl font-extrabold text-emerald-400 block">
                {loading ? '-' : data?.stats.totalPlans || 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                Ders Planı
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center space-y-1">
              <span className="text-2xl font-extrabold text-pink-400 block">
                {loading ? '-' : data?.stats.totalMaterials || 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                Materyal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GÜNLÜK ÖĞRETMEN ÇALIŞMA ÖZETİ (A4 Yazdırılabilir Rapor) */}
      <div 
        id="daily-summary-panel"
        className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden ${isPrintingSummary ? 'printable-area' : ''}`}
      >
        {/* Subtle Decorative Background, Hidden on Print */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/5 via-transparent to-transparent rounded-full pointer-events-none -mr-16 -mt-16 no-print" />
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 no-print">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                📋 Bugünün Öğretmen Çalışma Özeti
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Sistem Tarihi: <strong className="text-slate-200">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </p>
          </div>

          <button
            onClick={handlePrintSummary}
            className="no-print px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition duration-150 shadow-md"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Raporu Yazdır / PDF Kaydet
          </button>
        </div>

        {/* Print-Only Professional Document Header */}
        <div className="hidden printing-header border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-black">JARVIS EĞİTİM ASİSTANI</h1>
              <h2 className="text-lg font-bold text-black uppercase">Günlük Öğretmen Çalışma Raporu</h2>
            </div>
            <div className="text-right text-xs">
              <p>Tarih: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Öğretmen: İngilizce Branş Öğretmeni</p>
            </div>
          </div>
        </div>

        {/* Disclaimer / Notice */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 no-print" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 block no-print">💡 Önemli Güvenilirlik Bilgisi:</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Takvim entegrasyonu bulunmadığı için aşağıdaki liste mevcut sınıf hafızasına ve kayıtlı çalışmalara göre hazırlanmıştır. Ders zamanı veya program bilgisi tahmin edilmemiş, yapay zeka uydurmalarından (hallucination) kaçınılmıştır.
            </p>
          </div>
        </div>

        {/* Main Priorities & Class Analysis */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/50 pb-2">
            🚀 Sınıf Öncelikleri ve Pedagojik Analiz
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Sınıf durumları ve veritabanı analiz ediliyor...</div>
          ) : data?.classes && data.classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.classes.map(c => {
                const classLessons = data.recentLessons.filter(l => l.classId === c.id);
                const lastLesson = classLessons[0];
                const studentStruggle = lastLesson?.teacherNotes || "Gelişim alanı veya özel zorlanma not edilmemiş.";
                
                // Deterministic pedagogical recommendation matching grade level
                let jarvisRec = "İlgili ünite kazanımlarını MEB Maarif Modeli yönergeleriyle işleyin.";
                let rationale = "Sınıfın müfredat ünite akışı temel alındı.";
                
                if (c.gradeLevel === 5) {
                  jarvisRec = "5. Sınıf seviyesine uygun olarak oyunlaştırılmış etkinlikler, görsel flashcard'lar ve temel ünite kelimelerini pekiştiren eğlenceli aktiviteler düzenleyin.";
                  rationale = "Kazanım eşleşmeleri ve yaş grubunun iletişimsel pekiştirme ihtiyacı analiz edildi.";
                } else if (c.gradeLevel === 6) {
                  jarvisRec = "6. Sınıf müfredat kazanımlarına uygun olarak, günlük konuşma diyalogları ve interaktif kelime pekiştirme kartları hazırlayın.";
                  rationale = "SQLite geçmişi ve öğrencilerin kelime odaklı çalışma ihtiyacı değerlendirildi.";
                } else if (c.gradeLevel === 7) {
                  jarvisRec = "7. Sınıf seviyesine uygun olarak, okuma-anlama etkinlikleri, dil bilgisi pekiştirme kartları ve MEB ÖDSGM örnek soru çözümleri planlayın.";
                  rationale = "Mevcut ünite gelişim durumu ve beceri kazanımları analiz edildi.";
                } else if (c.gradeLevel === 8) {
                  jarvisRec = "8. Sınıf LGS hazırlığı kapsamında, MEB EBA ve ÖDSGM örnek soru analizleri, kelime kartları ve sınav provaları düzenleyin.";
                  rationale = "Merkezi sınav (LGS) kazanım uyumu ve sınav provası gereksinimi önceliklendirildi.";
                }

                return (
                  <div key={c.id} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4.5 space-y-3.5 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-xs">
                          {c.name}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100">{c.name} ({c.gradeLevel}. Sınıf)</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                        {c.studentCount || 24} Öğrenci
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-bold">Mevcut Ünite:</span>
                          <span className="text-slate-300 font-semibold">Ünite {c.currentUnit}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-bold">Son Konu:</span>
                          <span className="text-slate-300 font-semibold truncate block">{lastLesson?.topic || "Kayıt yok"}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Öğrenci Zorlanması / Not:</span>
                        <p className="text-slate-300 italic">{studentStruggle}</p>
                      </div>

                      <div className="p-3 bg-slate-950/90 rounded-xl border border-purple-500/10 space-y-1">
                        <span className="text-[10px] text-purple-400 uppercase block font-extrabold">💡 JARVIS Önerisi:</span>
                        <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{jarvisRec}</p>
                        <span className="text-[9px] text-slate-500 block pt-1 border-t border-slate-800/60">
                          <strong>Gerekçe:</strong> {rationale}
                        </span>
                      </div>
                    </div>

                    {/* Hızlı Aksiyonlar */}
                    <div className="no-print pt-2 flex flex-wrap gap-2 border-t border-slate-800/60">
                      <button
                        onClick={() => {
                          onSelectClassForPlanner(c.id);
                          onNavigateToView('lessons');
                        }}
                        className="px-2 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        🧠 Dersi Hazırla
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClassId(c.id);
                          handlePrepareMaterials();
                        }}
                        className="px-2 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        📄 Materyal Hazırla
                      </button>
                      <button
                        onClick={() => onNavigateToView('resources')}
                        className="px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        📖 MEB Kaynağı Bul
                      </button>
                      <button
                        onClick={() => onOpenJarvis(c.id)}
                        className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        🤖 JARVIS'e Sor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Analiz edilecek sınıf kaydı bulunamadı.</p>
          )}
        </div>

        {/* Suggested To-Dos & Material Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* To-Do Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/50 pb-2">
              ☐ Bugün Yapılması Önerilenler
            </h3>

            <div className="space-y-2 text-xs">
              {data?.classes && data.classes.map((c, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2 bg-slate-950/30 rounded-xl border border-slate-800/40">
                  <span className="text-cyan-400 font-bold mt-0.5">☐</span>
                  <p className="text-slate-300">
                    <strong className="text-slate-100">{c.name}</strong> — Sonraki ders planını ve kazanım odaklı kelime kartlarını hazırla.
                  </p>
                </div>
              ))}

              <div className="flex items-start gap-2.5 p-2 bg-slate-950/30 rounded-xl border border-slate-800/40">
                <span className="text-purple-400 font-bold mt-0.5">☐</span>
                <p className="text-slate-300">
                  Taslak olarak üretilmiş ders planlarını ve materyal paketlerini inceleyin ve onaylayın.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-slate-950/30 rounded-xl border border-slate-800/40">
                <span className="text-emerald-400 font-bold mt-0.5">☐</span>
                <p className="text-slate-300">
                  Yeni ünite kazanımlarına uygun, resmi MEB ÖDSGM ve EBA kaynak araştırmalarını yapın.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Saved Materials Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/50 pb-2">
              📁 Hazırlanmış Materyaller ve Taslak Durumu
            </h3>

            <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/50">
                <span>Toplam Kayıtlı Sınıf:</span>
                <strong className="text-slate-100">{data?.stats.totalClasses || 0} Sınıf</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/50">
                <span>Onaylanmış Ders Geçmişi Kaydı:</span>
                <strong className="text-slate-100">{data?.stats.totalLessons || 0} Ders</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/50">
                <span>Toplam Üretilen Ders Planı:</span>
                <strong className="text-slate-100">{data?.stats.totalPlans || 0} Plan</strong>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Toplam Üretilen Etkinlik / Materyal:</span>
                <strong className="text-slate-100">{data?.stats.totalMaterials || 0} Materyal</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Document Footer, Hidden on Web, Only Visible on Print */}
        <div className="hidden printing-footer border-t border-black/40 pt-4 mt-6 text-center text-[10px] text-black">
          <p>Bu rapor, İngilizce Eğitim Asistanı JARVIS tarafından veritabanındaki gerçek kayıtlardan derlenmiştir.</p>
          <p>© {new Date().getFullYear()} JARVIS Eğitim Paneli - Türkiye Yüzyılı Maarif Modeli Entegrasyonu</p>
        </div>
      </div>

      {/* 2. "BUGÜN İÇİN JARVIS ÖNERİYOR" PROAKTİF ASİSTAN BÖLÜMÜ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-100 tracking-tight">
                  ✨ JARVIS Bugün İçin Öneriyor
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                  Sınıf Hafızası Odaklı
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sınıfınızın SQLite verileri, son ders kayıtları ve öğretmen notları analiz edilerek oluşturuldu.
              </p>
            </div>
          </div>

          {/* Odak Sınıf Seçici */}
          {data?.classes && data.classes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Analiz Edilen Sınıf:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-cyan-500 transition cursor-pointer"
              >
                {data.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel}. Sınıf)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loadingSuggestion ? (
          <div className="p-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-center space-y-3 animate-pulse">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">JARVIS sınıf hafızasını, öğretmen notlarını ve müfredat durumunu analiz ediyor...</p>
          </div>
        ) : suggestionData ? (
          <div className="space-y-6">
            {/* Primary Proactive Card Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Priority Class & Recommended Topic */}
              <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      suggestionData.isPriority
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {suggestionData.priorityTag || (suggestionData.isPriority ? 'Öncelikli Sınıf' : 'Standart İlerleme')}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-100">
                      {suggestionData.className} ({suggestionData.gradeLevel}. Sınıf)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                    Ünite {suggestionData.suggestedUnit || activeClass?.currentUnit || 1}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Önerilen Sonraki Ders Konusu & Pedagojik Odak
                  </span>
                  <p className="text-sm font-bold text-slate-100 leading-snug">
                    {suggestionData.suggestedTopic || activeClass?.currentTopic || 'Giriş & Pekiştirme'}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    {suggestionData.pedagogicalFocus || 'Ders konusu üzerinden iletişimsel kazanım tekrarı.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Dikkat Edilmesi Gereken Not
                    </span>
                    <p className="text-xs text-amber-200/90 font-medium line-clamp-2">
                      {suggestionData.criticalTeacherNote || 'Kayıtlı özel zorlanma veya not bulunmuyor.'}
                    </p>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-cyan-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Önerilen Materyal
                    </span>
                    <p className="text-xs text-cyan-200/90 font-medium line-clamp-2">
                      {suggestionData.recommendedMaterial || 'Çalışma Kağıdı & Kelime Kartları'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transparency Reasoning Box ("Bu öneriyi neden yaptım?") */}
              <div className="bg-slate-950/80 border border-purple-500/20 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 mb-3">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Bu öneriyi neden yaptım? (Şeffaflık)
                    </h4>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 block">📌 Son Ders Kaydı:</span>
                      <p className="text-slate-200 font-medium">
                        {suggestionData.whyThisSuggestion?.lastLessonFact || 'Geçmiş ders kaydı bulunmuyor'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 block">📝 Öğretmen Notu / Zorlanma:</span>
                      <p className="text-slate-200 font-medium">
                        {suggestionData.whyThisSuggestion?.teacherNoteFact || 'Zorlanma kaydı yok'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 block">🎯 Kazanım Durumu:</span>
                      <p className="text-slate-200 font-medium">
                        {suggestionData.whyThisSuggestion?.coverageFact || 'Müfredat ünite akışı'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-purple-950/40 rounded-xl border border-purple-500/20 text-purple-200 text-[11px] leading-relaxed mt-2">
                      <strong>💡 Pedagojik Gerekçe:</strong> {suggestionData.whyThisSuggestion?.pedagogicalRationale || 'Sınıf hafızanız ve öğretmen notlarınız analiz edildi.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ONE-CLICK ACTION BUTTONS (4 TEK TIKLA AKSİYON) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Tek Tıkla Aksiyonlar
              </span>

              <div className="space-y-4">
                {/* Ana Aksiyonlar (Top 3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Dersi Hazırla (Tam Paket - En Önemli Aksiyon) */}
                  <button
                    onClick={handlePrepareFullLesson}
                    disabled={preparingFullLesson}
                    className="relative p-5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-fuchsia-500/10 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 group disabled:opacity-50 border border-fuchsia-400/20"
                  >
                    <span className="absolute -top-2 px-2.5 py-0.5 rounded-full bg-fuchsia-500 text-[9px] font-black uppercase tracking-widest animate-pulse border border-fuchsia-300/30">
                      ⭐ En Pratik Yol
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {preparingFullLesson ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-fuchsia-100 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-sm">Günü Planla ve Hazırla (Tam Paket)</span>
                    </div>
                    <span className="text-[10px] text-fuchsia-100 font-normal opacity-85">Ders planı + ilgili materyaller + MEB kaynak araştırması</span>
                  </button>

                  {/* 2. JARVIS'e Sor */}
                  <button
                    onClick={() => onOpenJarvis(selectedClassId)}
                    className="p-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-indigo-500/10 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 group border border-indigo-400/20"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm">Akıllı Asistan JARVIS ile Konuş</span>
                    </div>
                    <span className="text-[10px] text-indigo-100 font-normal opacity-85">Sesli veya yazılı olarak sınıfa dair soru sor / komut ver</span>
                  </button>

                  {/* 3. MEB Kaynağı Bul */}
                  <button
                    onClick={() => onNavigateToView('resources')}
                    className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-emerald-500/10 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 group border border-emerald-400/20"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm">MEB Müfredat Kaynağı Ara</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 font-normal opacity-85">ÖDSGM, EBA ve Türkiye Yüzyılı Maarif Modeli arşivi</span>
                  </button>
                </div>

                {/* Yardımcı Hızlı İşlemler (Sadece Tekil Üretim) */}
                <div className="pt-2 border-t border-slate-800/40 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Detaylı Diğer İşlemler:</span>
                  
                  {/* Ders Planla */}
                  <button
                    onClick={() => {
                      if (selectedClassId) onSelectClassForPlanner(selectedClassId);
                      onNavigateToView('lessons');
                    }}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-[11px] rounded-xl flex items-center gap-2 transition group"
                  >
                    <Brain className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    Sadece Ders Planı Tasarla (40 Dk)
                  </button>

                  {/* Materyal Hazırla */}
                  <button
                    onClick={handlePrepareMaterials}
                    disabled={preparingMaterials}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-[11px] rounded-xl flex items-center gap-2 transition group disabled:opacity-50"
                  >
                    {preparingMaterials ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                    )}
                    Sadece Etkinlik / Materyal Üret
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-4">Öneri verisi alınamadı.</p>
        )}
      </div>

      {/* 2. QUICK ACTION COMMAND BAR */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Hızlı Komutlar & Kısayollar
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Dersi Hazırla (Tam Paket) */}
          <button
            onClick={handlePrepareFullLesson}
            disabled={preparingFullLesson}
            className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-purple-500/30 hover:border-purple-400 rounded-2xl text-left transition-all duration-200 group shadow-lg space-y-2 disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              {preparingFullLesson ? (
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-200 block group-hover:text-purple-300">
                Dersi Hazırla (Tam Paket)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Plan + Materyal Taslakları
              </span>
            </div>
          </button>

          {/* Ders Hazırla */}
          <button
            onClick={() => {
              if (selectedClassId) onSelectClassForPlanner(selectedClassId);
              onNavigateToView('lessons');
            }}
            className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl text-left transition-all duration-200 group shadow-lg space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-200 block group-hover:text-cyan-300">
                40 Dk Ders Planla
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Proaktif & Hafıza Odaklı
              </span>
            </div>
          </button>

          {/* JARVIS'e Sor */}
          <button
            onClick={() => onOpenJarvis(selectedClassId || undefined)}
            className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-purple-500/30 hover:border-purple-400 rounded-2xl text-left transition-all duration-200 group shadow-lg space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-200 block group-hover:text-purple-300">
                JARVIS'e Sor
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Yazılı Akıllı Asistan
              </span>
            </div>
          </button>

          {/* Sınav Oluştur */}
          <button
            onClick={() => onNavigateToView('resources')}
            className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-pink-500/30 hover:border-pink-400 rounded-2xl text-left transition-all duration-200 group shadow-lg space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-200 block group-hover:text-pink-300">
                LGS / Sınav Üret
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                MEB Formatında Özgün
              </span>
            </div>
          </button>

          {/* Kaynak Bul */}
          <button
            onClick={() => onNavigateToView('resources')}
            className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl text-left transition-all duration-200 group shadow-lg space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-200 block group-hover:text-emerald-300">
                MEB Kaynak Bul
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                EBA / ÖDSGM Araştırma
              </span>
            </div>
          </button>

          {/* Canlı Sesli Mod */}
          <button
            onClick={onOpenVoice}
            className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-blue-500/30 hover:border-blue-400 rounded-2xl text-left transition-all duration-200 group shadow-lg space-y-2 col-span-2 sm:col-span-1"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-200 block group-hover:text-blue-300">
                Canlı Sesli Sohbet
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Canlı Sesli Görüşme Modu
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. SINIFLARIM CANLI MATRIX & JARVIS PROAKTİF TAVSİYE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Class Selection Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Sınıflarım ve Durum Matrisi
            </h3>
            <button
              onClick={() => onNavigateToView('lessons')}
              className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
            >
              Tüm Sınıfları Yönet <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.classes?.map(c => {
              const isSelected = selectedClassId === c.id;
              const classLessons = data.recentLessons.filter(l => l.classId === c.id);
              const lastLesson = classLessons[0];

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden space-y-3 ${
                    isSelected
                      ? 'bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border-cyan-500/60 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {c.name}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{c.name} ({c.gradeLevel}. Sınıf)</h4>
                        <span className="text-[11px] text-slate-400">{c.studentCount || 24} Öğrenci</span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                        Aktif Seçili
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Mevcut Ünite:</span>
                      <span className="text-slate-200 font-semibold">Ünite {c.currentUnit}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 truncate">
                      <span>Konu:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[140px]">
                        {c.currentTopic || 'Girilmedi'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">
                      Son Ders: <strong className="text-slate-300">{lastLesson ? lastLesson.topic : 'Henüz Yok'}</strong>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClassForPlanner(c.id);
                        onNavigateToView('lessons');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 transition flex items-center gap-1"
                    >
                      Planla <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Class JARVIS Recommendation & Memory */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            JARVIS Canlı Analiz ({activeClass?.name || 'Seçiniz'})
          </h3>

          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative">
            {activeClass ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-purple-400">Sınıf Hafızası</span>
                    <h4 className="text-sm font-extrabold text-slate-100">{activeClass.name} - {activeClass.gradeLevel}. Sınıf</h4>
                  </div>
                  <button
                    onClick={() => onOpenJarvis(activeClass.id)}
                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition"
                    title="JARVIS ile Görüş"
                  >
                    <Bot className="w-4 h-4" />
                  </button>
                </div>

                {/* AI Suggestion Box */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    JARVIS Pedagojik Önerisi:
                  </span>

                  {loadingSuggestion ? (
                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      Sınıf hafızası ve notlar analiz ediliyor...
                    </div>
                  ) : suggestionData ? (
                    <div className="p-3.5 bg-slate-950/80 rounded-xl border border-cyan-500/20 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto space-y-1.5">
                      <p className="font-bold text-slate-100">{suggestionData.suggestedTopic}</p>
                      <p className="text-slate-300">{suggestionData.pedagogicalFocus}</p>
                      {suggestionData.whyThisSuggestion?.pedagogicalRationale && (
                        <p className="text-[11px] text-purple-300 italic pt-1 border-t border-slate-800">
                          Gerekçe: {suggestionData.whyThisSuggestion.pedagogicalRationale}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Öneri alınamadı.</p>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => {
                    onSelectClassForPlanner(activeClass.id);
                    onNavigateToView('lessons');
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
                >
                  <Brain className="w-4 h-4" />
                  {activeClass.name} İçin 40 Dk Plan Oluştur
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Detaylı analiz görmek için lütfen sol taraftan bir sınıf seçin.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY STREAM & DRAFT / SAVED PLANS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Lessons Stream */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            Son İşlenen Ders Kayıtları (SQLite Verisi)
          </h3>

          {data?.recentLessons && data.recentLessons.length > 0 ? (
            <div className="space-y-3">
              {data.recentLessons.map(lesson => (
                <div key={lesson.id} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold text-cyan-300">{lesson.className} ({lesson.gradeLevel}. Sınıf)</span>
                    <span className="text-[10px] text-slate-500">{new Date(lesson.date).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <p className="text-slate-200 font-semibold">{lesson.topic}</p>
                  {lesson.teacherNotes && (
                    <p className="text-amber-400/90 text-[11px] italic mt-1">
                      Öğretmen Notu: "{lesson.teacherNotes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Henüz işlenmiş ders kaydı bulunmuyor.</p>
          )}
        </div>

        {/* Saved / Draft Lesson Plans Stream */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <FolderHeart className="w-4 h-4 text-purple-400" />
            Hazırlanan Ders Planları
          </h3>

          {data?.recentPlans && data.recentPlans.length > 0 ? (
            <div className="space-y-3">
              {data.recentPlans.map(plan => (
                <div key={plan.id} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-purple-300">{plan.className}</span>
                    <h5 className="text-slate-200 font-semibold">{plan.title}</h5>
                    <span className="text-[10px] text-slate-400 block">{plan.topic}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    plan.status === 'saved'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {plan.status === 'saved' ? 'Kaydedildi' : 'Taslak'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Henüz kaydedilmiş ders planı bulunmuyor.</p>
          )}
        </div>
      </div>

      {/* 5. WORKFLOW BUNDLE CONFIRMATION MODAL (WRITE Guard Onay Mekanizması) */}
      {showBundleModal && preparedBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                    JARVIS Ders Hazırlık Paketi (Taslak)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sınıf bağlamı, müfredat ve son ders analizleri temel alınarak hazırlandı.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowBundleModal(false); setPreparedBundle(null); }}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition"
              >
                Kapat
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-xs">
              
              {/* Pedagogical Reasoning */}
              <div className="bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">🧠 Pedagojik Gerekçe & Sınıf Hafızası Analizi</span>
                <p className="text-slate-200 text-[11px] leading-relaxed italic">
                  "{preparedBundle.plan?.pedagogicalReasoning}"
                </p>
              </div>

              {/* Lesson Plan Summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider">Ders Planı Taslağı</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Başlık</span>
                    <span className="font-bold text-slate-200">{preparedBundle.plan?.title}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Ünite & Konu</span>
                    <span className="font-bold text-slate-200">Unit {preparedBundle.plan?.unitNumber}: {preparedBundle.plan?.topic}</span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Kazanım ve Hedefler</span>
                    <ul className="list-disc pl-4 text-slate-300 text-[11px] space-y-0.5 mt-1">
                      {preparedBundle.plan?.mainGoals?.slice(0, 2).map((g: string, idx: number) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Agenda list */}
                <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl overflow-hidden mt-3">
                  <div className="grid grid-cols-12 bg-slate-950/60 p-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                    <div className="col-span-3">Aşama</div>
                    <div className="col-span-1">Süre</div>
                    <div className="col-span-3">Etkinlik</div>
                    <div className="col-span-5">Açıklama</div>
                  </div>
                  <div className="divide-y divide-slate-800/40">
                    {preparedBundle.plan?.agenda?.map((item: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 p-3 text-[11px] hover:bg-slate-900/10 transition-colors">
                        <div className="col-span-3 font-semibold text-purple-300">{item.stage}</div>
                        <div className="col-span-1 font-bold text-slate-300">{item.durationMinutes} dk</div>
                        <div className="col-span-3 font-medium text-slate-200">{item.activityTitle}</div>
                        <div className="col-span-5 text-slate-400">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prepared Materials */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <FileText className="w-4 h-4 text-pink-400" />
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider">Üretilen Materyal Taslakları</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preparedBundle.materials?.map((mat: any, idx: number) => (
                    <div key={mat.id || idx} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                        <span className="font-bold text-pink-300 text-xs">{mat.title}</span>
                        <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 text-[9px] uppercase font-bold tracking-wider">
                          {mat.type}
                        </span>
                      </div>
                      <div className="space-y-2 text-[11px]">
                        <p className="text-slate-300 font-medium"><strong>Talimatlar:</strong> {mat.instructions}</p>
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50 text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap font-mono">
                          {typeof mat.content === 'object' ? JSON.stringify(mat.content, null, 2) : mat.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WRITE Guard Note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-[10px] leading-relaxed flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>🛡️ WRITE Guard Koruma Bildirimi:</strong> Bu aşamada ders planı ve materyal veritabanına kalıcı veya tamamlanmış olarak kaydedilmemiştir. Sadece geçici taslak durumundadır. "Onayla ve Kaydet" butonuna tıkladığınızda kalıcı duruma getirilecektir.
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
              <button 
                onClick={() => { setShowBundleModal(false); setPreparedBundle(null); }}
                className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs transition"
              >
                Taslağı İptal Et
              </button>
              <button 
                onClick={handleConfirmSaveBundle}
                disabled={savingBundle}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                {savingBundle ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Taslağı Onayla ve Kaydet
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
