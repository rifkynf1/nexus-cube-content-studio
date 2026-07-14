# AI Content Studio & Brand Voice Assistant - Nexus Team

**Nexus Cube**, Event Organizer (EO) turnamen esports & gaming.

## Kesesuaian dengan Project Requirement (Project 5)

| Deliverable dari brief dosen | Status | Lokasi implementasi |
|---|---|---|
| Brand-voice profile (system prompt + few-shot) | ✅ | `rules.md`, `data/sample_posts.csv` |
| Multi-format generation dari 1 brief | ✅ | `api/generate.js` (WhatsApp, Discord/Telegram, X Thread, Instagram) |
| Content-calendar suggester | ✅ | `calendar_suggestion` di `api/generate.js`, bernalar dari detail brief (bukan jawaban template statis) |
| LLM-based sentiment & theme digest (zero-shot, no training) | ✅ | `api/sentiment.js` |
| **Weekly summary + flag negative spike (simple threshold)** | ✅ | `buildWeeklySummary()` di `api/sentiment.js` — grouping per minggu dari `timestamp`, flag kalau rasio negatif ≥ 30% (`NEGATIVE_SPIKE_THRESHOLD`) |
| Approval/edit UI + export | ✅ | `public/index.html` + `public/app.js` |
| **Evaluation: LLM-as-judge brand-fit rubric + human spot-check** | ✅ | `api/evaluate.js` (5 kriteria rubric) + tombol "EVALUASI (AI JUDGE)" & checkbox spot-check di tiap kartu format |
| **Market-sizing & business case** | ✅ | [`BUSINESS_CASE.md`](BUSINESS_CASE.md) |
| Dataset dengan kolom `timestamp`, `likes`, `shares`, `brand_mentioned`, `follower_count` | ✅ | `data/comments_dataset.csv`, `data/comments_event_offline.csv` |

## Struktur Proyek

```
/
├── api/
│   ├── _lib/
│   │   ├── gemini.js        # Wrapper panggilan Gemini API (@google/genai) + fallback 3 model
│   │   └── loadContext.js   # Baca rules.md & file CSV di /data
│   ├── generate.js          # POST -> generate konten 4 format + calendar suggestion dari brief
│   ├── sentiment.js         # GET/POST -> zero-shot sentiment/theme + weekly summary & negative spike flag
│   └── evaluate.js          # POST -> LLM-as-judge brand-fit rubric scoring
├── data/
│   ├── sample_posts.csv           # Data few-shot (contoh konten lama per format/event)
│   ├── comments_dataset.csv       # Dataset komentar turnamen (post_id, comment_text, channel, timestamp, likes, shares, brand_mentioned, follower_count)
│   └── comments_event_offline.csv # Dataset alternatif (event offline), skema sama
├── public/
│   ├── index.html           # UI single-page tema dark/neon esports (Tailwind CDN)
│   └── app.js               # Logic frontend (vanilla JS, fetch ke /api)
├── rules.md                 # System prompt / brand-voice guideline
├── BUSINESS_CASE.md         # Market sizing & business case
├── vercel.json              # Rewrite root -> /public, includeFiles untuk serverless bundle
├── package.json
└── .env.example
```

## Tech Stack

- **Frontend**: HTML + Vanilla JS + Tailwind CSS (via CDN) — tema dark/neon esports (font Orbitron/Rajdhani via Google Fonts).
- **Backend**: Node.js sebagai Vercel Serverless Functions (folder `/api`).
- **Parsing CSV**: [`papaparse@^5.5.4`](https://www.npmjs.com/package/papaparse) — dipilih karena bisa parse string secara sinkron (`Papa.parse(text, {header:true})`), lebih simpel di lingkungan serverless dibanding `csv-parser` yang berbasis stream.
- **Model AI**: Gemini lewat **`@google/genai`** — SDK resmi terbaru dari Google (SDK lama `@google/generative-ai` sudah **deprecated** sejak GA `@google/genai` pada Mei 2025). Dipanggil dengan **fallback 3 model berurutan** (`gemini-3.1-flash-lite` → `gemini-2.5-flash-lite` → `gemini-2.5-flash`) — kalau satu model kena limit/overload (HTTP 429/500/503), otomatis lanjut ke model berikutnya (masing-masing punya kuota terpisah). Tidak ada rate-limiting di level aplikasi.

## Setup Lokal

```bash
npm install
cp .env.example .env
# isi GEMINI_API_KEY di file .env dengan API key dari https://aistudio.google.com/apikey

npm install -g vercel   # kalau belum ada
vercel dev
```

Buka `http://localhost:3000`.

## Keamanan API Key

- `GEMINI_API_KEY` **hanya** dibaca di sisi server (`api/_lib/gemini.js`) lewat `process.env`.
- Frontend (`public/app.js`) **tidak pernah** menyentuh API key — ia hanya `fetch()` ke endpoint `/api/generate`, `/api/sentiment`, `/api/evaluate` di domain sendiri.
- Saat deploy ke Vercel, set `GEMINI_API_KEY` di **Project Settings → Environment Variables** (jangan commit `.env`).
- Pemilihan dataset lewat dropdown dibatasi **allowlist** (`ALLOWED_DATASETS` di `api/sentiment.js`) supaya request dari client tidak bisa dipakai untuk membaca file sembarangan di server.

## Alur Fitur

1. **Brief → Konten 4 Format + Calendar Suggestion**: `public/index.html` kirim brief ke `POST /api/generate`. Endpoint ini membaca `rules.md` (brand-voice Nexus Cube) + `data/sample_posts.csv` (few-shot) lalu memanggil Gemini dengan `responseSchema` supaya outputnya terstruktur: Broadcast WhatsApp, Pengumuman Discord/Telegram, Utas X/Twitter (array tweet), Caption Instagram — plus saran jadwal posting yang **bernalar dari detail konkret brief** (tanggal match/registrasi), bukan jawaban template tetap.
2. **Approval UI**: tiap kartu format bisa diedit langsung di textarea (utas Twitter disimpan sebagai teks, tiap tweet dipisah baris kosong), tombol **Setujui** menyimpan versi final ke state, dan **Export** menggabungkan semua yang disetujui + catatan human spot-check jadi satu file `.txt`.
3. **Evaluasi LLM-as-Judge**: tombol **EVALUASI (AI JUDGE)** di tiap kartu memanggil `POST /api/evaluate`, yang menilai konten terhadap 5 kriteria brand-fit rubric (tone & energi, istilah gaming, kepatuhan format, kejelasan CTA, kepatuhan hard rules), menghasilkan skor per kriteria + overall score + verdict (`approved`/`needs_revision`). Reviewer manusia bisa mencentang **human spot-check** dan menambahkan catatan manual sebagai lapisan verifikasi kedua.
4. **Sentiment & Theme Digest + Weekly Spike Alert**: tombol di dashboard memanggil `POST /api/sentiment`, yang membaca dataset komentar (war tiket, jadwal match, server/lag, bracket, dsb), meminta Gemini melakukan zero-shot classification (sentimen + tema utama), lalu **mengelompokkan hasilnya per minggu** (dari kolom `timestamp`) dan **menandai minggu dengan rasio komentar negatif ≥ 30% sebagai "spike"** — ditampilkan sebagai banner peringatan + tabel ringkasan mingguan, di samping kartu statistik & tabel rincian per komentar.

## Catatan

- Aplikasi internal untuk operasional Nexus Team. Belum ada autentikasi, caching, atau rate-limiting di level aplikasi (sesuai keputusan proyek).
- Data di `/data/*.csv` adalah data contoh (dummy), silakan diganti dengan data asli sesuai kebutuhan — cukup pertahankan kolom `post_id, comment_text, channel, timestamp` (kolom lain opsional) supaya fitur weekly summary tetap jalan.
- Angka di `BUSINESS_CASE.md` adalah estimasi ilustratif untuk keperluan tugas, bukan hasil riset primer — lihat catatan metodologi di bagian atas dokumen tersebut.
