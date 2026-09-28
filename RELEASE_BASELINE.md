# JARVIS V1.0 RELEASE BASELINE & PILOT SPECIFICATION

## Proje Bilgileri
- **Proje Adı**: JARVIS Eğitim ve İngilizce Branş Öğretmen Asistanı
- **Sürüm**: V1.0 (Stabil Sürüm)
- **Tarih**: 16 Ağustos 2026

---

## 🔒 V1.0 Temel Yetenekler ve Kapsam

### 1. Güvenlik & WRITE Guard
- Tüm kalıcı veri yazma işlemleri (ders geçmişi kaydı, öğretmen notları, öğrenci zorlanmaları ve materyal kayıtları) öncesinde öğretmenden **açık önizleme ve onay** alınması zorunludur.
- Veritabanı (`better-sqlite3`) sorgularının tamamı parametrik prepared statements kullanmaktadır.
- `GEMINI_API_KEY` sadece server-side proxy edilmektedir.

### 2. Sınıf Hafızası & Zero-Hallucination
- Sınıfların son işlenen dersleri, öğrenci zorlanmaları ve kapsanan kazanımları SQLite veritabanından dinamik okunur.
- Olmayan sınıf, takvim veya uydurma MEB kaynakları kesinlikle üretilmez.
- Takvim entegrasyonu olmadığında uyarı gösterilir, tahmini ders saatleri uydurulmaz.

### 3. MEB Expert & Resmi Kaynaklar
- MEB, EBA, ÖDSGM ve MEBİ Tier 1 resmi kaynakları önceliklendirilir.
- JARVIS özgün içerikleri ile resmi MEB materyalleri görsel olarak kesin çizgilerle ayrılır.

### 4. Yazılı & Sesli Akıllı Navigasyon (JARVIS E2E)
- Yazılı sohbet ve canlı ses kanalları (WebSocket) aynı merkezi navigasyon mantığını paylaşır.
- *"Bugün ne yapmalıyım?"*, *"6/A için ders hazırla"* gibi komutlar sınıf ve ders bağlamını koruyarak öğretmeni doğrudan ilgili sekmeye (stüdyo, kaynaklar vb.) yönlendirir.

### 5. Profesyonel A4 Yazdırma (Baskı Sistemi)
- Günlük öğretmen çalışma raporu, 40 dakikalık MEB ders planı, çalışma kağıdı, sınav provaları ve ders geçmişleri A4 formatıyla tam uyumludur.
- Yazdırma modu etkinleştirildiğinde tüm butonlar, navigasyon barları ve koyu arka planlar gizlenir.

---

## 🚀 Durum Bildirgesi
Uygulama sıfır linter hatası ve sıfır derleme engeli ile dondurulmuştur. V1.0 pilot kullanımı için tamamen hazırdır.
