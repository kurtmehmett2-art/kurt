import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'jarvis.db');

let db: InstanceType<typeof Database>;

try {
  db = new Database(dbPath, { verbose: console.log });
  db.pragma('foreign_keys = ON');
} catch (err) {
  console.error('[Database Error] Failed to open jarvis.db, re-creating database:', err);
  if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch (e) {}
  }
  db = new Database(dbPath, { verbose: console.log });
  db.pragma('foreign_keys = ON');
}

// Initialize database schema
export const initDb = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS Teacher (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Class (
        id TEXT PRIMARY KEY,
        teacherId TEXT NOT NULL,
        name TEXT NOT NULL,
        gradeLevel INTEGER NOT NULL,
        currentUnit INTEGER DEFAULT 1,
        currentTopic TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacherId) REFERENCES Teacher(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS LessonHistory (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        date TEXT NOT NULL,
        unitNumber INTEGER,
        unitName TEXT,
        topic TEXT,
        skill TEXT,
        activity TEXT,
        durationMinutes INTEGER,
        coveredOutcomes TEXT,
        teacherNotes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES Class(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ClassProgress (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        unitNumber INTEGER NOT NULL,
        unitName TEXT,
        outcomeCode TEXT NOT NULL,
        outcomeDescription TEXT,
        status TEXT DEFAULT 'pending', -- pending, completed
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES Class(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS EducationSource (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        institution TEXT,
        url TEXT NOT NULL,
        sourceType TEXT,
        grade TEXT,
        subject TEXT,
        unit INTEGER,
        topic TEXT,
        tier INTEGER DEFAULT 1,
        relevanceScore INTEGER DEFAULT 85,
        publishedAt TEXT,
        discoveredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        analysisJson TEXT
      );

      CREATE TABLE IF NOT EXISTS ResearchHistory (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        resultsCount INTEGER DEFAULT 0,
        resultsJson TEXT,
        relatedClassId TEXT
      );

      CREATE TABLE IF NOT EXISTS GeneratedMaterial (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        classId TEXT,
        sourceIds TEXT,
        type TEXT,
        contentJson TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        filePath TEXT
      );

      CREATE TABLE IF NOT EXISTS LessonPlans (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        title TEXT NOT NULL,
        durationMinutes INTEGER DEFAULT 40,
        unitNumber INTEGER,
        unitName TEXT,
        topic TEXT,
        goals TEXT,
        difficulty TEXT,
        planJson TEXT NOT NULL,
        reasoning TEXT,
        status TEXT DEFAULT 'draft',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES Class(id) ON DELETE CASCADE
      );
    `);

    // Insert default teacher if none exists
    const defaultTeacherId = 'teacher-1';
    const teacherExists = db.prepare('SELECT id FROM Teacher WHERE id = ?').get(defaultTeacherId);
    
    if (!teacherExists) {
      db.prepare('INSERT INTO Teacher (id, name) VALUES (?, ?)').run(defaultTeacherId, 'Öğretmen (Default)');
    }

    // Insert default classes if none exist
    const classCount = (db.prepare('SELECT COUNT(*) as count FROM Class WHERE teacherId = ?').get(defaultTeacherId) as any)?.count || 0;
    if (classCount === 0) {
      const insertClass = db.prepare('INSERT INTO Class (id, teacherId, name, gradeLevel, currentUnit, currentTopic) VALUES (?, ?, ?, ?, ?, ?)');
      insertClass.run('class-6a', defaultTeacherId, '6/A', 6, 3, 'Places in Town');
      insertClass.run('class-7b', defaultTeacherId, '7/B', 7, 4, 'Wild Animals');
      insertClass.run('class-8c', defaultTeacherId, '8/C', 8, 2, 'Teen Life');

      // Seed sample lesson history for 6/A
      const insertLesson = db.prepare('INSERT INTO LessonHistory (id, classId, date, unitNumber, unitName, topic, skill, activity, durationMinutes, coveredOutcomes, teacherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertLesson.run('lesson-6a-1', 'class-6a', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 3, 'Life in Town', 'Places in Town & Asking Directions', 'Speaking', 'Map Direction Activity', 40, 'E6.3.L1', 'Öğrenciler harita üzerinde yön tarifinde ve kelime eşleştirmede zorlandı.');
      insertLesson.run('lesson-6a-2', 'class-6a', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 3, 'Life in Town', 'Imperatives for Directions', 'Listening', 'Audio Dictation', 40, 'E6.3.L2', 'Dinleme bölümünde yer kelimelerinde takılmalar görüldü.');

      // Seed sample lesson history for 7/B
      insertLesson.run('lesson-7b-1', 'class-7b', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 4, 'Wild Animals', 'Animal Habitats & Adaptations', 'Vocabulary', 'Flashcard Matching', 40, 'E7.4.V1', 'Vahşi hayvan türleri kelimeleri pekiştirildi, genel durum başarılı.');
    }
  } catch (err) {
    console.error('[Database initDb Error]:', err);
  }
};

export default db;
