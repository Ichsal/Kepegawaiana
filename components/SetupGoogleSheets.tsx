"use client";

import { useState, useEffect } from "react";
import {
  Copy, Check, ExternalLink, ChevronDown, ChevronRight,
  Wifi, WifiOff, Settings2, AlertCircle, CheckCircle2, Loader2, X,
} from "lucide-react";

// ─── Kode Apps Script Terbaru ────────────────────────────────────────────────
const APPS_SCRIPT_CODE = `// ================================================================
// Google Apps Script - SIMRS Pegawai (Versi Lengkap)
// Salin SELURUH kode ini ke Google Apps Script
// ================================================================

const SHEET_NAME = "Pegawai";

// ── Inisialisasi / buat sheet otomatis ──────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      "ID", "Nama", "NIP", "Jenis Kepegawaian", "Unit Kerja",
      "Sub Unit", "Ruangan", "Jabatan", "Tanggal Masuk",
      "Link STR", "Link SIP", "Link Ijazah", "Link SK", "Link Sertifikat",
      "Dokumen Tambahan", "Created At", "Updated At"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1a56db")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 200);
  }
  return sheet;
}

// ── Baca semua data ──────────────────────────────────────────
function readAllData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map((row) => ({
    id:               row[0]  || "",
    nama:             row[1]  || "",
    nip:              row[2]  || "",
    jenisPegawai:     row[3]  || "",
    unitKerja:        row[4]  || "",
    subUnit:          row[5]  || "",
    ruangan:          row[6]  || "",
    jabatan:          row[7]  || "",
    tanggalMasuk:     row[8]  || "",
    linkSTR:          row[9]  || "",
    linkSIP:          row[10] || "",
    linkIjazah:       row[11] || "",
    linkSK:           row[12] || "",
    linkSertifikat:   row[13] || "",
    dokumenTambahan:  row[14] ? JSON.parse(row[14]) : [],
    createdAt:        row[15] || "",
    updatedAt:        row[16] || "",
  }));
}

// ── Endpoint GET ─────────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "getAll";
  try {
    if (action === "ping") {
      return jsonResp({ success: true, message: "Koneksi berhasil!" });
    }
    const sheet = setupSheet();
    if (action === "getAll") {
      return jsonResp({ success: true, data: readAllData(sheet) });
    }
  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

// ── Endpoint POST ────────────────────────────────────────────
function doPost(e) {
  const sheet = setupSheet();
  const body  = JSON.parse(e.postData.contents);
  const action = body.action;

  try {
    // ── Tambah 1 pegawai ──────────────────────────────────────
    if (action === "create") {
      const d   = body.data;
      const id  = Utilities.getUuid();
      const now = new Date().toISOString();
      sheet.appendRow([
        id, d.nama, d.nip, d.jenisPegawai, d.unitKerja,
        d.subUnit, d.ruangan, d.jabatan, d.tanggalMasuk || "",
        d.linkSTR || "", d.linkSIP || "", d.linkIjazah || "",
        d.linkSK || "", d.linkSertifikat || "",
        JSON.stringify(d.dokumenTambahan || []),
        now, now
      ]);
      return jsonResp({ success: true, data: { id, ...d, createdAt: now, updatedAt: now } });
    }

    // ── Import massal ─────────────────────────────────────────
    if (action === "bulkCreate") {
      const items = body.data;
      const now   = new Date().toISOString();
      const rows  = items.map((d) => [
        Utilities.getUuid(),
        d.nama, d.nip, d.jenisPegawai, d.unitKerja,
        d.subUnit, d.ruangan, d.jabatan, d.tanggalMasuk || "",
        d.linkSTR || "", d.linkSIP || "", d.linkIjazah || "",
        d.linkSK || "", d.linkSertifikat || "",
        JSON.stringify(d.dokumenTambahan || []),
        now, now
      ]);
      if (rows.length > 0) {
        sheet.getRange(
          sheet.getLastRow() + 1, 1, rows.length, rows[0].length
        ).setValues(rows);
      }
      return jsonResp({ success: true, count: rows.length });
    }

    // ── Update pegawai ────────────────────────────────────────
    if (action === "update") {
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === body.id) {
          const d   = body.data;
          const now = new Date().toISOString();
          sheet.getRange(i + 1, 2, 1, 15).setValues([[
            d.nama, d.nip, d.jenisPegawai, d.unitKerja,
            d.subUnit, d.ruangan, d.jabatan, d.tanggalMasuk || "",
            d.linkSTR || "", d.linkSIP || "", d.linkIjazah || "",
            d.linkSK || "", d.linkSertifikat || "",
            JSON.stringify(d.dokumenTambahan || []),
            now
          ]]);
          return jsonResp({ success: true });
        }
      }
      return jsonResp({ success: false, error: "ID tidak ditemukan" });
    }

    // ── Hapus pegawai ─────────────────────────────────────────
    if (action === "delete") {
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === body.id) {
          sheet.deleteRow(i + 1);
          return jsonResp({ success: true });
        }
      }
      return jsonResp({ success: false, error: "ID tidak ditemukan" });
    }

    // ── Upload file ke Google Drive ───────────────────────────
    if (action === "uploadFile") {
      const d = body.data;
      const rootFolder  = DriveApp.getRootFolder();
      const simrsFolders = rootFolder.getFoldersByName("SIMRS_Dokumen");
      const simrsFolder  = simrsFolders.hasNext()
        ? simrsFolders.next()
        : rootFolder.createFolder("SIMRS_Dokumen");

      const subName = d.folderName || "Umum";
      const subFolders = simrsFolder.getFoldersByName(subName);
      const subFolder  = subFolders.hasNext()
        ? subFolders.next()
        : simrsFolder.createFolder(subName);

      const decoded = Utilities.base64Decode(d.base64Content);
      const blob    = Utilities.newBlob(decoded, d.mimeType, d.fileName);
      const file    = subFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileUrl = "https://drive.google.com/file/d/" + file.getId() + "/view";
      return jsonResp({ success: true, fileUrl, fileId: file.getId() });
    }

  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

// ── Helper JSON response ──────────────────────────────────────
function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const LS_KEY = "simrs_apps_script_url";

const STEPS = [
  {
    no: "1",
    title: "Buat Google Spreadsheet",
    content: (
      <div className="space-y-3 text-sm">
        <ol className="list-decimal ml-4 space-y-2 text-foreground">
          <li>
            Buka{" "}
            <a href="https://sheets.new" target="_blank" rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5 font-medium">
              sheets.new <ExternalLink className="w-3 h-3" />
            </a>{" "}
            — akan langsung membuat spreadsheet baru.
          </li>
          <li>Beri nama file, contoh: <strong>SIMRS Pegawai RSX</strong>.</li>
          <li>Biarkan isi sheet kosong — kolom dibuat <strong>otomatis</strong> oleh script.</li>
        </ol>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <strong>Kolom yang akan dibuat otomatis:</strong><br />
          ID | Nama | NIP | Jenis Kepegawaian | Unit Kerja | Sub Unit | Ruangan | Jabatan | Tanggal Masuk | Link STR | Link SIP | Link Ijazah | Link SK | Link Sertifikat | Dokumen Tambahan | Created At | Updated At
        </div>
      </div>
    ),
  },
  {
    no: "2",
    title: "Buka Google Apps Script",
    content: (
      <div className="space-y-3 text-sm text-foreground">
        <ol className="list-decimal ml-4 space-y-2">
          <li>Di Google Sheets, klik menu <strong>Extensions</strong> (atau <strong>Ekstensi</strong>).</li>
          <li>Pilih <strong>Apps Script</strong>.</li>
          <li>Tab baru akan terbuka dengan editor kode.</li>
          <li><strong>Hapus semua</strong> kode yang ada di editor (biasanya <code className="bg-muted px-1 rounded text-xs">function myFunction() {"{...}"}</code>).</li>
          <li>Tempel kode dari tombol <strong>Salin Kode Script</strong> di bawah.</li>
          <li>Tekan <kbd className="bg-muted border border-border px-1.5 py-0.5 rounded text-xs">Ctrl+S</kbd> untuk menyimpan.</li>
        </ol>
      </div>
    ),
  },
  {
    no: "3",
    title: "Deploy sebagai Web App",
    content: (
      <div className="space-y-3 text-sm text-foreground">
        <ol className="list-decimal ml-4 space-y-2">
          <li>Di Apps Script, klik tombol <strong>Deploy</strong> (kanan atas berwarna biru).</li>
          <li>Pilih <strong>New deployment</strong>.</li>
          <li>Klik ikon <strong>gear/roda gigi</strong> di samping &ldquo;Select type&rdquo; → pilih <strong>Web app</strong>.</li>
          <li>
            Isi kolom keterangan: <code className="bg-muted px-1 rounded text-xs">SIMRS API v1</code>
          </li>
          <li>
            Set <strong>Execute as</strong>: <em>Me (email akun Google Anda)</em>
          </li>
          <li>
            Set <strong>Who has access</strong>: <em>Anyone</em> &nbsp;
            <span className="text-amber-600 font-medium">(penting!)</span>
          </li>
          <li>Klik <strong>Deploy</strong>.</li>
          <li>
            Muncul popup izin akses → klik <strong>Authorize access</strong> → pilih akun Google Anda
            → klik <strong>Advanced</strong> → <strong>Go to (nama proyek)</strong> → <strong>Allow</strong>.
          </li>
          <li>Salin <strong>Web app URL</strong> yang muncul — berbentuk:<br />
            <code className="bg-muted px-1.5 py-1 rounded text-xs block mt-1 break-all">
              https://script.google.com/macros/s/XXXXXXXX/exec
            </code>
          </li>
        </ol>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Catatan penting:</strong> Setiap kali Anda mengubah kode Apps Script, Anda harus buat deployment baru (bukan edit yang lama) agar perubahan berlaku.
        </div>
      </div>
    ),
  },
  {
    no: "4",
    title: "Sambungkan URL ke Aplikasi",
    content: (
      <div className="space-y-3 text-sm text-foreground">
        <p>Tempel URL Web App dari langkah 3 ke kolom di bawah, lalu klik <strong>Simpan & Test Koneksi</strong>.</p>
        <p className="text-muted-foreground text-xs">
          URL tersimpan di browser Anda. Jika deploy ulang aplikasi ke Vercel, masukkan URL lagi lewat form ini atau edit langsung di <code className="bg-muted px-1 rounded">lib/types.ts</code>.
        </p>
      </div>
    ),
  },
];

interface Props {
  onClose: () => void;
  onUrlSaved: (url: string) => void;
  currentUrl: string;
}

export default function SetupGoogleSheets({ onClose, onUrlSaved, currentUrl }: Props) {
  const [openStep, setOpenStep] = useState<number | null>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [url, setUrl] = useState(currentUrl || "");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) || "";
    if (saved && !currentUrl) setUrl(saved);
  }, [currentUrl]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTest = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setTestStatus("error");
      setTestMessage("URL belum diisi.");
      return;
    }
    setTestStatus("loading");
    setTestMessage("");
    try {
      const res = await fetch(`${trimmed}?action=ping`, { method: "GET" });
      const json = await res.json();
      if (json.success) {
        setTestStatus("success");
        setTestMessage(json.message || "Koneksi berhasil!");
        localStorage.setItem(LS_KEY, trimmed);
        onUrlSaved(trimmed);
      } else {
        setTestStatus("error");
        setTestMessage("Script merespons tapi ada error: " + (json.error || "Unknown"));
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Gagal terhubung. Pastikan URL benar dan akses diset ke Anyone.");
    }
  };

  const handleSaveOnly = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_KEY, trimmed);
    onUrlSaved(trimmed);
    setTestStatus("success");
    setTestMessage("URL disimpan. Klik Test Koneksi untuk memverifikasi.");
  };

  const isConnected = testStatus === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: "var(--hospital-blue)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Setup Google Sheets</p>
              <p className="text-white/70 text-xs">Hubungkan aplikasi ke Google Sheets sebagai database</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar */}
        <div className={`flex items-center gap-2 px-6 py-2.5 text-xs font-medium flex-shrink-0 ${
          currentUrl
            ? "bg-emerald-50 text-emerald-700 border-b border-emerald-100"
            : "bg-amber-50 text-amber-700 border-b border-amber-100"
        }`}>
          {currentUrl
            ? <><Wifi className="w-3.5 h-3.5" /> Terhubung ke Google Sheets — data akan tersimpan permanen</>
            : <><WifiOff className="w-3.5 h-3.5" /> Belum terhubung — berjalan mode demo (localStorage)</>
          }
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Steps accordion */}
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenStep(openStep === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "var(--hospital-blue)" }}
                  >
                    {step.no}
                  </span>
                  <span className="font-semibold text-sm text-foreground flex-1">{step.title}</span>
                  {openStep === i
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {openStep === i && (
                  <div className="px-5 pb-5 pt-1 border-t border-border bg-muted/20">
                    {step.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Copy Script Code */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div>
                <p className="text-sm font-semibold text-foreground">Kode Apps Script</p>
                <p className="text-xs text-muted-foreground mt-0.5">Salin dan tempel ke editor Google Apps Script</p>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all"
                style={{ background: copiedCode ? "#16a34a" : "var(--hospital-blue)" }}
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? "Tersalin!" : "Salin Kode Script"}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono bg-zinc-950 text-green-400 overflow-x-auto max-h-52 leading-relaxed whitespace-pre">
              {APPS_SCRIPT_CODE}
            </pre>
          </div>

          {/* Input URL + Test */}
          <div className="border-2 border-primary/30 rounded-xl p-5 space-y-4 bg-primary/5">
            <div>
              <p className="text-sm font-bold text-foreground">Langkah 4 — Masukkan URL Web App</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tempel URL dari hasil deploy Apps Script di sini
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">URL Web App Google Apps Script</label>
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTestStatus("idle"); }}
                placeholder="https://script.google.com/macros/s/XXXXXXXX/exec"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              />
            </div>

            {/* Status feedback */}
            {testStatus !== "idle" && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-medium ${
                testStatus === "loading" ? "bg-blue-50 text-blue-700" :
                testStatus === "success" ? "bg-emerald-50 text-emerald-700" :
                "bg-red-50 text-red-700"
              }`}>
                {testStatus === "loading" && <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin flex-shrink-0" />}
                {testStatus === "success" && <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                {testStatus === "error" && <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                <span>{testStatus === "loading" ? "Mencoba koneksi ke Google Sheets..." : testMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testStatus === "loading" || !url.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--hospital-blue)" }}
              >
                {testStatus === "loading"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghubungkan...</>
                  : <><Wifi className="w-4 h-4" /> Simpan &amp; Test Koneksi</>
                }
              </button>
              <button
                onClick={handleSaveOnly}
                disabled={!url.trim()}
                className="px-4 py-2.5 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Simpan Saja
              </button>
            </div>

            {isConnected && (
              <div className="text-xs text-muted-foreground text-center">
                Reload halaman agar koneksi aktif sepenuhnya.
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-bold text-foreground">Tips Troubleshooting</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc ml-4">
              <li>Pastikan <strong>Who has access</strong> diset ke <strong>Anyone</strong> (bukan hanya yang punya akun Google).</li>
              <li>Setelah edit kode script, buat <strong>New Deployment</strong> — jangan edit deployment lama.</li>
              <li>Jika muncul error <em>authorization</em>, ulangi proses izin akses di popup.</li>
              <li>URL berakhiran <code className="bg-muted px-1 rounded">/exec</code> — bukan <code className="bg-muted px-1 rounded">/dev</code>.</li>
              <li>Kalau koneksi gagal terus, coba buka URL di tab baru — harus muncul respons JSON.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Data tersimpan di Google Sheets milik Anda sendiri — aman dan gratis.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
