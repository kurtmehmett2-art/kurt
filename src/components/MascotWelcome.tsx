import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';

const TEACHER_TIPS = [
  "Hazır mısınız? Saniyeler içinde MEB Maarif Modeli uyumlu tam bir ders paketi hazırlayalım!",
  "Öğrencilerinizi derste aktif kılacak harika oyunlar ve 3D dönebilir kelime kartları sizi bekliyor! 🎲",
  "Çalışma kağıdını anında yazdırabilir veya akıllı tahtada kelime kartlarını sunum modunda açabilirsiniz! 💻",
  "BEP (Bireyselleştirilmiş Eğitim Planı) veya kalabalık sınıflar için 'Özel Koşul' seçeneğini ekleyebilirsiniz! 🌟",
  "Beğendiğiniz paketlerde 'Geliştirilebilir' butonuna basarak ders planını dilediğiniz gibi güncelletebilirsiniz! ✏️"
];

export const MascotWelcome: React.FC = () => {
  const [tipIndex, setTipIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullText = TEACHER_TIPS[tipIndex];

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [tipIndex, fullText]);

  const nextTip = () => {
    setTipIndex((prev) => (prev + 1) % TEACHER_TIPS.length);
  };

  return (
    <div className="glass-card p-5 sm:p-6 text-white relative overflow-hidden my-4 transition-all">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[#6C63FF]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-[#FF6584]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
        {/* Animated Robot Avatar */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="robot-assistant-avatar text-3xl">
            🤖
          </div>
          <span className="mt-2.5 px-3 py-1 rounded-full badge-kazanim text-xs shadow-[0_0_15px_rgba(108,99,255,0.3)]">
            Asistan Maarif-AI
          </span>
        </div>

        {/* Speech Bubble with Typewriter Effect */}
        <div className="flex-1 glass-bubble p-4 sm:p-5 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-extrabold text-sm sm:text-base flex items-center gap-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] bg-clip-text text-transparent glow-text">
              <Sparkles className="w-4 h-4 text-[#FF6584] animate-pulse" />
              Merhaba Değerli Öğretmenim! 👋
            </span>
            <button
              onClick={nextTip}
              className="text-xs text-[#A7A9BE] hover:text-white flex items-center gap-1 bg-[#1A1932] hover:bg-[#2D2B55] px-2.5 py-1 rounded-lg border border-[#2D2B55] transition-colors btn-premium"
              title="İpucunu Değiştir"
            >
              <RefreshCw className={`w-3 h-3 text-[#6C63FF] ${isTyping ? 'animate-spin' : ''}`} />
              <span>İpucu Değiştir</span>
            </button>
          </div>

          <p className="text-sm sm:text-base text-purple-100 font-medium leading-relaxed min-h-[48px]">
            "{displayedText}"
            <span className="typewriter-cursor" />
          </p>

          <div className="divider-premium my-3" />

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="badge-kazanim flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> MEB Kazanım Uyumlu
            </span>
            <span className="badge-maarif flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> A1-A2 Seviye Etkinlik
            </span>
            <span className="badge-sure flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6C63FF]" /> 3D Kelime Kartları
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
