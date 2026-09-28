import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ThumbsUp, Lightbulb, Sparkles, X, Send } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefine: (refinementText: string) => Promise<void>;
  isRefining: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onRefine,
  isRefining,
}) => {
  const [feedbackType, setFeedbackType] = useState<'liked' | 'refine' | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [likedSubmitted, setLikedSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleLike = () => {
    setFeedbackType('liked');
    setLikedSubmitted(true);
    // Trigger celebratory confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'],
    });
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementInput.trim()) return;
    await onRefine(refinementInput.trim());
    setRefinementInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-modal max-w-lg w-full p-6 sm:p-8 relative space-y-5 text-purple-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-purple-300 hover:text-white hover:bg-[#1A1932] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-2xl bg-[#6C63FF]/20 text-[#FF6584] border border-[#6C63FF]/30 mb-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent">
            Ders Paketi Geri Bildirimi
          </h3>
          <p className="text-xs text-purple-300/80">
            İçeriği geliştirmemiz için düşünceleriniz çok kıymetli!
          </p>
        </div>

        {!feedbackType && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleLike}
              className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 font-extrabold flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <ThumbsUp className="w-8 h-8 text-emerald-400" />
              <span>Harika / Beğendim! 👍</span>
            </button>

            <button
              onClick={() => setFeedbackType('refine')}
              className="p-5 rounded-2xl border border-[#6C63FF]/40 bg-[#1A1932] hover:bg-[#201F3B] text-purple-200 font-extrabold flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-[0_0_15px_rgba(108,99,255,0.15)]"
            >
              <Lightbulb className="w-8 h-8 text-amber-300" />
              <span>Geliştirilebilir 💡</span>
            </button>
          </div>
        )}

        {/* Option 1: Liked Confirmation */}
        {feedbackType === 'liked' && likedSubmitted && (
          <div className="text-center space-y-3 py-4 animate-fade-in">
            <div className="text-4xl">🎉</div>
            <h4 className="text-lg font-black text-emerald-400">
              Çok Sevindik Öğretmenim!
            </h4>
            <p className="text-xs text-purple-200">
              Bu harika ders paketini 'Kayıtlı Paketlerim' listesine ekledik. İyi dersler dileriz!
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-2xl font-bold text-sm shadow-[0_0_15px_rgba(108,99,255,0.3)]"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Option 2: Refinement Prompt Form */}
        {feedbackType === 'refine' && (
          <form onSubmit={handleRefineSubmit} className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-black text-purple-200 uppercase tracking-wide">
                Nelerin Değişmesini/Gelişmesini İstersiniz?
              </label>
              <p className="text-xs text-purple-300/70">
                Örn: "Etkinlik süresini 20 dakikaya indir", "Okuma parçasını biraz daha basit yap", "Daha fazla kelime ekle"
              </p>
            </div>

            <textarea
              rows={3}
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="İstediğiniz güncellemeleri buraya yazın..."
              className="w-full glass-input p-3 text-sm font-medium text-white placeholder-purple-300/40 transition-all"
              required
            ></textarea>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFeedbackType(null)}
                className="w-1/3 py-3 border border-[#6C63FF]/30 rounded-2xl font-bold text-xs text-purple-200 hover:bg-[#1A1932]"
              >
                Geri
              </button>

              <button
                type="submit"
                disabled={isRefining}
                className="w-2/3 py-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-2xl font-extrabold text-sm shadow-[0_0_15px_rgba(108,99,255,0.3)] flex items-center justify-center gap-2"
              >
                {isRefining ? (
                  <span>Güncelleniyor...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Yapay Zekaya Güncellet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
