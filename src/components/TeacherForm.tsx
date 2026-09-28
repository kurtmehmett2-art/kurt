import React, { useState, useEffect } from 'react';
import {
  GradeLevel,
  LanguageSkill,
  ActivityType,
  GenerateRequest,
} from '../types';
import { MEB_CURRICULUM, COMMON_SPECIAL_CONDITIONS } from '../data/mebCurriculum';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  Target,
  Clock,
  Sparkles,
  Users,
  Gamepad2,
  ListPlus,
  Sliders,
  PenTool,
  Volume2,
  MessageSquare,
  Globe,
  Layers,
  Languages
} from 'lucide-react';

interface TeacherFormProps {
  onSubmit: (request: GenerateRequest) => void;
  isLoading: boolean;
  externalGrade?: GradeLevel;
  externalUnitIndex?: number;
  onExternalLoadHandled?: () => void;
}

export const TeacherForm: React.FC<TeacherFormProps> = ({
  onSubmit,
  isLoading,
  externalGrade,
  externalUnitIndex,
  onExternalLoadHandled,
}) => {
  const { outputLang, setOutputLang } = useLanguage();
  const [grade, setGrade] = useState<GradeLevel>('5');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const [customUnitName, setCustomUnitName] = useState<string>('');
  const [isCustomUnit, setIsCustomUnit] = useState<boolean>(false);

  const [skill, setSkill] = useState<LanguageSkill>('Bütünleşik (Integrated - 4 Beceriler)');
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number>(-1);
  const [activityType, setActivityType] = useState<ActivityType>('Oyun');
  const [durationMinutes, setDurationMinutes] = useState<number>(40);
  
  const [extraVocabulary, setExtraVocabulary] = useState<string>('');
  const [specialConditions, setSpecialConditions] = useState<string[]>(['⚡ Akıllı Tahta Uyumlu']);
  const [customConditionText, setCustomConditionText] = useState<string>('');
  const [pedagogicalMethod, setPedagogicalMethod] = useState<string>('Auto');

  // Listen for external preset trigger (from ready plan buttons)
  useEffect(() => {
    if (externalGrade) {
      setGrade(externalGrade);
    }
    if (typeof externalUnitIndex === 'number' && externalUnitIndex >= 0) {
      setSelectedUnitIndex(externalUnitIndex);
      setIsCustomUnit(false);
      const targetGrade = externalGrade || grade;
      const unit = MEB_CURRICULUM[targetGrade]?.units[externalUnitIndex];
      if (unit) {
        setExtraVocabulary(unit.sampleVocabulary.join(', '));
      }
    }
    if (externalGrade && typeof externalUnitIndex === 'number' && onExternalLoadHandled) {
      onExternalLoadHandled();
    }
  }, [externalGrade, externalUnitIndex]);

  // Update selected unit when grade changes
  useEffect(() => {
    // If we are currently handling an external preset, do not force reset to 0
    if (externalGrade) return;

    setSelectedUnitIndex(0);
    setSelectedOutcomeIndex(-1);
    const firstUnit = MEB_CURRICULUM[grade]?.units[0];
    if (firstUnit) {
      setExtraVocabulary(firstUnit.sampleVocabulary.join(', '));
    }
  }, [grade]);

  // When unit index changes, load sample vocabulary suggestion
  const handleUnitChange = (index: number) => {
    setSelectedUnitIndex(index);
    setSelectedOutcomeIndex(-1);
    if (index >= 0) {
      setIsCustomUnit(false);
      const unit = MEB_CURRICULUM[grade]?.units[index];
      if (unit) {
        setExtraVocabulary(unit.sampleVocabulary.join(', '));
      }
    } else {
      setIsCustomUnit(true);
      setExtraVocabulary('');
    }
  };

  // When skill changes, reset outcome override so it auto-matches the new skill
  const handleSkillChange = (newSkill: LanguageSkill) => {
    setSkill(newSkill);
    setSelectedOutcomeIndex(-1);
  };

  // Helper to find the matching outcome index for a skill
  const getAutoOutcomeIndex = (outcomes: string[] | undefined, targetSkill: LanguageSkill): number => {
    if (!outcomes || outcomes.length === 0) return 0;

    let sub = '';
    if (targetSkill.includes('Kelime') || targetSkill.includes('Vocabulary')) {
      sub = '.V';
    } else if (targetSkill.includes('Okuma') || targetSkill.includes('Reading')) {
      sub = '.R';
    } else if (targetSkill.includes('Konuşma') || targetSkill.includes('Speaking')) {
      sub = '.S';
    } else if (targetSkill.includes('Dinleme') || targetSkill.includes('Listening')) {
      sub = '.L';
    } else if (targetSkill.includes('Yazma') || targetSkill.includes('Writing')) {
      sub = '.W';
    }

    if (sub) {
      const idx = outcomes.findIndex((o) => o.includes(sub));
      if (idx !== -1) return idx;
    }

    return 0;
  };

  const handleToggleCondition = (condition: string) => {
    setSpecialConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currUnits = MEB_CURRICULUM[grade]?.units || [];
    const activeUnit = currUnits[selectedUnitIndex];

    const unitName = isCustomUnit ? customUnitName.trim() : (activeUnit?.titleEn || 'General English');
    const unitNumber = isCustomUnit ? 1 : (activeUnit?.unitNumber || 1);

    const activeOutcomeIdx = selectedOutcomeIndex >= 0
      ? selectedOutcomeIndex
      : getAutoOutcomeIndex(activeUnit?.outcomes, skill);

    const learningOutcomeCode = !isCustomUnit && activeUnit?.outcomes?.[activeOutcomeIdx]
      ? activeUnit.outcomes[activeOutcomeIdx]
      : undefined;

    const allConditions = [...specialConditions];
    if (pedagogicalMethod !== 'Auto') {
      allConditions.push(`Pedagojik Yöntem Tercihi: ${pedagogicalMethod}`);
    }
    if (customConditionText.trim()) {
      allConditions.push(customConditionText.trim());
    }

    const req: GenerateRequest = {
      grade,
      unitNumber,
      unitName,
      skill,
      activityType,
      durationMinutes,
      extraVocabulary: extraVocabulary.trim() || undefined,
      specialConditions: allConditions.length > 0 ? allConditions.join('; ') : undefined,
      learningOutcomeCode,
      learningOutcomes: !isCustomUnit && activeUnit?.outcomes ? activeUnit.outcomes : undefined,
    };

    onSubmit(req);
  };

  const currentGradeUnits = MEB_CURRICULUM[grade]?.units || [];
  const currentActiveUnit = currentGradeUnits[selectedUnitIndex];

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card p-5 sm:p-7 space-y-6 relative text-white animate-fade-in-up-form"
    >
      <div className="flex items-center justify-between border-b border-[#6C63FF]/20 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-[#6C63FF]/20 text-[#FF6584] border border-[#6C63FF]/30">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent">
              Ders Parametrelerini Seçin
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/70">
              Sınıfınıza özel MEB müfredat uyumlu içerik hazırlayın.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-[#6C63FF]/20 text-purple-200 rounded-full border border-[#6C63FF]/40 shadow-[0_0_10px_rgba(108,99,255,0.2)]">
          Maarif Modeli
        </span>
      </div>

      {/* 1. Grade Level Selector */}
      <div>
        <label className="block form-label mb-2 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-[#FF6584]" />
          1. Sınıf Düzeyi
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(['5', '6', '7', '8'] as GradeLevel[]).map((g) => {
            const isSelected = grade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`py-3 px-4 rounded-2xl text-sm font-extrabold transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white border-transparent shadow-[0_0_20px_rgba(108,99,255,0.35)] scale-[1.02]'
                    : 'bg-[#1A1932] text-purple-100 border-[#2D2B55] hover:bg-[#201F3B] hover:border-[#6C63FF]/50'
                }`}
              >
                <span className="text-lg">{g}. Sınıf</span>
                <span className={`text-[10px] font-normal ${isSelected ? 'text-white/90' : 'text-[#A7A9BE]'}`}>
                  {g === '8' ? 'LGS Hazırlık' : 'A1-A2 Düzey'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Unit Selection */}
      <div>
        <label className="block form-label mb-2 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#6C63FF]" />
          2. Ünite Seçimi
        </label>

        <div className="space-y-3">
          <div className={isCustomUnit ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
            <div>
              <select
                value={isCustomUnit ? -1 : selectedUnitIndex}
                onChange={(e) => handleUnitChange(Number(e.target.value))}
                className="w-full glass-select text-sm font-bold text-white transition-all cursor-pointer"
              >
                {currentGradeUnits.map((u, idx) => (
                  <option key={u.unitNumber} value={idx} className="bg-[#1A1932] text-white">
                    Unit {u.unitNumber}: {u.titleEn} ({u.titleTr})
                  </option>
                ))}
                <option value={-1} className="bg-[#1A1932] text-white">✍️ Özel Ünite / Farklı Konu Gir...</option>
              </select>
            </div>

            {isCustomUnit && (
              <div>
                <input
                  type="text"
                  placeholder="Örn: My House / Animals / Transport"
                  value={customUnitName}
                  onChange={(e) => setCustomUnitName(e.target.value)}
                  className="w-full glass-input text-sm font-bold text-white placeholder-purple-300/40 transition-all"
                  required={isCustomUnit}
                />
              </div>
            )}
          </div>

          {/* Full MEB Outcomes Display Card */}
          {!isCustomUnit && currentActiveUnit && (
            <div className="bg-[#161524] p-4 sm:p-5 rounded-2xl border border-[#6C63FF]/30 space-y-3 shadow-lg animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D2B55] pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#FF6584]/20 text-[#FF6584] border border-[#FF6584]/30">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-[#FF6584] uppercase tracking-wider block">
                      {grade}. Sınıf - Unit {currentActiveUnit.unitNumber}: {currentActiveUnit.titleEn}
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      MEB Müfredat Kazanımları (Dil Becerisine Göre Otomatik Eşleşir)
                    </h4>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#6C63FF]/20 text-purple-200 font-extrabold border border-[#6C63FF]/40">
                  {currentActiveUnit.outcomes.length} Kazanım
                </span>
              </div>

              {/* Outcomes list */}
              <div className="space-y-2 pt-1">
                {currentActiveUnit.outcomes.map((outcomeText, oIdx) => {
                  const parts = outcomeText.split('. ');
                  const code = parts[0] ? parts[0] + '.' : 'MEB';
                  const description = parts.slice(1).join('. ') || outcomeText;

                  const isReading = code.includes('.R');
                  const isSpeaking = code.includes('.S');
                  const isListening = code.includes('.L');
                  const isWriting = code.includes('.W');
                  const isVocab = code.includes('.V');

                  let outcomeSkillName = 'Kelime & Yapı';
                  let outcomeBadgeStyle = 'bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/40';

                  if (isVocab) {
                    outcomeSkillName = 'Kelime (Vocabulary)';
                    outcomeBadgeStyle = 'bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/40';
                  } else if (isReading) {
                    outcomeSkillName = 'Okuma (Reading)';
                    outcomeBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  } else if (isSpeaking) {
                    outcomeSkillName = 'Konuşma (Speaking)';
                    outcomeBadgeStyle = 'bg-[#FF6584]/20 text-[#FF6584] border-[#FF6584]/40';
                  } else if (isListening) {
                    outcomeSkillName = 'Dinleme (Listening)';
                    outcomeBadgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                  } else if (isWriting) {
                    outcomeSkillName = 'Yazma (Writing)';
                    outcomeBadgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                  }

                  const activeAutoIdx = getAutoOutcomeIndex(currentActiveUnit.outcomes, skill);
                  const isSelectedOutcome = selectedOutcomeIndex >= 0 ? oIdx === selectedOutcomeIndex : oIdx === activeAutoIdx;

                  return (
                    <div
                      key={oIdx}
                      onClick={() => setSelectedOutcomeIndex(oIdx)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelectedOutcome
                          ? 'bg-[#1A1932] border-[#6C63FF] shadow-[0_0_16px_rgba(108,99,255,0.3)] ring-2 ring-[#6C63FF] scale-[1.01]'
                          : 'bg-[#1A1932]/50 border-[#2D2B55] opacity-75 hover:opacity-100 hover:border-[#6C63FF]/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${isSelectedOutcome ? 'bg-[#FF6584] text-white' : 'bg-[#6C63FF] text-white'}`}>
                            {code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${outcomeBadgeStyle}`}>
                            {outcomeSkillName}
                          </span>
                        </div>

                        {isSelectedOutcome && (
                          <span className="text-[10px] font-black text-white bg-gradient-to-r from-[#6C63FF] to-[#FF6584] px-2.5 py-0.5 rounded-full shadow border border-white/20 flex items-center gap-1">
                            {selectedOutcomeIndex === oIdx ? '🎯 Öğretmen Seçimi' : '✨ Otomatik Seçilen MEB Kazanımı'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed whitespace-normal break-words">
                        {description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Footer summary info */}
              <div className="pt-2 border-t border-[#2D2B55] flex flex-wrap items-center justify-between text-[11px] text-[#A7A9BE] gap-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
                  Seçilen Dil Becerisi: <strong className="text-white">{skill}</strong>
                </span>
                <span className="text-[#00D4FF] font-extrabold">
                  {selectedOutcomeIndex >= 0 ? 'Özel kazanım seçildi.' : 'Becerinize uygun MEB kazanımı otomatik aktif.'}
                </span>
              </div>
            </div>
          )}

          {isCustomUnit && (
            <div className="bg-[#161524] p-4 rounded-2xl border border-[#00D4FF]/30 space-y-1">
              <div className="flex items-center space-x-2 text-[#00D4FF]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Özel Konu / Ünite Kazanım Modu</span>
              </div>
              <p className="text-xs text-purple-200">
                Girmiş olduğunuz <strong>"{customUnitName || 'Özel Konu'}"</strong> için yapay zeka {grade}. sınıf düzeyine uygun MEB Türkiye Yüzyılı Maarif Modeli kazanım kodlarını ve detaylı açıklamalarını otomatik üretecektir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Language Skill & Activity Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language Skill */}
        <div>
          <label className="block form-label mb-2 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#FF6584]" />
            3. Dil Becerisi (Target Skill)
          </label>
          <div className="space-y-1.5">
            {[
              { label: 'Bütünleşik (Integrated - 4 Beceriler)', icon: Globe, color: 'text-[#6C63FF]' },
              { label: 'Dinleme (Listening)', icon: Volume2, color: 'text-purple-400' },
              { label: 'Kelime Bilgisi (Vocabulary)', icon: Sparkles, color: 'text-[#00D4FF]' },
              { label: 'Konuşma (Speaking)', icon: MessageSquare, color: 'text-[#FF6584]' },
              { label: 'Okuma (Reading)', icon: BookOpen, color: 'text-amber-400' },
              { label: 'Yazma (Writing)', icon: PenTool, color: 'text-sky-400' },
            ].map((s) => {
              const isSelected = skill === s.label;
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSkillChange(s.label as LanguageSkill)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#1A1932] text-white border-[#6C63FF] shadow-[0_0_15px_rgba(108,99,255,0.25)] ring-1 ring-[#6C63FF]'
                      : 'bg-[#1A1932]/60 text-[#A7A9BE] border-[#2D2B55] hover:bg-[#1A1932] hover:border-[#6C63FF]/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${s.color}`} />
                    {s.label}
                  </span>
                  {isSelected && <span className="text-[#FF6584] font-black">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Type */}
        <div>
          <label className="block form-label mb-2 flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-[#FF6584]" />
            4. Etkinlik Türü
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {[
              { type: 'Oyun & Yarışma', emoji: '🎲', label: 'Oyun & Yarışma' },
              { type: 'Ezberletme & Kelime Pratiği', emoji: '🧠', label: 'Ezberletme & Hafıza' },
              { type: 'Drama & Rol Yapma', emoji: '🎭', label: 'Drama & Rol' },
              { type: 'Şarkı & Ritimli Chant', emoji: '🎵', label: 'Şarkı & Chant' },
              { type: 'Flashcard & Kes-Eşleştir', emoji: '🃏', label: 'Flashcard & Kart' },
              { type: 'Tabu & Sessiz Sinema (Miming)', emoji: '🤫', label: 'Tabu & Sessiz Sinema' },
              { type: 'Tombala & Kelime Bingo', emoji: '🎯', label: 'Tombala & Bingo' },
              { type: 'Grup Çalışması', emoji: '👥', label: 'Grup Çalışması' },
              { type: 'Proje & Tasarım', emoji: '🛠️', label: 'Proje & Tasarım' },
              { type: 'Bireysel Çalışma', emoji: '📝', label: 'Bireysel Çalışma' },
            ].map((act) => {
              const isSelected = activityType === act.type;
              return (
                <button
                  key={act.type}
                  type="button"
                  onClick={() => setActivityType(act.type as ActivityType)}
                  className={`p-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all border flex flex-col items-center justify-center text-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#6C63FF]/40 to-[#FF6584]/40 text-white border-[#6C63FF] shadow-[0_0_15px_rgba(108,99,255,0.3)] ring-1 ring-[#FF6584]'
                      : 'bg-[#1A1932]/60 text-[#A7A9BE] border-[#2D2B55] hover:bg-[#1A1932]'
                  }`}
                >
                  <span className="text-base">{act.emoji}</span>
                  <span className="leading-tight text-[11px] sm:text-xs">{act.label}</span>
                </button>
              );
            })}
          </div>

          {/* Duration Slider */}
          <div className="mt-4 pt-4 border-t border-[#2D2B55]">
            <div className="flex justify-between items-center mb-1">
              <label className="form-label flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#6C63FF]" /> Süre (Dakika)
              </label>
              <span className="badge-sure">
                {durationMinutes} Dakika
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full accent-[#FF6584] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#A7A9BE] font-medium">
              <span>15 dk (Isınma)</span>
              <span>40 dk (1 Ders)</span>
              <span>80 dk (Blok Ders)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Target Words (Optional) */}
      <div>
        <label className="block form-label mb-1 flex items-center gap-1.5">
          <ListPlus className="w-4 h-4 text-sky-400" />
          5. Odaklanılacak Hedef Kelimeler (İsteğe Bağlı)
        </label>
        <p className="text-xs text-[#A7A9BE] mb-2">
          Ders planında ve 3D kelime kartlarında yer almasını istediğiniz kelimeleri virgülle ayırın.
        </p>
        <input
          type="text"
          value={extraVocabulary}
          onChange={(e) => setExtraVocabulary(e.target.value)}
          placeholder="Örn: library, bakery, pharmacy, next to, opposite"
          className="w-full glass-input text-sm font-semibold text-white placeholder-[#A7A9BE]/50 transition-all"
        />
      </div>

      {/* 6. Pedagogical Method Engine Selection */}
      <div className="bg-[#161524] p-4 rounded-2xl border border-[#6C63FF]/30 space-y-2">
        <label className="block text-xs font-black text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#6C63FF]" />
          Pedagojik Öğretim Yöntemi (Pedagogical Method Engine)
        </label>
        <p className="text-xs text-[#A7A9BE]">
          Ders planının pedagojik çatısını oluşturacak yabancı dil öğretim yöntemini seçin veya JARVIS&apos;e bırakın.
        </p>
        <select
          value={pedagogicalMethod}
          onChange={(e) => setPedagogicalMethod(e.target.value)}
          className="w-full glass-select text-xs sm:text-sm font-bold text-white transition-all cursor-pointer"
        >
          <option value="Auto" className="bg-[#1A1932] text-amber-300">🤖 Otomatik (JARVIS Kazanım & Sınıf Hafızasına Göre Seçsin)</option>
          <option value="Eclectic Method / Eklektik Yöntem" className="bg-[#1A1932] text-white">🎯 Eclectic Method (Çoklu Beceriler & Farklılaşmış Öğretim)</option>
          <option value="Communicative Language Teaching (CLT)" className="bg-[#1A1932] text-white">🗣️ Communicative Language Teaching - CLT (İletişimsel Konuşma & Görev)</option>
          <option value="Task-Based Language Teaching (TBLT)" className="bg-[#1A1932] text-white">📋 Task-Based Language Teaching - TBLT (Görev Odaklı Öğrenme)</option>
          <option value="Total Physical Response (TPR)" className="bg-[#1A1932] text-white">🕺 Total Physical Response - TPR (Fiziksel Tepki & Mimik/Hareket)</option>
          <option value="Audio-Lingual Method" className="bg-[#1A1932] text-white">🎧 Audio-Lingual Method (Dinleme, Telaffuz & Ritimli Tekrar)</option>
          <option value="Direct Method" className="bg-[#1A1932] text-white">💬 Direct Method (Anadilde Çevirisiz Doğrudan Hedef Dil)</option>
          <option value="Grammar-Translation Method" className="bg-[#1A1932] text-white">📖 Grammar-Translation Method (Dilbilgisi & Okuma Analizi)</option>
          <option value="Suggestopedia" className="bg-[#1A1932] text-white">🎵 Suggestopedia (Müzik & Özgüven Odaklı Rahat Öğrenme)</option>
        </select>
      </div>

      {/* 7. Special Class Conditions (Optional) */}
      <div>
        <label className="block form-label mb-2 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-[#FF6584]" />
          7. Sınıf Koşulları ve Özel İstekler (İsteğe Bağlı)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_SPECIAL_CONDITIONS.map((cond) => {
            const isSelected = specialConditions.includes(cond);
            return (
              <button
                key={cond}
                type="button"
                onClick={() => handleToggleCondition(cond)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
                  isSelected
                    ? 'bg-[#6C63FF]/30 text-white border-[#6C63FF] shadow-[0_0_10px_rgba(108,99,255,0.2)]'
                    : 'bg-[#1A1932]/60 text-[#A7A9BE] border-[#2D2B55] hover:bg-[#1A1932]'
                }`}
              >
                {cond} {isSelected ? '✓' : '+'}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={customConditionText}
          onChange={(e) => setCustomConditionText(e.target.value)}
          placeholder="Varsa başka özel isteğiniz (Örn: Görsel ağırlıklı olsun, yarışma grupları 4 kişilik olsun...)"
          className="w-full glass-input text-xs sm:text-sm font-medium text-white placeholder-[#A7A9BE]/50 transition-all"
        />
      </div>

      {/* Output Language Selection */}
      <div className="bg-[#161524] p-4 rounded-2xl border border-[#6C63FF]/30 space-y-2">
        <label className="block text-xs font-black text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-[#FF6584]" />
          Ders Paketi ve Materyal Dili (Output Language)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setOutputLang('tr')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              outputLang === 'tr'
                ? 'bg-[#6C63FF] text-white border-white/30 shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55] hover:text-white'
            }`}
          >
            <span>🇹🇷</span>
            <span>Türkçe</span>
          </button>

          <button
            type="button"
            onClick={() => setOutputLang('en')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              outputLang === 'en'
                ? 'bg-[#6C63FF] text-white border-white/30 shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55] hover:text-white'
            }`}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>

          <button
            type="button"
            onClick={() => setOutputLang('bilingual')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              outputLang === 'bilingual'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white border-white/30 shadow-[0_0_15px_rgba(108,99,255,0.4)]'
                : 'bg-[#1A1932] text-[#A7A9BE] border-[#2D2B55] hover:text-white'
            }`}
          >
            <span>🇹🇷🇬🇧</span>
            <span>Türkçe + English</span>
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full btn-gradient-premium btn-shimmer text-base sm:text-lg shadow-[0_0_30px_rgba(108,99,255,0.3)] flex items-center justify-center space-x-3 ${
            isLoading
              ? 'opacity-70 cursor-not-allowed border border-[#2D2B55]'
              : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <div className="premium-spinner flex-shrink-0"></div>
              <span>Ders Paketi Hazırlanıyor (MEB Maarif Modeli)...</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
              <span>Ders Paketi Oluştur (Saniyeler İçinde) 🚀</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
