// ---- State ----
const approved = { whatsapp: null, discord_telegram: null, twitter_thread: null, instagram_caption: null };

// ---- Elements ----
const briefInput = document.getElementById("briefInput");
const generateBtn = document.getElementById("generateBtn");
const generateStatus = document.getElementById("generateStatus");
const resultSection = document.getElementById("resultSection");

const editWhatsapp = document.getElementById("editWhatsapp");
const editDiscord = document.getElementById("editDiscord");
const editTwitter = document.getElementById("editTwitter");
const editInstagram = document.getElementById("editInstagram");
const exportBtn = document.getElementById("exportBtn");

const loadSentimentBtn = document.getElementById("loadSentimentBtn");
const sentimentStatus = document.getElementById("sentimentStatus");
const sentimentDashboard = document.getElementById("sentimentDashboard");

// ---- Helpers ----
function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

function clearApprovalStatuses() {
  document.querySelectorAll("[data-status]").forEach((el) => (el.textContent = ""));
  Object.keys(approved).forEach((k) => (approved[k] = null));
}

// Thread disimpan di textarea sebagai teks, tiap tweet dipisah baris kosong ("\n\n")
function threadArrayToText(arr) {
  return (arr || []).join("\n\n");
}
function threadTextToArray(text) {
  return text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
}

// ---- Generate Content ----
generateBtn.addEventListener("click", async () => {
  const brief = briefInput.value.trim();
  if (!brief) {
    generateStatus.textContent = "Isi brief dulu ya, Warriors.";
    generateStatus.className = "text-sm text-rose-400";
    return;
  }

  setBusy(generateBtn, true, "⚡ MENGHASILKAN...", "⚡ GENERATE KONTEN");
  generateStatus.textContent = "Memanggil AI Content Studio...";
  generateStatus.className = "text-sm text-slate-400";
  clearApprovalStatuses();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.ok) throw new Error(payload.error || "Gagal generate konten.");

    const { whatsapp, discord_telegram, twitter_thread, instagram_caption, calendar_suggestion } = payload.data;
    editWhatsapp.value = whatsapp || "";
    editDiscord.value = discord_telegram || "";
    editTwitter.value = threadArrayToText(twitter_thread);
    editInstagram.value = instagram_caption || "";

    // Jadwal upload disarankan, ditampilkan sebagai baris kecil di tiap kartu format.
    ["whatsapp", "discord_telegram", "twitter_thread", "instagram_caption"].forEach((key) => {
      const el = document.querySelector(`[data-schedule="${key}"]`);
      if (!el) return;
      const sched = calendar_suggestion && calendar_suggestion[key];
      el.textContent = sched
        ? `Upload: ${sched.day}, ${sched.date} pukul ${sched.time} WIB — ${sched.reasoning}`
        : "";
    });

    resultSection.classList.remove("hidden");
    resultSection.classList.add("flex");
    generateStatus.textContent = "Konten berhasil dibuat. Silakan review & edit sebelum disetujui.";
    generateStatus.className = "text-sm text-emerald-400";
  } catch (err) {
    generateStatus.textContent = `Error: ${err.message}`;
    generateStatus.className = "text-sm text-rose-400";
  } finally {
    setBusy(generateBtn, false, "⚡ MENGHASILKAN...", "⚡ GENERATE KONTEN");
  }
});

// ---- Approval buttons ----
document.querySelectorAll(".approve-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.approve;
    const statusEl = document.querySelector(`[data-status="${key}"]`);

    if (key === "whatsapp") approved.whatsapp = editWhatsapp.value;
    if (key === "discord_telegram") approved.discord_telegram = editDiscord.value;
    if (key === "twitter_thread") approved.twitter_thread = threadTextToArray(editTwitter.value);
    if (key === "instagram_caption") approved.instagram_caption = editInstagram.value;

    statusEl.textContent = "✅ Disetujui";
    statusEl.className = "text-[11px] text-emerald-400";
  });
});

// ---- Copy buttons ----
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const targetId = btn.dataset.copy;
    const value = document.getElementById(targetId).value;
    try {
      await navigator.clipboard.writeText(value);
      const original = btn.textContent;
      btn.textContent = "DISALIN!";
      setTimeout(() => (btn.textContent = original), 1200);
    } catch {
      alert("Gagal menyalin ke clipboard.");
    }
  });
});

// ---- Evaluate (LLM-as-Judge) buttons ----
const evalTextareaMap = {
  whatsapp: editWhatsapp,
  discord_telegram: editDiscord,
  twitter_thread: editTwitter,
  instagram_caption: editInstagram,
};

document.querySelectorAll(".evaluate-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.evaluate;
    const textarea = evalTextareaMap[key];
    const panel = document.querySelector(`[data-eval-panel="${key}"]`);
    const criteriaEl = document.querySelector(`[data-eval-criteria="${key}"]`);
    const overallEl = document.querySelector(`[data-eval-overall="${key}"]`);
    const verdictEl = document.querySelector(`[data-eval-verdict="${key}"]`);
    const summaryEl = document.querySelector(`[data-eval-summary="${key}"]`);

    const content = key === "twitter_thread" ? threadTextToArray(textarea.value) : textarea.value;
    if (!content || (Array.isArray(content) && !content.length)) {
      alert("Isi/generate kontennya dulu sebelum dievaluasi.");
      return;
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "MENILAI...";

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: key, content, brief: briefInput.value }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Gagal mengevaluasi konten.");

      const { criteria, overall_score, verdict, summary } = payload.data;

      criteriaEl.innerHTML = (criteria || [])
        .map(
          (c) => `
        <div class="flex items-start justify-between gap-3">
          <span class="text-gray-300">${c.label || c.key}</span>
          <span class="text-amber-300 font-bold whitespace-nowrap">${c.score}/5</span>
        </div>
        <p class="text-gray-500 text-[11px] -mt-1">${c.comment || ""}</p>
      `
        )
        .join("");

      overallEl.textContent = `Overall: ${overall_score}/5`;
      const isApproved = verdict === "approved";
      verdictEl.textContent = isApproved ? "✔ APPROVED" : "✎ NEEDS REVISION";
      verdictEl.className = isApproved ? "text-emerald-400 font-bold" : "text-rose-400 font-bold";
      summaryEl.textContent = summary || "";

      panel.classList.remove("hidden");
    } catch (err) {
      alert(`Error evaluasi: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
});

// ---- Export ----
function spotCheckNote(key) {
  const checkbox = document.querySelector(`[data-spotcheck="${key}"]`);
  const notes = document.querySelector(`[data-spotcheck-notes="${key}"]`);
  if (!checkbox) return "";
  const agreed = checkbox.checked ? "Human spot-check: DISETUJUI oleh reviewer manusia." : "Human spot-check: belum/tidak disetujui manual.";
  const noteText = notes && notes.value.trim() ? `Catatan: ${notes.value.trim()}` : "";
  return `\n[${agreed}${noteText ? " " + noteText : ""}]`;
}

exportBtn.addEventListener("click", () => {
  const parts = [];
  if (approved.whatsapp) parts.push(`=== BROADCAST WHATSAPP ===\n${approved.whatsapp}${spotCheckNote("whatsapp")}`);
  if (approved.discord_telegram) parts.push(`=== PENGUMUMAN DISCORD/TELEGRAM ===\n${approved.discord_telegram}${spotCheckNote("discord_telegram")}`);
  if (approved.twitter_thread && approved.twitter_thread.length)
    parts.push(`=== UTAS X/TWITTER ===\n${approved.twitter_thread.join("\n\n")}${spotCheckNote("twitter_thread")}`);
  if (approved.instagram_caption) parts.push(`=== CAPTION INSTAGRAM ===\n${approved.instagram_caption}${spotCheckNote("instagram_caption")}`);

  if (!parts.length) {
    alert("Belum ada konten yang disetujui. Klik 'Setujui' pada minimal satu format dulu.");
    return;
  }

  const blob = new Blob([parts.join("\n\n\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexus-cube-content-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---- Sentiment Dashboard ----
const datasetSelect = document.getElementById("datasetSelect");
const customCsvFile = document.getElementById("customCsvFile");

if (datasetSelect) {
  datasetSelect.addEventListener("change", () => {
    if (datasetSelect.value === "upload") {
      customCsvFile.classList.remove("hidden");
    } else {
      customCsvFile.classList.add("hidden");
    }
  });
}

loadSentimentBtn.addEventListener("click", async () => {
  setBusy(loadSentimentBtn, true, "MENGANALISIS...", "MUAT ANALISIS KOMENTAR");
  sentimentStatus.textContent = "Mengambil & menganalisis komentar dari dataset...";
  sentimentStatus.className = "text-sm text-slate-400";

  try {
    let requestBody = {};
    const mode = datasetSelect ? datasetSelect.value : "comments_dataset.csv";

    if (mode === "upload") {
      const file = customCsvFile.files[0];
      if (!file) throw new Error("Silakan pilih file CSV terlebih dahulu.");
      const fileText = await file.text();
      requestBody = { customCsvText: fileText };
    } else {
      requestBody = { datasetName: mode };
    }

    const res = await fetch("/api/sentiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const payload = await res.json();
    if (!res.ok || !payload.ok) throw new Error(payload.error || "Gagal memuat analisis sentimen.");

    const { summary, top_themes, items, weekly_summary } = payload.data;

    document.getElementById("statTotal").textContent = summary.total ?? "-";
    document.getElementById("statPositive").textContent = summary.positive ?? "-";
    document.getElementById("statNegative").textContent = summary.negative ?? "-";
    document.getElementById("statNeutral").textContent = summary.neutral ?? "-";

    const weeklyBody = document.getElementById("weeklySummaryBody");
    const spikeBanner = document.getElementById("spikeAlertBanner");
    const spikeText = document.getElementById("spikeAlertText");
    weeklyBody.innerHTML = "";
    const spikeWeeks = [];
    (weekly_summary || []).forEach((w) => {
      const tr = document.createElement("tr");
      if (w.is_spike) tr.className = "bg-red-500/10";
      tr.innerHTML = `
        <td class="p-2 text-slate-300">${w.week_start} – ${w.week_end}</td>
        <td class="p-2 text-slate-400">${w.total}</td>
        <td class="p-2 text-emerald-400">${w.positive}</td>
        <td class="p-2 text-rose-400">${w.negative}</td>
        <td class="p-2 text-slate-400">${w.neutral}</td>
        <td class="p-2 text-slate-300">${Math.round(w.negative_ratio * 100)}%</td>
        <td class="p-2">${w.is_spike ? '<span class="text-rose-400 font-bold">⚠ SPIKE</span>' : '<span class="text-slate-500">normal</span>'}</td>
      `;
      weeklyBody.appendChild(tr);
      if (w.is_spike) spikeWeeks.push(w);
    });

    if (spikeWeeks.length) {
      spikeBanner.classList.remove("hidden");
      spikeText.textContent = `Terdeteksi ${spikeWeeks.length} minggu dengan lonjakan sentimen negatif (>=30%): ${spikeWeeks
        .map((w) => `${w.week_start} s.d. ${w.week_end} (${Math.round(w.negative_ratio * 100)}% negatif)`)
        .join(", ")}.`;
    } else {
      spikeBanner.classList.add("hidden");
    }

    const themeList = document.getElementById("themeList");
    themeList.innerHTML = "";
    (top_themes || []).forEach((t) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm";
      row.innerHTML = `
        <span class="text-slate-200">${t.theme}</span>
        <span class="text-slate-400 text-xs">${t.count}x · <span class="capitalize">${t.sentiment_lean}</span></span>
      `;
      themeList.appendChild(row);
    });

    const tbody = document.getElementById("itemsTableBody");
    tbody.innerHTML = "";
    (items || []).forEach((item) => {
      const tr = document.createElement("tr");
      const sentimentColor =
        item.sentiment === "positive" ? "text-emerald-400" : item.sentiment === "negative" ? "text-rose-400" : "text-slate-400";
      tr.innerHTML = `
        <td class="p-2 text-slate-400">#${item.id}</td>
        <td class="p-2 font-medium ${sentimentColor} capitalize">${item.sentiment}</td>
        <td class="p-2 text-slate-300 truncate max-w-[120px]" title="${item.theme}">${item.theme}</td>
        <td class="p-2 text-slate-400 text-xs pr-4">${item.text || ''}</td>
      `;
      tbody.appendChild(tr);
    });

    sentimentDashboard.classList.remove("hidden");
    sentimentDashboard.classList.add("flex");
    sentimentStatus.textContent = "Analisis selesai.";
    sentimentStatus.className = "text-sm text-emerald-400";
  } catch (err) {
    sentimentStatus.textContent = `Error: ${err.message}`;
    sentimentStatus.className = "text-sm text-rose-400";
  } finally {
    setBusy(loadSentimentBtn, false, "MENGANALISIS...", "MUAT ANALISIS KOMENTAR");
  }
});
