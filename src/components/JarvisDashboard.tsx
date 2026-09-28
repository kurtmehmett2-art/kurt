import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Mic,
  Send,
  Sparkles,
  Loader2,
  Database,
  Check,
  RefreshCw,
  Users,
  MicOff,
  Square,
  Volume2,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { JarvisVoiceClient } from '../lib/jarvisVoiceClient.js';
import { JarvisVoiceState, TranscriptItem, ActionRequired as VoiceActionRequired } from '../types/jarvisVoice.js';

interface DashboardActionRequired {
  name: string;
  args: any;
  status: 'pending' | 'confirmed' | 'canceled';
}

interface Message {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  actionRequired?: DashboardActionRequired;
}

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
}

interface JarvisDashboardProps {
  initialClassId?: string | null;
  onGenerateLesson: (request: any) => void;
  onNavigate?: (view: any, options?: any) => void;
}

export const JarvisDashboard: React.FC<JarvisDashboardProps> = ({
  initialClassId,
  onGenerateLesson,
  onNavigate
}) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || '');
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Mode: 'text' or 'voice'
  const [mode, setMode] = useState<'text' | 'voice'>('text');

  // Text Chat State
  const [textMessages, setTextMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);
  const textEndRef = useRef<HTMLDivElement>(null);

  // Voice Chat State
  const [voiceState, setVoiceState] = useState<JarvisVoiceState>('DISCONNECTED');
  const [voiceTranscripts, setVoiceTranscripts] = useState<TranscriptItem[]>([]);
  const [voiceActionRequired, setVoiceActionRequired] = useState<VoiceActionRequired | null>(null);
  const [voiceActionStatus, setVoiceActionStatus] = useState<'pending' | 'executing' | 'confirmed' | 'canceled'>('pending');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const voiceClientRef = useRef<JarvisVoiceClient | null>(null);
  const voiceEndRef = useRef<HTMLDivElement>(null);

  // Proactive suggestions for side panel
  const [suggestionData, setSuggestionData] = useState<any | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Fetch classes list
  useEffect(() => {
    setLoadingClasses(true);
    fetch('/api/classes')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setClasses(data);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
        }
      })
      .catch((err) => console.error('Error loading classes:', err))
      .finally(() => setLoadingClasses(false));
  }, []);

  // Fetch proactive suggestion whenever selectedClassId changes
  useEffect(() => {
    if (!selectedClassId) return;
    setLoadingSuggestion(true);
    setSuggestionData(null);

    fetch('/api/jarvis/suggest-next-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData) {
          setSuggestionData(resData);
        }
      })
      .catch((err) => console.error('Error fetching proactive suggestion:', err))
      .finally(() => setLoadingSuggestion(false));
  }, [selectedClassId]);

  // Initial welcome message for Text Chat
  useEffect(() => {
    if (textMessages.length === 0) {
      setTextMessages([
        {
          id: 'welcome',
          role: 'jarvis',
          content: 'Merhaba öğretmenim! Ben yapay zeka asistanınız JARVIS. Bugün hangi sınıf için ders hazırlığı yapmak veya analiz etmek istersiniz?'
        }
      ]);
    }
  }, [textMessages.length]);

  // Scroll written messages to bottom
  useEffect(() => {
    textEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [textMessages, isTextLoading]);

  // Scroll voice transcripts to bottom
  useEffect(() => {
    voiceEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voiceTranscripts]);

  // Voice Client Connection lifecycle
  useEffect(() => {
    if (mode !== 'voice') {
      if (voiceClientRef.current) {
        voiceClientRef.current.destroy();
        voiceClientRef.current = null;
      }
      setVoiceTranscripts([]);
      setVoiceActionRequired(null);
      setVoiceError(null);
      setVoiceState('DISCONNECTED');
      return;
    }

    // Initialize voice client when mode switched to 'voice'
    const client = new JarvisVoiceClient({
      onStateChange: (state) => {
        setVoiceState(state);
        if (state !== 'ERROR') setVoiceError(null);
      },
      onTranscript: (item) => {
        setVoiceTranscripts((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (last.role === item.role && last.text === item.text) {
              return prev;
            }
          }
          return [...prev, item];
        });
      },
      onActionRequired: (action) => {
        setVoiceActionRequired(action);
        setVoiceActionStatus('pending');
      },
      onError: (err) => {
        setVoiceError(err.message || 'Bir ses hatası oluştu.');
      },
      onContextUpdated: () => {}
    });

    voiceClientRef.current = client;

    // Connect automatically
    client.connect(selectedClassId || undefined).then((connected) => {
      if (connected) {
        client.startListening();
      }
    });

    return () => {
      client.destroy();
      voiceClientRef.current = null;
    };
  }, [mode, selectedClassId]);

  // Text Chat send handler
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || isTextLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textInput.trim()
    };

    setTextMessages((prev) => [...prev, userMsg]);
    setTextInput('');
    setIsTextLoading(true);

    try {
      const history = textMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role === 'jarvis' ? 'model' : 'user', content: m.content }));

      const res = await fetch('/api/jarvis/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          contextClassId: selectedClassId,
          history
        })
      });

      const data = await res.json();
      setTextMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'jarvis',
          content: data.reply,
          actionRequired: data.actionRequired
        }
      ]);
      if (data.navigation && onNavigate) {
        onNavigate(data.navigation.view, {
          subTab: data.navigation.subTab,
          classId: data.navigation.classId,
          topic: data.navigation.topic
        });
      }
    } catch (err: any) {
      setTextMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'jarvis',
          content: `❌ Bağlantı hatası oluştu: ${err.message || 'Lütfen tekrar deneyin.'}`
        }
      ]);
    } finally {
      setIsTextLoading(false);
    }
  };

  const sendHiddenSystemMessage = async (sysText: string, updatedMessages: Message[]) => {
    try {
      const history = updatedMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role === 'jarvis' ? 'model' : 'user', content: m.content }));

      const res = await fetch('/api/jarvis/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sysText, contextClassId: selectedClassId, history })
      });
      const data = await res.json();
      setTextMessages((prev) => [...prev, { id: Date.now().toString(), role: 'jarvis', content: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm database write (WRITE Guard) in Text Mode
  const handleConfirmActionText = async (messageId: string, action: DashboardActionRequired) => {
    let currentMessages = textMessages;
    setTextMessages((prev) => {
      currentMessages = prev.map((m) =>
        m.id === messageId ? { ...m, actionRequired: { ...m.actionRequired!, status: 'confirmed' } } : m
      );
      return currentMessages;
    });
    setIsTextLoading(true);

    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.name, args: action.args })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
      }

      const sysMsg = `[SİSTEM BİLGİSİ]: Kullanıcı işlemi ONAYLADI ve veritabanına yazıldı. Sonuç: ${data.message} Kullanıcıya kısa bir başarı mesajı ver.`;
      await sendHiddenSystemMessage(sysMsg, currentMessages);
    } catch (err: any) {
      setTextMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'jarvis', content: `❌ Hata: ${err.message}` }
      ]);
    } finally {
      setIsTextLoading(false);
    }
  };

  // Cancel database write (WRITE Guard) in Text Mode
  const handleCancelActionText = async (messageId: string) => {
    let currentMessages = textMessages;
    setTextMessages((prev) => {
      currentMessages = prev.map((m) =>
        m.id === messageId ? { ...m, actionRequired: { ...m.actionRequired!, status: 'canceled' } } : m
      );
      return currentMessages;
    });
    const sysMsg = `[SİSTEM BİLGİSİ]: Kullanıcı işlemi İPTAL ETTİ. İşlem veritabanına kaydedilmedi. Kullanıcıya kısa bir iptal mesajı ver.`;
    await sendHiddenSystemMessage(sysMsg, currentMessages);
  };

  const handleGenerateActionText = (messageId: string, action: DashboardActionRequired) => {
    setTextMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, actionRequired: { ...m.actionRequired!, status: 'confirmed' } } : m
      )
    );
    const args = action.args;
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
  };

  // Mute & Speech control for Voice Mode
  const handleMuteToggle = () => {
    if (!voiceClientRef.current) return;
    if (isMuted) {
      voiceClientRef.current.startListening();
      setIsMuted(false);
    } else {
      voiceClientRef.current.stopListening();
      setIsMuted(true);
    }
  };

  const handleStopSpeech = () => {
    if (voiceClientRef.current) {
      voiceClientRef.current.interrupt();
    }
  };

  // Confirm database write (WRITE Guard) in Voice Mode
  const handleConfirmActionVoice = async () => {
    if (!voiceActionRequired || !voiceClientRef.current) return;
    setVoiceActionStatus('executing');

    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: voiceActionRequired.name, args: voiceActionRequired.args })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'İşlem başarısız oldu.');
      }

      setVoiceActionStatus('confirmed');
      setVoiceTranscripts((prev) => [...prev, { role: 'assistant', text: `✅ İşlem tamamlandı: ${data.message}` }]);
      voiceClientRef.current.sendText(
        `[SİSTEM BİLGİSİ]: İşlem başarıyla veritabanına yazıldı. Sonuç: ${data.message}`
      );
      setVoiceActionRequired(null);
    } catch (err: any) {
      setVoiceActionStatus('pending');
      setVoiceTranscripts((prev) => [...prev, { role: 'assistant', text: `❌ Onay hatası: ${err.message}` }]);
    }
  };

  const handleCancelActionVoice = () => {
    if (!voiceClientRef.current) return;
    setVoiceActionStatus('canceled');
    voiceClientRef.current.sendText(`[SİSTEM BİLGİSİ]: İşlem iptal edildi.`);
    setVoiceActionRequired(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Sol Sütun: Sınıf Seçimi ve Proaktif Öneriler (4 Kolon) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Sınıf Bağlamı Kartı */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2D2B55] pb-3">
            <Users className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Sınıf Bağlamı & Hafıza
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 block">Aktif Çalışılan Sınıf:</label>
            {loadingClasses ? (
              <div className="h-10 rounded-xl bg-[#1A1932] border border-[#2D2B55] flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Sınıflar yükleniyor...
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#1A1932] border border-[#2D2B55] text-xs font-bold text-white focus:outline-none focus:border-[#6C63FF] transition"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel}. Sınıf)
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            JARVIS, seçtiğiniz sınıfın geçmiş ders kayıtlarını ve öğretmen notlarını analiz ederek proaktif öneriler geliştirir.
          </p>
        </div>

        {/* Proaktif JARVIS Önerisi */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2D2B55] pb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Günün Akıllı Önerisi
            </h3>
          </div>

          {loadingSuggestion ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
              <span>Sınıf hafızası analiz ediliyor...</span>
            </div>
          ) : suggestionData ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#1A1932] rounded-xl border border-purple-500/20">
                <span className="text-[10px] font-extrabold text-[#FF6584] uppercase tracking-wider">
                  Sıradaki Konu
                </span>
                <p className="text-xs font-extrabold text-white mt-1">
                  {suggestionData.suggestedTopic}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Pedagojik Odak
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {suggestionData.pedagogicalFocus}
                </p>
              </div>

              {suggestionData.whyThisSuggestion?.pedagogicalRationale && (
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                  <span className="text-[10px] font-extrabold text-purple-400 uppercase">
                    Öneri Gerekçesi
                  </span>
                  <p className="text-[11px] text-purple-300 italic mt-0.5 leading-relaxed">
                    "{suggestionData.whyThisSuggestion.pedagogicalRationale}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-4">
              Öneri alınamadı. Sınıfa ait yeterli veri bulunmuyor olabilir.
            </p>
          )}
        </div>
      </div>

      {/* Sağ Sütun: Yazılı & Sesli JARVIS Terminal (8 Kolon) */}
      <div className="lg:col-span-8 flex flex-col h-[650px] glass-card overflow-hidden">
        {/* Terminal Mod Seçici Başlık */}
        <div className="px-6 py-4 border-b border-[#2D2B55] bg-[#161524] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/10 border border-[#6C63FF]/30 flex items-center justify-center text-purple-400 animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wider uppercase">
                JARVIS İletişim Terminali
              </h2>
              <p className="text-[10px] text-slate-400">
                Sınıf bağlamı ve sesli/yazılı sohbet oturumu
              </p>
            </div>
          </div>

          {/* Yazılı | Sesli Toggle */}
          <div className="bg-[#1A1932] p-1 rounded-xl border border-[#2D2B55] flex gap-1">
            <button
              onClick={() => setMode('text')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'text'
                  ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow'
                  : 'text-[#A7A9BE] hover:text-white'
              }`}
            >
              💬 Yazılı Sohbet
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'voice'
                  ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow'
                  : 'text-[#A7A9BE] hover:text-white'
              }`}
            >
              🎙️ Canlı Ses
            </button>
          </div>
        </div>

        {/* İÇERİK ALANI */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#12111E] space-y-4">
          {mode === 'text' ? (
            /* ================= YAZILI CHAT GÖRÜNÜMÜ ================= */
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 mb-4 max-h-[440px]">
                {textMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
                        msg.role === 'user'
                          ? 'bg-[#FF6584]/20 border-[#FF6584]/40 text-pink-200'
                          : 'bg-[#6C63FF]/20 border-[#6C63FF]/40 text-purple-200'
                      }`}
                    >
                      {msg.role === 'user' ? 'Ö' : '🤖'}
                    </div>

                    <div className="space-y-3">
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#FF6584]/10 text-pink-50 border border-[#FF6584]/20 rounded-tr-none'
                            : 'bg-[#1A1932] text-[#E4E4EE] border border-[#2D2B55] rounded-tl-none'
                        }`}
                      >
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* WRITE Guard / Action Confirmation Cards */}
                      {msg.actionRequired && msg.actionRequired.status === 'pending' && (
                        <div className="p-4 bg-slate-900 border-2 border-amber-500/40 rounded-2xl space-y-3 shadow-lg max-w-sm animate-fade-in-up">
                          <div className="flex items-center gap-2 border-b border-amber-500/10 pb-2">
                            <Database className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                              Yazma Onayı (WRITE Guard)
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            JARVIS bir işlem gerçekleştirmek istiyor:
                            <strong className="text-white block mt-1">
                              {msg.actionRequired.name === 'save_lesson_plan'
                                ? 'Ders Planını Kaydet'
                                : 'Öğretmen Notu / Materyal Ekle'}
                            </strong>
                          </p>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleConfirmActionText(msg.id, msg.actionRequired!)}
                              className="flex-1 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition"
                            >
                              Onayla ve Kaydet
                            </button>
                            <button
                              onClick={() => handleCancelActionText(msg.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.actionRequired && msg.actionRequired.status === 'confirmed' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
                          <Check className="w-3.5 h-3.5" /> İşlem Onaylandı & Yazıldı.
                        </div>
                      )}

                      {msg.actionRequired && msg.actionRequired.status === 'canceled' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-xl font-bold">
                          İptal Edildi.
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTextLoading && (
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-[#6C63FF]/20 border border-[#6C63FF]/40 text-purple-200 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-[#6C63FF]" />
                    </div>
                    <div className="bg-[#1A1932] p-3.5 rounded-2xl rounded-tl-none border border-[#2D2B55] text-xs text-slate-400 flex items-center gap-2">
                      JARVIS yazıyor...
                    </div>
                  </div>
                )}
                <div ref={textEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendText} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="JARVIS'e sorun veya komut verin... (örn. 'Sınıf durumunu özetle')"
                  className="flex-1 h-11 px-4 rounded-xl bg-[#1A1932] border border-[#2D2B55] text-xs sm:text-sm text-white focus:outline-none focus:border-[#6C63FF] placeholder-slate-500 transition"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isTextLoading}
                  className="w-11 h-11 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-90 flex items-center justify-center text-white transition shadow-lg shadow-purple-500/10 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            /* ================= CANLI SES GÖRÜNÜMÜ ================= */
            <div className="flex flex-col h-full justify-between items-center text-center">
              {/* Voice State Display & Glowing Visualizer */}
              <div className="my-auto space-y-6 w-full flex flex-col items-center">
                <div className="relative">
                  {/* Glowing ripple visualizer */}
                  <div
                    className={`absolute inset-0 rounded-full bg-purple-500/10 blur-xl transition-all duration-1000 ${
                      voiceState === 'LISTENING'
                        ? 'scale-150 opacity-100 animate-ping'
                        : voiceState === 'SPEAKING'
                        ? 'scale-135 opacity-100 animate-pulse'
                        : 'scale-75 opacity-0'
                    }`}
                  />

                  <div
                    className={`w-28 h-28 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      voiceState === 'LISTENING'
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.35)]'
                        : voiceState === 'SPEAKING'
                        ? 'bg-purple-500/10 border-[#6C63FF] shadow-[0_0_40px_rgba(108,99,255,0.35)]'
                        : 'bg-[#1A1932] border-[#2D2B55] shadow-inner'
                    }`}
                  >
                    {isMuted ? (
                      <MicOff className="w-10 h-10 text-rose-400" />
                    ) : (
                      <Mic
                        className={`w-10 h-10 transition-transform ${
                          voiceState === 'LISTENING'
                            ? 'text-emerald-400 scale-110 animate-bounce'
                            : voiceState === 'SPEAKING'
                            ? 'text-purple-400 animate-pulse'
                            : 'text-slate-400'
                        }`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">
                    Canlı Ses Bağlantısı
                  </span>
                  <h3 className="text-base font-extrabold text-white">
                    {voiceState === 'DISCONNECTED' && 'Bağlanılıyor...'}
                    {voiceState === 'CONNECTING' && 'Bağlanıyor...'}
                    {voiceState === 'LISTENING' && 'JARVIS Dinliyor...'}
                    {voiceState === 'SPEAKING' && 'JARVIS Konuşuyor...'}
                    {voiceState === 'ERROR' && 'Bağlantı Hatası'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {voiceState === 'LISTENING' && 'İngilizce veya Türkçe konuşun, asistanınız canlı yanıtlasın.'}
                    {voiceState === 'SPEAKING' && 'JARVIS şu anda ses sentezi üretiyor ve konuşuyor.'}
                    {voiceState === 'DISCONNECTED' && 'Sunucuya güvenli WebSocket bağlantısı kuruluyor.'}
                    {voiceState === 'ERROR' && (voiceError || 'Bilinmeyen bir ses kanalı hatası.')}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleMuteToggle}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                      isMuted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                    }`}
                  >
                    {isMuted ? 'Mikrofonu Aç' : 'Sesi Sessize Al'}
                  </button>

                  {voiceState === 'SPEAKING' && (
                    <button
                      onClick={handleStopSpeech}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition flex items-center gap-2"
                    >
                      <Square className="w-3.5 h-3.5" /> Konuşmayı Kes
                    </button>
                  )}
                </div>

                {/* Voice WRITE Guard Panel */}
                {voiceActionRequired && (
                  <div className="p-4 bg-slate-900 border-2 border-amber-500 rounded-2xl space-y-3 shadow-2xl max-w-sm animate-bounce text-left">
                    <div className="flex items-center gap-2 border-b border-amber-500/10 pb-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                        Sesli Yazma Onayı (WRITE Guard)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      JARVIS veritabanına kayıt yazmak istiyor:
                      <strong className="text-white block mt-1">
                        {voiceActionRequired.name === 'save_lesson_plan'
                          ? 'Ders Planını Kaydet'
                          : 'Notları Ekle'}
                      </strong>
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmActionVoice}
                        disabled={voiceActionStatus === 'executing'}
                        className="flex-1 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition"
                      >
                        Onayla ve Kaydet
                      </button>
                      <button
                        onClick={handleCancelActionVoice}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Live transcript box */}
              <div className="w-full mt-4 p-4 rounded-xl bg-[#1A1932]/70 border border-[#2D2B55] text-left max-h-[140px] overflow-y-auto">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block mb-2">
                  Canlı Konuşma Dökümü
                </span>
                <div className="space-y-2">
                  {voiceTranscripts.map((t, idx) => (
                    <p key={idx} className="text-xs">
                      <strong className={t.role === 'user' ? 'text-pink-400' : 'text-purple-400'}>
                        {t.role === 'user' ? 'Öğretmen: ' : 'JARVIS: '}
                      </strong>
                      <span className="text-slate-300">{t.text}</span>
                    </p>
                  ))}
                  <div ref={voiceEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
