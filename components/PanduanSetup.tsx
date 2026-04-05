"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink } from "lucide-react";

const APPS_SCRIPT_CODE = `// ============================================================
// Google Apps Script - API untuk SIMRS Pegawai
// Versi dengan fitur Upload ke Google Drive
// Salin kode ini ke Google Apps Script
// ============================================================

const SHEET_NAME = "Pegawai";

// ─── Inisialisasi Sheet ──────────────────────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      "ID", "Nama", "NIP", "Jenis Kepegawaian", "Unit Kerja",
      "Sub Unit", "Ruangan", "Jabatan",
      "Link STR", "Link SIP", "Link Ijazah", "Link SK", "Link Sertifikat",
      "Created At", "Updated At"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─── Helper: Baca semua data ────────────────────────────────
function readAllData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      // Ubah header menjadi camelCase
      const key = h.replace(/\\s+(\\w)/g, (_, c) => c.toUpperCase())
                    .replace(/^(\\w)/, (c) => c.toLowerCase())
                    .replace(/\\s/g, "");
      obj[key] = row[i] || "";
    });
    return obj;
  });
}

// ─── Endpoint GET ────────────────────────────────────────────
function doGet(e) {
  const sheet = setupSheet();
  const action = e.parameter.action || "getAll";

  try {
    if (action === "getAll") {
      const data = readAllData(sheet);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Endpoint POST ───────────────────────────────────────────
function doPost(e) {
  const sheet = setupSheet();
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  try {
    if (action === "create") {
      const d = body.data;
      const id = Utilities.getUuid();
      const now = new Date().toISOString();
      sheet.appendRow([
        id, d.nama, d.nip, d.jenisPegawai, d.unitKerja,
        d.subUnit, d.ruangan, d.jabatan,
        d.linkSTR, d.linkSIP, d.linkIjazah, d.linkSK, d.linkSertifikat,
        now, now
      ]);
      return jsonResp({ success: true, data: { id, ...d, createdAt: now, updatedAt: now } });
    }

    if (action === "update") {
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === body.id) {
          const d = body.data;
          const now = new Date().toISOString();
          const row = i + 1;
          sheet.getRange(row, 2, 1, 13).setValues([[
            d.nama, d.nip, d.jenisPegawai, d.unitKerja,
            d.subUnit, d.ruangan, d.jabatan,
            d.linkSTR, d.linkSIP, d.linkIjazah, d.linkSK, d.linkSertifikat,
            now
          ]]);
          return jsonResp({ success: true });
        }
      }
      return jsonResp({ success: false, error: "Data tidak ditemukan" });
    }

    if (action === "delete") {
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === body.id) {
          sheet.deleteRow(i + 1);
          return jsonResp({ success: true });
        }
      }
      return jsonResp({ success: false, error: "Data tidak ditemukan" });
    }

    if (action === "uploadFile") {
      const d = body.data;
      // Ambil atau buat folder SIMRS_Dokumen di root Drive
      const rootFolder = DriveApp.getRootFolder();
      const simrsFolders = rootFolder.getFoldersByName("SIMRS_Dokumen");
      const simrsFolder = simrsFolders.hasNext()
        ? simrsFolders.next()
        : rootFolder.createFolder("SIMRS_Dokumen");

      // Buat sub-folder per pegawai
      const subFolderName = d.folderName.split("/")[1] || d.folderName;
      const pegawaiFolders = simrsFolder.getFoldersByName(subFolderName);
      const pegawaiFolder = pegawaiFolders.hasNext()
        ? pegawaiFolders.next()
        : simrsFolder.createFolder(subFolderName);

      // Dekode base64 → buat file
      const decoded = Utilities.base64Decode(d.base64Content);
      const blob = Utilities.newBlob(decoded, d.mimeType, d.fileName);
      const file = pegawaiFolder.createFile(blob);

      // Set permission: siapapun dengan link bisa lihat (view only)
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileUrl = "https://drive.google.com/file/d/" + file.getId() + "/view";
      return jsonResp({ success: true, fileUrl, fileId: file.getId() });
    }

  } catch (err) {
    return jsonResp({ success: false, error: err.message });
  }
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

const steps = [
  {
    title: "1. Buat Google Sheets",
    content: (
      <div className="space-y-2 text-sm text-foreground">
        <p>Buka <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Google Sheets <ExternalLink className="w-3 h-3" /></a> dan buat spreadsheet baru.</p>
        <p>Beri nama file, misalnya: <strong>SIMRS Pegawai RSX</strong>.</p>
        <p>Kolom akan dibuat otomatis oleh script saat pertama dijalankan. Struktur kolomnya:</p>
        <div className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
          ID | Nama | NIP | Jenis Kepegawaian | Unit Kerja | Sub Unit | Ruangan | Jabatan | Link STR | Link SIP | Link Ijazah | Link SK | Link Sertifikat | Created At | Updated At
        </div>
      </div>
    ),
  },
  {
    title: "2. Buka Google Apps Script",
    content: (
      <div className="space-y-2 text-sm text-foreground">
        <p>Di Google Sheets, klik menu <strong>Extensions</strong> (Ekstensi) &rarr; <strong>Apps Script</strong>.</p>
        <p>Hapus kode default yang ada, lalu tempel kode di bawah ini ke editor.</p>
        <p>Klik ikon <strong>floppy disk</strong> (simpan) atau tekan <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs">Ctrl+S</kbd>.</p>
      </div>
    ),
  },
  {
    title: "3. Deploy sebagai Web App",
    content: (
      <div className="space-y-2 text-sm text-foreground">
        <ol className="list-decimal ml-4 space-y-1.5">
          <li>Klik tombol <strong>Deploy</strong> (kanan atas) &rarr; <strong>New deployment</strong>.</li>
          <li>Klik ikon gear di sebelah <em>Select type</em> &rarr; pilih <strong>Web app</strong>.</li>
          <li>Isi keterangan: <em>SIMRS API v1</em>.</li>
          <li>Set <strong>Execute as</strong>: <em>Me (akun Google Anda)</em>.</li>
          <li>Set <strong>Who has access</strong>: <em>Anyone</em>.</li>
          <li>Klik <strong>Deploy</strong> &rarr; izinkan akses (klik <em>Advanced</em> &rarr; <em>Go to...</em>).</li>
          <li>Salin <strong>Web app URL</strong> yang muncul.</li>
        </ol>
      </div>
    ),
  },
  {
    title: "4. Hubungkan ke Aplikasi Ini",
    content: (
      <div className="space-y-2 text-sm text-foreground">
        <p>Buka file <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/lib/types.ts</code> di kode aplikasi ini.</p>
        <p>Cari baris:</p>
        <div className="bg-muted rounded-lg p-3 text-xs font-mono">
          {`export const APPS_SCRIPT_URL = "";`}
        </div>
        <p>Ganti menjadi:</p>
        <div className="bg-muted rounded-lg p-3 text-xs font-mono break-all">
          {`export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXX/exec";`}
        </div>
        <p className="text-muted-foreground text-xs">Ganti <code>XXXXXX</code> dengan URL Web App yang disalin dari langkah 3.</p>
      </div>
    ),
  },
  {
    title: "5. Upload Dokumen ke Google Drive",
    content: (
      <div className="space-y-2 text-sm text-foreground">
        <p>Upload file dokumen (STR, SIP, Ijazah, dll.) ke Google Drive.</p>
        <p>Klik kanan file &rarr; <strong>Get link</strong> &rarr; ubah akses ke <em>Anyone with the link</em>.</p>
        <p>Salin link tersebut dan tempelkan ke form pegawai pada field dokumen yang sesuai.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-medium">Penting: Pastikan setiap file sudah diset ke &quot;Anyone with the link can view&quot; agar link bisa dibuka dari aplikasi.</p>
        </div>
      </div>
    ),
  },
];

export default function PanduanSetup() {
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="panduan" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Panduan Setup Google Sheets</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ikuti langkah berikut untuk menghubungkan aplikasi ke Google Sheets sebagai database.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setOpenStep(openStep === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="font-semibold text-sm text-foreground">{step.title}</span>
              {openStep === i ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>
            {openStep === i && (
              <div className="px-5 pb-4 border-t border-border pt-4">
                {step.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Apps Script Code */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Kode Google Apps Script</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: copied ? "oklch(0.52 0.15 150)" : "var(--hospital-blue)", color: "white" }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Tersalin!" : "Salin Kode"}
          </button>
        </div>
        <pre className="p-5 text-xs font-mono bg-muted/50 overflow-x-auto max-h-72 leading-relaxed text-foreground/80 whitespace-pre">
          {APPS_SCRIPT_CODE}
        </pre>
      </div>

      {/* Info Box */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: "oklch(0.94 0.04 240)", borderLeft: "4px solid var(--hospital-blue)" }}
      >
        <p className="font-semibold" style={{ color: "var(--hospital-blue)" }}>Catatan Mode Demo</p>
        <p className="text-muted-foreground text-xs mt-1">
          Saat ini aplikasi berjalan dalam mode demo menggunakan penyimpanan lokal (localStorage) browser.
          Data akan hilang jika browser dibersihkan. Untuk data permanen, hubungkan ke Google Sheets
          menggunakan panduan di atas.
        </p>
      </div>
    </section>
  );
}
