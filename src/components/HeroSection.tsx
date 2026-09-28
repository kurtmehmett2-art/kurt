import React from 'react';
import { Sparkles, Zap, Award } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="text-center py-6 sm:py-8 space-y-3 relative animate-fade-in">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1932] border border-[#6C63FF]/40 text-xs font-extrabold text-purple-200 shadow-[0_0_15px_rgba(108,99,255,0.2)]">
        <Award className="w-4 h-4 text-[#FF6584]" />
        <span>5-8. Sınıf • Türkiye Yüzyılı Maarif Modeli</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent glow-text leading-tight">
        MEB İngilizce Öğretmen Asistanı
      </h1>

      {/* Slogan */}
      <p className="text-base sm:text-xl font-extrabold text-purple-200 flex items-center justify-center gap-2">
        <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
        <span>Yapay Zeka ile Anında Ders Planı</span>
        <Sparkles className="w-5 h-5 text-[#FF6584] animate-pulse" />
      </p>

      {/* Subtitle description */}
      <p className="text-xs sm:text-sm text-[#A7A9BE] max-w-2xl mx-auto font-medium leading-relaxed">
        Saniyeler içinde MEB kazanımlarıyla birebir uyumlu ders planları, sınıf içi eğlenceli etkinlikler, çalışma kağıtları ve 3D kelime kartları oluşturun.
      </p>

      {/* Decorative gradient separator */}
      <div className="w-48 h-[2px] bg-gradient-to-r from-transparent via-[#FF6584] to-transparent mx-auto pt-2" />
    </section>
  );
};
