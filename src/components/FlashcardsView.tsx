import React, { useState } from 'react';
import { Flashcard } from '../types';
import {
  Volume2,
  RotateCw,
  Tv,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Maximize2
} from 'lucide-react';

interface FlashcardsViewProps {
  cards: Flashcard[];
  unitName: string;
  grade: string;
  onPrint: () => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  cards,
  unitName,
  grade,
  onPrint,
}) => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<'grid' | 'presentation' | 'quiz'>('grid');
  
  // Presentation & Quiz index
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [quizShowAnswer, setQuizShowAnswer] = useState(false);

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const speakWord = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // slightly slower for young learners
      window.speechSynthesis.speak(utterance);
    }
  };

  const activePresentationCard = cards[currentCardIndex] || cards[0];

  return (
    <div className="space-y-6 text-purple-100">
      {/* Top Controls & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-card text-white p-4">
        <div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 3D Dönebilir Kartlar
          </span>
          <h3 className="text-base sm:text-lg font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent">
            {unitName} Kelime Kartları ({cards.length} Kelime)
          </h3>
        </div>

        {/* View Modes */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode('grid')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              mode === 'grid'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_15px_rgba(108,99,255,0.3)]'
                : 'bg-[#161524] text-purple-200 hover:bg-[#201F3B] border border-[#6C63FF]/20'
            }`}
          >
            🎴 Kart Izgarası
          </button>
          <button
            onClick={() => setMode('presentation')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              mode === 'presentation'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_15px_rgba(108,99,255,0.3)] font-black'
                : 'bg-[#161524] text-purple-200 hover:bg-[#201F3B] border border-[#6C63FF]/20'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Akıllı Tahta Sunum Modu</span>
          </button>
          <button
            onClick={() => setMode('quiz')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              mode === 'quiz'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_15px_rgba(108,99,255,0.3)] font-black'
                : 'bg-[#161524] text-purple-200 hover:bg-[#201F3B] border border-[#6C63FF]/20'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Sınıf İçi Kelime Testi</span>
          </button>
          <button
            onClick={onPrint}
            className="p-2 bg-[#161524] hover:bg-[#201F3B] rounded-xl text-purple-200 transition-all border border-[#6C63FF]/20"
            title="Kelime Kartlarını Yazdır"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODE 1: GRID OF 3D FLIP CARDS */}
      {mode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const isFlipped = !!flippedCards[card.id];
            return (
              <div
                key={card.id}
                onClick={() => toggleFlip(card.id)}
                className="group h-60 w-full perspective-1000 cursor-pointer"
              >
                <div
                  className={`relative h-full w-full rounded-3xl transition-transform duration-500 transform-style-3d shadow-[0_0_20px_rgba(108,99,255,0.15)] border border-[rgba(108,99,255,0.3)] hover:shadow-[0_0_30px_rgba(108,99,255,0.3)] ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT SIDE (English) */}
                  <div className="absolute inset-0 h-full w-full rounded-3xl bg-[#1A1932] p-5 flex flex-col justify-between backface-hidden border border-[#6C63FF]/30">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{card.emojiOrIcon || '📌'}</span>
                      <button
                        onClick={(e) => speakWord(card.word, e)}
                        className="p-2.5 rounded-2xl bg-[#6C63FF]/20 hover:bg-[#6C63FF] hover:text-white text-purple-200 transition-colors border border-[#6C63FF]/30"
                        title="Telaffuzu Dinle"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="text-center my-auto space-y-1">
                      <h4 className="text-2xl font-black text-white tracking-wide">
                        {card.word}
                      </h4>
                      {card.pronunciationPhonetic && (
                        <p className="text-xs text-[#FF6584] font-mono font-medium">
                          {card.pronunciationPhonetic}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-purple-300/70 border-t border-[#6C63FF]/20 pt-2 font-medium">
                      <span className="text-purple-300 font-bold">{card.category || 'Vocabulary'}</span>
                      <span className="flex items-center gap-1 text-[#FF6584] font-bold group-hover:underline">
                        <RotateCw className="w-3 h-3 animate-spin-slow" /> Çevirmek için tıkla
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE (Turkish & Example Sentence) */}
                  <div className="absolute inset-0 h-full w-full rounded-3xl bg-[#161524] text-white p-5 flex flex-col justify-between rotate-y-180 backface-hidden border border-[#6C63FF]/40">
                    <div className="flex justify-between items-center text-xs text-purple-200">
                      <span className="font-bold text-amber-300">Türkçe Anlamı</span>
                      <button
                        onClick={(e) => speakWord(card.word, e)}
                        className="p-1.5 rounded-xl bg-[#6C63FF]/30 hover:bg-[#6C63FF]/50 text-white"
                        title="Telaffuzu Dinle"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-center my-auto space-y-2">
                      <h4 className="text-2xl font-black text-amber-300 tracking-wide">
                        {card.trTranslation}
                      </h4>
                      <p className="text-xs text-purple-100 italic bg-[#1A1932] p-2.5 rounded-xl border border-[#6C63FF]/30">
                        "{card.exampleSentence}"
                      </p>
                    </div>

                    <div className="text-center text-[10px] text-purple-300/80 font-medium border-t border-[#6C63FF]/20 pt-2">
                      İngilizcesi: <span className="font-bold text-white">{card.word}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: SMARTBOARD PRESENTATION MODE (Full Large Card) */}
      {mode === 'presentation' && activePresentationCard && (
        <div className="glass-card p-6 sm:p-10 text-white space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-xs text-purple-300 border-b border-[#6C63FF]/20 pb-3">
            <span className="font-extrabold text-amber-300">📺 Akıllı Tahta Sunum Modu</span>
            <span>
              Kart {currentCardIndex + 1} / {cards.length}
            </span>
          </div>

          {/* Huge Card Container */}
          <div className="glass-card p-8 text-center space-y-6">
            <div className="text-6xl animate-bounce">{activePresentationCard.emojiOrIcon}</div>

            <div className="space-y-2">
              <h2 className="text-4xl sm:text-5xl font-black text-amber-300 tracking-wider">
                {activePresentationCard.word}
              </h2>
              <p className="text-sm text-[#FF6584] font-mono">
                {activePresentationCard.pronunciationPhonetic || '/pronunciation/'}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => speakWord(activePresentationCard.word)}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-black text-sm shadow-[0_0_15px_rgba(108,99,255,0.3)] transform active:scale-95 transition-all"
              >
                <Volume2 className="w-5 h-5" />
                <span>Yüksek Sesle Oku (Listen)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#6C63FF]/30 space-y-2">
              <span className="text-xs text-purple-300/80 font-bold uppercase tracking-wider block">
                Türkçe Karşılığı & Örnek Cümle:
              </span>
              <p className="text-2xl font-bold text-white">
                {activePresentationCard.trTranslation}
              </p>
              <p className="text-sm text-purple-100 italic bg-[#161524] p-3 rounded-xl border border-[#6C63FF]/30 max-w-lg mx-auto">
                "{activePresentationCard.exampleSentence}"
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1))}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#1A1932] hover:bg-[#201F3B] border border-[#6C63FF]/30 text-white font-bold text-sm transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Önceki Kelime</span>
            </button>

            <button
              onClick={() => setCurrentCardIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0))}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(108,99,255,0.3)]"
            >
              <span>Sonraki Kelime</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: CLASSROOM QUIZ MODE */}
      {mode === 'quiz' && activePresentationCard && (
        <div className="glass-card p-6 sm:p-10 text-white space-y-6 max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-between text-xs text-purple-300 border-b border-[#6C63FF]/20 pb-3">
            <span className="font-black text-[#FF6584]">❓ Sınıf İçi Kelime Testi / Bulmaca</span>
            <span>
              Soru {currentCardIndex + 1} / {cards.length}
            </span>
          </div>

          <div className="text-5xl">{activePresentationCard.emojiOrIcon}</div>

          <div className="space-y-3">
            <span className="text-xs text-purple-300/80 uppercase tracking-widest font-bold">
              Bu Kelimenin Türkçe Anlamı Nedir?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide">
              "{activePresentationCard.word}"
            </h2>
            <button
              onClick={() => speakWord(activePresentationCard.word)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A1932] hover:bg-[#201F3B] border border-[#6C63FF]/30 rounded-full text-xs text-purple-200"
            >
              <Volume2 className="w-3.5 h-3.5" /> Dinle
            </button>
          </div>

          {/* Reveal Answer Switch */}
          <div className="py-4">
            {quizShowAnswer ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 space-y-2 animate-fade-in">
                <span className="text-xs font-bold text-emerald-300 block">Doğru Cevap:</span>
                <p className="text-3xl font-black text-emerald-300">
                  {activePresentationCard.trTranslation}
                </p>
                <p className="text-xs text-purple-200 italic">
                  "{activePresentationCard.exampleSentence}"
                </p>
              </div>
            ) : (
              <button
                onClick={() => setQuizShowAnswer(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-90 text-white font-black text-sm shadow-[0_0_20px_rgba(108,99,255,0.3)] transform active:scale-95 transition-all flex items-center gap-2 mx-auto"
              >
                <Eye className="w-4 h-4" />
                <span>Cevabı Göster (Reveal Answer)</span>
              </button>
            )}
          </div>

          {/* Quiz Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                setQuizShowAnswer(false);
                setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
              }}
              className="px-4 py-2 bg-[#1A1932] hover:bg-[#201F3B] border border-[#6C63FF]/30 rounded-xl text-xs font-bold text-purple-200"
            >
              ← Önceki
            </button>
            <button
              onClick={() => {
                setQuizShowAnswer(false);
                setCurrentCardIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-xl text-xs font-extrabold text-white shadow-md"
            >
              Sonraki Soru →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
