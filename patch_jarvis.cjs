const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const jarvisCode = `

// JARVIS Memory-Aware Assistant Endpoint
app.post("/api/jarvis/interact", async (req, res) => {
  try {
    const { message, contextClassId, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getGeminiClient();

    const jarvisTools = [
      {
        name: 'get_classes',
        description: 'Öğretmenin sahip olduğu tüm sınıfların listesini (ID, isim, kademe vb.) getirir.',
      },
      {
        name: 'get_class_status',
        description: 'Belirli bir sınıfın mevcut ünite, konu ve durumunu getirir. classId gereklidir.',
        parameters: {
          type: Type.OBJECT,
          properties: { classId: { type: Type.STRING } },
          required: ['classId']
        }
      },
      {
        name: 'get_class_lessons',
        description: 'Belirli bir sınıfın geçmiş ders kayıtlarını getirir.',
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
        description: 'Belirli bir sınıfın işlenen en son dersini (konu, aktivite, beceri) getirir.',
        parameters: {
          type: Type.OBJECT,
          properties: { classId: { type: Type.STRING } },
          required: ['classId']
        }
      }
    ];

    const systemInstruction = \`Sen JARVIS'sin. T.C. Millî Eğitim Bakanlığı İngilizce Öğretmenlerine yardımcı olan akıllı, samimi, profesyonel bir eğitim asistanısın.
Öğretmene "Öğretmenim" diye hitap edebilirsin. Tonun sakin, kısa, net ve profesyonel olmalı.
Kesinlikle BİLGİ UYDURMA (Hallucination yapma). Veritabanında sınıf veya ders kaydı yoksa dürüstçe olmadığını belirt.
Gerektiğinde araçları (tools) kullanarak öğretmenin sınıfları ve dersleri hakkında gerçek veritabanı bilgilerini çek ve bu bilgilere dayanarak cevap ver.\`;

    // Initialize chat session
    const chat = ai.chats.create({
      model: "gemini-3.7-flash",
      config: {
        systemInstruction,
        temperature: 0.4,
        tools: [{ functionDeclarations: jarvisTools }],
      }
    });

    // We can't directly inject arbitrary old history into chat easily without format translation in the new SDK if we want it exact.
    // Instead, we will pass history as part of the first message or send messages one by one if necessary.
    // For simplicity, we just send the user message. The frontend can send a "full context prompt" or we can reconstruct.
    // Actually, it's better to use generateContent with a combined history if we have tools, or just use ai.chats if we manually apply history.
    
    // To support multi-turn with function calls inside this request:
    let response = await chat.sendMessage({ message: \`\${contextClassId ? '(Şu anki bağlam sınıf ID: ' + contextClassId + ') ' : ''}\${message}\` });
    
    let usedContext = false;
    
    // Handle function calls loop
    while (response.functionCalls && response.functionCalls.length > 0) {
      usedContext = true;
      const functionResponses = response.functionCalls.map((call) => {
        let result = null;
        try {
          if (call.name === 'get_classes') {
            result = db.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE teacherId = ?').all(DEFAULT_TEACHER_ID);
          } else if (call.name === 'get_class_status') {
            result = db.prepare('SELECT id, name, gradeLevel, currentUnit, currentTopic FROM Class WHERE id = ? AND teacherId = ?').get(call.args.classId, DEFAULT_TEACHER_ID);
            if (!result) result = { error: 'Class not found' };
          } else if (call.name === 'get_class_lessons') {
            result = db.prepare('SELECT date, unitNumber, unitName, topic, skill, activity, coveredOutcomes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT ?').all(call.args.classId, call.args.limit || 5);
          } else if (call.name === 'get_latest_lesson') {
            result = db.prepare('SELECT date, unitNumber, unitName, topic, skill, activity, coveredOutcomes FROM LessonHistory WHERE classId = ? ORDER BY date DESC LIMIT 1').get(call.args.classId);
            if (!result) result = { message: 'No lesson found for this class' };
          }
        } catch (err) {
          result = { error: err.message };
        }
        
        return {
          name: call.name,
          response: { result }
        };
      });
      
      response = await chat.sendMessage({
        message: functionResponses
      });
    }

    return res.json({ reply: response.text, usedContext });
  } catch (err) {
    console.error("Error in JARVIS interact:", err);
    return res.status(500).json({ error: "JARVIS şu anda hafızasına erişemiyor. Lütfen tekrar deneyin." });
  }
});
`;

const insertPoint = content.indexOf('app.post("/api/generate-lesson"');
const newContent = content.slice(0, insertPoint) + jarvisCode + content.slice(insertPoint);

fs.writeFileSync('server.ts', newContent);
console.log("Successfully patched server.ts");
