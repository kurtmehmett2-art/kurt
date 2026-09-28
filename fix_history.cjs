const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const oldCode = `    // Initialize chat session
    const chat = ai.chats.create({
      model: "gemini-3.7-flash",
      config: {
        systemInstruction,
        temperature: 0.4,
        tools: [{ functionDeclarations: jarvisTools }],
      }
    });`;

const newCode = `    // Initialize chat session
    const chatHistory = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: "gemini-3.7-flash",
      history: chatHistory,
      config: {
        systemInstruction,
        temperature: 0.4,
        tools: [{ functionDeclarations: jarvisTools }],
      }
    });`;

if(content.includes(oldCode)) {
  fs.writeFileSync('server.ts', content.replace(oldCode, newCode));
  console.log("Success");
} else {
  console.log("Not found");
}
