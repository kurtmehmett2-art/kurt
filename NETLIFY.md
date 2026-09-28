# Netlify Deployment Rehberi

Bu proje Netlify üzerinde kolayca yayınlanacak şekilde yapılandırılmıştır.

---

## 🛠️ Yapılan Hazırlıklar

1. **`netlify.toml` Yapılandırması**:
   - **Build Komutu**: `npm run build`
   - **Yayın Klasörü**: `dist`
   - **SPA Route Yönlendirmesi**: Tüm sayfa istekleri `/index.html` dosyasına yönlendirilir.

2. **`public/_redirects` Dosyası**:
   - Single Page Application (SPA) yönlendirme hatalarını önlemek için `/*  /index.html  200` kuralı eklendi.

---

## 🚀 Netlify'da Yayınlama Adımları

### Seçenek 1: GitHub / GitLab ile Otomatik Yayım (Önerilen)

1. Projenizi **GitHub** veya **GitLab** hesabınıza push edin.
2. [Netlify Dashboard](https://app.netlify.com)'a giriş yapın.
3. **"Add new site"** > **"Import an existing project"** butonuna tıklayın.
4. GitHub/GitLab hesabınızı seçip projenizi seçin.
5. Build ayarları otomatik olarak `netlify.toml` dosyasından okunacaktır:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. **Environment Variables (Çevre Değişkenleri)** bölümüne gidin:
   - Key: `GEMINI_API_KEY`
   - Value: Gemini API Anahtarınız
7. **"Deploy site"** butonuna tıklayın.

---

### Seçenek 2: Netlify CLI ile Komut Satırından Yayım

1. Netlify CLI'ı yükleyin (yüklü değilse):
   ```bash
   npm install -g netlify-cli
   ```
2. Giriş yapın:
   ```bash
   netlify login
   ```
3. Projeyi derleyin ve yayınlayın:
   ```bash
   npm run build
   netlify deploy --prod
   ```
4. İstenildiğinde publish directory olarak `dist` seçin.

---

## 🔑 Çevre Değişkenleri (Environment Variables)

Netlify Dashboard -> **Site settings** -> **Environment variables** altından aşağıdaki değişkenleri eklediğinizden emin olun:
- `GEMINI_API_KEY`: Google Gemini API anahtarınız.
