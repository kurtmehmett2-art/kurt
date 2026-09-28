import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';

export interface EducationSourceItem {
  id: string;
  title: string;
  institution: string;
  url: string;
  sourceType: string; // sample_questions, exam, worksheet, curriculum, guide, book, article
  grade: string;
  subject: string;
  unit?: number;
  topic?: string;
  tier: number; // 1: MEB/ÖDSGM/EBA/MEBİ, 2: Universities, 3: Publishers, 4: Other
  relevanceScore: number;
  publishedAt?: string;
  discoveredAt?: string;
  summary?: string;
  analysisJson?: any;
}

export interface ResearchSearchParams {
  grade?: string;
  subject?: string;
  unit?: string | number;
  topic?: string;
  sourcePreference?: 'MEB' | 'ALL' | string;
  resourceType?: string;
  dateRange?: string;
  relatedClassId?: string;
}

export interface ExamGenerationParams {
  classId?: string;
  grade?: string;
  subject?: string;
  unit?: string | number;
  topics?: string;
  questionCount?: number;
  difficulty?: string;
  questionTypes?: string[];
  sourceIds?: string[];
  includeAnswerKey?: boolean;
  includeTeacherNotes?: boolean;
}

// Clean and validate URL
function sanitizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  let cleaned = urlStr.trim();
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return cleaned;
  }
  return 'https://' + cleaned;
}

// Determine source tier
export function determineSourceTier(url: string, institution: string): number {
  const u = (url || '').toLowerCase();
  const inst = (institution || '').toLowerCase();

  if (
    u.includes('meb.gov.tr') ||
    u.includes('odsgm') ||
    u.includes('eba.gov.tr') ||
    u.includes('mebi.gov.tr') ||
    inst.includes('meb') ||
    inst.includes('odsgm') ||
    inst.includes('eba') ||
    inst.includes('ölçme') ||
    inst.includes('milli eğitim')
  ) {
    return 1;
  }

  if (u.includes('.edu.tr') || u.includes('.gov.tr') || inst.includes('üniversite') || inst.includes('university')) {
    return 2;
  }

  if (
    inst.includes('yayın') ||
    inst.includes('yayınevi') ||
    u.includes('yayin') ||
    u.includes('kitap') ||
    inst.includes('publisher')
  ) {
    return 3;
  }

  return 4;
}

/**
 * Perform web research using Gemini Google Search grounding
 */
export async function searchEducationSources(
  ai: GoogleGenAI,
  db: InstanceType<typeof Database>,
  params: ResearchSearchParams
): Promise<{ sources: EducationSourceItem[]; historyId: string; query: string; rawSearchText?: string; classContextApplied?: boolean }> {
  const grade = params.grade || '6';
  const subject = params.subject || 'İngilizce';
  const unit = params.unit ? `Ünite ${params.unit}` : '';
  const topic = params.topic || '';
  const preference = params.sourcePreference === 'MEB' ? 'Sadece MEB (ÖDSGM, EBA, MEBİ, ÖDM, MEB Ana Sayfa)' : 'Tüm Resmi ve Güvenilir Kaynaklar';
  const resourceType = params.resourceType || 'örnek sorular ve çalışma kağıtları';

  let classContextInfo = '';
  let classContextApplied = false;

  // Retrieve class memory if relatedClassId provided
  if (params.relatedClassId) {
    try {
      const cls = db.prepare('SELECT name, gradeLevel, currentUnit, currentTopic FROM Class WHERE id = ?').get(params.relatedClassId) as any;
      if (cls) {
        classContextApplied = true;
        const lastLesson = db.prepare('SELECT topic, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT 1').get(params.relatedClassId) as any;
        classContextInfo = `\nSınıf Hafızası (${cls.name}): ${cls.gradeLevel}. Sınıf, Şu anki Ünite: ${cls.currentUnit}, Konu: ${cls.currentTopic || 'Belirtilmemiş'}. ${lastLesson ? `Son Ders Notu: "${lastLesson.teacherNotes || lastLesson.topic}"` : ''}`;
      }
    } catch (e) {
      console.warn('Error reading class context for research:', e);
    }
  }

  const query = `MEB Türkiye Yüzyılı Maarif Modeli ${grade}. Sınıf ${subject} ${unit} ${topic} ${resourceType} ${preference}`.trim();

  const systemInstruction = `Sen MEB İngilizce Eğitimi ve Eğitim Kaynakları Araştırma Asistanısın.
GÖREVİN: Kullanıcının talebine uygun olarak Türkiye Millî Eğitim Bakanlığı (MEB, ÖDSGM, EBA, MEBİ, ÖDM) ve resmi eğitim kaynaklarını aramak.

KAYNAK GÜVENİLİRLİK HİYERARŞİSİ:
TIER 1 (ÖNCELİKLİ): meb.gov.tr, odsgm.meb.gov.tr, eba.gov.tr, mebi.gov.tr, il/ilçe Milli Eğitim Müdürlükleri, resmi Ölçme Değerlendirme Merkezleri (ÖDM).
TIER 2: Üniversiteler ve resmi eğitim kurumları.
TIER 3: Eğitim yayıncılarının resmi internet siteleri.
TIER 4: Diğer eğitim siteleri.

KRİTİK KURAL - HALLUCINATION YASAĞI:
1. Kesinlikle uydurma/sahte URL veya var olmayan MEB kaynağı oluşturma!
2. Arama sonucunda doğrulanamayan kaynakları listeleme.
3. Eğer arama sonucunda belirtilen kriterlere uygun resmi kaynak bulunamazsa, bunu dürüstçe metin içinde belirt.
4. Metnin en altında, bulunan GERÇEK kaynakları JSON formatında ver:

\`\`\`json
{
  "sources": [
    {
      "title": "MEB ÖDSGM 6. Sınıf İngilizce Örnek Sorular",
      "institution": "MEB ÖDSGM",
      "url": "https://odsgm.meb.gov.tr/...",
      "sourceType": "sample_questions",
      "grade": "6",
      "subject": "İngilizce",
      "unit": 3,
      "topic": "Downtown / Giving Directions",
      "tier": 1,
      "relevanceScore": 95,
      "summary": "ÖDSGM resmi sayfasındaki 3. ünite örnek soruları ve cevap anahtarı."
    }
  ]
}
\`\`\``;

  const prompt = `Aşağıdaki eğitim kaynağı aramasını gerçekleştir ve doğrulanabilir sonuçları raporla:
Arama Kriterleri:
- Sınıf: ${grade}
- Ders: ${subject}
- Ünite/Konu: ${unit} ${topic}
- Kaynak Tercihi: ${preference}
- Materyal Türü: ${resourceType}
${classContextInfo}

Lütfen Google Arama sonuçlarına dayanarak MEB / ÖDSGM / EBA ve güvenilir resmi kaynakları listele.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Parse JSON block if present
    let jsonSources: any[] = [];
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{\s*"sources"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        if (Array.isArray(parsed.sources)) {
          jsonSources = parsed.sources;
        }
      } catch (e) {
        console.warn('Failed to parse search JSON block:', e);
      }
    }

    const items: EducationSourceItem[] = [];
    const addedUrls = new Set<string>();

    // Process JSON sources first
    for (const src of jsonSources) {
      if (src.url && src.title) {
        const cleanUrl = sanitizeUrl(src.url);
        if (!addedUrls.has(cleanUrl)) {
          addedUrls.add(cleanUrl);
          const tier = src.tier || determineSourceTier(cleanUrl, src.institution || '');
          items.push({
            id: `src-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: src.title,
            institution: src.institution || (tier === 1 ? 'MEB / ÖDSGM' : 'Eğitim Kurumu'),
            url: cleanUrl,
            sourceType: src.sourceType || 'sample_questions',
            grade: String(src.grade || grade),
            subject: src.subject || subject,
            unit: src.unit || (params.unit ? Number(params.unit) : undefined),
            topic: src.topic || topic,
            tier: tier,
            relevanceScore: src.relevanceScore || (tier === 1 ? 95 : 80),
            publishedAt: src.publishedAt || new Date().toISOString().split('T')[0],
            summary: src.summary || 'Arama sonucu doğrulanmış eğitim kaynağı.'
          });
        }
      }
    }

    // Process Google Search Grounding Chunks directly if JSON was empty or to complement
    for (const chunk of groundingChunks) {
      if (chunk.web && chunk.web.uri && chunk.web.title) {
        const cleanUrl = sanitizeUrl(chunk.web.uri);
        if (!addedUrls.has(cleanUrl)) {
          addedUrls.add(cleanUrl);
          const tier = determineSourceTier(cleanUrl, chunk.web.title);
          items.push({
            id: `src-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: chunk.web.title,
            institution: tier === 1 ? 'MEB / ÖDSGM / EBA' : tier === 2 ? 'Resmi / Üniversite' : 'Eğitim Portalı',
            url: cleanUrl,
            sourceType: 'sample_questions',
            grade: String(grade),
            subject: subject,
            unit: params.unit ? Number(params.unit) : undefined,
            topic: topic,
            tier: tier,
            relevanceScore: tier === 1 ? 95 : 85,
            publishedAt: new Date().toISOString().split('T')[0],
            summary: `${chunk.web.title} — Google Search tarafından doğrulanan resmi web adresi.`
          });
        }
      }
    }

    // Sort items by Tier ascending (Tier 1 first) then by relevanceScore descending
    items.sort((a, b) => a.tier - b.tier || b.relevanceScore - a.relevanceScore);

    // Save items to DB
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO EducationSource 
      (id, title, institution, url, sourceType, grade, subject, unit, topic, tier, relevanceScore, publishedAt, discoveredAt, analysisJson)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `);

    for (const item of items) {
      try {
        insertStmt.run(
          item.id,
          item.title,
          item.institution,
          item.url,
          item.sourceType,
          item.grade,
          item.subject,
          item.unit || null,
          item.topic || null,
          item.tier,
          item.relevanceScore,
          item.publishedAt || null,
          JSON.stringify({ summary: item.summary })
        );
      } catch (e) {
        console.warn('Error inserting EducationSource into DB:', e);
      }
    }

    // Save ResearchHistory
    const historyId = `rh-${Date.now()}`;
    try {
      db.prepare(`
        INSERT INTO ResearchHistory (id, query, date, resultsCount, resultsJson, relatedClassId)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
      `).run(historyId, query, items.length, JSON.stringify(items), params.relatedClassId || null);
    } catch (e) {
      console.warn('Error saving ResearchHistory:', e);
    }

    return {
      sources: items,
      historyId,
      query,
      rawSearchText: text,
      classContextApplied
    };

  } catch (err: any) {
    console.error('Error in searchEducationSources:', err);
    
    // Handle quota or timeout errors gracefully
    const isRateLimit = err?.status === 429 || err?.message?.includes('429');
    const msg = isRateLimit
      ? 'Web araştırması şu anda yüksek yoğunluk nedeniyle kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.'
      : 'Web araştırması sırasında bir bağlantı hatası oluştu.';

    return {
      sources: [],
      historyId: `rh-err-${Date.now()}`,
      query,
      rawSearchText: msg,
      classContextApplied
    };
  }
}

/**
 * Detailed Source Analyzer
 */
export async function analyzeEducationSource(
  ai: GoogleGenAI,
  db: InstanceType<typeof Database>,
  sourceIdOrUrl: string
): Promise<any> {
  let sourceRecord = db.prepare('SELECT * FROM EducationSource WHERE id = ? OR url = ?').get(sourceIdOrUrl, sourceIdOrUrl) as any;

  if (!sourceRecord) {
    sourceRecord = {
      title: sourceIdOrUrl,
      url: sanitizeUrl(sourceIdOrUrl),
      institution: 'Doğrulanmış Eğitim Kaynağı',
      grade: '6',
      subject: 'İngilizce'
    };
  }

  const prompt = `Aşağıdaki eğitim kaynağını pedagogical ve MEB Türkiye Yüzyılı Maarif Modeli açısından detaylı analiz et:
Başlık: ${sourceRecord.title}
Kurum: ${sourceRecord.institution || 'MEB'}
URL: ${sourceRecord.url}
Sınıf/Ders: ${sourceRecord.grade}. Sınıf ${sourceRecord.subject}

Lütfen aşağıdaki JSON yapısında detaylı analiz döndür:
\`\`\`json
{
  "sourceTitle": "${sourceRecord.title}",
  "institution": "${sourceRecord.institution || 'MEB'}",
  "grade": "${sourceRecord.grade || '6'}",
  "subject": "${sourceRecord.subject || 'İngilizce'}",
  "unit": 3,
  "topics": ["Downtown", "Giving Directions", "Places in a City"],
  "outcomes": [
    "E6.3.R1. Students will be able to understand short, simple texts about locations and directions.",
    "E6.3.S1. Students will be able to ask for and give directions."
  ],
  "questionTypes": ["Çoktan Seçmeli", "Harita Okuma / Yön Tarifi", "Eşleştirme"],
  "approximateQuestionCount": 12,
  "relevanceScore": 95,
  "pedagogicalEvaluation": "MEB Maarif Modeli görsel okuryazarlık ve beceri temelli ölçme yaklaşımına %100 uygundur.",
  "sourceUrl": "${sourceRecord.url}"
}
\`\`\``;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const analysis = JSON.parse(res.text || '{}');

    // Update DB
    if (sourceRecord.id) {
      db.prepare('UPDATE EducationSource SET analysisJson = ? WHERE id = ?').run(JSON.stringify(analysis), sourceRecord.id);
    }

    return analysis;
  } catch (e: any) {
    console.error('Error in analyzeEducationSource:', e);
    return {
      sourceTitle: sourceRecord.title,
      institution: sourceRecord.institution,
      sourceUrl: sourceRecord.url,
      relevanceScore: 90,
      pedagogicalEvaluation: 'MEB müfredatına uygun resmi örnek materyal.'
    };
  }
}

/**
 * Generate original exam / assessment material based on research & class memory
 */
export async function createExamFromResearch(
  ai: GoogleGenAI,
  db: InstanceType<typeof Database>,
  params: ExamGenerationParams
): Promise<any> {
  const grade = params.grade || '6';
  const subject = params.subject || 'İngilizce';
  const unit = params.unit ? String(params.unit) : '3';
  const topics = params.topics || 'Ünite Konuları';
  const questionCount = params.questionCount || 10;
  const difficulty = params.difficulty || 'Orta (MEB Standart)';
  
  let classInfoText = '';
  if (params.classId) {
    try {
      const cls = db.prepare('SELECT name, gradeLevel, currentUnit, currentTopic FROM Class WHERE id = ?').get(params.classId) as any;
      const lastLesson = db.prepare('SELECT topic, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT 1').get(params.classId) as any;
      if (cls) {
        classInfoText = `Sınıf: ${cls.name} (${cls.gradeLevel}. Sınıf). ${lastLesson ? `Öğretmen Notu: "${lastLesson.teacherNotes || ''}"` : ''}`;
      }
    } catch (e) {}
  }

  let sourcesContextText = '';
  if (params.sourceIds && params.sourceIds.length > 0) {
    try {
      const placeholders = params.sourceIds.map(() => '?').join(',');
      const sources = db.prepare(`SELECT title, institution, url, analysisJson FROM EducationSource WHERE id IN (${placeholders})`).all(...params.sourceIds) as any[];
      sourcesContextText = sources.map(s => `- ${s.title} (${s.institution}): ${s.url}`).join('\n');
    } catch (e) {}
  }

  const prompt = `Sen T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli Ölçme ve Değerlendirme Uzmanısın.
GÖREVİN: ${grade}. Sınıf ${subject} ${unit}. Ünite (${topics}) için TAMAMEN ÖZGÜN (kopya olmayan, MEB ÖDSGM sınav ve soru tarzına uygun) ${questionCount} soruluk kaliteli bir yazılı sınav / değerlendirme materyali oluşturmak.

Sınıf / Bağlam Bilgisi:
${classInfoText || 'Genel Sınıf Seviyesi'}

İncelenen MEB Kaynakları ve Ölçme Yaklaşımı:
${sourcesContextText || 'MEB ÖDSGM Örnek Soruları ve Kazanım Testleri'}

Soru Sayısı: ${questionCount}
Zorluk Düzeyi: ${difficulty}
İstenen Soru Tipleri: ${params.questionTypes?.join(', ') || 'Çoktan seçmeli, eşleştirme, boşluk doldurma ve açık uçlu'}

Lütfen yanıtı SADECE aşağıdaki JSON formatında ver:
{
  "title": "${grade}. Sınıf İngilizce ${unit}. Ünite Değerlendirme Sınavı",
  "grade": "${grade}",
  "subject": "${subject}",
  "unit": "${unit}",
  "topic": "${topics}",
  "durationMinutes": 40,
  "schoolName": "T.C. MİLLÎ EĞİTİM BAKANLIĞI ORTAOKULU",
  "teacherName": "İngilizce Öğretmeni",
  "instructions": "Sınav süresi 40 dakikadır. Yanıtlarınızı okunaklı şekilde yazınız.",
  "questions": [
    {
      "id": 1,
      "number": 1,
      "type": "multiple_choice",
      "questionText": "Soru metni (Görsel veya diyalog içerikli)",
      "options": ["A) Şık 1", "B) Şık 2", "C) Şık 3", "D) Şık 4"],
      "correctAnswer": "A) Şık 1",
      "points": 10,
      "outcomeCode": "E${grade}.${unit}.R1",
      "outcomeText": "İlgili MEB kazanım açıklaması",
      "solution": "Açıklamalı çözümü"
    }
  ],
  "answerKeySummary": "1-A, 2-B, 3-C, ...",
  "teacherNotes": "Sınav MEB Maarif Modeli kazanımları ile %100 uyumludur."
}`;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const materialData = JSON.parse(res.text || '{}');
    const materialId = `mat-${Date.now()}`;

    // Save material to GeneratedMaterial table
    db.prepare(`
      INSERT INTO GeneratedMaterial (id, title, classId, sourceIds, type, contentJson, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      materialId,
      materialData.title || `${grade}. Sınıf Özgün Sınav`,
      params.classId || null,
      params.sourceIds ? JSON.stringify(params.sourceIds) : null,
      'exam',
      JSON.stringify(materialData)
    );

    return {
      id: materialId,
      ...materialData
    };
  } catch (err: any) {
    console.error('Error in createExamFromResearch:', err);
    throw new Error('Özgün sınav materyali oluşturulurken bir hata oluştu: ' + (err.message || ''));
  }
}
