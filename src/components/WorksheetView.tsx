import React, { useState } from 'react';
import { ActivityGuide, Worksheet, PrintableMaterial } from '../types';
import {
  FileText,
  Printer,
  Copy,
  Eye,
  EyeOff,
  Gamepad2,
  CheckCircle,
  Scissors,
  Sparkles,
  Check
} from 'lucide-react';

interface WorksheetViewProps {
  activityGuide: ActivityGuide;
  worksheet: Worksheet;
  unitName: string;
  grade: string;
  onCopy: () => void;
  onPrint: () => void;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({
  activityGuide,
  worksheet,
  unitName,
  grade,
  onCopy,
  onPrint,
}) => {
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'worksheet' | 'activity' | 'materials'>('worksheet');
  const [copiedItemIndex, setCopiedItemIndex] = useState<string | null>(null);

  // Fallback if AI hasn't returned writtenMaterials for an existing older plan
  const effectiveWrittenMaterials: PrintableMaterial[] =
    activityGuide.writtenMaterials && activityGuide.writtenMaterials.length > 0
      ? activityGuide.writtenMaterials
      : [
          {
            title: `${activityGuide.title || unitName} - Rol & Görev Kartları (Role & Task Cards)`,
            materialType: "Rol ve İletişim Kartları",
            instructions: "Sınıfı çiftlere veya 4'erli gruplara ayırın. Her öğrenciye aşağıdaki kartları noktalı çizgilerden keserek dağıtın.",
            items: [
              {
                header: "Student A (Role 1)",
                content: `Ask your partner 3 questions about ${unitName}. Take notes on their answers.`,
                subtext: "Target Structures: Do you like...? / Can you...? / What is your favorite...?"
              },
              {
                header: "Student B (Role 2)",
                content: "Answer Student A's questions using complete sentences. Ask 2 questions in return.",
                subtext: "Target Structures: Yes, I do / I can... / My favorite is..."
              },
              {
                header: "Group Leader (Puanlayıcı)",
                content: "Etkinlik boyunca grubundaki arkadaşlarının sadece İngilizce konuşup konuşmadığını takip et. Her doğru cümle için +1 puan ver.",
                subtext: "Değerlendirme Kriteri: Akıcılık, Doğru Kelime Kullanımı, Özgüven"
              },
              {
                header: "Reporter (Sunucu)",
                content: "Listen to Student A and Student B carefully. Be ready to tell 2 interesting facts to the class.",
                subtext: "Presentation Format: 'In our group, Student A likes... and Student B can...'"
              }
            ]
          },
          {
            title: `${unitName} - Kes-Kullan Cümle & Kelime Şeritleri`,
            materialType: "Cümle ve Diyalog Şeritleri",
            instructions: "Aşağıdaki cümle şeritlerini noktalı çizgilerden kesin. Öğrencilerin diyalog oluşturması veya eşleştirmesi için kullanın.",
            items: [
              {
                header: "Strip 1 (Diyalog Başlangıcı)",
                content: "A: Hello! Excuse me, can you help me with this task?",
                subtext: "Kesim Çizgisi ✂️"
              },
              {
                header: "Strip 2 (Cevap Şeridi)",
                content: "B: Sure! I'd be happy to help. What do you need?",
                subtext: "Kesim Çizgisi ✂️"
              },
              {
                header: "Strip 3 (Hedef Cümle 1)",
                content: `In the ${unitName} unit, we learn how to express our preferences clearly.`,
                subtext: "Kesim Çizgisi ✂️"
              },
              {
                header: "Strip 4 (Hedef Cümle 2)",
                content: "I always practice English with my classmates every day.",
                subtext: "Kesim Çizgisi ✂️"
              }
            ]
          }
        ];

  const handleCopyMaterialText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemIndex(id);
    setTimeout(() => setCopiedItemIndex(null), 2000);
  };

  return (
    <div className="space-y-6 text-purple-100">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('worksheet')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 btn-premium ${
              activeSubTab === 'worksheet'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_15px_rgba(108,99,255,0.3)]'
                : 'text-[#A7A9BE] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Öğrenci Çalışma Kağıdı</span>
          </button>

          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 btn-premium ${
              activeSubTab === 'activity'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_15px_rgba(108,99,255,0.3)]'
                : 'text-[#A7A9BE] hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-amber-300" />
            <span>Sınıf Etkinlik Rehberi</span>
          </button>

          <button
            onClick={() => setActiveSubTab('materials')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 btn-premium relative ${
              activeSubTab === 'materials'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_15px_rgba(108,99,255,0.3)]'
                : 'text-[#A7A9BE] hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4 text-[#00D4FF]" />
            <span>Yazdırılabilir Etkinlik Materyalleri</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-[#FFD700] text-[#0F0E17] font-black rounded-full">
              Kes-Kullan
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {activeSubTab === 'worksheet' && (
            <button
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border btn-premium ${
                showAnswerKey
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-[#1A1932] text-purple-200 border-[#2D2B55] hover:bg-[#201F3B]'
              }`}
            >
              {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showAnswerKey ? 'Cevapları Gizle' : 'Cevap Anahtarı'}</span>
            </button>
          )}

          <button
            onClick={onPrint}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 btn-gradient-premium btn-shimmer text-xs font-bold shadow-[0_0_15px_rgba(108,99,255,0.3)]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Yazdır / PDF</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: WORKSHEET */}
      {activeSubTab === 'worksheet' && (
        <div id="printable-worksheet" className="glass-card p-6 sm:p-10 space-y-6 relative text-purple-100">
          {/* Header Block styled like an exam paper */}
          <div className="border border-[#6C63FF]/40 rounded-2xl p-4 bg-[#161524] space-y-3 shadow-inner">
            <div className="flex flex-wrap justify-between items-center border-b border-[#6C63FF]/20 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-black text-white text-base sm:text-lg uppercase tracking-wide">
                  T.C. MEB - {grade}. SINIF İNGİLİZCE ÇALIŞMA KAĞIDI
                </span>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 bg-[#6C63FF]/20 text-purple-200 rounded-full border border-[#6C63FF]/40">
                {worksheet.gradeAndUnit || `${grade}. Sınıf - ${unitName}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-purple-200 font-bold">
              <div className="border-b border-dashed border-[#6C63FF]/40 pb-1">
                Name & Surname: <span className="font-normal text-purple-300/50">................................................</span>
              </div>
              <div className="border-b border-dashed border-[#6C63FF]/40 pb-1">
                Class / Number: <span className="font-normal text-purple-300/50">........................</span>
              </div>
              <div className="border-b border-dashed border-[#6C63FF]/40 pb-1">
                Date: <span className="font-normal text-purple-300/50">.... / .... / 202...</span>
              </div>
            </div>
          </div>

          {/* Worksheet Title & Instructions */}
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent">
              {worksheet.title || `${unitName} Practice Worksheet`}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 italic">
              {worksheet.instructions || 'Read the instructions carefully and answer all questions.'}
            </p>
          </div>

          {/* Worksheet Sections */}
          <div className="space-y-6 pt-2">
            {worksheet.sections?.map((section, sIdx) => (
              <div key={sIdx} className="border border-[#6C63FF]/30 rounded-2xl p-4 sm:p-5 bg-[#161524] space-y-3">
                <div className="flex items-center space-x-2 bg-[#6C63FF]/20 border border-[#6C63FF]/40 px-3 py-1.5 rounded-xl w-fit">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white flex items-center justify-center font-black text-xs">
                    {String.fromCharCode(65 + sIdx)}
                  </span>
                  <h3 className="font-black text-white text-xs sm:text-sm uppercase">
                    {section.sectionTitle}
                  </h3>
                </div>

                <p className="text-xs text-purple-200/80 font-medium italic">
                  👉 {section.instructions}
                </p>

                {/* Question List */}
                <div className="space-y-3 pl-1 sm:pl-3">
                  {section.questions?.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="bg-[#1A1932] p-3.5 rounded-xl border border-[#6C63FF]/20 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white">
                          {qIdx + 1}. {q.prompt}
                        </span>
                        {showAnswerKey && (
                          <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/40 flex-shrink-0">
                            Cevap: {q.answer}
                          </span>
                        )}
                      </div>

                      {/* Options if multiple choice */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium text-purple-100">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="bg-[#161524] p-2 rounded-lg border border-[#6C63FF]/30 flex items-center space-x-1.5">
                              <span className="font-bold text-[#FF6584]">
                                {String.fromCharCode(65 + oIdx)})
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Answer Key Block if toggled */}
          {showAnswerKey && (
            <div className="mt-8 p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <h4 className="font-black text-emerald-300 text-sm uppercase flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Öğretmen Cevap Anahtarı (Teacher Answer Key)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {worksheet.answerKey?.map((ak, idx) => (
                  <div key={idx} className="bg-[#161524] p-3 rounded-xl border border-emerald-500/30 space-y-1">
                    <span className="font-bold text-white block">
                      Bölüm {String.fromCharCode(65 + idx)} - {ak.sectionTitle}:
                    </span>
                    <ol className="list-decimal list-inside text-purple-100 space-y-0.5">
                      {ak.answers?.map((ans, aIdx) => (
                        <li key={aIdx} className="font-semibold">
                          <span className="text-emerald-400">{ans}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CLASSROOM ACTIVITY GUIDE */}
      {activeSubTab === 'activity' && (
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#6C63FF]/20 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[#6C63FF]/20 text-[#FF6584] rounded-2xl border border-[#6C63FF]/30">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black text-[#FF6584] uppercase tracking-wide">
                  {activityGuide.gameType || 'Oyun & Etkinlik'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {activityGuide.title || `${unitName} Sınıf Etkinliği`}
                </h3>
              </div>
            </div>
          </div>

          {/* Objective */}
          <div className="bg-[#161524] p-5 rounded-2xl border border-[#6C63FF]/30 text-sm sm:text-[15px] lg:text-base text-purple-100 font-medium leading-relaxed max-w-[75ch]">
            <span className="font-black text-[#FF6584] block mb-1 text-xs sm:text-sm uppercase tracking-wide">🎯 Etkinlik Amacı:</span>
            {activityGuide.objective}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rules */}
            <div className="bg-[#161524] p-5 rounded-2xl border border-[#6C63FF]/30 space-y-2">
              <h4 className="font-black text-purple-200 text-xs sm:text-sm uppercase tracking-wider mb-1">
                📜 Etkinlik Kuralları
              </h4>
              <ul className="text-xs sm:text-sm text-purple-100 space-y-2">
                {activityGuide.rules?.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 font-medium leading-relaxed">
                    <span className="text-[#FF6584] font-bold mt-0.5">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Materials Needed & Setup */}
            <div className="bg-[#161524] p-5 rounded-2xl border border-[#6C63FF]/30 space-y-4">
              <div>
                <h4 className="font-black text-purple-200 text-xs sm:text-sm uppercase tracking-wider mb-2">
                  📦 Gerekli Materyaller
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activityGuide.materialsNeeded?.map((mat, idx) => (
                    <span key={idx} className="bg-[#1A1932] border border-[#6C63FF]/30 text-purple-100 font-bold text-xs px-2.5 py-1 rounded-lg">
                      {mat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-black text-purple-200 text-xs sm:text-sm uppercase tracking-wider mb-1.5">
                  🪑 Sınıf Düzeni
                </h4>
                <p className="text-xs sm:text-sm text-purple-100/90 font-medium leading-relaxed">
                  {activityGuide.classroomSetup}
                </p>
              </div>
            </div>
          </div>

          {/* Step by step instructions */}
          <div className="space-y-3">
            <h4 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
              🚀 Adım Adım Sınıf Uygulaması
            </h4>
            <div className="space-y-2.5">
              {activityGuide.stepByStepInstructions?.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-[#161524] rounded-xl border border-[#6C63FF]/20 text-xs sm:text-sm lg:text-base font-medium max-w-[75ch] leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-purple-100 mt-0.5">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher tips */}
          {activityGuide.teacherTips?.length > 0 && (
            <div className="bg-[#161524] p-4 rounded-2xl border border-[#6C63FF]/30 space-y-1">
              <span className="font-black text-[#FF6584] text-xs uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" /> Öğretmen İpuçları & Önerileri:
              </span>
              <ul className="text-xs text-purple-200 space-y-1 pl-2">
                {activityGuide.teacherTips.map((tip, idx) => (
                  <li key={idx}>💡 {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PRINTABLE ACTIVITY MATERIALS (CUT-OUT CARDS & HANDOUTS) */}
      {activeSubTab === 'materials' && (
        <div className="glass-card p-6 sm:p-8 space-y-8">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2D2B55] pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[#00D4FF]/20 text-[#00D4FF] rounded-2xl border border-[#00D4FF]/40">
                <Scissors className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black text-[#00D4FF] uppercase tracking-wider">
                  Yazdırılabilir Kes-Dağıt Etkinlik Kartları
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {activityGuide.title || unitName} - Yazılı Etkinlik Materyalleri
                </h3>
              </div>
            </div>

            <button
              onClick={onPrint}
              className="flex items-center space-x-2 px-4 py-2 btn-gradient-premium btn-shimmer text-xs sm:text-sm font-extrabold shadow-[0_0_15px_rgba(108,99,255,0.3)]"
            >
              <Printer className="w-4 h-4" />
              <span>Tüm Materyalleri Yazdır / PDF</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[#A7A9BE] font-medium leading-relaxed bg-[#161524] p-4 rounded-2xl border border-[#2D2B55]">
            ✂️ <strong>Öğretmen İpucu:</strong> Yapay zeka bu etkinlik için ihtiyaç duyulan tüm rol kartlarını, diyalog metinlerini ve cümle şeritlerini hazırladı. Yazıcıdan çıktı aldıktan sonra noktalı çizgilerden keserek öğrencilerinize doğrudan dağıtabilirsiniz.
          </p>

          {/* Render each material group */}
          <div className="space-y-8">
            {effectiveWrittenMaterials.map((mat, mIdx) => (
              <div key={mIdx} className="space-y-4 bg-[#161524] p-5 sm:p-6 rounded-2xl border border-[#6C63FF]/30">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D2B55] pb-3">
                  <div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#6C63FF]/20 text-purple-200 border border-[#6C63FF]/40 mr-2">
                      {mat.materialType || 'Kes-Kullan Kart'}
                    </span>
                    <h4 className="text-base font-black text-white inline-block mt-1">
                      {mat.title}
                    </h4>
                  </div>
                  <span className="text-xs text-[#00D4FF] font-bold">
                    {mat.items?.length || 0} Adet Yazdırılabilir Fiş
                  </span>
                </div>

                <p className="text-xs text-[#A7A9BE] italic">
                  💡 {mat.instructions}
                </p>

                {/* Grid of cut-out cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {mat.items?.map((item, iIdx) => {
                    const itemId = `mat_${mIdx}_${iIdx}`;
                    const isCopied = copiedItemIndex === itemId;

                    return (
                      <div
                        key={iIdx}
                        className="border-2 border-dashed border-[#6C63FF]/50 bg-[#1A1932] p-4 rounded-2xl relative space-y-2 hover:border-[#FF6584] transition-all shadow-md group"
                      >
                        {/* Scissors Cut Icon Tag */}
                        <div className="flex items-center justify-between border-b border-[#2D2B55] pb-2">
                          <span className="text-[11px] font-black text-[#FF6584] uppercase tracking-wide flex items-center gap-1">
                            ✂️ {item.header || `Kart #${iIdx + 1}`}
                          </span>

                          <button
                            onClick={() =>
                              handleCopyMaterialText(
                                `${item.header ? item.header + '\n' : ''}${item.content}${item.subtext ? '\n' + item.subtext : ''}`,
                                itemId
                              )
                            }
                            className="text-[11px] font-bold text-[#A7A9BE] hover:text-white flex items-center gap-1 bg-[#232146] px-2 py-1 rounded-lg border border-[#2D2B55]"
                            title="Kartı Kopyala"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Kopyalandı</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Kopyala</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Content text */}
                        <p className="text-xs sm:text-sm font-bold text-white pt-1 leading-relaxed">
                          {item.content}
                        </p>

                        {/* Subtext or targets */}
                        {item.subtext && (
                          <div className="text-[11px] text-[#A7A9BE] italic bg-[#161524] p-2 rounded-xl border border-[#2D2B55] mt-2">
                            {item.subtext}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
