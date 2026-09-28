import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Database
import db, { initDb } from './src/db/database.js'; // using .js extension for ESM compilation
import { searchEducationSources, analyzeEducationSource, createExamFromResearch } from './src/services/webResearchService.js';
import { getNextLessonContext, suggestNextLesson, createLessonPlan, prepareLessonMaterials } from './src/services/lessonPlannerService.js';
import { MEB_CURRICULUM } from './src/data/mebCurriculum.js';
initDb();

// CLASS MANAGEMENT API ENDPOINTS
const DEFAULT_TEACHER_ID = 'teacher-1';

// GET all classes
app.get('/api/classes', (req, res) => {
  try {
    const classes = db.prepare('SELECT * FROM Class WHERE teacherId = ? ORDER BY createdAt DESC').all(DEFAULT_TEACHER_ID);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// GET single class by ID
app.get('/api/classes/:id', (req, res) => {
  try {
    const classData = db.prepare('SELECT * FROM Class WHERE id = ? AND teacherId = ?').get(req.params.id, DEFAULT_TEACHER_ID);
    if (!classData) return res.status(404).json({ error: "Class not found" });
    res.json(classData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch class details" });
  }
});

// POST new class
app.post('/api/classes', (req, res) => {
  try {
    const { name, gradeLevel, currentUnit, currentTopic } = req.body;
    const id = `class-${Date.now()}`;
    db.prepare(`
      INSERT INTO Class (id, teacherId, name, gradeLevel, currentUnit, currentTopic)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, DEFAULT_TEACHER_ID, name, gradeLevel, currentUnit || 1, currentTopic || '');
    
    const newClass = db.prepare('SELECT * FROM Class WHERE id = ?').get(id);
    res.status(201).json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// PUT update class
app.put('/api/classes/:id', (req, res) => {
  try {
    const { name, gradeLevel, currentUnit, currentTopic } = req.body;
    db.prepare(`
      UPDATE Class 
      SET name = ?, gradeLevel = ?, currentUnit = ?, currentTopic = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND teacherId = ?
    `).run(name, gradeLevel, currentUnit, currentTopic, req.params.id, DEFAULT_TEACHER_ID);
    
    const updatedClass = db.prepare('SELECT * FROM Class WHERE id = ?').get(req.params.id);
    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ error: "Failed to update class" });
  }
});

// DELETE class
app.delete('/api/classes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM Class WHERE id = ? AND teacherId = ?').run(req.params.id, DEFAULT_TEACHER_ID);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// GET class lesson history
app.get('/api/classes/:id/lessons', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM LessonHistory WHERE classId = ? ORDER BY createdAt DESC').all(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lesson history" });
  }
});

// POST complete a lesson
app.post('/api/classes/:id/lessons', (req, res) => {
  try {
    const classId = req.params.id;
    const { date, unitNumber, unitName, topic, skill, activity, durationMinutes, coveredOutcomes, teacherNotes } = req.body;
    
    // Verify class exists
    const classExists = db.prepare('SELECT id FROM Class WHERE id = ? AND teacherId = ?').get(classId, DEFAULT_TEACHER_ID);
    if (!classExists) return res.status(404).json({ error: "Class not found" });

    const lessonId = `lesson-${Date.now()}`;
    
    // Begin transaction to ensure both insert and update succeed together
    const transaction = db.transaction(() => {
      // 1. Add to lesson history
      db.prepare(`
        INSERT INTO LessonHistory (id, classId, date, unitNumber, unitName, topic, skill, activity, durationMinutes, coveredOutcomes, teacherNotes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(lessonId, classId, date, unitNumber, unitName, topic, skill, activity, durationMinutes, coveredOutcomes, teacherNotes);

      // 2. Update class current status
      db.prepare(`
        UPDATE Class 
        SET currentUnit = ?, currentTopic = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(unitNumber, topic, classId);
    });
    
    transaction();
    
    const newLesson = db.prepare('SELECT * FROM LessonHistory WHERE id = ?').get(lessonId);
    res.status(201).json(newLesson);
  } catch (error) {
    console.error("Error saving lesson:", error);
    res.status(500).json({ error: "Failed to save lesson history" });
  }
});


// Initialize Gemini AI Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Helper for retrying AI calls
async function callAIWithRetry(aiClient: any, prompt: string, config: any, retries = 3): Promise<any> {
  const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite"];
  for (let i = 0; i < retries; i++) {
    const modelToUse = models[i % models.length];
    try {
      return await aiClient.models.generateContent({
        model: modelToUse,
        contents: prompt,
        config: config
      });
    } catch (err: any) {
      // Retry on 503 (Service Unavailable) or 429
      const isRetryable = err.status === 503 || err.status === 429 || err?.message?.includes('429') || err?.message?.includes('503');
      if (isRetryable && i < retries - 1) {
        console.log(`[callAIWithRetry] Model limit hit (attempt ${i+1}), trying rotating alternative in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw err;
    }
  }
}

// Simple Chatbot Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGeminiClient();
    
    // Convert generic messages to Gemini format or just send a combined prompt for simple interaction
    // We'll format the history into a string
    const conversation = messages.map((m: any) => `${m.role === 'user' ? 'Öğretmen' : 'Asistan'}: ${m.content}`).join('\n');
    
    const prompt = `Aşağıdaki mesajlaşma geçmişine göre son soruyu veya isteği yanıtla:\n\n${conversation}\n\nAsistan:`;

    const systemInstruction = `Sen T.C. Millî Eğitim Bakanlığı İngilizce Öğretmenlerine yardımcı olan akıllı, samimi ve uzman bir eğitim asistanısın. 
Görevlerin:
1. Öğretmenin sorularını yanıtlamak.
2. İhtiyaç duyduğu "yazılı materyalleri" (okuma parçası, diyalog, mini sınav, kelime listesi, boşluk doldurma vb.) hazırlamak.
3. Yanıtlarını sadece, anlaşılır ve markdown formatında vermek (başlıklar, listeler vb. kullanarak). 
4. Tonun motive edici, nazik ve profesyonel olmalı ("Öğretmenim" diye hitap edebilirsin).
5. Tüm içerikler A1-A2 ortaokul İngilizce düzeyine uygun olmalıdır.`;

    const response = await callAIWithRetry(ai, prompt, {
      systemInstruction,
      temperature: 0.7,
    });

    return res.json({ response: response.text });
  } catch (err: any) {
    console.error("Error in chat:", err);
    return res.status(500).json({ error: "Sohbet sırasında bir hata oluştu." });
  }
});

// API Endpoint for generating MEB Maarif Modeli compliant English teaching package


// SHARED JARVIS CONFIGURATION & TOOLS
export const jarvisTools = [
  {
    name: 'get_curriculum_outcomes',
    description: 'T.C. Millî Eğitim Bakanlığı resmi İngilizce dersi müfredat kazanımlarını ve örnek kelimelerini getirir. Gerçek müfredat verilerini kullanır, uydurma kazanım üretmez.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        grade: { type: Type.STRING, description: 'Sınıf kademesi (5, 6, 7, 8)' },
        unitNumber: { type: Type.INTEGER, description: 'Ünite numarası (1-10 arası)' }
      },
      required: ['grade', 'unitNumber']
    }
  },
  {
    name: 'get_classes',
    description: 'Öğretmenin sahip olduğu tüm sınıfların listesini (ID, isim, kademe vb.) getirir. Sınıf ID\'lerini (classId) bulmak için bunu kullanın.',
  },
  {
    name: 'get_class_status',
    description: 'Belirli bir sınıfın mevcut ünite, konu ve durumunu getirir. classId veritabanındaki gerçek ID olmalıdır (örn. class-123). Kullanıcı sınıf adı verdiyse (örn. 6/A), önce get_classes kullanın.',
    parameters: {
      type: Type.OBJECT,
      properties: { classId: { type: Type.STRING } },
      required: ['classId']
    }
  },
  {
    name: 'get_class_lessons',
    description: 'Belirli bir sınıfın geçmiş ders kayıtlarını (ve öğretmen notlarını) getirir.',
    parameters: {
      type: Type.OBJECT,
      properties: { 
        classId: { type: Type.STRING },
        limit: { type: Type.INTEGER }
      },
      required: ['classId']
    }
  },
  {
    name: 'get_latest_lesson',
    description: 'Belirli bir sınıfın işlenen en son dersini (ve öğretmen notlarını) getirir.',
    parameters: {
      type: Type.OBJECT,
      properties: { classId: { type: Type.STRING } },
      required: ['classId']
    }
  },
  {
    name: 'search_education_sources',
    description: 'MEB (ÖDSGM, EBA, MEBİ, ÖDM) ve resmi/güvenilir eğitim kaynaklarını internette Google Search kullanarak araştırır.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        grade: { type: Type.STRING, description: 'Sınıf kademesi (5, 6, 7, 8)' },
        subject: { type: Type.STRING, description: 'Ders adı (örn: İngilizce)' },
        unit: { type: Type.STRING, description: 'Ünite numarası (örn: 3)' },
        topic: { type: Type.STRING, description: 'Konu (örn: Giving Directions, Downtown)' },
        sourcePreference: { type: Type.STRING, description: 'Kaynak tercihi (örn: MEB)' },
        resourceType: { type: Type.STRING, description: 'Materyal türü (örn: sample_questions, exam, worksheet)' },
        relatedClassId: { type: Type.STRING, description: 'Eğer araştırma bir sınıfla ilgiliyse o sınıfın IDsi' }
      }
    }
  },
  {
    name: 'analyze_education_source',
    description: 'Bulunan bir eğitim kaynağını (MEB örnek soru, diyalog, kılavuz vb.) pedagojik ve MEB kazanım uyumu açısından analiz eder.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceIdOrUrl: { type: Type.STRING, description: 'Analiz edilecek kaynağın IDsi veya URL adresi' }
      },
      required: ['sourceIdOrUrl']
    }
  },
  {
    name: 'create_exam_from_research',
    description: 'Arama yapılan MEB kaynakları ve sınıf hafızasına dayanarak %100 ÖZGÜN, MEB Maarif Modeli uyumlu yazılı sınav ve cevap anahtarı üretir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı IDsi (opsiyonel)' },
        grade: { type: Type.STRING, description: 'Sınıf kademesi (5, 6, 7, 8)' },
        subject: { type: Type.STRING, description: 'Ders (İngilizce)' },
        unit: { type: Type.STRING, description: 'Ünite Numarası' },
        topics: { type: Type.STRING, description: 'Sınav konuları' },
        questionCount: { type: Type.INTEGER, description: 'Soru sayısı (örn: 10 veya 15)' },
        difficulty: { type: Type.STRING, description: 'Zorluk derecesi (örn: Orta MEB Standart)' }
      }
    }
  },
  {
    name: 'create_lesson_record',
    description: 'Yeni bir ders işlendiğinde bunu veritabanına kaydeder. Kullanıcıdan konu, ünite vb. bilgileri aldıktan sonra çağır. Eksik bilgi varsa (örn: konu) çağırmadan önce KULLANICIYA SOR. Kendin uydurma.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı ID\'si (get_classes ile bulunmalı)' },
        className: { type: Type.STRING, description: 'Sınıfın adı, örn: 6/A (UI gösterimi için)' },
        unitNumber: { type: Type.INTEGER, description: 'Ünite numarası (opsiyonel)' },
        unitName: { type: Type.STRING, description: 'Ünite adı (opsiyonel)' },
        topic: { type: Type.STRING, description: 'Dersin konusu (zorunlu)' },
        teacherNotes: { type: Type.STRING, description: 'Öğretmenin derse dair eklemek istediği notlar (opsiyonel)' }
      },
      required: ['classId', 'className', 'topic']
    }
  },
  {
    name: 'add_teacher_note',
    description: 'Sadece işlenmiş olan en SON derse not ekler. Eğer yeni bir ders işlendiyse create_lesson_record kullanın.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı ID\'si' },
        className: { type: Type.STRING, description: 'Sınıfın adı, örn: 6/A' },
        note: { type: Type.STRING, description: 'Eklenecek not' }
      },
      required: ['classId', 'className', 'note']
    }
  },
  {
    name: 'propose_lesson_plan',
    description: 'Öğretmenin talebi üzerine geçmiş dersleri ve notları okuyup bir sonraki ders için akıllı bir öneri sunar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı ID\'si' },
        className: { type: Type.STRING, description: 'Sınıfın adı (örn: 6/A)' },
        grade: { type: Type.STRING, description: 'Sınıf kademesi (5, 6, 7, 8)' },
        unitNumber: { type: Type.INTEGER, description: 'Ünite Numarası' },
        unitName: { type: Type.STRING, description: 'Ünite Adı' },
        topic: { type: Type.STRING, description: 'Önerilen dersin konusu' },
        skill: { type: Type.STRING, description: 'Önerilen beceri alanı (Reading, Listening, Speaking, Writing, Vocabulary, Grammar vb.)' },
        activityType: { type: Type.STRING, description: 'Önerilen etkinlik türü' },
        durationMinutes: { type: Type.INTEGER, description: 'Ders süresi (varsayılan 40)' },
        reasoning: { type: Type.STRING, description: 'Önerinin gerekçesi.' },
        agenda: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Önerilen akış maddeleri.' }
      },
      required: ['classId', 'className', 'grade', 'unitNumber', 'unitName', 'topic', 'skill', 'activityType', 'durationMinutes', 'reasoning', 'agenda']
    }
  },
  {
    name: 'get_next_lesson_context',
    description: 'Belirtilen sınıf için bir sonraki ders planlamasına gerekli bağlamı (sınıf bilgisi, kademe, ünite, son 3 ders kaydı, öğretmen notları, zorluklar, kazanımlar) tek bir yapı halinde döndürür. Eğer classId bilinmiyorsa önce get_classes kullan.',
    parameters: {
      type: Type.OBJECT,
      properties: { classId: { type: Type.STRING } },
      required: ['classId']
    }
  },
  {
    name: 'suggest_next_lesson',
    description: 'Sınıfın geçmişine ve öğretmen notlarına göre bir sonraki ders için pedagojik öneri oluşturur. Doğrudan veritabanına yazmaz. Eğer classId bilinmiyorsa önce get_classes kullan.',
    parameters: {
      type: Type.OBJECT,
      properties: { classId: { type: Type.STRING } },
      required: ['classId']
    }
  },
  {
    name: 'create_lesson_plan',
    description: 'Sınıfın hafızasına, son derslerindeki zorluklara ve öğretmen notlarına dayanarak 40 dakikalık (veya özel süreli) pedagojik, dakikalara bölünmüş tam bir ders planı ve "Neden bu plan?" gerekçesini hazırlar. Doğrudan veritabanına kalıcı ders kaydı yazmaz. Eğer classId bilinmiyorsa önce get_classes kullan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı IDsi' },
        durationMinutes: { type: Type.INTEGER, description: 'Ders süresi (varsayılan 40 dakikadır)' },
        goals: { type: Type.STRING, description: 'Özel hedefler veya istekler' },
        difficulty: { type: Type.STRING, description: 'Zorluk seviyesi' },
        useWebResearch: { type: Type.BOOLEAN, description: 'MEB kaynak araştırması yapılsın mı?' }
      },
      required: ['classId']
    }
  },
  {
    name: 'prepare_lesson_materials',
    description: 'Hazırlanan ders planı için çalışma kağıdı (worksheet), kelime kartları (flashcards), oyun, exit ticket gibi materyal taslakları üretir. Eğer classId bilinmiyorsa önce get_classes kullan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı IDsi' },
        planId: { type: Type.STRING, description: 'İlgili ders planının IDsi (opsiyonel)' },
        materialTypes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'İstenen materyal türleri listesi (örn: ["worksheet", "game", "exit_ticket"])'
        }
      },
      required: ['classId', 'materialTypes']
    }
  },
  {
    name: 'prepare_full_lesson',
    description: 'Sınıf bağlamını kullanarak uygun ders planı, gerekli materyal ve MEB kaynak araştırmasını içeren kapsamlı bir ders hazırlık paketi (Dersi Hazırla workflow) hazırlar. Kalıcı veritabanı kaydı için öğretmenin açık onayını gerektirir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Sınıfın veritabanı IDsi (get_classes ile bulunmalıdır)' },
        materialTypes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'İstenen materyal türleri listesi (örn: ["worksheet", "flashcards"])'
        },
        useWebResearch: { type: Type.BOOLEAN, description: 'MEB kaynak araştırması yapılsın mı? Varsayılan true\'dur.' }
      },
      required: ['classId']
    }
  },
  {
    name: 'navigate_to_workspace',
    description: 'Öğretmeni uygulama içerisindeki ilgili çalışma alanına veya sekmeye yönlendirir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        view: { type: Type.STRING, description: 'Yönlendirilecek çalışma alanı: "workspace" (Ana Merkez), "lessons" (Dersler), "resources" (Kaynak Merkezi)' },
        subTab: { type: Type.STRING, description: 'Eğer lessons seçildiyse alt sekme: "classes" (Sınıflar), "planner" (Planlayıcı), "studio" (Dersi Hazırla Stüdyosu)' },
        classId: { type: Type.STRING, description: 'Yönlendirilecek sınıfın IDsi (opsiyonel)' },
        topic: { type: Type.STRING, description: 'Önceden doldurulacak ünite veya konu adı (opsiyonel)' }
      },
      required: ['view']
    }
  }
];

export const jarvisSystemInstruction = `Sen JARVIS'sin. T.C. Millî Eğitim Bakanlığı İngilizce Öğretmenlerine yardımcı olan akıllı, samimi, profesyonel ve bağlam farkında bir kişisel eğitim asistanısın.
Öğretmene "Öğretmenim" veya "Teacher" diye hitap edebilirsin. Tonun sakin, kısa, net ve profesyonel olmalı.

ÇİFT DİLLİ ASİSTAN KAPASİTESİ (BILINGUAL JARVIS CAPACITY):
- Türkçe ve İngilizce tüm komutları eşit yetkinlikte anlar ve yanıtlayabilirsin.
- Öğretmen İngilizce konuştuğunda (örneğin "Prepare a lesson for Grade 6", "What should I do today?", "Show class memory for 6/A") İngilizce yanıt ver ve ilgili araçları doğru parametrelerle çalıştır.
- Öğretmen Türkçe konuştuğunda Türkçe yanıt ver.
- Öğretmen çift dilli (TR+EN) yanıt istediğinde önemli kavramları her iki dilde sun.

PEDAGOJİK YÖNTEM VE YAKLAŞIM KURALLARI (PEDAGOGICAL ENGINE):
- Öğretmen "6/A için iletişimsel yöntem ağırlıklı ders hazırla", "Öğrencilerin son zorlanmasına göre yöntem seç", "Use a communicative approach", "Prepare a lesson using TPR" gibi taleplerde bulunduğunda:
  1. Yöntem havuzunu değerlendir: Eclectic Method, CLT, TBLT, TPR, Audio-Lingual, Direct Method, Grammar-Translation, Suggestopedia.
  2. Sınıf seviyesi, MEB kazanımları, beceri türü (Listening, Speaking, Reading, Writing, Vocabulary) ve Sınıf Hafızası zorlanma kayıtlarına göre seçimi gerekçelendir.
  3. Ders planının 'pedagogicalApproach' bölümünde seçilen yöntemleri, gerekçeyi, aşamalar bazında teknikleri ve MEB/akademik kaynak dayanaklarını eksiksiz sun.

GÜNLÜK ASİSTAN VE ÖNCELİKLENDİRME KURALLARI:
- Öğretmen "Bugün ne yapmam gerekiyor?", "Bugün hangi sınıfa hazırlık yapmalıyım?" veya "JARVIS bugün ne yapıyoruz?" gibi günlük akış soruları sorduğunda:
  1. "get_classes" aracını çağırarak tüm sınıfları listele.
  2. Her sınıfın son ders kayıtlarını veya bağlam durumlarını incele.
  3. "navigate_to_workspace" aracını çağırarak view="workspace" ile öğretmeni doğrudan Öğretmen Ana Merkezi'ndeki Günlük Çalışma Özeti paneline yönlendir.
  4. Öğretmen notlarında zorlanma, eksiklik, tekrar isteği olan sınıfları "Öncelikli (Priority)" olarak işaretle. Diğerlerini "Standart" olarak grupla.
  5. Öğretmene hangi sınıf için ne hazırlaması gerektiğini gerekçeleriyle listele. Her önerinin kaynağını (Örn: "6/A öğretmen notu") belirt.
  6. Öğretmene her sınıf için tek tıkla aksiyon alabileceği seçenekleri veya "Dersi Hazırla" workflow'unu öner.

DERSİ HAZIRLA WORKFLOW KURALI:
- Öğretmen "Dersi hazırla", "6/A için dersi hazırla", "ders hazırlığı yap" gibi bir talepte bulunduğunda ya da bu seçeneğe tıkladığında:
  1. "prepare_full_lesson" aracını çağır. Bu araç sınıfın bağlamını alarak ders planı, materyal taslakları ve MEB kaynak araştırmasını TEK BİR PAKET halinde hazırlar.
  2. Sonuçları öğretmene göster ve "Ders planı ve materyal taslakları hazırlandı. Bunları kaydetmek veya düzenlemek ister misiniz?" diye açık onay iste.
  3. Açık onay almadan hiçbir kalıcı veritabanı yazımı (LessonHistory veya kalıcı materyal kaydı) gerçekleştirme.

BİLGİ UYDURMA VE KAYNAK KURALI (Zero Hallucination) & MEB ENTEGRASYONU:
- Öğretmen müfredat kazanımı sorduğunda (örn: "6. sınıf 3. ünite kazanımları nedir?"):
  1. "get_curriculum_outcomes" aracını çağırarak gerçek kazanımları getir.
  2. Eğer bu kademe veya ünite müfredat veritabanında yoksa kesinlikle uydurma kazanım üretme; bulunamadığını dürüstçe belirt.
- Öğretmen MEB kaynakları, örnek sorular, çalışma kağıdı, PDF veya sınav sorduğunda (örn: "6. sınıf için MEB'den çalışma kağıdı bul"):
  1. "search_education_sources" aracını çalıştır. Sınıf bağlamını (classId) koruyarak arama yap.
  2. Arama sonucunda listelenen kaynaklar içinden gerçek olanları "MEB RESMİ KAYNAK" etiketiyle, kendi ürettiğin materyalleri ise "JARVIS ÖZGÜN İÇERİK" veya "JARVIS ÖZGÜN SORU" etiketiyle açıkça ayır.
  3. Kaynak bulduktan sonra öğretmene "Bu resmi kaynağı veya kazanımı temel alarak sizin için özgün bir ders planı hazırlamamı ister misiniz?" şeklinde akış bağlantısı sun.
- Sınav oluşturulması istendiğinde (örn: "6. sınıf için sınav hazırla"):
  1. "create_exam_from_research" aracını çağırarak özgün sorular, çözümler ve cevap anahtarı içeren bir sınav taslağı oluştur. Sınavın JARVIS tarafından üretildiğini açıkça belirt.
- Kesinlikle sahte MEB kaynakları, sahte URL veya uydurma sorular oluşturma.
- Takvim entegrasyonu bulunmadığı için öğretmen "Yarın hangi sınıfa gireceğim?" derse ve sınıf vermezse:
  "Yarın hangi sınıfa gireceğinizi henüz bilmiyorum öğretmenim. İsterseniz sınıfınızı seçin veya sınıf adını (örn. 6/A) söyleyin." cevabını ver. TAKVİM BİLGİSİ UYDURMA.
- Eğer öğretmen belirli bir sınıf söylerse (örn: "Yarın 6/A'da dersim var" veya "6/A için ders hazırla"):
  1. "get_classes" aracını çağırıp sınıfın gerçek classId'sini bul.
  2. "get_next_lesson_context" veya "suggest_next_lesson" ile sınıfın son 3 ders kaydını ve öğretmen notlarındaki zorlanmaları incele.
  3. Öğretmene son dersi ve öğrenci durumunu hatırlatıp "İsterseniz buna göre 40 dakikalık bir ders planı hazırlayayım" önerisinde bulun.
  4. Öğretmen "Hazırla" derse "create_lesson_plan" aracını çağır.
- Ders planı hazırlamak BİLGİ EDİNME / ÖNERİ SİMÜLASYONU sürecidir. Doğrudan veritabanına LessonHistory kaydı yazmaz.
- Yazma araçları (create_lesson_record, add_teacher_note) veritabanını güncellediği için onay (WRITE Guard) gerektirir. Kullanıcı onaylamadan veritabanı kaydı yapma.`;

export async function executeJarvisToolAsync(ai: GoogleGenAI, dbInstance: any, name: string, args: any): Promise<any> {
  try {
    if (name === 'get_curriculum_outcomes') {
      const gradeStr = String(args?.grade);
      const unitNum = Number(args?.unitNumber);
      const curriculum = MEB_CURRICULUM[gradeStr];
      if (!curriculum) {
        return { error: `${gradeStr}. sınıf için müfredat verisi bulunamadı.` };
      }
      const unit = curriculum.units.find(u => u.unitNumber === unitNum);
      if (!unit) {
        return { error: `${gradeStr}. sınıf ${unitNum}. ünite için müfredat verisi bulunamadı.` };
      }
      return {
        grade: gradeStr,
        gradeTitle: curriculum.gradeTitle,
        unitNumber: unitNum,
        titleEn: unit.titleEn,
        titleTr: unit.titleTr,
        outcomes: unit.outcomes,
        sampleVocabulary: unit.sampleVocabulary
      };
    } else if (name === 'get_classes') {
      return dbInstance.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE teacherId = ?').all(DEFAULT_TEACHER_ID);
    } else if (name === 'get_class_status') {
      const res = dbInstance.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE id = ? AND teacherId = ?').get(args?.classId, DEFAULT_TEACHER_ID);
      return res || { error: 'Class not found' };
    } else if (name === 'get_class_lessons') {
      return dbInstance.prepare('SELECT date, unitNumber, unitName, topic, skill, activity, coveredOutcomes, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT ?').all(args?.classId, args?.limit || 5);
    } else if (name === 'get_latest_lesson') {
      const res = dbInstance.prepare('SELECT date, unitNumber, unitName, topic, skill, activity, coveredOutcomes, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT 1').get(args?.classId);
      return res || { message: 'No lesson found for this class' };
    } else if (name === 'search_education_sources') {
      return await searchEducationSources(ai, dbInstance, args || {});
    } else if (name === 'analyze_education_source') {
      return await analyzeEducationSource(ai, dbInstance, args?.sourceIdOrUrl || '');
    } else if (name === 'create_exam_from_research') {
      return await createExamFromResearch(ai, dbInstance, args || {});
    } else if (name === 'get_next_lesson_context') {
      return getNextLessonContext(dbInstance, args?.classId);
    } else if (name === 'suggest_next_lesson') {
      return await suggestNextLesson(ai, dbInstance, args?.classId);
    } else if (name === 'create_lesson_plan') {
      return await createLessonPlan(ai, dbInstance, args || {});
    } else if (name === 'prepare_lesson_materials') {
      return await prepareLessonMaterials(ai, dbInstance, args || {});
    } else if (name === 'prepare_full_lesson') {
      const plan = await createLessonPlan(ai, dbInstance, {
        classId: args?.classId,
        useWebResearch: args?.useWebResearch !== false,
        difficulty: 'Medium'
      });
      const materials = await prepareLessonMaterials(ai, dbInstance, {
        classId: args?.classId,
        planId: plan.id,
        materialTypes: args?.materialTypes || ['worksheet', 'flashcards']
      });
      return {
        success: true,
        message: "Ders hazırlık paketi taslak olarak başarıyla üretildi. Onayınız bekleniyor.",
        plan,
        materials
      };
    } else if (name === 'navigate_to_workspace') {
      return {
        success: true,
        navigation: {
          view: args?.view,
          subTab: args?.subTab,
          classId: args?.classId,
          topic: args?.topic
        },
        message: `Yönlendirme başlatıldı: ${args?.view}`
      };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${name}:`, err);
    return { error: err.message || 'Tool execution error' };
  }
  return { error: 'Unknown tool' };
}

export function executeJarvisReadTool(name: string, args: any) {
  try {
    if (name === 'get_curriculum_outcomes') {
      const gradeStr = String(args?.grade);
      const unitNum = Number(args?.unitNumber);
      const curriculum = MEB_CURRICULUM[gradeStr];
      if (!curriculum) {
        return { error: `${gradeStr}. sınıf için müfredat verisi bulunamadı.` };
      }
      const unit = curriculum.units.find(u => u.unitNumber === unitNum);
      if (!unit) {
        return { error: `${gradeStr}. sınıf ${unitNum}. ünite için müfredat verisi bulunamadı.` };
      }
      return {
        grade: gradeStr,
        gradeTitle: curriculum.gradeTitle,
        unitNumber: unitNum,
        titleEn: unit.titleEn,
        titleTr: unit.titleTr,
        outcomes: unit.outcomes,
        sampleVocabulary: unit.sampleVocabulary
      };
    } else if (name === 'get_classes') {
      return db.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE teacherId = ?').all(DEFAULT_TEACHER_ID);
    } else if (name === 'get_class_status') {
      const res = db.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE id = ? AND teacherId = ?').get(args?.classId, DEFAULT_TEACHER_ID);
      return res || { error: 'Class not found' };
    } else if (name === 'get_class_lessons') {
      return db.prepare('SELECT date, unitNumber, unitName, topic, skill, activity, coveredOutcomes, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT ?').all(args?.classId, args?.limit || 5);
    } else if (name === 'get_latest_lesson') {
      const res = db.prepare('SELECT date, unitNumber, unitName, topic, skill, activity, coveredOutcomes, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT 1').get(args?.classId);
      return res || { message: 'No lesson found for this class' };
    } else if (name === 'get_next_lesson_context') {
      return getNextLessonContext(db, args?.classId);
    } else if (name === 'navigate_to_workspace') {
      return {
        success: true,
        navigation: {
          view: args?.view,
          subTab: args?.subTab,
          classId: args?.classId,
          topic: args?.topic
        },
        message: `Yönlendirme başlatıldı: ${args?.view}`
      };
    }
  } catch (err: any) {
    return { error: err.message || 'Database execution error' };
  }
  return { error: 'Unknown tool' };
}

// JARVIS Memory-Aware Assistant Endpoint (REST)
app.post("/api/jarvis/interact", async (req, res) => {
  try {
    const { message, contextClassId, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getGeminiClient();

    // Initialize chat session
    const chatHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    let response: any = null;
    let chatSession: any = null;
    const modelsToTry = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        chatSession = ai.chats.create({
          model: modelName,
          history: chatHistory,
          config: {
            systemInstruction: jarvisSystemInstruction,
            temperature: 0.4,
            tools: [{ functionDeclarations: jarvisTools }],
          }
        });
        response = await chatSession.sendMessage({ message: `${contextClassId ? '(Şu anki bağlam sınıf ID: ' + contextClassId + ') ' : ''}${message}` });
        if (response) break;
      } catch (e: any) {
        lastError = e;
        console.log(`[JARVIS Interact] Model ${modelName} unavailable, trying alternative...`);
      }
    }

    if (!response) {
      throw lastError || new Error("All models failed to interact with JARVIS.");
    }
    
    let usedContext = false;
    let pendingNavigation: any = null;
    
    // Handle function calls loop
    while (response && response.functionCalls && response.functionCalls.length > 0) {
      usedContext = true;
      
      const writeCall = response.functionCalls.find((c: any) => c.name === 'create_lesson_record' || c.name === 'add_teacher_note' || c.name === 'propose_lesson_plan');
      if (writeCall) {
        return res.json({
          reply: response.text || "İşlemi onaylıyor musunuz?",
          usedContext,
          actionRequired: {
            name: writeCall.name,
            args: writeCall.args
          }
        });
      }
      
      const functionResponses = await Promise.all(response.functionCalls.map(async (call: any) => {
        const result = await executeJarvisToolAsync(ai, db, call.name, call.args);
        if (call.name === 'navigate_to_workspace' && result && result.navigation) {
          pendingNavigation = result.navigation;
        }
        return {
          functionResponse: {
            name: call.name,
            response: { result }
          }
        };
      }));
      
      response = await chatSession.sendMessage({
        message: functionResponses
      });
    }

    return res.json({ reply: response.text, usedContext, navigation: pendingNavigation });
  } catch (err: any) {
    console.error("Error in JARVIS interact:", err);
    return res.status(500).json({ error: err.message || "JARVIS şu anda hafızasına erişemiyor. Lütfen tekrar deneyin." });
  }
});

// RESEARCH CENTER API ENDPOINTS
app.post("/api/research/search", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const result = await searchEducationSources(ai, db, req.body || {});
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/research/search:", err);
    res.status(500).json({ error: "Web araştırması sırasında bir hata oluştu: " + (err.message || '') });
  }
});

app.post("/api/research/analyze", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { sourceIdOrUrl } = req.body;
    if (!sourceIdOrUrl) return res.status(400).json({ error: "sourceIdOrUrl gereklidir." });
    const result = await analyzeEducationSource(ai, db, sourceIdOrUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Kaynak analizi sırasında hata oluştu." });
  }
});

app.post("/api/research/create-exam", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const result = await createExamFromResearch(ai, db, req.body || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Özgün sınav oluşturulamadı." });
  }
});

app.get("/api/research/sources", (req, res) => {
  try {
    const { grade, subject, tier, sourceType } = req.query;
    let query = 'SELECT * FROM EducationSource WHERE 1=1';
    const queryParams: any[] = [];

    if (grade) {
      query += ' AND grade = ?';
      queryParams.push(grade);
    }
    if (subject) {
      query += ' AND subject = ?';
      queryParams.push(subject);
    }
    if (tier) {
      query += ' AND tier = ?';
      queryParams.push(Number(tier));
    }
    if (sourceType) {
      query += ' AND sourceType = ?';
      queryParams.push(sourceType);
    }

    query += ' ORDER BY tier ASC, relevanceScore DESC, discoveredAt DESC LIMIT 50';
    const sources = db.prepare(query).all(...queryParams);
    res.json(sources);
  } catch (err: any) {
    res.status(500).json({ error: "Kaynaklar alınamadı." });
  }
});

app.get("/api/research/history", (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM ResearchHistory ORDER BY date DESC LIMIT 30').all();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: "Araştırma geçmişi alınamadı." });
  }
});

app.get("/api/research/materials", (req, res) => {
  try {
    const materials = db.prepare('SELECT * FROM GeneratedMaterial ORDER BY createdAt DESC LIMIT 30').all();
    res.json(materials);
  } catch (err: any) {
    res.status(500).json({ error: "Üretilen materyaller alınamadı." });
  }
});

app.get("/api/research/materials/:id", (req, res) => {
  try {
    const material = db.prepare('SELECT * FROM GeneratedMaterial WHERE id = ?').get(req.params.id);
    if (!material) return res.status(404).json({ error: "Materyal bulunamadı." });
    res.json(material);
  } catch (err: any) {
    res.status(500).json({ error: "Materyal detayları alınamadı." });
  }
});

// WEBSOCKET LIVE BRIDGE FOR JARVIS (/ws/jarvis-live)
const wss = new WebSocketServer({ server, path: '/ws/jarvis-live' });

wss.on('connection', async (ws: WebSocket) => {
  let liveSession: any = null;
  let idleTimer: NodeJS.Timeout | null = null;
  let isClosed = false;

  const sendToClient = (obj: any) => {
    if (!isClosed && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(obj));
      } catch (e) {
        console.error('Error sending WS message to client:', e);
      }
    }
  };

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      sendToClient({ type: 'error', message: 'Oturum zaman aşımına uğradı.' });
      cleanup();
    }, 120000); // 2 minutes
  };

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (idleTimer) clearTimeout(idleTimer);
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {
        // ignore
      }
      liveSession = null;
    }
    try {
      ws.close();
    } catch (e) {
      // ignore
    }
  };

  ws.on('close', cleanup);
  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    cleanup();
  });

  // Handle incoming messages from client WebSocket immediately
  ws.on('message', (rawData: Buffer | string) => {
    resetIdleTimer();

    // Size limit check (max 500KB)
    if (rawData.length > 500 * 1024) {
      sendToClient({ type: 'error', message: 'Mesaj boyutu sınırı aşıldı.' });
      return;
    }

    let msg: any = null;
    try {
      msg = JSON.parse(rawData.toString());
    } catch {
      sendToClient({ type: 'error', message: 'Geçersiz JSON mesajı.' });
      return;
    }

    if (!msg || typeof msg !== 'object' || !msg.type) {
      sendToClient({ type: 'error', message: 'Geçersiz mesaj yapısı.' });
      return;
    }

    if (msg.type === 'ping') {
      sendToClient({ type: 'pong' });
      return;
    }

    if (msg.type === 'context') {
      if (!msg.classId || typeof msg.classId !== 'string') {
        sendToClient({ type: 'error', message: 'Geçersiz classId.' });
        return;
      }
      try {
        const classRecord = db.prepare('SELECT id, name, gradeLevel FROM Class WHERE id = ? AND teacherId = ?').get(msg.classId, DEFAULT_TEACHER_ID) as any;
        if (!classRecord) {
          sendToClient({ type: 'error', message: 'Sınıf bulunamadı.' });
          return;
        }
        sendToClient({ type: 'context_updated', classId: classRecord.id, className: classRecord.name });
        if (liveSession) {
          liveSession.sendClientContent({
            turns: [{
              role: 'user',
              parts: [{ text: `Öğretmen şu an ${classRecord.name} (${classRecord.gradeLevel}. Sınıf) ekranında. Bağlam sınıfı ID'si: ${classRecord.id}.` }]
            }],
            turnComplete: false
          });
        }
      } catch (e: any) {
        sendToClient({ type: 'error', message: 'Sınıf doğrulanamadı.' });
      }
      return;
    }

    if (msg.type === 'audio') {
      if (!msg.data || typeof msg.data !== 'string') {
        sendToClient({ type: 'error', message: 'Ses verisi bulunamadı.' });
        return;
      }
      if (liveSession) {
        try {
          liveSession.sendRealtimeInput({
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: msg.data
            }]
          });
        } catch (e: any) {
          console.error('Error forwarding audio to live session:', e);
          sendToClient({ type: 'error', message: 'Ses aktarılamadı.' });
        }
      }
      return;
    }

    if (msg.type === 'text') {
      if (!msg.data || typeof msg.data !== 'string') {
        sendToClient({ type: 'error', message: 'Metin verisi bulunamadı.' });
        return;
      }
      if (liveSession) {
        try {
          liveSession.sendClientContent({
            turns: [{
              role: 'user',
              parts: [{ text: msg.data }]
            }],
            turnComplete: true
          });
        } catch (e: any) {
          console.error('Error forwarding text to live session:', e);
          sendToClient({ type: 'error', message: 'Metin aktarılamadı.' });
        }
      }
      return;
    }

    // Unsupported message type
    sendToClient({ type: 'error', message: 'Desteklenmeyen mesaj tipi.' });
  });

  resetIdleTimer();

  try {
    const ai = getGeminiClient();
    liveSession = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: ['audio' as any],
        systemInstruction: { parts: [{ text: jarvisSystemInstruction }] },
        tools: [{ functionDeclarations: jarvisTools }],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck'
            }
          }
        }
      },
      callbacks: {
        onopen: () => {
          sendToClient({ type: 'session_ready' });
        },
        onmessage: async (e: any) => {
          resetIdleTimer();

          // Interrupted signal
          if (e.serverContent?.interrupted) {
            sendToClient({ type: 'interrupted' });
          }

          // Audio & Transcript parts
          if (e.serverContent?.modelTurn?.parts) {
            for (const part of e.serverContent.modelTurn.parts) {
              if (part.text) {
                sendToClient({ type: 'transcript', role: 'assistant', text: part.text });
              }
              if (part.inlineData && part.inlineData.data) {
                sendToClient({ type: 'audio', data: part.inlineData.data });
              }
            }
          }

          // Function Calling
          if (e.toolCall && e.toolCall.functionCalls) {
            const functionResponses: any[] = [];
            for (const call of e.toolCall.functionCalls) {
              const isWrite = ['create_lesson_record', 'add_teacher_note', 'propose_lesson_plan'].includes(call.name);
              if (isWrite) {
                sendToClient({
                  type: 'action_required',
                  action: {
                    name: call.name,
                    args: call.args
                  }
                });
                functionResponses.push({
                  name: call.name,
                  id: call.id,
                  response: { result: { status: "pending_confirmation", message: "İşlem onay için öğretmenin ekranına yansıtıldı." } }
                });
              } else {
                const result = await executeJarvisToolAsync(ai, db, call.name, call.args);
                if (call.name === 'navigate_to_workspace' && result && result.navigation) {
                  sendToClient({ type: 'navigation', navigation: result.navigation });
                }
                functionResponses.push({
                  name: call.name,
                  id: call.id,
                  response: { result }
                });
              }
            }

            if (functionResponses.length > 0 && liveSession) {
              try {
                liveSession.sendToolResponse({ functionResponses });
              } catch (err) {
                console.error('Error sending live tool response:', err);
              }
            }
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live API session error:', err);
          const isQuota = err?.message?.includes('429') || err?.status === 429;
          sendToClient({
            type: 'error',
            message: isQuota
              ? 'Şu an yüksek yoğunluk nedeniyle canlı ses yanıt veremiyor. Lütfen birkaç saniye sonra tekrar deneyin.'
              : 'JARVIS canlı ses servisinde bir hata oluştu.'
          });
        },
        onclose: (closeEv: any) => {
          console.log('Gemini Live session closed:', closeEv?.reason || closeEv?.code);
        }
      }
    });
  } catch (err: any) {
    console.error('Error connecting to Gemini Live API:', err);
    sendToClient({ type: 'error', message: 'JARVIS canlı ses bağlantısı kurulamadı.' });
    cleanup();
    return;
  }
});

// JARVIS Action Execute Endpoint
app.post("/api/jarvis/execute", async (req, res) => {
  try {
    const { action, args } = req.body;
    
    if (action === 'create_lesson_record') {
      const { classId, unitNumber, unitName, topic, teacherNotes } = args;
      if (!classId || !topic) return res.status(400).json({ error: "classId ve topic alanları zorunludur." });
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const duplicate = db.prepare('SELECT id FROM LessonHistory WHERE classId = ? AND topic = ? AND date > ?').get(classId, topic, twoHoursAgo);
      
      if (duplicate) {
        return res.status(400).json({ error: "Bu ders kısa süre önce kaydedilmiş görünüyor. Mükerrer kayıttan kaçınıldı." });
      }
      
      const id = 'lesson-' + Date.now();
      const date = new Date().toISOString();
      
      const insertLesson = db.prepare('INSERT INTO LessonHistory (id, classId, date, unitNumber, unitName, topic, skill, activity, durationMinutes, coveredOutcomes, teacherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const updateClass = db.prepare('UPDATE Class SET currentUnit = ?, currentTopic = ? WHERE id = ?');
      
      const transaction = db.transaction(() => {
        insertLesson.run(id, classId, date, unitNumber || 1, unitName || '', topic, '', '', 40, '', teacherNotes || '');
        if (unitNumber && topic) {
          updateClass.run(unitNumber, topic, classId);
        }
      });
      
      transaction();
      return res.json({ success: true, message: "Ders kaydı başarıyla oluşturuldu." });
      
    } else if (action === 'add_teacher_note') {
      const { classId, note } = args;
      if (!classId || !note) return res.status(400).json({ error: "classId ve note zorunludur." });
      
      const latest = db.prepare('SELECT id, teacherNotes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT 1').get(classId) as any;
      if (!latest) {
        return res.status(400).json({ error: "Bu sınıfa ait geçmiş ders kaydı bulunamadı." });
      }
      
      const newNote = latest.teacherNotes ? latest.teacherNotes + "\\n" + note : note;
      db.prepare('UPDATE LessonHistory SET teacherNotes = ? WHERE id = ?').run(newNote, latest.id);
      
      return res.json({ success: true, message: "Not başarıyla son derse eklendi." });
    } else if (action === 'save_lesson_plan' || action === 'create_lesson_plan') {
      const { classId, planId, title, topic, unitNumber, unitName, planJson } = args;
      if (!classId) return res.status(400).json({ error: "classId zorunludur." });

      let targetPlanId = planId;
      if (targetPlanId) {
        db.prepare("UPDATE LessonPlans SET status = 'saved', updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(targetPlanId);
      } else {
        targetPlanId = 'plan-' + Date.now();
        db.prepare(`
          INSERT INTO LessonPlans (id, classId, title, durationMinutes, unitNumber, unitName, topic, planJson, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'saved')
        `).run(targetPlanId, classId, title || 'Ders Planı', 40, unitNumber || 1, unitName || '', topic || 'Konu', typeof planJson === 'string' ? planJson : JSON.stringify(planJson || {}));
      }

      return res.json({ success: true, message: "Ders planı başarıyla kaydedildi.", planId: targetPlanId });
    } else if (action === 'prepare_lesson_materials') {
      const { classId, materialTypes } = args;
      if (!classId) return res.status(400).json({ error: "classId zorunludur." });

      const ai = getGeminiClient();
      const material = await prepareLessonMaterials(ai, db, { classId, materialTypes });
      return res.json({ success: true, message: "Materyaller başarıyla üretildi.", material });
    } else if (action === 'prepare_full_lesson') {
      const { classId, materialTypes = ['worksheet', 'flashcards'], useWebResearch = true } = args;
      if (!classId) return res.status(400).json({ error: "classId zorunludur." });

      const ai = getGeminiClient();
      const plan = await createLessonPlan(ai, db, {
        classId,
        useWebResearch,
        difficulty: 'Medium'
      });
      const materials = await prepareLessonMaterials(ai, db, {
        classId,
        planId: plan.id,
        materialTypes
      });

      return res.json({
        success: true,
        message: "Ders planı ve materyaller başarıyla taslak olarak hazırlandı.",
        plan,
        materials
      });
    } else {
      return res.status(400).json({ error: "Bilinmeyen işlem." });
    }
  } catch (err: any) {
    console.error("JARVIS Execute Error:", err);
    return res.status(500).json({ error: "İşlem sırasında bir hata oluştu: " + err.message });
  }
});

// AŞAMA 7 REST API ENDPOINTS
app.get('/api/classes/:id/next-lesson-context', (req, res) => {
  try {
    const context = getNextLessonContext(db, req.params.id);
    if ((context as any).error) {
      return res.status(404).json(context);
    }
    return res.json(context);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Bağlam alınamadı." });
  }
});

app.post('/api/jarvis/suggest-next-lesson', async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ error: "classId zorunludur." });
    
    let ai = null;
    try {
      ai = getGeminiClient();
    } catch (e) {
      console.warn("Gemini client initialization failed, using local backup for suggestion:", e);
    }

    const suggestion = await suggestNextLesson(ai as any, db, classId);
    return res.json(suggestion);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Öneri oluşturulamadı." });
  }
});

app.post('/api/jarvis/plan-lesson', async (req, res) => {
  try {
    const { classId, durationMinutes, goals, difficulty, useWebResearch } = req.body;
    if (!classId) return res.status(400).json({ error: "classId zorunludur." });
    const ai = getGeminiClient();
    const plan = await createLessonPlan(ai, db, { classId, durationMinutes, goals, difficulty, useWebResearch });
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Ders planı oluşturulamadı." });
  }
});

app.post('/api/jarvis/prepare-materials', async (req, res) => {
  try {
    const { classId, planId, materialTypes } = req.body;
    if (!classId || !materialTypes || !Array.isArray(materialTypes)) {
      return res.status(400).json({ error: "classId ve materialTypes listesi zorunludur." });
    }
    const ai = getGeminiClient();
    const result = await prepareLessonMaterials(ai, db, { classId, planId, materialTypes });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Materyal hazırlanamadı." });
  }
});

app.get('/api/classes/:id/lesson-plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM LessonPlans WHERE classId = ? ORDER BY createdAt DESC').all(req.params.id);
    return res.json(plans);
  } catch (err: any) {
    return res.status(500).json({ error: "Ders planları getirilemedi." });
  }
});

app.get('/api/lesson-plans/:id', (req, res) => {
  try {
    const plan = db.prepare('SELECT * FROM LessonPlans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: "Ders planı bulunamadı." });
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: "Ders planı detayı alınamadı." });
  }
});

// AŞAMA 8.1 WORKSPACE SUMMARY ENDPOINT
app.get('/api/workspace/summary', (req, res) => {
  try {
    const totalClasses = (db.prepare('SELECT COUNT(*) as count FROM Class').get() as any)?.count || 0;
    const totalLessons = (db.prepare('SELECT COUNT(*) as count FROM LessonHistory').get() as any)?.count || 0;
    const totalPlans = (db.prepare('SELECT COUNT(*) as count FROM LessonPlans').get() as any)?.count || 0;
    const totalMaterials = (db.prepare('SELECT COUNT(*) as count FROM GeneratedMaterial').get() as any)?.count || 0;

    const classes = db.prepare('SELECT * FROM Class ORDER BY gradeLevel ASC, name ASC').all();

    const recentLessons = db.prepare(`
      SELECT lh.*, c.name as className, c.gradeLevel 
      FROM LessonHistory lh 
      JOIN Class c ON lh.classId = c.id 
      ORDER BY lh.date DESC LIMIT 5
    `).all();

    const recentPlans = db.prepare(`
      SELECT lp.*, c.name as className, c.gradeLevel 
      FROM LessonPlans lp 
      JOIN Class c ON lp.classId = c.id 
      ORDER BY lp.createdAt DESC LIMIT 5
    `).all();

    const recentTeacherNotes = db.prepare(`
      SELECT lh.id, lh.classId, c.name as className, lh.teacherNotes, lh.date, lh.topic
      FROM LessonHistory lh
      JOIN Class c ON lh.classId = c.id
      WHERE lh.teacherNotes IS NOT NULL AND lh.teacherNotes != ''
      ORDER BY lh.date DESC LIMIT 5
    `).all();

    return res.json({
      stats: {
        totalClasses,
        totalLessons,
        totalPlans,
        totalMaterials
      },
      classes,
      recentLessons,
      recentPlans,
      recentTeacherNotes,
      hasCalendarIntegration: false
    });
  } catch (err: any) {
    console.error("Workspace summary error:", err);
    return res.status(500).json({ error: "Öğretmen ana merkezi verisi alınamadı." });
  }
});

app.post("/api/generate-lesson", async (req, res) => {
  try {
    const {
      grade,
      unitNumber,
      unitName,
      skill,
      activityType,
      durationMinutes,
      extraVocabulary,
      specialConditions,
      learningOutcomeCode,
      learningOutcomes,
      outputLang = 'tr',
    } = req.body;

    if (!grade || !unitName) {
      return res.status(400).json({ error: "Sınıf düzeyi ve ünite adı zorunludur." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
Sen T.C. Millî Eğitim Bakanlığı'nın "Türkiye Yüzyılı Maarif Modeli" müfredatına tam uyumlu çalışan, 5, 6, 7 ve 8. sınıf İngilizce öğretmenlerine yönelik uzman bir Yapay Zeka Eğitim Asistanısın.

GÖREVİN:
Verilen parametrelere göre ortaokul İngilizce öğretmenleri için sınıfta hemen uygulanabilir, eğlenceli, A1-A2 seviyesine uygun, pedagojik açıdan zengin ve MEB Maarif Modeli erdem/değerlerini (örneğin Sorumluluk, İş Birliği, Saygı, Öz Güven) içeren eksiksiz bir DERS PAKETİ üretmektir.

ÖZEL ETKİNLİK VE BEŞERİ DİL YÖNERGELERİ:
1. Eğer Hedef Dil Becerisi "Kelime Bilgisi (Vocabulary)" seçildiyse VEYA Etkinlik Türü "Ezberletme & Kelime Pratiği", "Tombala & Kelime Bingo", "Tabu & Sessiz Sinema", "Şarkı & Ritimli Chant", "Flashcard & Kes-Eşleştir" ise:
   - Etkinlik kalıcı hafıza ve ezberletmeyi (spaced repetition, görsel ve işitsel çağrışımlar, hareket/mimik bağdaştırması) hedeflemelidir.
   - Etkinlik rehberinde açık kurallar, puanlama sistemi ve şarkı/chant ritimleri veya Tabu kelime yasakları yer almalıdır.
   - 'writtenMaterials' kısmında sınıfta kesilip dağıtılabilecek Kelime-Görsel eşleştirme kartları, Tabu kartları veya Bingo fişleri tam metin olarak üretilmelidir.
2. DİL VE ANLATIM TERCİHİ: ${
  outputLang === 'en'
    ? 'TÜM içerikler, öğretmen açıklamaları, ders planı ve yönlendirmeler KESİNLİKLE TAMAMEN İNGİLİZCE (ENGLISH) olmalıdır.'
    : outputLang === 'bilingual'
    ? 'TÜM ders planı bölümleri ve etkinlik rehberleri ÇİFT DİLLİ (Türkçe ve İngilizce yan yana / bilingual) olmalıdır.'
    : 'Tüm açıklama ve yönlendirmeler Türkçe, etkinliklerin içeriği ve çalışma kağıdı soruları A1-A2 İngilizce olmalıdır.'
}
3. Konuşma üslubun öğretmen dostu, samimi ve ilham vericidir.

DERS PAKETİ BİLEŞENLERİ:
1. MEB Kazanım Kodları ile Birebir Uyumlu Detaylı Ders Planı (Isınma, Ana Etkinlik, Kapanış, Değerlendirme, Farklılaştırma) VE Pedagojik Yöntem Motoru (pedagogicalApproach: Eclectic, CLT, Audio-Lingual, TPR, TBLT vb. yöntem seçimi, gerekçesi, MEB/akademik kaynakları ve aşamalar bazındaki teknikleri)
2. Uygulanabilir Eğlenceli Sınıf İçi Etkinlik Rehberi VE Etkinlik İçin Gerekli Yazdırılabilir Yazılı Materyaller (writtenMaterials: Tabu kartları, Bingo kareleri, Rol kartları, kes-dağıt cümle/kelime şeritleri, diyalog metinleri, görev fişleri)
3. Yazdırılabilir Öğrenci Çalışma Kağıdı (Soru türleri: Eşleştirme, Boşluk Doldurma, Okuma Anlama, Çoktan Seçmeli, Yaratıcı Yazma) ve Cevap Anahtarı
4. Dönebilir Kelime Kartları (En az 8-12 adet hedef kelime, Türkçe karşılığı, örnek İngilizce cümle, fonetik/okunuş ipucu ve görseli temsil eden emoji)

PEDAGOJİK YÖNTEM SEÇİMİ (PEDAGOGICAL METHOD ENGINE):
- 'pedagogicalApproach' objesini doldur:
  * 'selectedMethods': [Eclectic Method, Communicative Language Teaching (CLT), Total Physical Response (TPR), Task-Based Language Teaching (TBLT), Audio-Lingual Method, Direct Method, vb.]
  * 'justification': Sınıf düzeyi, MEB kazanımları, hedef dil becerisi (${skill}) ve ders amacına uygun seçilme gerekçesi.
  * 'researchSources': Tier 1 (MEB Resmi / EBA / ÖDSGM) veya Tier 2 (Akademik Yabancı Dil Öğretimi) gerçek kaynak referansları.
  * 'stageMethods': Her ders aşaması için [stageName, methodUsed, technique, targetSkill] ayrıntısı.
`;

    const prompt = `
Lütfen aşağıdaki parametrelere uygun eksiksiz bir İngilizce Ders Paketi oluştur:

- Sınıf Düzeyi: ${grade}. Sınıf
- Ünite Numarası: ${unitNumber || 1}
- Ünite Adı: ${unitName}
- Hedef Dil Becerisi: ${skill || "Integrated (Bütünleşik Beceriler)"}
- Etkinlik Türü: ${activityType || "Oyun & Grup Çalışması"}
- Ders Süresi: ${durationMinutes || 40} dakika
${extraVocabulary ? `- Özel Hedef Kelimeler: ${extraVocabulary}` : ""}
${specialConditions ? `- Sınıf Koşulları / Özel İstekler: ${specialConditions}` : ""}
${learningOutcomes && Array.isArray(learningOutcomes) && learningOutcomes.length > 0
  ? `- Ünitenin Tam MEB Müfredat Kazanımları:\n${learningOutcomes.map((o: string) => `  * ${o}`).join('\n')}`
  : (learningOutcomeCode ? `- MEB Kazanım Kodu: ${learningOutcomeCode}` : "")}

Lütfen çıktıyı tam olarak tanımlanan JSON formatında ver.
`;

    const response = await callAIWithRetry(ai, prompt, {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          createdAt: { type: Type.STRING },
          lessonPlan: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pedagogicalApproach: {
                type: Type.OBJECT,
                properties: {
                  selectedMethods: { type: Type.ARRAY, items: { type: Type.STRING } },
                  justification: { type: Type.STRING },
                  researchSources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        url: { type: Type.STRING },
                        sourceTier: { type: Type.STRING },
                      },
                      required: ["title", "sourceTier"],
                    },
                  },
                  stageMethods: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stageName: { type: Type.STRING },
                        methodUsed: { type: Type.STRING },
                        technique: { type: Type.STRING },
                        targetSkill: { type: Type.STRING },
                      },
                      required: ["stageName", "methodUsed", "technique", "targetSkill"],
                    },
                  },
                },
                required: ["selectedMethods", "justification", "stageMethods"],
              },
              mebKazanımKodları: { type: Type.ARRAY, items: { type: Type.STRING } },
              maarifModeliDeğerler: { type: Type.ARRAY, items: { type: Type.STRING } },
              beceriler: { type: Type.ARRAY, items: { type: Type.STRING } },
              sure: { type: Type.STRING },
              materyaller: { type: Type.ARRAY, items: { type: Type.STRING } },
              isinismaWarmUp: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  content: { type: Type.STRING },
                  teacherScript: { type: Type.STRING },
                },
                required: ["duration", "content", "teacherScript"],
              },
              anaEtkinlikMainTask: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  content: { type: Type.STRING },
                  stepByStep: { type: Type.ARRAY, items: { type: Type.STRING } },
                  teacherScript: { type: Type.STRING },
                },
                required: ["duration", "content", "stepByStep", "teacherScript"],
              },
              kapanisWrapUp: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["duration", "content"],
              },
              degerlendirmeAssessment: {
                type: Type.OBJECT,
                properties: {
                  methods: { type: Type.ARRAY, items: { type: Type.STRING } },
                  questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["methods", "questions"],
              },
              farklilastirmaDifferentiation: {
                type: Type.OBJECT,
                properties: {
                  support: { type: Type.STRING },
                  extension: { type: Type.STRING },
                },
                required: ["support", "extension"],
              },
            },
            required: [
              "title",
              "mebKazanımKodları",
              "maarifModeliDeğerler",
              "beceriler",
              "sure",
              "materyaller",
              "isinismaWarmUp",
              "anaEtkinlikMainTask",
              "kapanisWrapUp",
              "degerlendirmeAssessment",
              "farklilastirmaDifferentiation",
            ],
          },
          activityGuide: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              gameType: { type: Type.STRING },
              objective: { type: Type.STRING },
              rules: { type: Type.ARRAY, items: { type: Type.STRING } },
              materialsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
              writtenMaterials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    materialType: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          header: { type: Type.STRING },
                          content: { type: Type.STRING },
                          subtext: { type: Type.STRING },
                        },
                        required: ["content"],
                      },
                    },
                  },
                  required: ["title", "materialType", "instructions", "items"],
                },
              },
              stepByStepInstructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              classroomSetup: { type: Type.STRING },
              teacherTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              "title",
              "gameType",
              "objective",
              "rules",
              "materialsNeeded",
              "stepByStepInstructions",
              "classroomSetup",
              "teacherTips",
            ],
          },
          worksheet: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              gradeAndUnit: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    sectionTitle: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          prompt: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          answer: { type: Type.STRING },
                        },
                        required: ["id", "prompt", "answer"],
                      },
                    },
                  },
                  required: ["type", "sectionTitle", "instructions", "questions"],
                },
              },
              answerKey: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sectionIndex: { type: Type.INTEGER },
                    sectionTitle: { type: Type.STRING },
                    answers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["sectionIndex", "sectionTitle", "answers"],
                },
              },
            },
            required: ["title", "instructions", "gradeAndUnit", "sections", "answerKey"],
          },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                word: { type: Type.STRING },
                trTranslation: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
                pronunciationPhonetic: { type: Type.STRING },
                emojiOrIcon: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ["id", "word", "trTranslation", "exampleSentence", "emojiOrIcon", "category"],
            },
          },
        },
        required: ["lessonPlan", "activityGuide", "worksheet", "flashcards"],
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);

    // Attach request metadata
    data.id = data.id || `plan_${Date.now()}`;
    data.createdAt = new Date().toISOString();
    data.request = req.body;

    return res.json(data);
  } catch (err: any) {
    console.error("Error generating lesson plan:", err);
    return res.status(500).json({
      error: "Ders planı üretilirken bir hata oluştu: " + (err.message || err.toString()),
    });
  }
});

// API Endpoint for refining an existing lesson package
app.post("/api/refine-lesson", async (req, res) => {
  try {
    const { currentPackage, refinementInstruction } = req.body;

    if (!currentPackage || !refinementInstruction) {
      return res.status(400).json({ error: "Mevcut ders paketi ve düzenleme isteği gereklidir." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
Sen T.C. MEB Maarif Modeli uyumlu uzman İngilizce Eğitim Asistanısın.
Öğretmenin talebi üzerine mevcut ders paketini güncelle. İstenen değişiklikleri yaparken diğer kısımların kalitesini ve MEB müfredat uyumunu koru.
Çıktıyı tam olarak tanımlanan JSON şemasına uygun ver.
`;

    const prompt = `
Mevcut Ders Paketi:
${JSON.stringify(currentPackage)}

Öğretmenin Düzenleme/Geliştirme Talebi:
"${refinementInstruction}"

Lütfen bu talebe göre ders paketini güncelleyerek eksiksiz JSON formatında döndür.
`;

    const response = await callAIWithRetry(ai, prompt, {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          createdAt: { type: Type.STRING },
          lessonPlan: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              mebKazanımKodları: { type: Type.ARRAY, items: { type: Type.STRING } },
              maarifModeliDeğerler: { type: Type.ARRAY, items: { type: Type.STRING } },
              beceriler: { type: Type.ARRAY, items: { type: Type.STRING } },
              sure: { type: Type.STRING },
              materyaller: { type: Type.ARRAY, items: { type: Type.STRING } },
              isinismaWarmUp: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  content: { type: Type.STRING },
                  teacherScript: { type: Type.STRING },
                },
              },
              anaEtkinlikMainTask: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  content: { type: Type.STRING },
                  stepByStep: { type: Type.ARRAY, items: { type: Type.STRING } },
                  teacherScript: { type: Type.STRING },
                },
              },
              kapanisWrapUp: {
                type: Type.OBJECT,
                properties: {
                  duration: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
              },
              degerlendirmeAssessment: {
                type: Type.OBJECT,
                properties: {
                  methods: { type: Type.ARRAY, items: { type: Type.STRING } },
                  questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
              farklilastirmaDifferentiation: {
                type: Type.OBJECT,
                properties: {
                  support: { type: Type.STRING },
                  extension: { type: Type.STRING },
                },
              },
            },
          },
          activityGuide: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              gameType: { type: Type.STRING },
              objective: { type: Type.STRING },
              rules: { type: Type.ARRAY, items: { type: Type.STRING } },
              materialsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
              writtenMaterials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    materialType: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          header: { type: Type.STRING },
                          content: { type: Type.STRING },
                          subtext: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
              },
              stepByStepInstructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              classroomSetup: { type: Type.STRING },
              teacherTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          worksheet: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              gradeAndUnit: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    sectionTitle: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          prompt: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          answer: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
              },
              answerKey: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sectionIndex: { type: Type.INTEGER },
                    sectionTitle: { type: Type.STRING },
                    answers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
              },
            },
          },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                word: { type: Type.STRING },
                trTranslation: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
                pronunciationPhonetic: { type: Type.STRING },
                emojiOrIcon: { type: Type.STRING },
                category: { type: Type.STRING },
              },
            },
          },
        },
        required: ["lessonPlan", "activityGuide", "worksheet", "flashcards"],
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);

    data.id = currentPackage.id || `plan_${Date.now()}`;
    data.createdAt = new Date().toISOString();
    data.request = currentPackage.request;

    return res.json(data);
  } catch (err: any) {
    console.error("Error refining lesson plan:", err);
    return res.status(500).json({
      error: "Ders paketi güncellenirken bir hata oluştu: " + (err.message || err.toString()),
    });
  }
});



async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Maarif İngilizce Asistanı sunucusu ${PORT} portunda çalışıyor.`);
  });
}

startServer();
