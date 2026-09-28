import React from 'react';
import { GeneratedContent } from '../types';
import { FolderHeart, X, Trash2, ChevronRight, Calendar, Sparkles } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedPackages: GeneratedContent[];
  onSelectPackage: (pkg: GeneratedContent) => void;
  onDeletePackage: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedPackages,
  onSelectPackage,
  onDeletePackage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-modal flex flex-col text-purple-100 rounded-none rounded-l-[32px]">
          {/* Header */}
          <div className="p-5 bg-[#1A1932]/80 backdrop-blur-md border-b border-[#6C63FF]/30 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderHeart className="w-5 h-5 text-[#FF6584]" />
              <h2 className="text-lg font-black bg-gradient-to-r from-[#6C63FF] via-[#FF6584] to-[#6C63FF] bg-clip-text text-transparent">
                Kayıtlı Ders Paketlerim
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#6C63FF]/20 text-purple-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {savedPackages.length === 0 ? (
              <div className="text-center py-12 text-purple-300/50 space-y-2">
                <FolderHeart className="w-12 h-12 mx-auto text-[#6C63FF]/40 stroke-1" />
                <p className="text-sm font-semibold text-purple-200">Henüz kayıtlı ders paketiniz yok.</p>
                <p className="text-xs">
                  Oluşturduğunuz paketlerde "Paketi Kaydet 👍" butonuna basarak buraya kaydedebilirsiniz.
                </p>
              </div>
            ) : (
              savedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="glass-card hover:border-[#6C63FF] p-4 transition-all space-y-2 group relative"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#6C63FF]/20 text-purple-200 border border-[#6C63FF]/40">
                      {pkg.request?.grade || '5'}. Sınıf
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePackage(pkg.id);
                      }}
                      className="text-purple-300/60 hover:text-rose-400 p-1 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    onClick={() => {
                      onSelectPackage(pkg);
                      onClose();
                    }}
                    className="cursor-pointer space-y-1"
                  >
                    <h3 className="font-extrabold text-white text-sm group-hover:text-[#FF6584] transition-colors">
                      {pkg.lessonPlan?.title || pkg.request?.unitName || 'Ders Paketi'}
                    </h3>
                    <p className="text-xs text-purple-200/80 font-medium">
                      Ünite: {pkg.request?.unitName} | {pkg.request?.skill}
                    </p>
                    <div className="flex items-center text-[10px] text-purple-300/60 gap-1 pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(pkg.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
