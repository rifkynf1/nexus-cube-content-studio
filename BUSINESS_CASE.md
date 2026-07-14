# Business Case & Market Sizing

### AI Content Studio & Brand Voice Assistant — Studi Kasus: Nexus Cube (EO Turnamen Esports)

> **Catatan metodologi:** Dokumen ini dibuat untuk memenuhi deliverable "market-sizing dan
> business case" pada Project 5. Angka-angka di dalamnya adalah **estimasi ilustratif**
> yang disusun dari asumsi wajar (bukan hasil riset primer atau kutipan langsung dari
> laporan riset berbayar/berlisensi), supaya kerangka berpikirnya bisa dipakai dan
> diverifikasi ulang. Kalau dokumen ini akan dipakai untuk keperluan formal/dinilai lebih
> ketat, sebaiknya angka TAM/SAM/SOM di bawah divalidasi ulang dengan sumber data primer
> (mis. laporan resmi asosiasi esports Indonesia, BPS, atau survei internal ke calon
> pelanggan) sebelum disitasi sebagai fakta.

---

## 1. Masalah yang Diselesaikan

Tim marketing/EO (event organizer) — termasuk EO esports seperti Nexus Cube — harus
memproduksi konten dalam volume tinggi dan konsisten brand-voice di banyak channel
sekaligus (WhatsApp broadcast, Discord/Telegram, X/Twitter, Instagram), sambil tetap
memantau reaksi publik terhadap konten yang mereka rilis. Menulis semuanya manual tidak
scalable; sementara output AI generik (tanpa brand-voice profile & few-shot) sering terasa
"lepas dari karakter brand". Di sisi lain, memantau ribuan komentar publik secara manual
untuk menangkap keluhan (mis. server lag, masalah tiket) sebelum jadi krisis reputasi juga
tidak realistis dilakukan manual oleh tim kecil.

## 2. Solusi

Nexus Cube AI Content Studio: sebuah tool ringan berbasis LLM (Gemini) yang:

1. Menghasilkan konten multi-format dari satu brief, mengikuti brand-voice profile (`rules.md`)
   dan few-shot contoh konten lama (`sample_posts.csv`).
2. Menyarankan jadwal posting berdasarkan konteks brief (bukan template statis).
3. Melakukan sentiment & theme digest zero-shot atas komentar publik, termasuk **weekly
   summary dan flagging otomatis saat ada lonjakan sentimen negatif** (deteksi dini krisis).
4. Menyediakan approval/edit UI + evaluasi otomatis (LLM-as-judge) terhadap brand-fit
   konten sebelum di-publish, dengan human spot-check sebagai lapisan verifikasi akhir.

## 3. Target Pengguna

- **Primer**: EO/organizer event esports & gaming skala kecil-menengah di Indonesia yang
  rutin bikin turnamen (per kota/kampus/komunitas) tapi tidak punya tim social media/content
  writer khusus.
- **Sekunder (perluasan produk)**: UMKM digital lain dengan pola serupa — toko online,
  komunitas hobi, brand lokal — yang butuh konsistensi brand-voice lintas channel.

## 4. Market Sizing (TAM / SAM / SOM) — Estimasi Ilustratif

| Level                                                      | Definisi                                                                                                                           | Estimasi                                                     | Asumsi di balik angka                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TAM** (Total Addressable Market)                         | Seluruh bisnis/komunitas di Indonesia yang rutin bikin konten promosi multi-channel (UMKM digital, EO event, kreator, brand lokal) | ± Rp 2–3 triliun/tahun (potensi belanja tools & jasa konten) | Diturunkan dari estimasi jumlah UMKM aktif secara digital di Indonesia (jutaan unit) dikali asumsi kesediaan belanja tools produktivitas/konten yang sangat kecil per unit (Rp puluhan ribu-jutaan/tahun) — **angka kasar**, bukan hasil survei. |
| **SAM** (Serviceable Available Market)                     | Segmen yang relevan dengan produk ini: EO event & komunitas esports/gaming aktif di Indonesia                                      | ± Rp 30–60 miliar/tahun                                      | Asumsi: ada ribuan EO/komunitas esports aktif (dari skala kampus s.d. nasional) yang berpotensi butuh tool sejenis, dengan willingness-to-pay bulanan setara langganan SaaS kecil-menengah.                                                      |
| **SOM** (Serviceable Obtainable Market, 1–2 tahun pertama) | Porsi realistis yang bisa diraih start awal (produk baru, tim kecil, go-to-market organik)                                         | ± Rp 500 juta–1,5 miliar/tahun                               | Asumsi: menangkap 1–3% dari SAM lewat komunitas esports/Discord, kemitraan dengan platform turnamen, dan word-of-mouth di kalangan panitia EO.                                                                                                   |

**Cara memvalidasi ulang (kalau diperlukan untuk tugas formal):** cari data jumlah turnamen
esports terdaftar per tahun di Indonesia (asosiasi esports nasional/lokal), estimasi jumlah
EO aktif dari jumlah turnamen tersebut, lalu kalikan dengan estimasi ARPU (average revenue
per user) dari harga langganan yang direncanakan.

## 5. Model Bisnis (Revenue Model)

Model **SaaS berlangganan bertingkat (tiered subscription)**, disesuaikan skala EO:

| Tier              | Target                              | Harga (ilustratif)         | Fitur                                                                           |
| ----------------- | ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| **Starter**       | EO komunitas/kampus, event sesekali | Rp99.000/bulan             | Generate konten (kuota terbatas/bulan), 1 brand-voice profile, export manual    |
| **Pro**           | EO aktif, turnamen rutin            | Rp299.000/bulan            | Kuota lebih besar, sentiment digest + weekly spike alert, evaluasi LLM-as-judge |
| **Agency/Custom** | Jaringan EO/multi-brand             | Custom (mulai Rp1jt/bulan) | Multi brand-voice profile, multi-user approval workflow, integrasi API          |

Revenue tambahan (opsional, fase lanjut): biaya setup/onboarding brand-voice profile untuk
klien baru, atau add-on image generation.

## 6. Struktur Biaya Utama

- **Biaya API LLM** (Gemini) — biaya per-request, jadi skala dengan volume pemakaian; mitigasi
  lewat fallback 3 model (kuota terpisah) dan batas kuota per tier langganan.
  Ini juga yang menentukan margin — perlu monitoring cost per generate/evaluate call.
- **Hosting** — Vercel (serverless), biaya rendah di awal, naik seiring traffic.
- **Pengembangan & maintenance** — tim kecil (1-2 developer) di fase awal.
- **Akuisisi pelanggan** — organik lewat komunitas Discord esports, kemitraan platform
  turnamen, dan demo langsung ke EO yang sudah dikenal (network-driven, biaya rendah di awal).

## 7. Kompetitor & Diferensiasi

- **Tools generik** (ChatGPT/Gemini langsung, Jasper, Copy.ai): bisa generate konten, tapi
  tidak punya brand-voice profile terkunci + few-shot khusus historis brand, dan tidak
  terintegrasi dengan sentiment digest atas data komentar milik brand sendiri.
- **Social media scheduler** (Buffer, Hootsuite, dsb): kuat di scheduling/publishing, tapi
  tidak fokus di generation brand-voice-locked + evaluasi otomatis brand-fit.
- **Diferensiasi Nexus Cube AI Content Studio**: kombinasi generation + repurposing +
  calendar suggestion + sentiment/spike digest + LLM-as-judge evaluation dalam satu alur
  kerja approval yang ringkas, disetel khusus untuk komunitas esports/gaming Indonesia
  (istilah, nada, dan konteks lokal).

## 8. Risiko & Mitigasi

| Risiko                                      | Mitigasi                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ketergantungan pada 1 provider LLM (Gemini) | Fallback 3 model dengan kuota terpisah sudah diimplementasikan; arsitektur wrapper (`api/_lib/gemini.js`) memudahkan tambah provider lain di masa depan. |
| Output AI kadang tidak sesuai brand-voice   | Evaluasi LLM-as-judge + human spot-check sebagai lapisan verifikasi sebelum publish.                                                                     |
| Biaya API membengkak seiring skala          | Kuota per tier langganan + monitoring biaya per panggilan API.                                                                                           |
| Data komentar sensitif/privasi pengguna     | Untuk versi production sungguhan (di luar scope prototipe ini), perlu kebijakan retensi data & anonimisasi sebelum dikirim ke LLM pihak ketiga.          |
| Kompetitor besar masuk ke ceruk yang sama   | Fokus di ceruk esports/gaming Indonesia dengan bahasa & konteks lokal sebagai moat awal, sebelum ekspansi ke vertikal lain.                              |

## 9. Kesimpulan

Peluang bisnisnya masuk akal sebagai produk niche SaaS untuk komunitas EO esports di
Indonesia, dengan biaya operasional awal rendah (serverless dan API LLM pay-as-you-go) dan
jalur ekspansi natural ke UMKM digital lain yang punya kebutuhan serupa (konten multi-channel,
brand-voice, dan monitoring sentimen). Validasi pasar riil (wawancara ke 10-20 EO/komunitas
target) sangat disarankan sebelum investasi lebih lanjut, untuk mengonfirmasi asumsi
willingness-to-pay di atas.
