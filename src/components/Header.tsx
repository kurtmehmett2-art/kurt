import React from 'react';
import { Sparkles, FolderHeart, UserCheck, Bot, Globe, LayoutDashboard, BookOpen, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  onOpenHistory: () => void;
  savedCount: number;
  currentView: 'workspace' | 'lessons' | 'resources' | 'jarvis';
  onViewChange: (view: 'workspace' | 'lessons' | 'resources' | 'jarvis') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  savedCount,
  currentView,
  onViewChange,
}) => {
  const { uiLang, setUiLang, t } = useLanguage();

  return (
    <header className="glass-header text-white sticky top-0 z-40 animate-fade-in-down border-b border-[#2D2B55] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Logo + App Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('workspace')}>
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] shadow-[0_0_20px_rgba(108,99,255,0.4)] transform hover:scale-105 transition-transform p-0.5 animate-glow-pulse">
            <div className="w-full h-full bg-[#1A1932] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl animate-bounce" role="img" aria-label="Robot Asistan">🤖</span>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6584] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF6584] border-2 border-[#0F0E17]"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent glow-text">
                {t('appTitle', 'MEB İngilizce Öğretmen Asistanı')}
              </h1>
            </div>
            <p className="text-[11px] text-[#A7A9BE] font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-[#FF6584]" />
              {t('appSubTitle', 'Türkiye Yüzyılı Maarif Modeli Destekli')}
            </p>
          </div>
        </div>

        {/* Center: Navigation */}
        <div className="flex items-center bg-[#1A1932] p-1 rounded-xl border border-[#2D2B55]">
          <button
            onClick={() => onViewChange('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'workspace'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-md'
                : 'text-[#A7A9BE] hover:text-white hover:bg-[#2D2B55]/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{t('navDashboard', 'Ana Merkez')}</span>
          </button>
          
          <button
            onClick={() => onViewChange('lessons')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'lessons'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-md'
                : 'text-[#A7A9BE] hover:text-white hover:bg-[#2D2B55]/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">{t('navLessons', 'Dersler')}</span>
          </button>
          
          <button
            onClick={() => onViewChange('resources')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'resources'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-md'
                : 'text-[#A7A9BE] hover:text-white hover:bg-[#2D2B55]/50'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{t('navResources', 'Kaynaklar')}</span>
          </button>

          <button
            onClick={() => onViewChange('jarvis')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'jarvis'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-md'
                : 'text-[#A7A9BE] hover:text-white hover:bg-[#2D2B55]/50'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('navJarvis', 'JARVIS')}</span>
          </button>
        </div>

        {/* Right: Language Toggle, Badge & Saved Packages */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* UI Language Switch Button */}
          <div className="flex items-center bg-[#1A1932] p-1 rounded-xl border border-[#2D2B55]">
            <button
              onClick={() => setUiLang('tr')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                uiLang === 'tr'
                  ? 'bg-[#6C63FF] text-white shadow'
                  : 'text-[#A7A9BE] hover:text-white'
              }`}
              title="Türkçe Arayüz"
            >
              <span>🇹🇷</span>
              <span className="hidden xs:inline">TR</span>
            </button>
            <button
              onClick={() => setUiLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                uiLang === 'en'
                  ? 'bg-[#6C63FF] text-white shadow'
                  : 'text-[#A7A9BE] hover:text-white'
              }`}
              title="English UI"
            >
              <span>🇬🇧</span>
              <span className="hidden xs:inline">EN</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center space-x-1.5 bg-[#1A1932] px-3 py-1.5 rounded-xl border border-[#2D2B55] text-xs font-bold text-purple-100">
            <UserCheck className="w-4 h-4 text-[#FF6584]" />
            <span>{t('teacherMode', 'Öğretmen Modu')}</span>
          </div>

          <button
            id="saved-plans-btn"
            onClick={onOpenHistory}
            className="relative flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-bold text-xs sm:text-sm btn-premium btn-shimmer shadow-[0_0_20px_rgba(108,99,255,0.3)]"
            title={t('savedPackages', 'Kayıtlı Paketler')}
          >
            <FolderHeart className="w-4 h-4 text-white" />
            <span className="hidden xs:inline">{t('savedPackages', 'Kayıtlı Paketler')}</span>
            {savedCount > 0 && (
              <span className="bg-white text-[#6C63FF] text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Thin Gradient Separator */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#6C63FF]/60 to-transparent" />
    </header>
  );
};
