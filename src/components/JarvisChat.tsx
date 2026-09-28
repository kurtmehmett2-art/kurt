import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, Loader2, Database, Check, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ActionRequired {
  name: string;
  args: any;
  status: 'pending' | 'confirmed' | 'canceled';
}

interface Message {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  actionRequired?: ActionRequired;
}

interface JarvisChatProps {
  isOpen: boolean;
  onClose: () => void;
  contextClassId?: string | null;
  onGenerateLesson?: (request: any) => void;
  onOpenVoiceModal?: () => void;
  onNavigate?: (view: any, options?: any) => void;
}

const SUGGESTIONS = [
  "Sıradaki dersi hazırla",
  "Son dersimi göster",
  "Sınıflarımın durumunu özetle"
];

export const JarvisChat: React.FC<JarvisChatProps> = ({ isOpen, onClose, contextClassId, onGenerateLesson, onOpenVoiceModal, onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'jarvis',
        content: 'Size nasıl yardımcı olabilirim, öğretmenim?'
      }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendHiddenSystemMessage = async (sysText: string, updatedMessages: Message[]) => {
    try {
      const history = updatedMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role === 'jarvis' ? 'model' : 'user', content: m.content }));
      
      const res = await fetch('/api/jarvis/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sysText, contextClassId, history })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'jarvis', content: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAction = async (messageId: string, actionRequired: ActionRequired) => {
    let currentMessages = messages;
    setMessages(prev => {
      currentMessages = prev.map(m => m.id === messageId ? { ...m, actionRequired: { ...m.actionRequired!, status: 'confirmed' } } : m);
      return currentMessages;
    });
    setIsLoading(true);

    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionRequired.name, args: actionRequired.args })
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'İşlem başarısız oldu.');
      }

      const sysMsg = `[SİSTEM BİLGİSİ]: Kullanıcı işlemi ONAYLADI ve veritabanına yazıldı. Sonuç: ${data.message} Kullanıcıya kısa bir onay/başarı mesajı ver.`;
      await sendHiddenSystemMessage(sysMsg, currentMessages);

    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'jarvis', content: `❌ Hata: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = async (messageId: string) => {
    let currentMessages = messages;
    setMessages(prev => {
      currentMessages = prev.map(m => m.id === messageId ? { ...m, actionRequired: { ...m.actionRequired!, status: 'canceled' } } : m);
      return currentMessages;
    });
    const sysMsg = `[SİSTEM BİLGİSİ]: Kullanıcı işlemi İPTAL ETTİ. İşlem veritabanına kaydedilmedi. Kullanıcıya kısa bir iptal edildi mesajı ver.`;
    await sendHiddenSystemMessage(sysMsg, currentMessages);
  };

  const handleGenerateAction = (messageId: string, actionRequired: ActionRequired) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, actionRequired: { ...m.actionRequired!, status: 'confirmed' } } : m));
    if (onGenerateLesson) {
      const args = actionRequired.args;
      onGenerateLesson({
        grade: args.grade || '6',
        unitNumber: args.unitNumber || 1,
        unitName: args.unitName || 'Unit',
        skill: args.skill || 'Speaking',
        activityType: args.activityType || 'Role-Play & Canlandırma',
        durationMinutes: args.durationMinutes || 40,
        extraVocabulary: '',
        specialConditions: `JARVIS Önerisi: Sınıf (${args.className}). Hedef konu: ${args.topic}. Gerekçe: ${args.reasoning}`
      });
      onClose(); // Close chat when generating starts
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Map internal state to the format expected by the backend
      const history = messages
        .filter(m => m.id !== 'welcome') // exclude initial greeting from strict history if preferred, but keeping it is also fine.
        .map(m => ({ role: m.role === 'jarvis' ? 'model' : 'user', content: m.content }));

      const res = await fetch('/api/jarvis/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          contextClassId,
          history
        })
      });

      if (!res.ok) {
        throw new Error('JARVIS API Error');
      }

      const data = await res.json();
      
      const jarvisMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'jarvis',
        content: data.reply,
        actionRequired: data.actionRequired ? { ...data.actionRequired, status: 'pending' } : undefined
      };
      
      setMessages(prev => [...prev, jarvisMessage]);

      if (data.navigation && onNavigate) {
        onNavigate(data.navigation.view, {
          subTab: data.navigation.subTab,
          classId: data.navigation.classId,
          topic: data.navigation.topic
        });
      }
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'jarvis',
        content: 'Şu anda hafızama erişemiyorum. Lütfen tekrar deneyin.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#161524] border-l border-[#2D2B55] z-50 flex flex-col shadow-2xl transform transition-transform animate-fade-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2D2B55] bg-[#1A1932] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#FF6584] p-0.5 shadow-[0_0_15px_rgba(108,99,255,0.4)]">
              <div className="w-full h-full bg-[#161524] rounded-[10px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#6C63FF]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                JARVIS <Sparkles className="w-4 h-4 text-[#FF6584]" />
              </h2>
              <p className="text-xs text-[#A7A9BE] font-medium">Öğretmen Asistanı</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenVoiceModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVoiceModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 border border-[#6C63FF]/40 text-purple-200 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-[0_0_12px_rgba(108,99,255,0.2)]"
                title="Canlı Ses Moduna Geç"
              >
                <Mic className="w-3.5 h-3.5 text-[#6C63FF]" />
                <span>Sesli Mod</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#2D2B55] rounded-xl text-[#A7A9BE] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'jarvis' && (
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <Bot className="w-3.5 h-3.5 text-[#6C63FF]" />
                  <span className="text-[10px] font-bold text-[#A7A9BE]">JARVIS</span>
                </div>
              )}
              <div 
                className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#6C63FF] text-white rounded-br-sm shadow-md' 
                    : 'bg-[#1A1932] border border-[#2D2B55] text-white rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.role === 'jarvis' ? (
                  <>
                    <div className="prose prose-invert prose-sm max-w-none text-[14px] leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.actionRequired && (
                      <div className="mt-3 p-4 bg-[#161524]/80 rounded-xl border border-[#2D2B55] shadow-inner text-sm w-full">
                        <div className="text-[#A7A9BE] font-bold mb-3 flex items-center gap-2">
                          {msg.actionRequired.name === 'propose_lesson_plan' ? (
                            <><Sparkles className="w-4 h-4 text-[#FF6584]" /> Bir Sonraki Ders Önerisi</>
                          ) : (
                            <><Database className="w-4 h-4 text-[#FF6584]" /> Hafızaya Kaydedilecek</>
                          )}
                        </div>
                        
                        {msg.actionRequired.name === 'create_lesson_record' && (
                          <div className="space-y-2 mb-4 text-white">
                            <div className="flex gap-2"><span className="text-[#A7A9BE] w-12 shrink-0">Sınıf:</span> <span className="font-semibold">{msg.actionRequired.args.className || msg.actionRequired.args.classId}</span></div>
                            {msg.actionRequired.args.unitNumber && <div className="flex gap-2"><span className="text-[#A7A9BE] w-12 shrink-0">Ünite:</span> <span>Unit {msg.actionRequired.args.unitNumber} - {msg.actionRequired.args.unitName}</span></div>}
                            <div className="flex gap-2"><span className="text-[#A7A9BE] w-12 shrink-0">Konu:</span> <span className="text-[#6C63FF] font-medium">{msg.actionRequired.args.topic}</span></div>
                            {msg.actionRequired.args.teacherNotes && <div className="flex gap-2"><span className="text-[#A7A9BE] w-12 shrink-0">Not:</span> <span className="italic text-purple-200">"{msg.actionRequired.args.teacherNotes}"</span></div>}
                          </div>
                        )}

                        {msg.actionRequired.name === 'add_teacher_note' && (
                          <div className="space-y-2 mb-4 text-white">
                            <div className="flex gap-2"><span className="text-[#A7A9BE] w-12 shrink-0">Sınıf:</span> <span className="font-semibold">{msg.actionRequired.args.className || msg.actionRequired.args.classId}</span></div>
                            <div className="flex gap-2"><span className="text-[#A7A9BE] w-12 shrink-0">Not:</span> <span className="italic text-purple-200">"{msg.actionRequired.args.note}"</span></div>
                          </div>
                        )}

                        {msg.actionRequired.name === 'propose_lesson_plan' && (
                          <div className="space-y-3 mb-4 text-white text-[13px]">
                            <div className="flex justify-between items-start border-b border-[#2D2B55] pb-2">
                              <div>
                                <div className="font-bold text-[15px]">{msg.actionRequired.args.className}</div>
                                <div className="text-[#A7A9BE] text-xs">Unit {msg.actionRequired.args.unitNumber} - {msg.actionRequired.args.unitName}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[#FF6584] font-semibold">{msg.actionRequired.args.topic}</div>
                                <div className="text-[#A7A9BE] text-[10px]">{msg.actionRequired.args.durationMinutes} dk</div>
                              </div>
                            </div>
                            
                            <div className="text-[#A7A9BE] italic">"{msg.actionRequired.args.reasoning}"</div>
                            
                            {msg.actionRequired.args.agenda && msg.actionRequired.args.agenda.length > 0 && (
                              <div className="bg-[#1A1932] p-3 rounded-lg border border-[#2D2B55]">
                                <div className="text-[#A7A9BE] text-xs font-bold mb-2">ÖNERİLEN AKIŞ:</div>
                                <ul className="space-y-1.5">
                                  {msg.actionRequired.args.agenda.map((item: string, i: number) => (
                                    <li key={i} className="flex gap-2"><span className="text-[#6C63FF]">•</span> <span>{item}</span></li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.actionRequired.status === 'pending' ? (
                          <div className="flex items-center gap-2 pt-2 border-t border-[#2D2B55]">
                            <button onClick={() => handleCancelAction(msg.id)} className="flex-1 py-2 rounded-lg text-xs font-bold text-[#A7A9BE] hover:text-white hover:bg-[#2D2B55] transition-colors flex justify-center items-center gap-1.5"><X className="w-3.5 h-3.5"/> Vazgeç</button>
                            {msg.actionRequired.name === 'propose_lesson_plan' ? (
                              <button onClick={() => handleGenerateAction(msg.id, msg.actionRequired!)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-90 shadow-lg shadow-[#FF6584]/20 transition-all flex justify-center items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Dersi Hazırla</button>
                            ) : (
                              <button onClick={() => handleConfirmAction(msg.id, msg.actionRequired!)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-90 shadow-lg shadow-[#6C63FF]/20 transition-all flex justify-center items-center gap-1.5"><Check className="w-3.5 h-3.5"/> Kaydet</button>
                            )}
                          </div>
                        ) : msg.actionRequired.status === 'confirmed' ? (
                          <div className="text-center pt-2 border-t border-[#2D2B55] text-[#6C63FF] text-xs font-bold flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4"/> {msg.actionRequired.name === 'propose_lesson_plan' ? 'Ders Üretimine Başlandı' : 'Başarıyla Kaydedildi'}
                          </div>
                        ) : (
                          <div className="text-center pt-2 border-t border-[#2D2B55] text-[#A7A9BE] text-xs font-bold flex items-center justify-center gap-1.5">
                            <X className="w-4 h-4"/> İptal Edildi
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[14px] leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
               <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <Bot className="w-3.5 h-3.5 text-[#6C63FF]" />
                  <span className="text-[10px] font-bold text-[#A7A9BE]">JARVIS</span>
                </div>
              <div className="bg-[#1A1932] border border-[#2D2B55] p-4 rounded-2xl rounded-bl-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#6C63FF] animate-spin" />
                <span className="text-sm text-[#A7A9BE] font-medium animate-pulse">Jarvis düşünüyor...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#2D2B55] bg-[#161524] shrink-0">
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(suggestion)}
                  className="text-xs bg-[#2D2B55]/50 hover:bg-[#6C63FF]/20 text-[#A7A9BE] hover:text-[#6C63FF] border border-[#2D2B55] hover:border-[#6C63FF]/50 px-3 py-1.5 rounded-full transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajınızı yazın..."
              className="flex-1 bg-[#1A1932] border border-[#2D2B55] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-[#6C63FF] to-[#FF6584] p-3 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
