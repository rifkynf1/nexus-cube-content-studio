const { generateJSON } = require('./_lib/gemini');
const { loadRules, loadSamplePosts } = require('./_lib/loadContext');

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
      properties: {
        best_day: { type: 'string' },
        best_time: { type: 'string' },
        reasoning: { type: 'string' },
      },
      required: ['best_day', 'best_time', 'reasoning'],
    },
  },
  required: ['whatsapp', 'discord_telegram', 'twitter_thread', 'instagram_caption', 'calendar_suggestion'],
};

function buildFewShotBlock(samplePosts) {
  if (!samplePosts.length) return '(Tidak ada data contoh tersedia.)';
  return samplePosts.map((row, i) => `Contoh #${i + 1} [format: ${row.format}, event: ${row.event}]:\n${row.content}`).join('\n\n---\n\n');
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

    const rules = loadRules();
    const samplePosts = loadSamplePosts();
    const fewShotBlock = buildFewShotBlock(samplePosts);

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

Plus 1 saran jadwal posting (calendar_suggestion). Tentukan best_day & best_time dengan
BERNALAR dari detail konkret yang ada di brief di atas (tanggal registrasi/match day/deadline
yang disebutkan, jenis pengumuman, urgensi war tiket, dll) — JANGAN otomatis menjawab
"Jumat, 19:00" atau jawaban template lain kalau tidak ada alasan spesifik dari brief yang
mendukungnya. Pertimbangkan misalnya:
- Kalau brief menyebut tanggal war tiket/registrasi/match day, jadwal posting idealnya
  beberapa hari SEBELUM tanggal tersebut (H-3 s.d. H-1), bukan hari tetap.
- Kalau brief tidak menyebut tanggal spesifik, pilih hari & jam berdasarkan jenis kontennya
  (mis. pengumuman teknis vs hype promosi) dan jelaskan alasannya di field "reasoning" secara
  konkret, bukan generik.
- Variasikan hari/jam antar brief yang berbeda — dua brief dengan konteks berbeda seharusnya
  bisa menghasilkan saran jadwal yang berbeda juga.

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
