import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { GeneratedContent } from '../types';

interface ClassData {
  id: string;
  name: string;
  gradeLevel: number;
}

interface SaveToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPackage: GeneratedContent;
}

export const SaveToClassModal: React.FC<SaveToClassModalProps> = ({
  isOpen,
  onClose,
  currentPackage,
}) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClasses();
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      if (!res.ok) throw new Error('Sınıflar yüklenemedi.');
      const data = await res.json();
      // Filter by current grade if provided in request
      const grade = currentPackage.request?.grade;
      setClasses(data.filter((c: ClassData) => !grade || c.gradeLevel === Number(grade)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (classId: string) => {
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/classes/${classId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          unitNumber: Number(currentPackage.request?.unitNumber || 1),
          unitName: currentPackage.request?.unitName || '',
          topic: currentPackage.lessonPlan?.title || '',
          skill: currentPackage.request?.skill || '',
          activity: currentPackage.request?.activityType || '',
          durationMinutes: currentPackage.request?.durationMinutes || 40,
          coveredOutcomes: currentPackage.request?.learningOutcomes || '',
          teacherNotes: '',
        }),
      });
      
      if (!res.ok) throw new Error('Ders kaydedilemedi.');
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1A1932] border border-[#6C63FF]/30 w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(108,99,255,0.2)] overflow-hidden">
        <div className="p-5 border-b border-[#2D2B55] flex justify-between items-center bg-[#161524]">
          <h3 className="text-lg font-black text-white glow-text">Dersi Sınıfa Kaydet</h3>
          <button onClick={onClose} className="text-[#A7A9BE] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {success ? (
            <div className="text-center py-6 animate-fade-in-up">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Başarıyla Kaydedildi!</h4>
              <p className="text-[#A7A9BE]">Bu ders paketi sınıfınızın geçmişine eklendi.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#A7A9BE] mb-4">
                Lütfen bu ders paketini işlediğiniz sınıfı seçin:
              </p>
              
              {error && (
                <div className="mb-4 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                  {error}
                </div>
              )}
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <p className="text-center text-[#A7A9BE]">Yükleniyor...</p>
                ) : classes.length === 0 ? (
                  <div className="text-center p-4 border border-[#2D2B55] rounded-xl bg-[#161524]">
                    <p className="text-[#A7A9BE] mb-2">Uygun sınıf bulunamadı.</p>
                    <p className="text-xs text-[#A7A9BE]/70">Lütfen önce Sınıflarım sekmesinden sınıf oluşturun.</p>
                  </div>
                ) : (
                  classes.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => handleSave(cls.id)}
                      disabled={saving}
                      className="w-full flex items-center justify-between p-4 bg-[#161524] hover:bg-[#6C63FF]/10 border border-[#2D2B55] hover:border-[#6C63FF]/50 rounded-xl transition-all disabled:opacity-50"
                    >
                      <span className="font-bold text-white text-left">{cls.name}</span>
                      <span className="text-xs font-black bg-[#2D2B55] text-[#A7A9BE] px-2 py-1 rounded">
                        {cls.gradeLevel}. Sınıf
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
