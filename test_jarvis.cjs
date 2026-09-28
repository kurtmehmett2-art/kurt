const db = require('better-sqlite3')('./jarvis.db');

// Seed Data
const teacherId = 'teacher-1';
const class6A = 'class-6A-test';
const class8A = 'class-8A-test';

// Clean old
db.prepare("DELETE FROM Class WHERE id IN (?, ?)").run(class6A, class8A);

// Insert classes
db.prepare("INSERT INTO Class (id, teacherId, name, gradeLevel, currentUnit, currentTopic) VALUES (?, ?, ?, ?, ?, ?)").run(class6A, teacherId, '6/A', 6, 3, 'Places in Town');
db.prepare("INSERT INTO Class (id, teacherId, name, gradeLevel, currentUnit, currentTopic) VALUES (?, ?, ?, ?, ?, ?)").run(class8A, teacherId, '8/A', 8, 1, 'Friendship');

// Insert lesson for 6A
db.prepare("INSERT INTO LessonHistory (id, classId, date, unitNumber, unitName, topic, skill, activity, coveredOutcomes, teacherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
  'lesson-1', class6A, new Date().toISOString(), 3, 'Downtown', 'Places in Town', 'Vocabulary', 'Bingo', 'E6.3.R1', 'Öğrenciler giving directions konusunda zorlandı.'
);
db.prepare("INSERT INTO LessonHistory (id, classId, date, unitNumber, unitName, topic, skill, activity, coveredOutcomes, teacherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
  'lesson-2', class6A, new Date(Date.now() - 86400000).toISOString(), 3, 'Downtown', 'Prepositions', 'Grammar', 'Worksheet', 'E6.3.G1', 'Isınma iyi geçti.'
);

console.log("Database seeded for tests.");
