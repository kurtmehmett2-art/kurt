import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Printer,
  ArrowLeft,
  Loader2,
  Target,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  FileText,
  Layers
} from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  currentUnit: number;
  currentTopic: string;
}

interface LessonRecord {
  id: string;
  classId: string;
  date: string;
  unitNumber: number;
  unitName: string;
  topic: string;
  skill?: string;
  activity?: string;
  durationMinutes?: number;
  coveredOutcomes?: string;
  teacherNotes?: string;
  createdAt?: string;
}

interface ClassAnalyticsViewProps {
  classInfo: ClassItem;
  onBack: () => void;
}

export const ClassAnalyticsView: React.FC<ClassAnalyticsViewProps> = ({ classInfo, onBack }) => {
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLessons();
  }, [classInfo.id]);

  const fetchLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classInfo.id}/lessons`);
      if (!res.ok) throw new Error('Ders geçmişi verisi alınamadı.');
      const data = await res.json();
      setLessons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Veri yükleme hatası.');
    } finally {
      setLoading(false);
    }
  };

  // Computations based strictly on SQLite data
  const totalLessons = lessons.length;

  // 1. Unit breakdown
  const unitStatsMap: { [unitNum: number]: { unitName: string; count: number } } = {};
  lessons.forEach((l) => {
    const num = l.unitNumber || 1;
    const name = l.unitName || `Ünite ${num}`;
    if (!unitStatsMap[num]) {
      unitStatsMap[num] = { unitName: name, count: 0 };
    }
    unitStatsMap[num].count += 1;
  });
  const unitStatsList = Object.keys(unitStatsMap)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((num) => ({
      unitNumber: num,
      unitName: unitStatsMap[num].unitName,
      count: unitStatsMap[num].count,
      percentage: totalLessons > 0 ? Math.round((unitStatsMap[num].count / totalLessons) * 100) : 0
    }));

  // 2. Outcomes breakdown
  const outcomesMap: { [outcome: string]: number } = {};
  lessons.forEach((l) => {
    if (l.coveredOutcomes) {
      let items: string[] = [];
      try {
        if (l.coveredOutcomes.startsWith('[')) {
          items = JSON.parse(l.coveredOutcomes);
        } else {
          items = l.coveredOutcomes.split(',').map((s) => s.trim());
        }
      } catch {
        items = l.coveredOutcomes.split(',').map((s) => s.trim());
      }
      items.forEach((item) => {
        if (item) {
          outcomesMap[item] = (outcomesMap[item] || 0) + 1;
        }
      });
    }
  });
  const outcomesList = Object.entries(outcomesMap)
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Struggles & teacher notes frequency
  const strugglesMap: { [keyword: string]: number } = {};
  lessons.forEach((l) => {
    const note = (l.teacherNotes || '').toLowerCase();
    const topic = (l.topic || '').toLowerCase();
    const combined = `${note} ${topic}`;

    if (combined.includes('kelime') || combined.includes('vocabulary')) {
      strugglesMap['Kelime Bilgisi (Vocabulary)'] = (strugglesMap['Kelime Bilgisi (Vocabulary)'] || 0) + 1;
    }
    if (combined.includes('dil bilgisi') || combined.includes('grammar') || combined.includes('kural')) {
      strugglesMap['Dil Bilgisi (Grammar)'] = (strugglesMap['Dil Bilgisi (Grammar)'] || 0) + 1;
    }
    if (combined.includes('dinleme') || combined.includes('listening')) {
      strugglesMap['Dinleme Becerisi (Listening)'] = (strugglesMap['Dinleme Becerisi (Listening)'] || 0) + 1;
    }
    if (combined.includes('konuşma') || combined.includes('speaking') || combined.includes('telaffuz')) {
      strugglesMap['Konuşma & Telaffuz (Speaking)'] = (strugglesMap['Konuşma & Telaffuz (Speaking)'] || 0) + 1;
    }
    if (combined.includes('okuma') || combined.includes('reading')) {
      strugglesMap['Okuma Anlama (Reading)'] = (strugglesMap['Okuma Anlama (Reading)'] || 0) + 1;
    }
    if (combined.includes('yazma') || combined.includes('writing')) {
      strugglesMap['Yazma Becerisi (Writing)'] = (strugglesMap['Yazma Becerisi (Writing)'] || 0) + 1;
    }
  });
  const strugglesList = Object.entries(strugglesMap)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);

  // 4. Data-grounded JARVIS Assessment
  const generateJarvisSummary = () => {
    if (totalLessons === 0) return null;

    const topStruggle = strugglesList.length > 0 ? strugglesList[0].keyword : null;
    const topUnit = unitStatsList.length > 0 ? unitStatsList[0] : null;

    return `${classInfo.name} (${classInfo.gradeLevel}. Sınıf) için veritabanında toplam ${totalLessons} ders kaydı analiz edilmiştir. Sınıfımız dönem boyunca ${unitStatsList.length} farklı ünite kapsayarak ilerlemiştir. ${topUnit ? `En yoğun işlenen ünite "${topUnit.unitName}" (${topUnit.count} ders) olmuştur.` : ''} ${topStruggle ? `Öğretmen ders notları incelendiğinde, öğrencilerin özellikle "${topStruggle}" alanında ek pekiştirmeye ihtiyaç duyduğu gözlemlenmiştir.` : 'Ders kayıtlarında genel katılım dengeli görünmektedir.'} Gelecek derslerde bu yönde 10-15 dakikalık tekrar etkinlikleri yapılması pedagojik açıdan önerilmektedir.`;
  };

  const jarvisSummary = generateJarvisSummary();

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* HEADER BAR (NO PRINT ON PRINTING) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1932] p-5 rounded-2xl border border-[#2D2B55] shadow-xl no-print">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#201F3B] hover:bg-[#2D2B55] text-white border border-[#2D2B55] transition"
            title="Sınıf Özetine Dön"
          >
            <ArrowLeft className="w-5 h-5 text-[#A7A9BE]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#6C63FF]/20 text-purple-300 border border-[#6C63FF]/30">
                {classInfo.gradeLevel}. Sınıf
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
                Dönemsel Gelişim Analizi — {classInfo.name}
              </h2>
            </div>
            <p className="text-xs text-[#A7A9BE] font-medium mt-0.5">
              Sınıf hafızasındaki tüm kayıtlı dersler, zorlanılan konular ve kazanım takibi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => window.print()}
            disabled={totalLessons === 0}
            className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5a52d6] disabled:opacity-50 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition duration-150"
          >
            <Printer className="w-4 h-4" />
            <span>Analizi Yazdır (A4 Rapor)</span>
          </button>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
          <p className="text-xs text-[#A7A9BE] font-bold">Sınıf verileri ve ders kayıtları analiz ediliyor...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl text-center text-rose-300 text-xs font-bold space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
          <p>{error}</p>
        </div>
      ) : totalLessons === 0 ? (
        /* SAFE EMPTY STATE */
        <div className="glass-card p-10 sm:p-16 text-center rounded-3xl border border-[#2D2B55]/60 max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/30 flex items-center justify-center mx-auto text-2xl shadow-glow">
            📊
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white">Bu analiz için henüz yeterli ders kaydı bulunmuyor.</h3>
            <p className="text-xs text-[#A7A9BE] leading-relaxed max-w-md mx-auto">
              {classInfo.name} sınıfında işlenen derslerin sonunda <strong>"Dersi İşledim & Kaydet"</strong> butonuna basarak ders notlarınızı onayladıkça, bu sınıfa ait dönemsel öğrenme ve zorlanma grafikleri otomatik olarak burada oluşturulacaktır.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-[#201F3B] hover:bg-[#2D2B55] text-white border border-[#2D2B55] rounded-xl text-xs font-bold transition"
          >
            Sınıf Özetine Dön ve Ders İşle
          </button>
        </div>
      ) : (
        /* ANALYTICS REPORT CONTENT (SCREEN + PRINT) */
        <div className="space-y-6 bg-slate-950 p-2 sm:p-4 rounded-3xl print:bg-white print:text-black print:p-0">
          {/* PRINT-ONLY OFFICIAL HEADER */}
          <div className="hidden print:block border-b-2 border-black pb-4 text-center space-y-1 mb-6">
            <h1 className="text-xl font-bold uppercase text-black">T.C. MİLLÎ EĞİTİM BAKANLIĞI</h1>
            <h2 className="text-lg font-extrabold uppercase text-black">
              DÖNEMSEL DERS VE GELİŞİM ANALİZ RAPORU — {classInfo.name} ({classInfo.gradeLevel}. SINIF)
            </h2>
            <div className="flex justify-between text-xs font-semibold pt-2 px-2 border-t border-gray-300 mt-2 text-black">
              <span><strong>Ders:</strong> İngilizce</span>
              <span><strong>Toplam Kayıtlı Ders:</strong> {totalLessons} Ders</span>
              <span><strong>Rapor Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')}</span>
            </div>
          </div>

          {/* 4 METRIC CARDS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#161524] p-4 rounded-2xl border border-[#2D2B55] space-y-1 print:bg-gray-50 print:border-gray-300 print:text-black">
              <div className="flex items-center justify-between text-[#A7A9BE] print:text-gray-600">
                <span className="text-[11px] font-bold uppercase">Toplam İşlenen Ders</span>
                <BookOpen className="w-4 h-4 text-[#6C63FF] print:text-black" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{totalLessons}</p>
              <p className="text-[10px] text-[#A7A9BE] print:text-gray-500 font-medium">Kayıtlı ders oturumu</p>
            </div>

            <div className="bg-[#161524] p-4 rounded-2xl border border-[#2D2B55] space-y-1 print:bg-gray-50 print:border-gray-300 print:text-black">
              <div className="flex items-center justify-between text-[#A7A9BE] print:text-gray-600">
                <span className="text-[11px] font-bold uppercase">Kapsanan Üniteler</span>
                <Layers className="w-4 h-4 text-[#FF6584] print:text-black" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{unitStatsList.length}</p>
              <p className="text-[10px] text-[#A7A9BE] print:text-gray-500 font-medium">Farklı MEB ünitesi</p>
            </div>

            <div className="bg-[#161524] p-4 rounded-2xl border border-[#2D2B55] space-y-1 print:bg-gray-50 print:border-gray-300 print:text-black">
              <div className="flex items-center justify-between text-[#A7A9BE] print:text-gray-600">
                <span className="text-[11px] font-bold uppercase">Kapsanan Kazanımlar</span>
                <Target className="w-4 h-4 text-emerald-400 print:text-black" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{outcomesList.length}</p>
              <p className="text-[10px] text-[#A7A9BE] print:text-gray-500 font-medium">MEB müfredat hedefi</p>
            </div>

            <div className="bg-[#161524] p-4 rounded-2xl border border-[#2D2B55] space-y-1 print:bg-gray-50 print:border-gray-300 print:text-black">
              <div className="flex items-center justify-between text-[#A7A9BE] print:text-gray-600">
                <span className="text-[11px] font-bold uppercase">Zorlanma Başlıkları</span>
                <AlertCircle className="w-4 h-4 text-amber-400 print:text-black" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{strugglesList.length}</p>
              <p className="text-[10px] text-[#A7A9BE] print:text-gray-500 font-medium">Öne çıkan hassasiyet</p>
            </div>
          </div>

          {/* JARVIS DATA-GROUNDED PEDAGOGICAL SUMMARY */}
          {jarvisSummary && (
            <div className="bg-gradient-to-r from-[#1A1932] via-[#201F3B] to-[#1A1932] border border-[#6C63FF]/30 p-5 rounded-2xl space-y-2 shadow-xl print:bg-white print:border-gray-400 print:shadow-none">
              <div className="flex items-center gap-2 text-xs font-black text-[#6C63FF] print:text-purple-900">
                <Sparkles className="w-4 h-4 text-[#6C63FF] print:text-purple-900" />
                <span>JARVIS PEDAGOJİK DÖNEM DEĞERLENDİRMESİ</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 print:text-gray-900 font-medium leading-relaxed italic">
                "{jarvisSummary}"
              </p>
            </div>
          )}

          {/* CHARTS / VISUAL DISTRIBUTION SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CHART 1: UNIT & TOPIC DISTRIBUTION (HORIZONAL BARS) */}
            <div className="bg-[#161524] p-5 rounded-2xl border border-[#2D2B55] space-y-4 print:bg-white print:border-gray-300 print:text-black">
              <h3 className="text-xs sm:text-sm font-extrabold text-white print:text-black flex items-center gap-2 border-b border-[#2D2B55] print:border-gray-300 pb-2">
                <BookOpen className="w-4 h-4 text-[#6C63FF] print:text-black" />
                İşlenen Ünite ve Konu Dağılımı
              </h3>

              <div className="space-y-3">
                {unitStatsList.map((unit) => (
                  <div key={unit.unitNumber} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-200 print:text-black truncate">
                        Ünite {unit.unitNumber}: {unit.unitName}
                      </span>
                      <span className="text-[#6C63FF] print:text-gray-700 font-black">
                        {unit.count} Ders (%{unit.percentage})
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-3 bg-[#1A1932] print:bg-gray-200 rounded-full overflow-hidden border border-[#2D2B55] print:border-gray-300">
                      <div
                        className="h-full bg-gradient-to-r from-[#6C63FF] to-[#8F88FF] print:bg-gray-800 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(unit.percentage, 8)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 2: STRUGGLES & DIFFICULTIES FREQUENCY */}
            <div className="bg-[#161524] p-5 rounded-2xl border border-[#2D2B55] space-y-4 print:bg-white print:border-gray-300 print:text-black">
              <h3 className="text-xs sm:text-sm font-extrabold text-white print:text-black flex items-center gap-2 border-b border-[#2D2B55] print:border-gray-300 pb-2">
                <AlertCircle className="w-4 h-4 text-amber-400 print:text-black" />
                Öğrenci Zorlanmaları ve Hassas Alanlar
              </h3>

              {strugglesList.length === 0 ? (
                <p className="text-xs text-[#A7A9BE] print:text-gray-500 italic py-4 text-center">
                  Ders kayıtlarında belirgin bir zorlanma notu tespiti yapılmadı.
                </p>
              ) : (
                <div className="space-y-3">
                  {strugglesList.map((st, i) => {
                    const percentage = Math.round((st.count / totalLessons) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-200 print:text-black truncate">{st.keyword}</span>
                          <span className="text-amber-400 print:text-gray-800 font-black">
                            {st.count} Derste Geçti
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[#1A1932] print:bg-gray-200 rounded-full overflow-hidden border border-[#2D2B55] print:border-gray-300">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 print:bg-gray-700 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 10)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COVERED MEB OUTCOMES BADGES LIST */}
          <div className="bg-[#161524] p-5 rounded-2xl border border-[#2D2B55] space-y-3 print:bg-white print:border-gray-300 print:text-black">
            <h3 className="text-xs sm:text-sm font-extrabold text-white print:text-black flex items-center gap-2 border-b border-[#2D2B55] print:border-gray-300 pb-2">
              <Target className="w-4 h-4 text-emerald-400 print:text-black" />
              İşlenen MEB Müfredat Kazanımları
            </h3>

            {outcomesList.length === 0 ? (
              <p className="text-xs text-[#A7A9BE] print:text-gray-500 italic py-2">Henüz kaydedilmiş kazanım bulunmuyor.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {outcomesList.map((out, idx) => (
                  <div
                    key={idx}
                    className="bg-emerald-500/10 print:bg-gray-100 border border-emerald-500/30 print:border-gray-400 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 print:text-black flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                    <span>{out.outcome}</span>
                    <span className="bg-emerald-500/20 print:bg-gray-300 text-emerald-200 print:text-black text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                      {out.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHRONOLOGICAL LESSON HISTORY LOG TABLE */}
          <div className="bg-[#161524] p-5 rounded-2xl border border-[#2D2B55] space-y-3 print:bg-white print:border-gray-300 print:text-black">
            <h3 className="text-xs sm:text-sm font-extrabold text-white print:text-black flex items-center gap-2 border-b border-[#2D2B55] print:border-gray-300 pb-2">
              <Calendar className="w-4 h-4 text-[#FF6584] print:text-black" />
              Dönem İçi Ders İlerleme Kayıtları
            </h3>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id || idx}
                  className="bg-[#1A1932] print:bg-gray-50 border border-[#2D2B55] print:border-gray-300 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-black text-white print:text-black">
                      <span className="text-[#6C63FF] print:text-black">
                        {new Date(lesson.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span>•</span>
                      <span>Ünite {lesson.unitNumber}: {lesson.topic}</span>
                    </div>
                    {lesson.teacherNotes && (
                      <p className="text-[11px] text-[#A7A9BE] print:text-gray-700 italic">
                        Not: {lesson.teacherNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#A7A9BE] print:text-gray-600 shrink-0">
                    <span className="bg-[#161524] print:bg-gray-200 px-2 py-0.5 rounded border border-[#2D2B55] print:border-gray-300">
                      Ünite {lesson.unitNumber}
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 print:text-black px-2 py-0.5 rounded border border-emerald-500/30">
                      Tamamlandı
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
