import React from 'react';
import { GeneratedContent } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface PrintViewProps {
  content: GeneratedContent;
  printLang?: 'tr' | 'en' | 'bilingual';
}

export const PrintView: React.FC<PrintViewProps> = ({ content, printLang }) => {
  const { outputLang } = useLanguage();
  const { lessonPlan, activityGuide, worksheet, flashcards, request } = content;

  const mode = printLang || outputLang || 'tr';
  const isBilingual = mode === 'bilingual';
  const isEn = mode === 'en';

  const formatTitle = (trText: string, enText: string) => {
    if (isBilingual) return `${trText} / ${enText}`;
    if (isEn) return enText;
    return trText;
  };

  return (
    <div id="printable-content" className="hidden print:block text-black p-6 font-sans space-y-8 bg-white">
      {/* 1. LESSON PLAN PRINT */}
      <div className="space-y-4 page-break-after">
        <div className="border-b-2 border-black pb-2 text-center">
          <h1 className="text-xl font-bold uppercase">
            T.C. MİLLÎ EĞİTİM BAKANLIĞI - TÜRKİYE YÜZYILI MAARİF MODELİ
          </h1>
          <h2 className="text-lg font-bold">
            {request.grade}. {formatTitle('SINIF İNGİLİZCE DERS PLANI', 'GRADE ENGLISH LESSON PLAN')} - {request.unitName}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2">
          <div><strong>{formatTitle('Sınıf', 'Grade')}:</strong> {request.grade}. {formatTitle('Sınıf', 'Grade')}</div>
          <div><strong>{formatTitle('Ünite', 'Unit')}:</strong> {request.unitName}</div>
          <div><strong>{formatTitle('Kazanım Kodu', 'Outcomes Code')}:</strong> {lessonPlan.mebKazanımKodları?.join(', ')}</div>
          <div><strong>{formatTitle('Süre', 'Duration')}:</strong> {lessonPlan.sure}</div>
          <div><strong>{formatTitle('Beceri', 'Skill')}:</strong> {request.skill}</div>
          <div><strong>{formatTitle('Erdem & Değerler', 'Virtues & Values')}:</strong> {lessonPlan.maarifModeliDeğerler?.join(', ')}</div>
        </div>

        {/* PEDAGOGICAL METHOD & APPROACH PRINT BLOCK */}
        <div className="border border-black p-2 text-xs space-y-1">
          <div className="font-bold border-b border-black pb-0.5 uppercase">
            🎓 {formatTitle('ÖĞRETİM YÖNTEMİ VE PEDAGOJİK YAKLAŞIM', 'TEACHING METHOD & PEDAGOGICAL APPROACH')}
          </div>
          <div>
            <strong>{formatTitle('Seçilen Yöntemler', 'Selected Methods')}:</strong>{' '}
            {(lessonPlan.pedagogicalApproach?.selectedMethods || ['Communicative Language Teaching (CLT)', 'Eclectic Method']).join(', ')}
          </div>
          <div>
            <strong>{formatTitle('Pedagojik Gerekçe', 'Rationale')}:</strong>{' '}
            {lessonPlan.pedagogicalApproach?.justification || formatTitle(
              'A1-A2 seviyesi dil kazanımları ve iletişimsel üretim ihtiyaçlarına uygun olarak seçilmiştir.',
              'Selected in accordance with A1-A2 language outcomes and communicative production needs.'
            )}
          </div>
          {lessonPlan.pedagogicalApproach?.stageMethods && lessonPlan.pedagogicalApproach.stageMethods.length > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-300 grid grid-cols-2 gap-1 text-[11px]">
              {lessonPlan.pedagogicalApproach.stageMethods.map((sm, i) => (
                <div key={i}>
                  <strong>{sm.stageName}:</strong> {sm.methodUsed} ({sm.technique})
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <h3 className="font-bold border-b border-black text-sm">{formatTitle('DERS AŞAMALARI', 'LESSON PHASES')}</h3>
          
          <div>
            <strong>1. {formatTitle('Isınma (Warm-up)', 'Warm-up (Lead-in)')}:</strong>
            <p>{lessonPlan.isinismaWarmUp?.content}</p>
          </div>

          <div>
            <strong>2. {formatTitle('Ana Etkinlik (Main Task)', 'Main Task')}:</strong>
            <p>{lessonPlan.anaEtkinlikMainTask?.content}</p>
            <ul className="list-disc list-inside">
              {lessonPlan.anaEtkinlikMainTask?.stepByStep?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <strong>3. {formatTitle('Kapanış & Değerlendirme', 'Wrap-up & Assessment')}:</strong>
            <p>{lessonPlan.kapanisWrapUp?.content}</p>
          </div>
        </div>
      </div>

      {/* 2. WORKSHEET PRINT */}
      <div className="space-y-4 page-break-before">
        <div className="border-2 border-black p-3 text-center">
          <h2 className="text-lg font-bold uppercase">
            {request.grade}. {formatTitle('SINIF İNGİLİZCE ÇALIŞMA KAĞIDI (WORKSHEET)', 'GRADE ENGLISH WORKSHEET')}
          </h2>
          <div className="flex justify-between text-xs mt-2 font-bold">
            <span>Name Surname: .......................................</span>
            <span>Class/No: ..................</span>
            <span>Date: ..../..../202...</span>
          </div>
        </div>

        <h3 className="text-base font-bold text-center">{worksheet.title}</h3>

        <div className="space-y-4 text-xs">
          {worksheet.sections?.map((sec, idx) => (
            <div key={idx} className="border-b border-black pb-2 space-y-1">
              <h4 className="font-bold">{String.fromCharCode(65 + idx)}) {sec.sectionTitle}</h4>
              <p className="italic">{sec.instructions}</p>
              <div className="space-y-1 mt-1">
                {sec.questions?.map((q, qIdx) => (
                  <div key={qIdx}>
                    <span>{qIdx + 1}. {q.prompt}</span>
                    {q.options && (
                      <div className="flex gap-4 ml-4 my-1">
                        {q.options.map((opt, oIdx) => (
                          <span key={oIdx}>({String.fromCharCode(65 + oIdx)}) {opt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. FLASHCARDS PRINT CUTOUTS */}
      <div className="space-y-4 page-break-before">
        <h2 className="text-lg font-bold border-b border-black pb-1 text-center uppercase">
          {formatTitle('KELİME KARTLARI (FLASHCARDS)', 'VOCABULARY FLASHCARDS')}
        </h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          {flashcards.map((card, i) => (
            <div key={i} className="border-2 border-dashed border-black p-4 rounded text-center space-y-1">
              <span className="text-xl">{card.emojiOrIcon}</span>
              <div className="text-base font-bold">{card.word}</div>
              <div className="italic text-slate-700">{card.trTranslation}</div>
              <div className="text-[10px] text-slate-600">"{card.exampleSentence}"</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. ACTIVITY WRITTEN MATERIALS PRINT CUTOUTS */}
      {activityGuide?.writtenMaterials && activityGuide.writtenMaterials.length > 0 && (
        <div className="space-y-6 page-break-before">
          <div className="border-2 border-black p-3 text-center">
            <h2 className="text-lg font-bold uppercase">
              {request.grade}. {formatTitle('SINIF ETKİNLİK YAZILI MATERYALLERİ', 'GRADE ACTIVITY PRINTABLE MATERIALS')}
            </h2>
            <p className="text-xs font-semibold mt-1">
              {activityGuide.title || request.unitName} - {formatTitle('Sınıf Etkinliği İçin Kesilip Dağıtılmaya Hazır Materyaller', 'Ready-to-cut Classroom Activity Materials')}
            </p>
          </div>

          {activityGuide.writtenMaterials.map((mat, mIdx) => (
            <div key={mIdx} className="space-y-3">
              <div className="border-b border-black pb-1">
                <h3 className="text-sm font-bold uppercase">
                  {mIdx + 1}. {mat.title} ({mat.materialType})
                </h3>
                <p className="text-xs italic">{mat.instructions}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {mat.items?.map((item, iIdx) => (
                  <div key={iIdx} className="border-2 border-dashed border-black p-3 rounded space-y-1 relative">
                    <span className="text-[10px] font-bold text-slate-500 absolute top-1 right-2">✂️ {formatTitle('KESİNİZ', 'CUT HERE')}</span>
                    {item.header && <div className="font-bold text-xs uppercase border-b border-slate-300 pb-1">{item.header}</div>}
                    <div className="font-medium text-xs pt-1">{item.content}</div>
                    {item.subtext && <div className="text-[10px] italic text-slate-600">{item.subtext}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
