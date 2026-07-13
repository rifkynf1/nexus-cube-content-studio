const { GoogleGenAI } = require("@google/genai");

// Model default mengikuti permintaan proyek: Gemini 3.1 Flash Lite.
// Bisa dioverride lewat env var GEMINI_MODEL kalau Google mengganti nama modelnya.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

let client;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum di-set di environment variables.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Memanggil Gemini dan memaksa output JSON sesuai responseSchema.
 * @param {object} opts
 * @param {string} opts.systemInstruction - System prompt (isi rules.md).
 * @param {string} opts.prompt - User prompt / brief + data few-shot.
 * @param {object} [opts.responseSchema] - JSON schema untuk structured output.
 * @param {number} [opts.temperature]
 */
async function generateJSON({ systemInstruction, prompt, responseSchema, temperature = 0.8 }) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature,
      responseMimeType: "application/json",
      ...(responseSchema ? { responseSchema } : {}),
    },
  });

  const text = response.text;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Gagal parse JSON dari Gemini: ${err.message}\nRaw: ${text}`);
  }
}

module.exports = { generateJSON, DEFAULT_MODEL };
