import React, { useState, useEffect } from 'react';
import { Plus, Folder, Clock, Calendar, CheckCircle2, ChevronRight, BookOpen, User, Book, Bot } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
  gradeLevel: number;
  currentUnit: number;
  currentTopic: string;
}

interface LessonData {
  id: string;
  date: string;
  unitNumber: number;
  topic: string;
  activity: string;
}

export const ClassesView = ({ onOpenJarvis }: { onOpenJarvis: (classId?: string) => void }) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New class form
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(5);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonData[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchLessons(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      if (!res.ok) throw new Error('Failed to fetch classes');
      const data = await res.json();
      setClasses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (classId: string) => {
    try {
      const res = await fetch(`/api/classes/${classId}/lessons`);
      if (!res.ok) throw new Error('Failed to fetch lessons');
      const data = await res.json();
      setLessons(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          gradeLevel: newClassGrade,
        }),
      });
      if (!res.ok) throw new Error('Failed to create class');
      const newClass = await res.json();
      setClasses([newClass, ...classes]);
      setIsCreating(false);
      setNewClassName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Sınıfı silmek istediğinize emin misiniz?')) return;

    try {
      await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      setClasses(classes.filter(c => c.id !== id));
      if (selectedClassId === id) setSelectedClassId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white glow-text">Sınıflarım</h2>
          <p className="text-sm text-[#A7A9BE] mt-1">
            Öğrencilerinizin durumunu ve ders geçmişlerini takip edin.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6C63FF] hover:bg-[#5a52d6] text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(108,99,255,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Yeni Sınıf Ekle
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-200 p-4 rounded-xl">
          {error}
        </div>
      )}

      {isCreating && (
        <form onSubmit={handleCreateClass} className="glass-card p-6 rounded-2xl animate-fade-in-down border border-[#2D2B55]">
          <h3 className="text-lg font-bold text-white mb-4">Yeni Sınıf Oluştur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#A7A9BE] mb-2 uppercase tracking-wider">Sınıf Şubesi (Örn: 5/A)</label>
              <input
                type="text"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="Şube adı..."
                className="w-full bg-[#161524] border border-[#2D2B55] text-white rounded-xl p-3 focus:outline-none focus:border-[#6C63FF] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#A7A9BE] mb-2 uppercase tracking-wider">Sınıf Kademesi</label>
              <select
                value={newClassGrade}
                onChange={e => setNewClassGrade(Number(e.target.value))}
                className="w-full bg-[#161524] border border-[#2D2B55] text-white rounded-xl p-3 focus:outline-none focus:border-[#6C63FF] transition-all"
              >
                {[5, 6, 7, 8].map(g => (
                  <option key={g} value={g}>{g}. Sınıf</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-6 space-x-3">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-[#A7A9BE] hover:text-white font-bold transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Kaydet
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Classes List */}
        <div className="lg:col-span-5 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-[#A7A9BE]">Yükleniyor...</div>
          ) : classes.length === 0 ? (
            <div className="glass-card p-10 text-center rounded-3xl border border-[#2D2B55]/50 flex flex-col items-center justify-center">
              <Folder className="w-12 h-12 text-[#6C63FF]/50 mb-4" />
              <p className="text-[#A7A9BE] font-medium">Henüz sınıfınız bulunmuyor.</p>
            </div>
          ) : (
            classes.map(cls => (
              <div
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`glass-card p-5 rounded-2xl cursor-pointer border transition-all ${
                  selectedClassId === cls.id 
                    ? 'border-[#6C63FF] bg-[#1A1932] shadow-[0_0_20px_rgba(108,99,255,0.2)]' 
                    : 'border-[#2D2B55] hover:border-[#6C63FF]/50 hover:bg-[#1A1932]/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">{cls.name}</h3>
                      <span className="bg-[#6C63FF]/20 text-[#6C63FF] text-xs font-extrabold px-2 py-0.5 rounded-full border border-[#6C63FF]/30">
                        {cls.gradeLevel}. Sınıf
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-[#A7A9BE] font-medium">
                      <span className="flex items-center gap-1">
                        <Book className="w-3.5 h-3.5" />
                        Ünite {cls.currentUnit}
                      </span>
                      {cls.currentTopic && (
                        <>
                          <span className="w-1 h-1 bg-[#2D2B55] rounded-full" />
                          <span className="truncate max-w-[120px]">{cls.currentTopic}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteClass(cls.id, e)}
                    className="text-rose-500/50 hover:text-rose-400 p-1 transition-colors"
                    title="Sınıfı Sil"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Class Details */}
        <div className="lg:col-span-7">
          {selectedClassId ? (
            <div className="glass-card p-6 rounded-2xl border border-[#2D2B55] space-y-6">
              <div className="flex items-center justify-between border-b border-[#2D2B55] pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#6C63FF]" />
                  Ders Geçmişi
                </h3>
                <button
                  onClick={() => onOpenJarvis(selectedClassId)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2D2B55]/50 hover:bg-[#6C63FF]/20 text-[#A7A9BE] hover:text-white border border-[#2D2B55] hover:border-[#6C63FF]/50 transition-all text-xs font-bold"
                >
                  <Bot className="w-4 h-4 text-[#6C63FF]" />
                  Jarvis'e Sor
                </button>
              </div>

              <div className="space-y-4">
                {lessons.length === 0 ? (
                  <div className="text-center py-10 text-[#A7A9BE] text-sm">
                    Bu sınıf için henüz işlenmiş bir ders kaydı bulunmuyor.
                  </div>
                ) : (
                  lessons.map(lesson => (
                    <div key={lesson.id} className="bg-[#161524] border border-[#2D2B55] p-4 rounded-xl flex gap-4 hover:border-[#6C63FF]/30 transition-colors">
                      <div className="flex flex-col items-center justify-center bg-[#1A1932] px-3 py-2 rounded-lg min-w-[70px]">
                        <span className="text-xs font-bold text-[#A7A9BE] uppercase">Tarih</span>
                        <span className="text-sm font-black text-white">{new Date(lesson.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold">{lesson.topic}</h4>
                        <p className="text-xs text-[#A7A9BE] mt-1 line-clamp-2">{lesson.activity}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Tamamlandı
                          </span>
                          <span className="text-[10px] text-[#A7A9BE] bg-[#2D2B55]/50 px-2 py-0.5 rounded">
                            Ünite {lesson.unitNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card h-full min-h-[300px] flex flex-col items-center justify-center rounded-2xl border border-[#2D2B55]/50 text-center p-6">
              <User className="w-16 h-16 text-[#2D2B55] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Sınıf Seçin</h3>
              <p className="text-sm text-[#A7A9BE]">Ders geçmişini ve detayları görmek için sol taraftan bir sınıf seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
