import React, { createContext, useContext, useState, useEffect } from 'react';

export type UiLanguage = 'tr' | 'en';
export type OutputLanguage = 'tr' | 'en' | 'bilingual';

interface LanguageContextType {
  uiLang: UiLanguage;
  setUiLang: (lang: UiLanguage) => void;
  outputLang: OutputLanguage;
  setOutputLang: (lang: OutputLanguage) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<UiLanguage, Record<string, string>> = {
  tr: {
    // Header & Nav
    appTitle: 'MEB İngilizce Öğretmen Asistanı',
    appSubTitle: 'Türkiye Yüzyılı Maarif Modeli Destekli',
    navDashboard: 'Ana Merkez',
    navLessons: 'Dersler',
    navResources: 'Kaynaklar',
    navJarvis: 'JARVIS',
    teacherMode: 'Öğretmen Modu',
    savedPackages: 'Kayıtlı Paketler',
    uiLanguage: 'Arayüz Dili',

    // Dashboard
    workspaceTitle: 'Öğretmen Ana Merkezi & Canlı Komuta Paneli',
    welcomeTeacher: 'Hoş Geldiniz, Öğretmenim 👋',
    welcomeDesc: 'Türkiye Yüzyılı Maarif Modeli müfredatınız, sınıflarınızın canlı hafızası ve akıllı ders planlama asistanınız JARVIS kullanımınıza hazır.',
    calendarNotice: 'Ders Takvimi: Harici takvim verisi bulunmuyor. Lütfen işlem yapmak istediğiniz sınıfı seçin.',
    totalClasses: 'Sınıf',
    totalLessons: 'Ders Kaydı',
    totalPlans: 'Ders Planı',
    totalMaterials: 'Materyal',
    dailySummaryTitle: '📋 Bugünün Öğretmen Çalışma Özeti',
    systemDate: 'Sistem Tarihi',
    printSummary: 'Raporu Yazdır / PDF Kaydet',
    disclaimerTitle: 'Önemli Güvenilirlik Bilgisi:',
    disclaimerDesc: 'Takvim entegrasyonu bulunmadığı için aşağıdaki liste mevcut sınıf hafızasına göre hazırlanmıştır. Ders zamanı tahmin edilmemiş, yapay zeka uydurmalarından kaçınılmıştır.',
    classPriorities: '🚀 Sınıf Öncelikleri ve Pedagojik Analiz',
    suggestedForToday: '✨ JARVIS Bugün İçin Öneriyor',
    classMemoryFocused: 'Sınıf Hafızası Odaklı',
    prepareLesson: 'Dersi Hazırla',
    prepareFullLesson: 'Dersi Hazırla (Tam Paket)',
    findResources: 'Kaynak Bul',
    termAnalytics: 'Dönemsel Gelişim Analizi',
    askJarvis: 'JARVIS\'e Sor',
    suggestedToDos: '☐ Bugün Yapılması Önerilenler',
    preparedMaterialsStatus: '📁 Hazırlanmış Materyaller ve Taslak Durumu',
    quickCommands: 'Hızlı Komutlar & Kısayollar',
    
    // Lessons & Studio
    subtabClasses: 'Sınıf Hafızası & Yönetimi',
    subtabPlanner: 'Ders Planlayıcı',
    subtabStudio: 'Ders Paketi Stüdyosu',
    outputLangLabel: 'Ders Paketi ve Materyal Dili:',
    langTr: '🇹🇷 Türkçe',
    langEn: '🇬🇧 English',
    langBilingual: '🇹🇷🇬🇧 Türkçe + English',
    lessonPlan: 'Ders Planı',
    worksheet: 'Çalışma Kağıdı',
    flashcards: 'Kelime Kartları',
    learningOutcomes: 'Kazanımlar',
    maarifValues: 'Maarif Modeli Değerleri',
    targetedSkills: 'Hedef Beceriler',
    duration: 'Süre',
    materials: 'Materyaller',
    warmUp: 'Isınma (Lead-in)',
    mainTask: 'Ana Etkinlik (Main Task)',
    wrapUp: 'Kapanış (Wrap-up)',
    assessment: 'Ölçme & Değerlendirme',
    differentiation: 'Farklılaştırma',
    support: 'Destekleme (Support)',
    extension: 'Zenginleştirme (Extension)',
    teacherScript: 'Öğretmen Yönergesi',
    saveToFavorites: 'Favorilere Kaydet',
    saveToClass: 'Sınıf Hafızasına Kaydet',
    printTR: '🇹🇷 Türkçe Yazdır',
    printEN: '🇬🇧 English Print',
    printBilingual: '🇹🇷🇬🇧 İki Dilli Yazdır',

    // Resources
    resourceCenterTitle: 'MEB İngilizce Kaynak Merkezi & Sınav Bankası',
    tabExams: 'Soru Bankası & Sınavlar',
    tabActivities: 'Etkinlikler & Çalışma Kağıtları',
    tabMeb: 'MEB Müfredat Kaynakları',
    shuffleAB: 'A/B Grubu Kitapçık Karıştırıcı',
    shuffleBtn: 'A/B Kitapçık Oluştur & Karıştır',

    // Analytics
    analyticsTitle: 'Dönemsel Gelişim Analizi',
    analyticsSubtitle: 'Sınıf hafızasındaki tüm kayıtlı dersler, zorlanılan konular ve kazanım takibi',
    unitDistribution: 'İşlenen Ünite ve Konu Dağılımı',
    strugglesDistribution: 'Öğrenci Zorlanmaları ve Hassas Alanlar',
    coveredOutcomes: 'İşlenen MEB Müfredat Kazanımları',
    lessonHistoryLog: 'Dönem İçi Ders İlerleme Kayıtları',
    emptyAnalytics: 'Bu analiz için henüz yeterli ders kaydı bulunmuyor.',
    printAnalytics: 'Analizi Yazdır (A4 Rapor)',

    // JARVIS
    jarvisTitle: 'JARVIS Öğretmen Asistanı',
    jarvisWelcome: 'Merhaba Öğretmenim! Bugün sınıflarınız için ne yapmamı istersiniz?',
    listeningVoice: 'JARVIS Dinliyor...',

    // General & WRITE Guard
    writeGuardWarning: 'READ-ONLY Mod: Veritabanına onay vermediğiniz sürece otomatik değişiklik yazılmaz.',
    loadingText: 'Yükleniyor...',
    errorOccurred: 'Bir hata oluştu.',
    backBtn: 'Geri Dön',
    confirmBtn: 'Onayla',
    cancelBtn: 'İptal',
    closeBtn: 'Kapat',
    saveBtn: 'Kaydet',
    printBtn: 'Yazdır',
  },
  en: {
    // Header & Nav
    appTitle: 'MEB English Teacher Assistant',
    appSubTitle: 'Supported by Türkiye Yüzyılı Maarif Model',
    navDashboard: 'Dashboard',
    navLessons: 'Lessons',
    navResources: 'Resources',
    navJarvis: 'JARVIS',
    teacherMode: 'Teacher Mode',
    savedPackages: 'Saved Packages',
    uiLanguage: 'UI Language',

    // Dashboard
    workspaceTitle: 'Teacher Main Workspace & Live Control Panel',
    welcomeTeacher: 'Welcome, Teacher 👋',
    welcomeDesc: 'Your Türkiye Yüzyılı Maarif Model curriculum, live class memory, and smart lesson planning assistant JARVIS are ready for use.',
    calendarNotice: 'Lesson Calendar: No external calendar data available. Please select a class to operate.',
    totalClasses: 'Classes',
    totalLessons: 'Lesson Logs',
    totalPlans: 'Lesson Plans',
    totalMaterials: 'Materials',
    dailySummaryTitle: '📋 Today\'s Teacher Work Summary',
    systemDate: 'System Date',
    printSummary: 'Print Report / Save PDF',
    disclaimerTitle: 'Important Reliability Note:',
    disclaimerDesc: 'Because calendar integration is not present, the list below is generated from existing class memory. No class time was guessed, avoiding AI hallucinations.',
    classPriorities: '🚀 Class Priorities & Pedagogical Analysis',
    suggestedForToday: '✨ JARVIS Recommends for Today',
    classMemoryFocused: 'Class Memory Focused',
    prepareLesson: 'Prepare Lesson',
    prepareFullLesson: 'Prepare Lesson (Full Bundle)',
    findResources: 'Find Resources',
    termAnalytics: 'Term Progress Analytics',
    askJarvis: 'Ask JARVIS',
    suggestedToDos: '☐ Suggested To-Dos for Today',
    preparedMaterialsStatus: '📁 Prepared Materials & Draft Status',
    quickCommands: 'Quick Commands & Shortcuts',

    // Lessons & Studio
    subtabClasses: 'Class Memory & Management',
    subtabPlanner: 'Lesson Planner',
    subtabStudio: 'Lesson Package Studio',
    outputLangLabel: 'Lesson Package & Material Language:',
    langTr: '🇹🇷 Turkish',
    langEn: '🇬🇧 English',
    langBilingual: '🇹🇷🇬🇧 Turkish + English',
    lessonPlan: 'Lesson Plan',
    worksheet: 'Worksheet',
    flashcards: 'Flashcards',
    learningOutcomes: 'Learning Outcomes',
    maarifValues: 'Maarif Model Values',
    targetedSkills: 'Targeted Skills',
    duration: 'Duration',
    materials: 'Materials',
    warmUp: 'Warm-up (Lead-in)',
    mainTask: 'Main Task',
    wrapUp: 'Wrap-up',
    assessment: 'Assessment & Evaluation',
    differentiation: 'Differentiation',
    support: 'Support',
    extension: 'Extension',
    teacherScript: 'Teacher Script',
    saveToFavorites: 'Save to Favorites',
    saveToClass: 'Save to Class Memory',
    printTR: '🇹🇷 Print Turkish',
    printEN: '🇬🇧 Print English',
    printBilingual: '🇹🇷🇬🇧 Print Bilingual',

    // Resources
    resourceCenterTitle: 'MEB English Resource Center & Exam Bank',
    tabExams: 'Question Bank & Exams',
    tabActivities: 'Activities & Worksheets',
    tabMeb: 'MEB Curriculum Resources',
    shuffleAB: 'Group A/B Booklet Shuffler',
    shuffleBtn: 'Generate & Shuffle A/B Booklets',

    // Analytics
    analyticsTitle: 'Term Progress Analytics',
    analyticsSubtitle: 'All recorded lessons, struggles, and outcome tracking in class memory',
    unitDistribution: 'Covered Unit & Topic Distribution',
    strugglesDistribution: 'Student Struggles & Sensitive Areas',
    coveredOutcomes: 'Covered MEB Curriculum Outcomes',
    lessonHistoryLog: 'Term Lesson Progress Logs',
    emptyAnalytics: 'Not enough lesson records available for this analysis yet.',
    printAnalytics: 'Print Analysis (A4 Report)',

    // JARVIS
    jarvisTitle: 'JARVIS Teacher Assistant',
    jarvisWelcome: 'Hello Teacher! What would you like me to do for your classes today?',
    listeningVoice: 'JARVIS is Listening...',

    // General & WRITE Guard
    writeGuardWarning: 'READ-ONLY Mode: No automatic changes are written to SQLite unless you explicitly approve.',
    loadingText: 'Loading...',
    errorOccurred: 'An error occurred.',
    backBtn: 'Back',
    confirmBtn: 'Confirm',
    cancelBtn: 'Cancel',
    closeBtn: 'Close',
    saveBtn: 'Save',
    printBtn: 'Print',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  uiLang: 'tr',
  setUiLang: () => {},
  outputLang: 'tr',
  setOutputLang: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiLang, setUiLangState] = useState<UiLanguage>(() => {
    try {
      const stored = localStorage.getItem('maarif_teacher_ui_lang');
      return (stored === 'en' || stored === 'tr') ? stored : 'tr';
    } catch {
      return 'tr';
    }
  });

  const [outputLang, setOutputLangState] = useState<OutputLanguage>(() => {
    try {
      const stored = localStorage.getItem('maarif_teacher_output_lang');
      return (stored === 'en' || stored === 'tr' || stored === 'bilingual') ? stored : 'tr';
    } catch {
      return 'tr';
    }
  });

  const setUiLang = (lang: UiLanguage) => {
    setUiLangState(lang);
    try {
      localStorage.setItem('maarif_teacher_ui_lang', lang);
      // Synchronize default outputLang with uiLang if user hasn't explicitly set bilingual
      if (outputLang !== 'bilingual') {
        setOutputLangState(lang);
        localStorage.setItem('maarif_teacher_output_lang', lang);
      }
    } catch (e) {
      console.error('Failed to set UI language in localStorage:', e);
    }
  };

  const setOutputLang = (lang: OutputLanguage) => {
    setOutputLangState(lang);
    try {
      localStorage.setItem('maarif_teacher_output_lang', lang);
    } catch (e) {
      console.error('Failed to set output language in localStorage:', e);
    }
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[uiLang] || translations.tr;
    return dict[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ uiLang, setUiLang, outputLang, setOutputLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
