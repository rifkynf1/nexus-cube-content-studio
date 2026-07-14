const { generateJSON } = require('./_lib/gemini');
const { loadRules, loadSamplePosts } = require('./_lib/loadContext');

// Skema 1 rekomendasi jadwal upload (dipakai berulang untuk tiap format di calendar_suggestion).
const SCHEDULE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    date: { type: 'string', description: 'Tanggal upload, format YYYY-MM-DD, harus di masa depan relatif ke tanggal acuan.' },
    day: { type: 'string', description: 'Nama hari dalam Bahasa Indonesia, mis. "Rabu".' },
    time: { type: 'string', description: 'Jam upload, format HH:MM (24 jam), waktu Indonesia bagian barat (WIB).' },
    reasoning: { type: 'string', description: 'Alasan konkret pemilihan tanggal & jam ini untuk platform tsb.' },
  },
  required: ['date', 'day', 'time', 'reasoning'],
};

// Skema output supaya Gemini selalu balas terstruktur,
// mencakup 4 format konten + saran jadwal posting.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    whatsapp: { type: 'string' },
    discord_telegram: { type: 'string' },
    twitter_thread: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array tweet berurutan (thread), tiap elemen 1 tweet.',
    },
    instagram_caption: { type: 'string' },
    calendar_suggestion: {
      type: 'object',
      description: 'Jadwal UPLOAD/POSTING konten (bukan jadwal turnamen), terpisah per format.',
      properties: {
        whatsapp: SCHEDULE_ITEM_SCHEMA,
        discord_telegram: SCHEDULE_ITEM_SCHEMA,
        twitter_thread: SCHEDULE_ITEM_SCHEMA,
        instagram_caption: SCHEDULE_ITEM_SCHEMA,
      },
      required: ['whatsapp', 'discord_telegram', 'twitter_thread', 'instagram_caption'],
    },
  },
  required: ['whatsapp', 'discord_telegram', 'twitter_thread', 'instagram_caption', 'calendar_suggestion'],
};

function buildFewShotBlock(samplePosts) {
  if (!samplePosts.length) return '(Tidak ada data contoh tersedia.)';
  return samplePosts.map((row, i) => `Contoh #${i + 1} [format: ${row.format}, event: ${row.event}]:\n${row.content}`).join('\n\n---\n\n');
}

// Validasi kasar brief SEBELUM manggil Gemini sama sekali, supaya brief yang jelas
// asal-asalan (terlalu pendek / cuma 1-2 kata) langsung ditolak dengan pasti - tidak
// bergantung pada AI "mau nurut" instruksi di rules.md, yang sifatnya tidak selalu konsisten.
const MIN_BRIEF_LENGTH = 12;
const MIN_BRIEF_WORDS = 3;

function isBriefTooVague(brief) {
  const trimmed = brief.trim();
  if (trimmed.length < MIN_BRIEF_LENGTH) return true;
  const words = trimmed.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < MIN_BRIEF_WORDS) return true;
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
    return;
  }

  try {
    const { brief } = req.body || {};
    if (!brief || typeof brief !== 'string' || !brief.trim()) {
      res.status(400).json({ error: "Field 'brief' wajib diisi." });
      return;
    }
    if (isBriefTooVague(brief)) {
      res.status(400).json({
        error: 'Brief terlalu singkat/kurang jelas. Tambahkan minimal info produk atau event yang mau dipromosikan, misal: nama event, tanggal, atau detail promo.',
      });
      return;
    }

    const rules = loadRules();
    const samplePosts = loadSamplePosts();
    const fewShotBlock = buildFewShotBlock(samplePosts);

    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10);
    const todayDayName = now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });

    const prompt = `Berikut adalah contoh-contoh konten Nexus Cube sebelumnya (few-shot reference).
Pelajari gaya, struktur, istilah gaming, dan nada bicaranya:

${fewShotBlock}

---

Brief/instruksi konten baru dari panitia:
"${brief.trim()}"

Tugasmu: buat konten promosi turnamen berdasarkan brief di atas dalam 4 format sekaligus:
1. Broadcast WhatsApp / Grup WA (detail lengkap)
2. Pengumuman Discord/Telegram (nada official komunitas)
3. Utas (thread) X/Twitter — array beberapa tweet berurutan, tweet pertama sebagai hook
4. Caption Instagram (naratif & visual)

ATURAN FORMATTING WAJIB untuk whatsapp, discord_telegram, dan instagram_caption (perhatikan
baik-baik, ini sering dilanggar):
- WAJIB pisahkan tiap bagian/poin dengan BARIS KOSONG (\\n\\n), sama persis seperti pola di
  contoh few-shot di atas. JANGAN PERNAH menggabungkan semua kalimat jadi satu paragraf padat
  tanpa jeda baris — itu SALAH walau isinya benar.
- Sapaan pembuka, isi/poin detail (pakai emoji sebagai bullet di baris terpisah-pisah), dan
  CTA penutup harus masing-masing jadi blok terpisah dengan baris kosong di antaranya, persis
  seperti struktur di contoh few-shot.
- Untuk twitter_thread, tiap elemen array adalah 1 tweet - jangan gabungkan beberapa tweet
  jadi 1 elemen string panjang.

Tanggal acuan hari ini (server, WIB): ${todayDate} (${todayDayName}). Semua tanggal yang kamu
sarankan WAJIB berada di masa depan relatif ke tanggal acuan ini.

Plus rekomendasi JADWAL UPLOAD/POSTING (calendar_suggestion) — ini BUKAN jadwal turnamen
(match day/registrasi tetap fakta dari brief, jangan diubah), tapi kapan sebaiknya
masing-masing dari 4 konten di atas di-upload/posting. Buat rekomendasi TERPISAH untuk
whatsapp, discord_telegram, twitter_thread, dan instagram_caption — masing-masing dengan
date (YYYY-MM-DD), day (nama hari), time (HH:MM), dan reasoning sendiri.

Aturan supaya rekomendasi jadwal upload ini tidak template/asal sama tiap kali:
- BERNALAR dari detail konkret di brief (tanggal war tiket/registrasi/match day yang
  disebutkan) untuk menentukan tanggal upload — idealnya beberapa hari SEBELUM tanggal
  acara tsb (H-3 s.d. H-1), bukan tanggal tetap yang selalu sama.
- Waktu upload BOLEH beda antar platform sesuai karakter platform (mis. WhatsApp broadcast
  malam saat orang santai cek HP, Instagram jam makan siang/malam saat engagement tinggi,
  Discord saat komunitas biasanya aktif, X/Twitter bisa lebih pagi sebagai teaser sebelum
  broadcast utama) — TAPI jangan ikuti pola ini secara membabi-buta tiap kali; kalau konteks
  brief (mis. urgensi war tiket) lebih masuk akal untuk pola waktu yang beda, ikuti itu.
- JANGAN kasih tanggal & jam yang persis sama di keempat platform kecuali memang ada alasan
  kuat dari brief yang mendukungnya.
- Dua brief dengan konteks berbeda harus menghasilkan rekomendasi jadwal upload yang berbeda
  juga — jangan mengulang pola jawaban yang sama setiap kali diminta.

Balas HANYA dalam format JSON sesuai schema yang diberikan.`;

    const result = await generateJSON({
      systemInstruction: rules,
      prompt,
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.9,
    });

    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    console.error('Error di /api/generate:', err);
    res.status(500).json({ ok: false, error: err.message || 'Terjadi kesalahan di server.' });
  }
};
