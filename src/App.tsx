import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';
import { GeneratedContent, GenerateRequest } from './types';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MascotWelcome } from './components/MascotWelcome';
import { ParticleBackground } from './components/ParticleBackground';
import { StatsCounter } from './components/StatsCounter';
import { TeacherForm } from './components/TeacherForm';
import { LessonPlanView } from './components/LessonPlanView';
import { WorksheetView } from './components/WorksheetView';
import { FlashcardsView } from './components/FlashcardsView';
import { FeedbackModal } from './components/FeedbackModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PrintView } from './components/PrintView';
import { LessonsWorkspace } from './components/LessonsWorkspace';
import { ResourceCenter } from './components/ResourceCenter';
import { SaveToClassModal } from './components/SaveToClassModal';
import { TeacherWorkspace } from './components/TeacherWorkspace';
import { JarvisChat } from './components/JarvisChat';
import { JarvisVoiceModal } from './components/JarvisVoiceModal';
import { JarvisDashboard } from './components/JarvisDashboard';
import {
  BookOpen,
  FileText,
  Sparkles,
  RotateCcw,
  ThumbsUp,
  Lightbulb,
  Check,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPackage, setCurrentPackage] = useState<GeneratedContent | null>(null);
  const [mainView, setMainView] = useState<'workspace' | 'lessons' | 'resources' | 'jarvis'>('workspace');
  const [lessonsSubTab, setLessonsSubTab] = useState<'classes' | 'planner' | 'studio'>('classes');
  const [activeTab, setActiveTab] = useState<'plan' | 'worksheet' | 'cards'>('plan');

  // Modals & Drawers
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaveToClassOpen, setIsSaveToClassOpen] = useState(false);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisVoiceOpen, setIsJarvisVoiceOpen] = useState(false);
  const [jarvisContextClassId, setJarvisContextClassId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ready plans to fill form
  const [externalGrade, setExternalGrade] = useState<string | null>(null);
  const [externalUnitIndex, setExternalUnitIndex] = useState<number | null>(null);

  // Resource center context prefilling
  const [resourceClassId, setResourceClassId] = useState<string>('');
  const [resourceGrade, setResourceGrade] = useState<string>('');
  const [resourceUnit, setResourceUnit] = useState<string>('');
  const [resourceTopic, setResourceTopic] = useState<string>('');

  // LocalStorage persistence for saved packages
  const [savedPackages, setSavedPackages] = useState<GeneratedContent[]>(() => {
    try {
      const stored = localStorage.getItem('maarif_teacher_saved_packages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('maarif_teacher_saved_packages', JSON.stringify(savedPackages));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [savedPackages]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6C63FF', '#FF6584', '#FFD700', '#4EA8DE']
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGenerate = async (request: GenerateRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Ders paketi oluşturulurken hata oluştu.');
      }

      const data: GeneratedContent = await response.json();
      setCurrentPackage(data);
      setMainView('lessons');
      setLessonsSubTab('studio');
      setActiveTab('plan');
      triggerConfetti();
      showToast('🎉 Harika! MEB Maarif Modeli ders paketiniz hazır!');
    } catch (err: any) {
      console.error('Generation Error:', err);
      setError(err.message || 'Sunucu hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (refinementText: string) => {
    if (!currentPackage) return;
    setIsRefining(true);

    try {
      const response = await fetch('/api/refine-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPackage,
          refinementInstruction: refinementText,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Ders paketi güncellenirken hata oluştu.');
      }

      const updatedData: GeneratedContent = await response.json();
      setCurrentPackage(updatedData);
      showToast('✨ Ders paketiniz başarıyla güncellendi!');
    } catch (err: any) {
      console.error('Refinement Error:', err);
      showToast('❌ Güncellenirken bir hata oluştu.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveToFavorites = () => {
    if (!currentPackage) return;
    const exists = savedPackages.some((p) => p.id === currentPackage.id);
    if (!exists) {
      setSavedPackages((prev) => [currentPackage, ...prev]);
      showToast('❤️ Ders paketi kayıtlı paketlerinize eklendi!');
    } else {
      showToast('ℹ️ Bu ders paketi zaten kayıtlı.');
    }
  };

  const handleDeleteSaved = (id: string) => {
    setSavedPackages((prev) => prev.filter((p) => p.id !== id));
    showToast('Silindi.');
  };

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    showToast('📋 Metin panoya kopyalandı!');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-content');
    if (!printContent) return;

    const contentHtml = printContent.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ders Paketi</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                .page-break-after { page-break-after: always; }
                .page-break-before { page-break-before: always; }
              }
              body { font-family: sans-serif; padding: 20px; }
            </style>
          </head>
          <body>
            ${contentHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      // Wait a tiny bit for Tailwind to load and then print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleNavigationCommand = (view: 'workspace' | 'lessons' | 'resources' | 'jarvis', options?: any) => {
    setMainView(view);
    if (view === 'lessons') {
      if (options?.subTab) {
        setLessonsSubTab(options.subTab === 'none' ? 'classes' : options.subTab);
      } else {
        setLessonsSubTab('classes');
      }
      if (options?.classId) {
        setJarvisContextClassId(options.classId);
      }
    } else if (view === 'resources') {
      if (options?.classId) setResourceClassId(options.classId);
      if (options?.topic) setResourceTopic(options.topic);
    } else if (view === 'jarvis') {
      if (options?.classId) setJarvisContextClassId(options.classId);
    }
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-radial-dark text-purple-100 font-sans antialiased flex flex-col selection:bg-[#6C63FF] selection:text-white relative overflow-x-hidden">
        {/* Moving Particle Background */}
        <ParticleBackground />

        {/* Top Header */}
        <Header
          onOpenHistory={() => setIsHistoryOpen(true)}
          savedCount={savedPackages.length}
          currentView={mainView}
          onViewChange={(view) => {
            setMainView(view);
            if (view === 'lessons') {
              setLessonsSubTab('classes');
            }
          }}
        />

      {/* Main Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-[#161524] text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(108,99,255,0.4)] border border-[#6C63FF] flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-[#FF6584]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 md:space-y-8 relative z-10">
        {mainView === 'workspace' ? (
          <TeacherWorkspace
            onNavigateToView={(view) => {
              setMainView(view);
              if (view === 'lessons') {
                setLessonsSubTab('classes');
              }
            }}
            onOpenJarvis={(classId) => {
              if (classId) setJarvisContextClassId(classId);
              setMainView('jarvis');
            }}
            onOpenVoice={() => {
              setMainView('jarvis');
            }}
            onSelectClassForPlanner={(classId) => {
              setJarvisContextClassId(classId);
              setLessonsSubTab('planner');
            }}
          />
        ) : mainView === 'lessons' ? (
          <LessonsWorkspace
            currentPackage={currentPackage}
            setCurrentPackage={setCurrentPackage}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
            setError={setError}
            handleGenerate={handleGenerate}
            onNavigateToResources={(classId, grade, unit, topic) => {
              setResourceClassId(classId);
              setResourceGrade(grade);
              setResourceUnit(unit);
              setResourceTopic(topic);
              setMainView('resources');
            }}
            onNavigateToJarvis={(classId) => {
              setJarvisContextClassId(classId);
              setMainView('jarvis');
            }}
            savedPackages={savedPackages}
            onSaveToFavorites={handleSaveToFavorites}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
            onOpenSaveToClass={() => setIsSaveToClassOpen(true)}
            externalGrade={externalGrade}
            externalUnitIndex={externalUnitIndex}
            setExternalGrade={setExternalGrade}
            setExternalUnitIndex={setExternalUnitIndex}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            initialClassId={jarvisContextClassId}
            initialFlow={lessonsSubTab === 'classes' ? 'none' : (lessonsSubTab === 'planner' ? 'planner' : 'studio')}
          />
        ) : mainView === 'resources' ? (
          <ResourceCenter
            initialClassId={resourceClassId}
            initialGrade={resourceGrade}
            initialUnit={resourceUnit}
            initialTopic={resourceTopic}
            onOpenJarvis={(classId) => {
              setJarvisContextClassId(classId || null);
              setMainView('jarvis');
            }}
            onOpenVoice={() => {
              setMainView('jarvis');
            }}
            showToast={showToast}
          />
        ) : (
          <JarvisDashboard
            initialClassId={jarvisContextClassId}
            onGenerateLesson={(request) => {
              handleGenerate(request);
            }}
            onNavigate={handleNavigationCommand}
          />
        )}


        {/* Animated System Stats Counter (En Alt İstatistik Bölümü) */}
        <div className="pt-4 border-t border-[#2D2B55]/50">
          <StatsCounter />
        </div>
      </main>

      {/* Modals & Drawers */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onRefine={handleRefine}
        isRefining={isRefining}
      />

      {currentPackage && (
        <SaveToClassModal
          isOpen={isSaveToClassOpen}
          onClose={() => setIsSaveToClassOpen(false)}
          currentPackage={currentPackage}
        />
      )}

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedPackages={savedPackages}
        onSelectPackage={(pkg) => setCurrentPackage(pkg)}
        onDeletePackage={handleDeleteSaved}
      />

      {/* Hidden Print Area */}
      {currentPackage && <PrintView content={currentPackage} />}

      <JarvisChat 
        isOpen={isJarvisOpen}
        onClose={() => setIsJarvisOpen(false)}
        contextClassId={jarvisContextClassId}
        onGenerateLesson={handleGenerate}
        onOpenVoiceModal={() => setIsJarvisVoiceOpen(true)}
        onNavigate={handleNavigationCommand}
      />

      <JarvisVoiceModal
        isOpen={isJarvisVoiceOpen}
        onClose={() => setIsJarvisVoiceOpen(false)}
        contextClassId={jarvisContextClassId}
        onGenerateLesson={handleGenerate}
        onNavigate={handleNavigationCommand}
      />

      {/* FOOTER */}
      <footer className="bg-[#161524] text-[#A7A9BE] text-xs py-6 border-t border-[#2D2B55] text-center space-y-1.5 relative z-10">
        <p className="font-bold text-purple-200">
          © 2025 MEB İngilizce Öğretmen Asistanı - Powered by Gemini AI
        </p>
        <p className="text-[11px] text-[#A7A9BE]/70">
          5, 6, 7 ve 8. Sınıf Türkiye Yüzyılı Maarif Modeli İngilizce Müfredatı İçin Özel Tasarlanmıştır.
        </p>
      </footer>
    </div>
    </LanguageProvider>
  );
}
