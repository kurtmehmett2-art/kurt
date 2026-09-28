import React from 'react';
import { LessonPlan } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Award,
  Clock,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Users,
  Target,
  FileText,
  Copy,
  Printer,
  ChevronRight,
  HeartHandshake,
  Languages,
  GraduationCap,
  Compass,
  Layers,
  Lightbulb,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface LessonPlanViewProps {
  plan: LessonPlan;
  unitName: string;
  grade: string;
  onCopy: () => void;
  onPrint: (lang?: 'tr' | 'en' | 'bilingual') => void;
}

export const LessonPlanView: React.FC<LessonPlanViewProps> = ({
  plan,
  unitName,
  grade,
  onCopy,
  onPrint,
}) => {
  const { outputLang, setOutputLang, t } = useLanguage();

  const isBilingual = outputLang === 'bilingual';
  const isEn = outputLang === 'en';

  const formatTitle = (trText: string, enText: string) => {
    if (isBilingual) return `${trText} / ${enText}`;
    if (isEn) return enText;
    return trText;
  };

  return (
    <div className="space-y-6 text-purple-100">
      {/* Action Bar & Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-4">
        <div className="flex items-center space-x-2">
          <span className="badge-sinif">
            {grade}. {formatTitle('Sınıf', 'Grade')}
          </span>
          <span className="badge-sure">
            {plan.sure || '40 min'}
          </span>
          <h3 className="font-extrabold text-white text-sm sm:text-base">
            {plan.title || `${unitName} ${formatTitle('Ders Planı', 'Lesson Plan')}`}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Mode Toggle */}
          <div className="flex items-center bg-[#1A1932] p-1 rounded-xl border border-[#2D2B55] text-xs">
            <button
              onClick={() => setOutputLang('tr')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                outputLang === 'tr' ? 'bg-[#6C63FF] text-white' : 'text-[#A7A9BE] hover:text-white'
              }`}
              title="Türkçe Görünüm"
            >
              🇹🇷 TR
            </button>
            <button
              onClick={() => setOutputLang('en')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                outputLang === 'en' ? 'bg-[#6C63FF] text-white' : 'text-[#A7A9BE] hover:text-white'
              }`}
              title="English View"
            >
              🇬🇧 EN
            </button>
            <button
              onClick={() => setOutputLang('bilingual')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                outputLang === 'bilingual' ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white' : 'text-[#A7A9BE] hover:text-white'
              }`}
              title="İki Dilli Görünüm (Bilingual)"
            >
              🇹🇷🇬🇧 TR+EN
            </button>
          </div>

          <button
            onClick={onCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1932] hover:bg-[#2D2B55] text-purple-200 hover:text-white rounded-xl border border-[#2D2B55] text-xs font-bold transition-all btn-premium"
            title="Kopyala"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('copyBtn', 'Kopyala')}</span>
          </button>

          <button
            onClick={() => onPrint(outputLang)}
            className="flex items-center space-x-1.5 px-3 py-1.5 btn-gradient-premium btn-shimmer text-xs font-bold shadow-[0_0_15px_rgba(108,99,255,0.3)]"
            title="Yazdır"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {isBilingual ? '🇹🇷🇬🇧 Yazdır' : isEn ? '🇬🇧 Print' : '🇹🇷 Yazdır'}
            </span>
          </button>
        </div>
      </div>

      {/* Overview Cards: MEB Outcomes & Maarif Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MEB Learning Outcomes */}
        <div className="glass-card p-4 sm:p-5 space-y-2">
          <div className="flex items-center space-x-2 text-[#FF6584] font-black text-xs sm:text-sm uppercase tracking-wide mb-1">
            <Award className="w-4 h-4 text-[#FF6584]" />
            <span>{formatTitle('MEB Kazanım Kodları', 'MEB Learning Outcomes')}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {plan.mebKazanımKodları?.map((kod, idx) => (
              <span
                key={idx}
                className="badge-kazanim shadow-[0_0_10px_rgba(108,99,255,0.15)]"
              >
                {kod}
              </span>
            ))}
          </div>
        </div>

        {/* Türkiye Yüzyılı Maarif Modeli Values & Virtues */}
        <div className="glass-card p-3 space-y-1.5" style={{ background: 'rgba(26, 25, 50, 0.5)' }}>
          <div className="flex items-center space-x-2 text-amber-300 font-black text-[10px] uppercase tracking-wide">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTitle('Maarif Modeli Erdem ve Değerleri', 'Maarif Model Virtues & Values')}</span>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {plan.maarifModeliDeğerler?.map((deger, idx) => (
              <span
                key={idx}
                className="badge-maarif flex items-center gap-1 shadow-xs text-[10px] py-0.5 px-1.5"
              >
                <Sparkles className="w-2.5 h-2.5 text-[#0F0E17]" />
                {deger}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Materials & Target Skills */}
      <div className="glass-card p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-black text-purple-300/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> {formatTitle('Hedef Beceriler', 'Targeted Skills')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {plan.beceriler?.map((b, i) => (
                <span key={i} className="bg-[#161524] text-purple-200 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-[#6C63FF]/30">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-purple-300/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#6C63FF]" /> {formatTitle('Gerekli Materyaller', 'Required Materials')}
            </h4>
            <ul className="text-xs text-purple-100 space-y-1">
              {plan.materyaller?.map((m, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* PEDAGOGICAL APPROACH & METHOD ENGINE (AŞAMA 24) */}
      <div className="glass-card p-5 space-y-4 border-l-4 border-l-[#6C63FF] bg-[#16152B]/80">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D2B55] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#6C63FF]/20 text-[#6C63FF] border border-[#6C63FF]/40">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                <span>{formatTitle('Öğretim Yöntemi ve Pedagojik Yaklaşım', 'Teaching Method & Pedagogical Approach')}</span>
              </h4>
              <p className="text-[11px] text-purple-300/80">
                {formatTitle('Kazanım, sınıf seviyesi ve beceri odaklı pedagojik gerekçelendirme', 'Outcome, grade level and skill-focused pedagogical rationale')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(plan.pedagogicalApproach?.selectedMethods || ['Communicative Language Teaching (CLT)', 'Eclectic Approach']).map((method, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#6C63FF]/20 to-[#FF6584]/20 border border-[#6C63FF]/40 text-purple-200 text-xs font-black">
                🎯 {method}
              </span>
            ))}
          </div>
        </div>

        {/* Justification / Gerekçe */}
        <div className="bg-[#1A1932] p-3.5 rounded-xl border border-[#2D2B55] space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>{formatTitle('Pedagojik Gerekçelendirme', 'Pedagogical Rationale')}</span>
          </div>
          <p className="text-xs text-purple-100 leading-relaxed">
            {plan.pedagogicalApproach?.justification || formatTitle(
              'Öğrencilerin sınıf seviyesine, A1-A2 dil becerilerine ve iletişimsel üretim ihtiyaçlarına yönelik olarak İletişimsel Dil Öğretimi (CLT) ve Eklektik Yaklaşım harmanlanmıştır.',
              'Communicative Language Teaching (CLT) and Eclectic Approach have been combined to suit student grade levels, A1-A2 skills, and communicative production requirements.'
            )}
          </p>
        </div>

        {/* Stage-by-Stage Method Breakdown */}
        {plan.pedagogicalApproach?.stageMethods && plan.pedagogicalApproach.stageMethods.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#FF6584]" />
              {formatTitle('Ders Aşamalarında Yöntem ve Teknik Dağılımı', 'Method & Technique Distribution across Lesson Stages')}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.pedagogicalApproach.stageMethods.map((sm, idx) => (
                <div key={idx} className="p-2.5 bg-[#121124] rounded-lg border border-[#252345] text-xs space-y-1">
                  <div className="flex items-center justify-between font-extrabold text-amber-300">
                    <span>{sm.stageName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6C63FF]/20 text-purple-200 border border-[#6C63FF]/30">{sm.targetSkill}</span>
                  </div>
                  <div className="text-purple-200 font-semibold">
                    <span className="text-purple-400 font-bold">{formatTitle('Yöntem', 'Method')}:</span> {sm.methodUsed}
                  </div>
                  <div className="text-purple-300 text-[11px]">
                    <span className="text-emerald-400 font-bold">{formatTitle('Teknik', 'Technique')}:</span> {sm.technique}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research Sources / Referanslar */}
        {plan.pedagogicalApproach?.researchSources && plan.pedagogicalApproach.researchSources.length > 0 && (
          <div className="pt-2 border-t border-[#2D2B55] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-purple-300/80 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {formatTitle('Pedagojik Kaynak ve Akademik Dayanak', 'Pedagogical & Academic References')}:
            </span>
            <div className="flex flex-wrap gap-2">
              {plan.pedagogicalApproach.researchSources.map((src, idx) => (
                <span key={idx} className="flex items-center gap-1 text-[11px] bg-[#121124] px-2 py-1 rounded-md border border-[#2D2B55] text-purple-200">
                  <span className="text-emerald-400 font-bold">[{src.sourceTier}]</span>
                  <span>{src.title}</span>
                  {src.url && <ExternalLink className="w-3 h-3 text-purple-400" />}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TIMELINE PHASES */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#FF6584]" />
          {formatTitle('Ders Akışı ve Aşamaları', 'Lesson Procedure & Phases')} ({plan.sure || '40 min'})
        </h3>

        {/* Phase 1: Warm-up */}
        <div className="step-card-warmup space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-black text-amber-300 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-black border border-amber-400/40">
                1
              </span>
              {formatTitle('Isınma ve Dikkat Çekme', 'Warm-up & Lead-in')}
            </span>
            <span className="badge-sure">
              {plan.isinismaWarmUp?.duration || '5-10 min'}
            </span>
          </div>

          <p className="text-sm sm:text-[15px] lg:text-base text-purple-100 font-medium leading-relaxed max-w-[75ch]">
            {plan.isinismaWarmUp?.content}
          </p>

          {plan.isinismaWarmUp?.teacherScript && (
            <div className="bg-[#1A1932] p-3 rounded-xl border border-amber-400/30 text-xs sm:text-sm text-amber-200 italic font-medium max-w-[75ch]">
              💬 <span className="font-bold">{formatTitle('Öğretmenin Söyleyebileceği İfade', 'Teacher Script')}:</span> "{plan.isinismaWarmUp.teacherScript}"
            </div>
          )}
        </div>

        {/* Phase 2: Main Activity */}
        <div className="step-card-main space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-black text-purple-200 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#6C63FF]/30 text-purple-200 flex items-center justify-center text-xs font-black border border-[#6C63FF]/50">
                2
              </span>
              {formatTitle('Ana Etkinlik ve Uygulama', 'Main Task & Practice')}
            </span>
            <span className="badge-sure">
              {plan.anaEtkinlikMainTask?.duration || '20-25 min'}
            </span>
          </div>

          <p className="text-sm sm:text-[15px] lg:text-base text-white font-semibold leading-relaxed max-w-[75ch]">
            {plan.anaEtkinlikMainTask?.content}
          </p>

          <div className="space-y-1.5 pl-2">
            <span className="text-xs sm:text-sm font-black text-[#A7A9BE] uppercase tracking-wider">
              {formatTitle('Adım Adım Uygulama', 'Step-by-Step Procedure')}:
            </span>
            {plan.anaEtkinlikMainTask?.stepByStep?.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-purple-100 font-medium max-w-[75ch]">
                <ChevronRight className="w-4 h-4 text-[#FF6584] flex-shrink-0 mt-0.5" />
                <span>{step}</span>
              </div>
            ))}
          </div>

          {plan.anaEtkinlikMainTask?.teacherScript && (
            <div className="bg-[#1A1932] p-3 rounded-xl border border-[#6C63FF]/30 text-xs sm:text-sm text-purple-200 italic font-medium max-w-[75ch]">
              🗣️ <span className="font-bold">{formatTitle('Sınıf İçi İngilizce Yönerge', 'Classroom Instruction')}:</span> "{plan.anaEtkinlikMainTask.teacherScript}"
            </div>
          )}
        </div>

        {/* Phase 3: Wrap-up */}
        <div className="step-card-wrapup space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-black text-emerald-300 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-xs font-black border border-emerald-400/40">
                3
              </span>
              {formatTitle('Değerlendirme ve Kapanış', 'Wrap-up & Assessment')}
            </span>
            <span className="badge-sure">
              {plan.kapanisWrapUp?.duration || '5 min'}
            </span>
          </div>

          <p className="text-sm sm:text-[15px] lg:text-base text-purple-100 font-medium leading-relaxed max-w-[75ch]">
            {plan.kapanisWrapUp?.content}
          </p>
        </div>
      </div>

      {/* Assessment & Differentiation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Assessment */}
        <div className="glass-card p-4 sm:p-5 space-y-2">
          <h4 className="font-black text-purple-200 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#FF6584]" /> {formatTitle('Değerlendirme Yöntemleri', 'Assessment Methods')}
          </h4>
          <ul className="text-xs text-purple-100 space-y-1">
            {plan.degerlendirmeAssessment?.methods?.map((m, i) => (
              <li key={i} className="flex items-center gap-1.5 font-medium">
                <span className="text-[#FF6584] font-bold">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
          {plan.degerlendirmeAssessment?.questions?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#6C63FF]/20">
              <span className="text-[11px] font-bold text-purple-300/70">
                {formatTitle('Örnek Kontrol Soruları', 'Check Questions')}:
              </span>
              <ul className="text-xs text-purple-100 italic space-y-0.5 mt-1">
                {plan.degerlendirmeAssessment.questions.map((q, idx) => (
                  <li key={idx}>- "{q}"</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Differentiation (Farklılaştırma) */}
        <div className="glass-card p-4 sm:p-5 space-y-2">
          <h4 className="font-black text-purple-200 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#6C63FF]" /> {formatTitle('Kapsayıcı Eğitim & Farklılaştırma', 'Inclusive Education & Differentiation')}
          </h4>
          <div className="text-xs text-purple-100 space-y-2">
            <div>
              <span className="font-bold text-sky-300">
                🧩 {formatTitle('Desteğe İhtiyacı Olan Öğrenciler (BEP)', 'Support Students (IEP)')}:
              </span>
              <p className="mt-0.5 text-purple-200/80">{plan.farklilastirmaDifferentiation?.support}</p>
            </div>
            <div>
              <span className="font-bold text-[#FF6584]">
                ⭐ {formatTitle('İleri Düzey Öğrenciler (Zenginleştirme)', 'Advanced Students (Extension)')}:
              </span>
              <p className="mt-0.5 text-purple-200/80">{plan.farklilastirmaDifferentiation?.extension}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
