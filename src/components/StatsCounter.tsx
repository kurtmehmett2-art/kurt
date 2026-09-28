import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, Gamepad2, Layers, CheckCircle2 } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  target: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, target, suffix = '', prefix = '', label }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000; // 2 seconds
    const steps = 50;
    const stepTime = duration / steps;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-2 hover:scale-[1.03] transition-transform">
      <div className="w-10 h-10 rounded-2xl bg-[#1A1932] border border-[#2D2B55] flex items-center justify-center text-[#FF6584] shadow-[0_0_15px_rgba(108,99,255,0.2)]">
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent glow-text">
        {prefix}{count.toLocaleString('tr-TR')}{suffix}
      </div>
      <div className="text-xs font-medium text-[#A7A9BE]">
        {label}
      </div>
    </div>
  );
};

export const StatsCounter: React.FC = () => {
  return (
    <div className="my-6">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#FF6584] animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#A7A9BE]">
          Sistem İstatistikleri & Maarif Modeli
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatItem
          icon={<BookOpen className="w-5 h-5 text-[#6C63FF]" />}
          target={1250}
          suffix="+"
          label="Oluşturulan MEB Ders Planı"
        />
        <StatItem
          icon={<Gamepad2 className="w-5 h-5 text-[#FF6584]" />}
          target={4800}
          suffix="+"
          label="Eğlenceli Sınıf Etkinliği"
        />
        <StatItem
          icon={<Layers className="w-5 h-5 text-amber-400" />}
          target={8500}
          suffix="+"
          label="3D Dönebilir Kelime Kartı"
        />
        <StatItem
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          target={100}
          prefix="%"
          label="Türkiye Yüzyılı Uyum Sınıfı"
        />
      </div>
    </div>
  );
};
