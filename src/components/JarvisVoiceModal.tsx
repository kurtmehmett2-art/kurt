import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Square,
  X,
  Sparkles,
  Bot,
  Database,
  Check,
  AlertCircle,
  Volume2,
  RefreshCw,
  Send
} from 'lucide-react';
import { JarvisVoiceClient } from '../lib/jarvisVoiceClient.js';
import {
  JarvisVoiceState,
  ActionRequired,
  TranscriptItem
} from '../types/jarvisVoice.js';

interface JarvisVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextClassId?: string | null;
  onGenerateLesson?: (request: any) => void;
  onNavigate?: (view: any, options?: any) => void;
}

export const JarvisVoiceModal: React.FC<JarvisVoiceModalProps> = ({
  isOpen,
  onClose,
  contextClassId,
  onGenerateLesson,
  onNavigate
}) => {
  const [voiceState, setVoiceState] = useState<JarvisVoiceState>('DISCONNECTED');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [actionRequired, setActionRequired] = useState<ActionRequired | null>(null);
  const [actionStatus, setActionStatus] = useState<'pending' | 'executing' | 'confirmed' | 'canceled'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classNameContext, setClassNameContext] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const clientRef = useRef<JarvisVoiceClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll transcript to bottom smoothly
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize JarvisVoiceClient on modal mount / open
  useEffect(() => {
    if (!isOpen) {
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
      setTranscripts([]);
      setActionRequired(null);
      setErrorMessage(null);
      setClassNameContext(null);
      setVoiceState('DISCONNECTED');
      return;
    }

    const client = new JarvisVoiceClient({
      onStateChange: (state) => {
        setVoiceState(state);
        if (state !== 'ERROR') {
          setErrorMessage(null);
        }
      },
      onTranscript: (item) => {
        setTranscripts((prev) => {
          // Avoid exact duplicate consecutive transcripts
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
        setActionRequired(action);
        setActionStatus('pending');
      },
      onNavigation: (navigation) => {
        if (onNavigate && navigation) {
          onNavigate(navigation.view, {
            subTab: navigation.subTab,
            classId: navigation.classId,
            topic: navigation.topic
          });
        }
      },
      onError: (err) => {
        setErrorMessage(err.message || 'Bir ses hatası oluştu.');
      },
      onContextUpdated: (_classId, className) => {
        setClassNameContext(className);
      }
    });

    clientRef.current = client;

    // Connect & start listening automatically
    client.connect(contextClassId || undefined).then((connected) => {
      if (connected) {
        client.startListening();
      }
    });

    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, [isOpen, contextClassId]);

  if (!isOpen) return null;

  const handleMuteToggle = () => {
    if (!clientRef.current) return;
    if (isMuted) {
      clientRef.current.startListening();
      setIsMuted(false);
    } else {
      clientRef.current.stopListening();
      setIsMuted(true);
    }
  };

  const handleStopSpeech = () => {
    if (clientRef.current) {
      clientRef.current.interrupt();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !clientRef.current) return;
    
    setTranscripts((prev) => [...prev, { role: 'user', text: textInput.trim() }]);
    clientRef.current.sendText(textInput.trim());
    setTextInput('');
  };

  const handleConfirmAction = async () => {
    if (!actionRequired) return;
    setActionStatus('executing');

    try {
      const res = await fetch('/api/jarvis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionRequired.name, args: actionRequired.args })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
      }

      setActionStatus('confirmed');
      
      // Notify voice client
      if (clientRef.current) {
        clientRef.current.sendText(`[SİSTEM BİLGİSİ]: Kullanıcı "${actionRequired.name}" işlemini ONAYLADI ve başarıyla kaydedildi. Sonuç: ${data.message}`);
      }

      setTimeout(() => {
        setActionRequired(null);
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Kayıt sırasında hata oluştu.');
      setActionStatus('pending');
    }
  };

  const handleCancelAction = () => {
    setActionStatus('canceled');
    if (clientRef.current) {
      clientRef.current.sendText('[SİSTEM BİLGİSİ]: Kullanıcı işlemi İPTAL ETTİ. Veritabanına kayıt yapılmadı.');
    }
    setTimeout(() => {
      setActionRequired(null);
    }, 1500);
  };

  const handleGenerateFromAction = () => {
    if (!actionRequired) return;
    setActionStatus('confirmed');

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
        specialConditions: `JARVIS Sesli Öneri: Sınıf (${args.className}). Hedef konu: ${args.topic}. Gerekçe: ${args.reasoning}`
      });
      onClose();
    }
  };

  // Status Labels
  const getStatusText = () => {
    switch (voiceState) {
      case 'CONNECTING':
        return 'JARVIS Bağlanıyor...';
      case 'LISTENING':
        return 'Sizi Dinliyorum';
      case 'THINKING':
        return 'Düşünüyorum...';
      case 'SPEAKING':
        return 'JARVIS Konuşuyor';
      case 'INTERRUPTED':
        return 'Sözünüz Kesildi';
      case 'ERROR':
        return 'Bağlantı Sorunu';
      case 'DISCONNECTED':
        return 'Bağlantı Kesildi';
      default:
        return 'Hazır';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden select-none">
        {/* Dark Glass Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#090810]/85 backdrop-blur-xl"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl h-[100dvh] sm:h-[85vh] sm:max-h-[720px] bg-[#12111F]/90 border border-white/10 sm:rounded-3xl shadow-[0_0_80px_rgba(108,99,255,0.15)] flex flex-col justify-between overflow-hidden z-10"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-purple-200 text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full ${voiceState === 'ERROR' ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                <span>JARVIS ● Canlı Ses Mode</span>
              </div>

              {classNameContext && (
                <div className="px-2.5 py-1 rounded-full bg-white/5 text-white/70 text-xs font-medium border border-white/10">
                  {classNameContext}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-y-auto custom-scrollbar relative">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div
                className={`w-72 h-72 rounded-full blur-[100px] transition-all duration-700 ${
                  voiceState === 'SPEAKING'
                    ? 'bg-[#FF6584]/30 scale-125'
                    : voiceState === 'THINKING'
                    ? 'bg-[#6C63FF]/30 scale-110'
                    : voiceState === 'LISTENING'
                    ? 'bg-emerald-500/20 scale-100'
                    : 'bg-[#6C63FF]/15 scale-90'
                }`}
              />
            </div>

            {/* JARVIS ORB INTERFACE */}
            <div className="relative my-6 flex flex-col items-center justify-center">
              {/* Outer Pulse Rings */}
              <motion.div
                animate={{
                  scale: voiceState === 'SPEAKING' ? [1, 1.25, 1] : voiceState === 'LISTENING' ? [1, 1.1, 1] : 1,
                  opacity: voiceState === 'SPEAKING' ? [0.2, 0.5, 0.2] : voiceState === 'LISTENING' ? [0.2, 0.4, 0.2] : 0.15
                }}
                transition={{
                  duration: voiceState === 'SPEAKING' ? 1.2 : 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute w-44 h-44 rounded-full border border-[#6C63FF]/40 pointer-events-none"
              />

              <motion.div
                animate={{
                  rotate: voiceState === 'THINKING' ? 360 : 0,
                  scale: voiceState === 'SPEAKING' ? [1, 1.15, 1] : 1
                }}
                transition={{
                  rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                }}
                className="absolute w-36 h-36 rounded-full border border-[#FF6584]/30 border-dashed pointer-events-none"
              />

              {/* Core Orb */}
              <motion.div
                animate={{
                  scale: voiceState === 'SPEAKING' ? [1, 1.08, 1] : voiceState === 'LISTENING' ? [1, 1.04, 1] : [1, 1.02, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
                  voiceState === 'SPEAKING'
                    ? 'bg-gradient-to-br from-[#FF6584] via-[#6C63FF] to-[#3B82F6] shadow-[0_0_50px_rgba(255,101,132,0.5)]'
                    : voiceState === 'THINKING'
                    ? 'bg-gradient-to-br from-[#6C63FF] via-[#8B5CF6] to-[#EC4899] shadow-[0_0_40px_rgba(108,99,255,0.4)]'
                    : voiceState === 'LISTENING'
                    ? 'bg-gradient-to-br from-emerald-500 via-[#6C63FF] to-indigo-600 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
                    : 'bg-gradient-to-br from-[#1A1932] to-[#2D2B55] border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                }`}
              >
                <div className="w-20 h-20 rounded-full bg-[#0F0E17]/80 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Bot className={`w-10 h-10 transition-colors duration-300 ${
                    voiceState === 'SPEAKING' ? 'text-[#FF6584]' : voiceState === 'THINKING' ? 'text-purple-300' : 'text-[#6C63FF]'
                  }`} />
                </div>
              </motion.div>

              {/* State Label */}
              <motion.p
                key={voiceState}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-5 text-sm font-medium tracking-wide text-purple-200/90 text-center"
              >
                {getStatusText()}
              </motion.p>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-center space-x-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* LIVE TRANSCRIPT PANEL */}
            <div className="w-full max-h-48 overflow-y-auto space-y-3 px-2 py-3 my-2 rounded-2xl bg-white/[0.02] border border-white/5 custom-scrollbar">
              {transcripts.length === 0 ? (
                <p className="text-center text-xs text-white/40 py-4 italic">
                  JARVIS ile konuşmaya başlayabilirsiniz. Döküm burada görüntülenecektir.
                </p>
              ) : (
                transcripts.map((t, idx) => {
                  const isLatest = idx === transcripts.length - 1;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: isLatest ? 1 : 0.6, y: 0 }}
                      className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] uppercase font-bold text-white/40 mb-1 px-1">
                        {t.role === 'user' ? 'Siz' : 'JARVIS'}
                      </div>
                      <div
                        className={`max-w-[88%] text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl ${
                          t.role === 'user'
                            ? 'bg-[#6C63FF]/30 text-white border border-[#6C63FF]/40 rounded-br-xs'
                            : 'bg-white/5 text-purple-100 border border-white/10 rounded-bl-xs'
                        }`}
                      >
                        {t.text}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* ACTION REQUIRED CONFIRMATION CARD (WRITE Guard) */}
            <AnimatePresence>
              {actionRequired && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="w-full my-3 p-4 rounded-2xl bg-[#1A1932] border border-[#6C63FF]/40 shadow-2xl text-xs space-y-3"
                >
                  <div className="flex items-center space-x-2 text-purple-200 font-bold border-b border-white/10 pb-2">
                    {actionRequired.name === 'propose_lesson_plan' ? (
                      <><Sparkles className="w-4 h-4 text-[#FF6584]" /> Bir Sonraki Ders Önerisi</>
                    ) : (
                      <><Database className="w-4 h-4 text-[#FF6584]" /> Onay Bekleyen Hafıza Kaydı</>
                    )}
                  </div>

                  {actionRequired.name === 'create_lesson_record' && (
                    <div className="space-y-1.5 text-white/90">
                      <div className="flex justify-between"><span className="text-white/50">Sınıf:</span> <span className="font-semibold">{actionRequired.args.className || actionRequired.args.classId}</span></div>
                      {actionRequired.args.unitNumber && <div className="flex justify-between"><span className="text-white/50">Ünite:</span> <span>Unit {actionRequired.args.unitNumber} - {actionRequired.args.unitName}</span></div>}
                      <div className="flex justify-between"><span className="text-white/50">Konu:</span> <span className="text-[#6C63FF] font-semibold">{actionRequired.args.topic}</span></div>
                      {actionRequired.args.teacherNotes && <div className="italic text-white/70 pt-1">"{actionRequired.args.teacherNotes}"</div>}
                    </div>
                  )}

                  {actionRequired.name === 'add_teacher_note' && (
                    <div className="space-y-1.5 text-white/90">
                      <div className="flex justify-between"><span className="text-white/50">Sınıf:</span> <span className="font-semibold">{actionRequired.args.className || actionRequired.args.classId}</span></div>
                      <div className="italic text-white/80 pt-1">"{actionRequired.args.note}"</div>
                    </div>
                  )}

                  {actionRequired.name === 'propose_lesson_plan' && (
                    <div className="space-y-2 text-white/90">
                      <div className="font-semibold">{actionRequired.args.className} — {actionRequired.args.topic}</div>
                      <div className="text-white/60 italic">"{actionRequired.args.reasoning}"</div>
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
                    <button
                      onClick={handleCancelAction}
                      disabled={actionStatus === 'executing'}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold transition-colors text-center"
                    >
                      Vazgeç
                    </button>

                    {actionRequired.name === 'propose_lesson_plan' ? (
                      <button
                        onClick={handleGenerateFromAction}
                        disabled={actionStatus === 'executing'}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-bold transition-all shadow-md flex items-center justify-center space-x-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Dersi Hazırla</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleConfirmAction}
                        disabled={actionStatus === 'executing'}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-bold transition-all shadow-md flex items-center justify-center space-x-1.5"
                      >
                        {actionStatus === 'executing' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{actionStatus === 'confirmed' ? 'Kaydedildi' : 'Kaydet'}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Controls & Text Input Bar */}
          <div className="p-4 border-t border-white/5 bg-white/[0.02] space-y-3">
            {/* Quick Text Input for silent backup */}
            <form onSubmit={handleSendText} className="flex space-x-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Sesli konuşabilir veya yazabilirsiniz..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#6C63FF] transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-3 py-2 bg-[#6C63FF] hover:bg-[#6C63FF]/80 disabled:opacity-40 text-white rounded-xl transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Minimal Control Bar */}
            <div className="flex items-center justify-between">
              {/* Mic Status Indicator */}
              <div className="flex items-center space-x-2 text-xs text-white/60">
                <span className={`w-2 h-2 rounded-full ${isMuted ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
                <span>{isMuted ? 'Mikrofon Sessizde' : 'Mikrofon Aktif'}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* Interrupt / Stop Speech */}
                {voiceState === 'SPEAKING' && (
                  <button
                    onClick={handleStopSpeech}
                    className="p-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-all flex items-center space-x-1.5 text-xs font-semibold"
                    title="JARVIS'in konuşmasını kes"
                  >
                    <Square className="w-4 h-4 fill-amber-200" />
                    <span>Durdur</span>
                  </button>
                )}

                {/* Mute / Unmute Mic */}
                <button
                  onClick={handleMuteToggle}
                  className={`p-3 rounded-2xl transition-all border flex items-center space-x-2 text-xs font-semibold ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-200 border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-[#6C63FF]/20 text-purple-200 border-[#6C63FF]/30 hover:bg-[#6C63FF]/30'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isMuted ? 'Sesi Aç' : 'Sustur'}</span>
                </button>

                {/* Close Session */}
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
                >
                  Bitir
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
