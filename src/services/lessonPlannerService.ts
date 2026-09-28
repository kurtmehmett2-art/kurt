import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';
import { searchEducationSources } from './webResearchService.js';

export interface ClassMemorySummary {
  classInfo: {
    id: string;
    name: string;
    gradeLevel: number;
    currentUnit: number;
    currentTopic?: string;
  };
  lastLessons: Array<{
    date: string;
    unitNumber?: number;
    unitName?: string;
    topic?: string;
    skill?: string;
    activity?: string;
    durationMinutes?: number;
    coveredOutcomes?: string;
    teacherNotes?: string;
  }>;
  recentTeacherNotes: string[];
  recentDifficulties: string[];
  completedOutcomes: string[];
  pendingOutcomes: string[];
  recentMaterials: Array<{
    id: string;
    title: string;
    type?: string;
  }>;
}

export interface LessonPlanAgendaItem {
  stage: string; // e.g. 'Warm-up', 'Vocabulary Review', 'Main Activity', 'Practice', 'Assessment / Exit Ticket'
  durationMinutes: number;
  activityTitle: string;
  description: string;
  outcomes?: string[];
  teacherGuideNotes?: string;
}

export interface StructuredLessonPlan {
  id: string;
  classId: string;
  className: string;
  gradeLevel: number;
  unitNumber: number;
  unitName: string;
  topic: string;
  durationMinutes: number;
  mainGoals: string[];
  pedagogicalReasoning: string; // "Neden bu plan?" gerekçesi
  agenda: LessonPlanAgendaItem[];
  suggestedMaterials: string[]; // e.g. ['Worksheet', 'Vocabulary Cards', 'Exit Ticket']
  recommendedHomeFun?: string;
  sourcesUsed?: Array<{ title: string; url: string; tier: number }>;
  createdAt?: string;
  status: 'draft' | 'saved' | 'completed';
}

export interface CreatePlanParams {
  classId: string;
  durationMinutes?: number;
  goals?: string;
  difficulty?: string;
  customTopic?: string;
  useWebResearch?: boolean;
}

/**
 * Get unified context for the next lesson plan based on class history and teacher notes
 */
export function getNextLessonContext(
  db: InstanceType<typeof Database>,
  classId: string
): ClassMemorySummary | null {
  try {
    const classInfo = db.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE id = ?').get(classId) as any;
    if (!classInfo) return null;

    // Last 3 lessons
    const lastLessons = db.prepare(`
      SELECT date, unitNumber, unitName, topic, skill, activity, durationMinutes, coveredOutcomes, teacherNotes 
      FROM LessonHistory 
      WHERE classId = ? 
      ORDER BY date DESC 
      LIMIT 3
    `).all(classId) as any[];

    // Teacher notes & difficulties
    const recentTeacherNotes: string[] = [];
    const recentDifficulties: string[] = [];

    for (const l of lastLessons) {
      if (l.teacherNotes && l.teacherNotes.trim()) {
        recentTeacherNotes.push(l.teacherNotes.trim());
        const lower = l.teacherNotes.toLowerCase();
        if (
          lower.includes('zorland') ||
          lower.includes('eksik') ||
          lower.includes('tekrar') ||
          lower.includes('anlamad') ||
          lower.includes('problem')
        ) {
          recentDifficulties.push(l.teacherNotes.trim());
        }
      }
    }

    // Class progress outcomes
    const completedOutcomes = (db.prepare(`
      SELECT outcomeCode FROM ClassProgress WHERE classId = ? AND status = 'completed'
    `).all(classId) as any[]).map(x => x.outcomeCode);

    const pendingOutcomes = (db.prepare(`
      SELECT outcomeCode FROM ClassProgress WHERE classId = ? AND status = 'pending'
    `).all(classId) as any[]).map(x => x.outcomeCode);

    // Recent materials
    const recentMaterials = db.prepare(`
      SELECT id, title, type FROM GeneratedMaterial WHERE classId = ? ORDER BY createdAt DESC LIMIT 5
    `).all(classId) as any[];

    return {
      classInfo,
      lastLessons,
      recentTeacherNotes,
      recentDifficulties,
      completedOutcomes,
      pendingOutcomes,
      recentMaterials
    };
  } catch (err) {
    console.error('Error in getNextLessonContext:', err);
    return null;
  }
}

export interface ProactiveSuggestion {
  classId: string;
  className: string;
  gradeLevel: number;
  isPriority: boolean;
  priorityTag: string; // e.g. "Öncelikli - Kelime Zorlanması", "Standart İlerleme", "Yeni Ünite"
  suggestedUnit: number;
  suggestedTopic: string;
  pedagogicalFocus: string;
  criticalTeacherNote?: string;
  recommendedMaterial: string;
  recommendedDuration: number;
  // Şeffaflık: "Bu öneriyi neden yaptım?"
  whyThisSuggestion: {
    lastLessonFact: string;
    teacherNoteFact: string;
    coverageFact: string;
    pedagogicalRationale: string;
  };
}

/**
 * Generate quick pedagogical proactive suggestion for next lesson with ground truth facts
 */
export async function suggestNextLesson(
  ai: GoogleGenAI,
  db: InstanceType<typeof Database>,
  classId: string
): Promise<ProactiveSuggestion> {
  const context = getNextLessonContext(db, classId);
  if (!context) {
    throw new Error('Sınıf bulunamadı.');
  }

  const hasHistory = context.lastLessons && context.lastLessons.length > 0;
  const lastLesson = hasHistory ? context.lastLessons[0] : null;
  const hasNotes = context.recentTeacherNotes && context.recentTeacherNotes.length > 0;
  const hasDifficulties = context.recentDifficulties && context.recentDifficulties.length > 0;

  // Handle case with NO lesson history cleanly (Zero Hallucination)
  if (!hasHistory && !hasNotes) {
    return {
      classId,
      className: context.classInfo.name,
      gradeLevel: context.classInfo.gradeLevel,
      isPriority: false,
      priorityTag: 'Yeni Ünite Başlangıcı',
      suggestedUnit: context.classInfo.currentUnit || 1,
      suggestedTopic: context.classInfo.currentTopic || `Ünite ${context.classInfo.currentUnit || 1} Giriş`,
      pedagogicalFocus: 'Kavramsal ısınma, temel kelimelerin görsellerle tanıtımı ve heveslendirici etkileşim.',
      criticalTeacherNote: 'Henüz bu sınıfa ait kaydedilmiş ders geçmişi veya öğretmen notu bulunmuyor.',
      recommendedMaterial: 'Görsel Giriş Flashcardları & Çalışma Kağıdı',
      recommendedDuration: 40,
      whyThisSuggestion: {
        lastLessonFact: 'Henüz bu sınıf için işlenmiş ders kaydı yapılmamış.',
        teacherNoteFact: 'Kayıtlı öğretmen notu veya zorlanma bildirimi bulunmuyor.',
        coverageFact: 'Müfredat ünite başlangıcı seviyesinde.',
        pedagogicalRationale: 'Veritabanında ders geçmişi olmadığı için müfredat sırasına uygun 40 dakikalık ısınma ve kelime tanıtımı akışı oluşturuldu.'
      }
    };
  }

  const prompt = `Sen MEB Türkiye Yüzyılı Maarif Modeli uyumlu akıllı öğretmen asistanı JARVIS'sin.
GÖREVİN: Aşağıdaki GERÇEK veritabanı verilerini kullanarak ${context.classInfo.name} (${context.classInfo.gradeLevel}. Sınıf) için proaktif bir ders önerisi ve ŞEFFAFLIK GEREKÇESİ ("Bu öneriyi neden yaptım?") üretmek.

GERÇEK VERİTABANI VERİLERİ (BUNLARA KESİNLİKLE SADIK KAL, BİLGİ UYDURMA):
- Sınıf: ${context.classInfo.name} (${context.classInfo.gradeLevel}. Sınıf)
- Mevcut Ünite: ${context.classInfo.currentUnit} - ${context.classInfo.currentTopic || 'Belirtilmedi'}
- Son İşlenen Ders Kayıtları (${context.lastLessons.length} adet):
${JSON.stringify(context.lastLessons, null, 2)}
- Kayıtlı Öğretmen Notları:
${context.recentTeacherNotes.join(' | ') || 'Not girilmemiş'}
- Zorlanılan Noktalar:
${context.recentDifficulties.join(' | ') || 'Zorlanma kaydı yok'}

Lütfen yanıtı SADECE aşağıdaki JSON formatında üret:
\`\`\`json
{
  "classId": "${classId}",
  "className": "${context.classInfo.name}",
  "gradeLevel": ${context.classInfo.gradeLevel},
  "isPriority": ${hasDifficulties ? 'true' : 'false'},
  "priorityTag": "${hasDifficulties ? 'Öncelikli - Zorlanma Kaydı' : 'Standart İlerleme'}",
  "suggestedUnit": ${context.classInfo.currentUnit},
  "suggestedTopic": "${lastLesson?.topic ? lastLesson.topic + ' - Pekiştirme & İlerleme' : (context.classInfo.currentTopic || 'Ders Konusu')}",
  "pedagogicalFocus": "Öğrencilerin son dersteki zorlanmalarını giderecek kelime tekrarı ve iletişimsel etkinlik.",
  "criticalTeacherNote": "${context.recentDifficulties[0] || context.recentTeacherNotes[0] || 'Kayıtlı özel not bulunmuyor.'}",
  "recommendedMaterial": "Kelime Kartları (Flashcards) & Eşleştirme Çalışma Kağıdı",
  "recommendedDuration": 40,
  "whyThisSuggestion": {
    "lastLessonFact": "Son İşlenen Ders: ${lastLesson ? (lastLesson.topic || 'Ders Kaydı') : 'Henüz ders kaydı yok'}",
    "teacherNoteFact": "Öğretmen Notu: ${context.recentTeacherNotes[0] || 'Açıklama yok'}",
    "coverageFact": "Kazanım Durumu: Ünite ${context.classInfo.currentUnit} konuları pekiştiriliyor.",
    "pedagogicalRationale": "Son ders kayıtlarındaki öğretmen notları analiz edildi. Öğrencilerin kalıcılığını artırmak için derse 8 dakikalık tekrar ile başlanması önerilir."
  }
}
\`\`\``;

  try {
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
    let res: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        res = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        });
        if (res && res.text) {
          break;
        }
      } catch (e: any) {
        lastError = e;
        console.log(`[suggestNextLesson] Model ${modelName} unavailable, trying alternative...`);
      }
    }

    if (!res || !res.text) {
      throw lastError || new Error("All models failed to generate content.");
    }

    const parsed = JSON.parse(res.text || '{}');
    return {
      classId,
      className: context.classInfo.name,
      gradeLevel: context.classInfo.gradeLevel,
      isPriority: parsed.isPriority ?? hasDifficulties,
      priorityTag: parsed.priorityTag || (hasDifficulties ? 'Öncelikli - Zorlanma Kaydı' : 'Standart İlerleme'),
      suggestedUnit: parsed.suggestedUnit || context.classInfo.currentUnit,
      suggestedTopic: parsed.suggestedTopic || context.classInfo.currentTopic || 'Ders Konusu',
      pedagogicalFocus: parsed.pedagogicalFocus || 'Kazanım pekiştirme ve iletişim odaklı etkinlik.',
      criticalTeacherNote: parsed.criticalTeacherNote || context.recentTeacherNotes[0] || 'Özel not yok.',
      recommendedMaterial: parsed.recommendedMaterial || 'Çalışma Kağıdı & Görsel Kartlar',
      recommendedDuration: parsed.recommendedDuration || 40,
      whyThisSuggestion: {
        lastLessonFact: parsed.whyThisSuggestion?.lastLessonFact || `Son Ders: ${lastLesson ? lastLesson.topic : 'Henüz ders kaydı yok'}`,
        teacherNoteFact: parsed.whyThisSuggestion?.teacherNoteFact || `Öğretmen Notu: ${context.recentTeacherNotes[0] || 'Özel not yok'}`,
        coverageFact: parsed.whyThisSuggestion?.coverageFact || `Kazanım: Ünite ${context.classInfo.currentUnit} konuları`,
        pedagogicalRationale: parsed.whyThisSuggestion?.pedagogicalRationale || 'Sınıfınızın kayıtlı geçmiş dersleri ve notları analiz edilerek oluşturuldu.'
      }
    };
  } catch (err: any) {
    console.error('Error in suggestNextLesson:', err);
    return {
      classId,
      className: context.classInfo.name,
      gradeLevel: context.classInfo.gradeLevel,
      isPriority: hasDifficulties,
      priorityTag: hasDifficulties ? 'Öncelikli - Zorlanma Kaydı' : 'Standart İlerleme',
      suggestedUnit: context.classInfo.currentUnit,
      suggestedTopic: context.classInfo.currentTopic || 'İngilizce Dersi',
      pedagogicalFocus: 'Kazanım pekiştirme ve etkileşimli iletişim.',
      criticalTeacherNote: context.recentTeacherNotes[0] || 'Özel not yok',
      recommendedMaterial: 'Çalışma Kağıdı & Kelime Kartları',
      recommendedDuration: 40,
      whyThisSuggestion: {
        lastLessonFact: `Son Ders: ${lastLesson ? lastLesson.topic : 'Ders Kaydı Yok'}`,
        teacherNoteFact: `Öğretmen Notu: ${context.recentTeacherNotes[0] || 'Yok'}`,
        coverageFact: `Ünite ${context.classInfo.currentUnit} Konuları`,
        pedagogicalRationale: 'Geçmiş derslerin ve öğretmen notlarının analizi ile oluşturuldu.'
      }
    };
  }
}

/**
 * Generate comprehensive structured 40-minute lesson plan
 */
export async function createLessonPlan(
  ai: GoogleGenAI,
  db: InstanceType<typeof Database>,
  params: CreatePlanParams
): Promise<StructuredLessonPlan> {
  const classId = params.classId;
  const durationMinutes = params.durationMinutes || 40;
  const context = getNextLessonContext(db, classId);

  if (!context) {
    throw new Error('Sınıf bulunamadı.');
  }

  let webResearchSources: any[] = [];
  if (params.useWebResearch) {
    try {
      const searchRes = await searchEducationSources(ai, db, {
        grade: String(context.classInfo.gradeLevel),
        subject: 'İngilizce',
        unit: context.classInfo.currentUnit,
        topic: params.customTopic || context.classInfo.currentTopic,
        sourcePreference: 'MEB',
        relatedClassId: classId
      });
      webResearchSources = searchRes.sources || [];
    } catch (e) {
      console.warn('Web research step skipped for lesson plan:', e);
    }
  }

  const prompt = `Sen MEB Türkiye Yüzyılı Maarif Modeli Uyumlu Uzman İngilizce Öğretim Tasarımcısı Asistanısın (JARVIS).
GÖREVİN: ${context.classInfo.name} (${context.classInfo.gradeLevel}. Sınıf) için ${durationMinutes} dakikalık PEDAGOJİK DERS PLANI hazırlamak.

SINIF HAFIZASI BİLGİSİ:
- Sınıf Adı: ${context.classInfo.name}
- Sınıf Kademesi: ${context.classInfo.gradeLevel}. Sınıf
- Ünite No: ${context.classInfo.currentUnit}
- Konu: ${params.customTopic || context.classInfo.currentTopic || 'Ünite Konuları'}
- Öğretmenin Notları & Geçmiş Ders Zorlukları: ${context.recentTeacherNotes.join(' | ') || 'Herhangi bir zorluk bildirilmedi.'}
- Özel Hedef / Talep: ${params.goals || 'Ders konusu ve kazanımlarına tam uyum'}
- İstenen Zorluk: ${params.difficulty || 'MEB Standart (Orta)'}
${webResearchSources.length > 0 ? `- MEB Web Araştırma Kaynakları: ${JSON.stringify(webResearchSources.map(s => ({ title: s.title, url: s.url })))}` : ''}

KRİTİK PEDAGOJİK KURALLAR:
1. Zaman bölüşümü TAM OLARAK ${durationMinutes} DAKİKA etmelidir.
2. Öğretmen notlarında belirtilen zorluklar/eksikler varsa, dersin Isınma (Warm-up) veya Tekrar (Review) aşamasına özel vurgu yap.
3. Neden bu plan? ("pedagogicalReasoning") alanında öğretmenin geçmiş ders notlarına açıkça atıf yap. (Örn: "Son dersinizde öğrencilerin kelime bilgisinde zorlandığını not ettiğiniz için ilk 8 dakikayı Vocabulary Review adımına ayırdım.")
4. MEB Maarif Modeli beceri temelli (Reading, Speaking, Listening, Writing) yaklaşımı yansıt.

Yanıtı SADECE aşağıdaki JSON formatında ver:
\`\`\`json
{
  "title": "${context.classInfo.gradeLevel}. Sınıf İngilizce ${context.classInfo.currentUnit}. Ünite Ders Planı",
  "unitNumber": ${context.classInfo.currentUnit},
  "unitName": "${context.classInfo.currentTopic || 'Unit ' + context.classInfo.currentUnit}",
  "topic": "${params.customTopic || context.classInfo.currentTopic || 'Ders Konusu'}",
  "durationMinutes": ${durationMinutes},
  "mainGoals": [
    "Öğrenciler hedef yapıları günlük diyaloglarda kullanabilecek.",
    "Öğrenciler dinledikleri/okudukları metindeki temel bilgileri kavrayacak."
  ],
  "pedagogicalReasoning": "Sınıfınızın son ders kayıtları ve öğretmen notlarınız analiz edilerek kişiselleştirildi.",
  "agenda": [
    {
      "stage": "Warm-up & Greeting",
      "durationMinutes": 5,
      "activityTitle": "Görsel Hatırlatma Oyunu",
      "description": "Önceki dersteki kelimeleri akıllı tahtada resimlerle hatırlatma.",
      "outcomes": ["E${context.classInfo.gradeLevel}.${context.classInfo.currentUnit}.S1"],
      "teacherGuideNotes": "Öğrencilere heveslendirici kısa sorular yöneltin."
    },
    {
      "stage": "Vocabulary Review",
      "durationMinutes": 8,
      "activityTitle": "Word Matching Challenge",
      "description": "Zorlanılan kelimelerin çiftler halinde eşleştirilmesi.",
      "outcomes": ["E${context.classInfo.gradeLevel}.${context.classInfo.currentUnit}.V1"],
      "teacherGuideNotes": "Hatalı telaffuzları nazikçe düzeltin."
    },
    {
      "stage": "Main Activity",
      "durationMinutes": 15,
      "activityTitle": "Interactive Dialogue Role-Play",
      "description": "Öğrencilerin ikili gruplar halinde örnek diyalogu canlandırması.",
      "outcomes": ["E${context.classInfo.gradeLevel}.${context.classInfo.currentUnit}.S2"],
      "teacherGuideNotes": "Sınıf içinde dolaşarak rehberlik edin."
    },
    {
      "stage": "Practice",
      "durationMinutes": 7,
      "activityTitle": "Fill in the Blanks Worksheet",
      "description": "Kısa çalışma kağıdı uygulaması.",
      "outcomes": ["E${context.classInfo.gradeLevel}.${context.classInfo.currentUnit}.R1"],
      "teacherGuideNotes": "Bireysel kontrol sağlayın."
    },
    {
      "stage": "Assessment / Exit Ticket",
      "durationMinutes": 5,
      "activityTitle": "3-2-1 Exit Slip",
      "description": "Bugün öğrenilen 3 kelime, 2 cümle ve 1 sorunun kağıda yazılması.",
      "outcomes": ["E${context.classInfo.gradeLevel}.${context.classInfo.currentUnit}.W1"],
      "teacherGuideNotes": "Ders çıkışında toplayarak değerlendirin."
    }
  ],
  "suggestedMaterials": ["Çalışma Kağıdı (Worksheet)", "Kelime Kartları (Flashcards)", "Exit Slip Kağıtları"],
  "recommendedHomeFun": "Öğrenilen 5 yeni kelime ile ilgili resimli defter çalışması."
}
\`\`\``;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const parsedData = JSON.parse(res.text || '{}');
    const planId = `plan-${Date.now()}`;

    const planResult: StructuredLessonPlan = {
      id: planId,
      classId,
      className: context.classInfo.name,
      gradeLevel: context.classInfo.gradeLevel,
      unitNumber: parsedData.unitNumber || context.classInfo.currentUnit,
      unitName: parsedData.unitName || `Unit ${context.classInfo.currentUnit}`,
      topic: parsedData.topic || context.classInfo.currentTopic || 'Ders Konusu',
      durationMinutes: parsedData.durationMinutes || durationMinutes,
      mainGoals: parsedData.mainGoals || ['Kazanımların tamamlanması'],
      pedagogicalReasoning: parsedData.pedagogicalReasoning || 'Sınıf hafızanıza göre özel olarak hazırlandı.',
      agenda: parsedData.agenda || [],
      suggestedMaterials: parsedData.suggestedMaterials || ['Çalışma Kağıdı'],
      recommendedHomeFun: parsedData.recommendedHomeFun || '',
      sourcesUsed: webResearchSources.map(s => ({ title: s.title, url: s.url, tier: s.tier })),
      createdAt: new Date().toISOString(),
      status: 'draft'
    };

    // Save as DRAFT in LessonPlans table (Does NOT mutate LessonHistory -> WRITE Guard respected!)
    try {
      db.prepare(`
        INSERT INTO LessonPlans (id, classId, title, durationMinutes, unitNumber, unitName, topic, goals, difficulty, planJson, reasoning, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        planId,
        classId,
        parsedData.title || `${context.classInfo.name} Ders Planı`,
        durationMinutes,
        planResult.unitNumber,
        planResult.unitName,
        planResult.topic,
        JSON.stringify(planResult.mainGoals),
        params.difficulty || 'Medium',
        JSON.stringify(planResult),
        planResult.pedagogicalReasoning,
        'draft'
      );
    } catch (e) {
      console.warn('Error persisting draft LessonPlan to DB:', e);
    }

    return planResult;
  } catch (err: any) {
    console.error('Error in createLessonPlan:', err);
    throw new Error('Ders planı oluşturulurken bir hata oluştu: ' + (err.message || ''));
  }
}

/**
 * Prepare lesson materials requested for a lesson plan
 */
export async function prepareLessonMaterials(
  ai: GoogleGenAI,
  db: InstanceType<typeof Database>,
  params: {
    classId: string;
    planId?: string;
    materialTypes: string[]; // e.g. ['worksheet', 'game', 'exit_ticket']
  }
): Promise<any[]> {
  const context = getNextLessonContext(db, params.classId);
  if (!context) throw new Error('Sınıf bulunamadı.');

  const createdMaterials: any[] = [];

  for (const mType of params.materialTypes) {
    const prompt = `Sen MEB İngilizce Materyal Üretim Uzmanısın.
${context.classInfo.name} (${context.classInfo.gradeLevel}. Sınıf, Ünite ${context.classInfo.currentUnit}: ${context.classInfo.currentTopic || ''}) için "${mType}" türünde harika, eğlenceli ve MEB Maarif Modeli uyumlu bir ders materyali hazırla.

JSON formatında yanıt ver:
\`\`\`json
{
  "title": "${context.classInfo.gradeLevel}. Sınıf ${mType.toUpperCase()} Materyali",
  "type": "${mType}",
  "instructions": "Öğrenciler için yönlendirme açıklaması",
  "content": "Materyalin detaylı içeriği, soruları veya kart bilgileri"
}
\`\`\``;

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { temperature: 0.3, responseMimeType: 'application/json' }
      });
      const matJson = JSON.parse(res.text || '{}');
      const matId = `mat-plan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // Save to GeneratedMaterial
      db.prepare(`
        INSERT INTO GeneratedMaterial (id, title, classId, type, contentJson)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        matId,
        matJson.title || `${context.classInfo.name} ${mType}`,
        params.classId,
        mType,
        JSON.stringify(matJson)
      );

      createdMaterials.push({ id: matId, ...matJson });
    } catch (e) {
      console.warn(`Error generating material for ${mType}:`, e);
    }
  }

  return createdMaterials;
}
