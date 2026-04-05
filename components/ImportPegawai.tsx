"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X, Upload, FileSpreadsheet, ClipboardPaste, Download,
  CheckCircle2, AlertCircle, AlertTriangle, ChevronRight,
  RotateCcw, Users, Loader2, Info, FileDown,
} from "lucide-react";
import {
  Pegawai, JENIS_PEGAWAI_OPTIONS, UNIT_KERJA_OPTIONS,
  SUB_UNIT_OPTIONS, JenisPegawai, UnitKerja,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewRow {
  rowNum: number;
  data: Omit<Pegawai, "id" | "createdAt" | "updatedAt">;
  errors: string[];
  warnings: string[];
  status: "valid" | "warning" | "error";
}

interface Props {
  ruanganList: string[];
  onClose: () => void;
  onImported: (count: number) => void;
  onBulkCreate: (rows: Omit<Pegawai, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
}

// ─── Definisi kolom ───────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "nama",           header: "Nama",              required: true  },
  { key: "nip",            header: "NIP",               required: false },
  { key: "jenisPegawai",   header: "Jenis Kepegawaian", required: true  },
  { key: "unitKerja",      header: "Unit Kerja",        required: true  },
  { key: "subUnit",        header: "Sub Unit",          required: false },
  { key: "ruangan",        header: "Ruangan",           required: false },
  { key: "jabatan",        header: "Jabatan",           required: false },
  { key: "tanggalMasuk",   header: "Tanggal Masuk",     required: false },
  { key: "linkSTR",        header: "Link STR",          required: false },
  { key: "linkSIP",        header: "Link SIP",          required: false },
  { key: "linkIjazah",     header: "Link Ijazah",       required: false },
  { key: "linkSK",         header: "Link SK",           required: false },
  { key: "linkSertifikat", header: "Link Sertifikat",   required: false },
];

// Alias header: semua variasi nama kolom yang diterima
const HEADER_ALIASES: Record<string, string> = {
  nama: "nama",
  name: "nama",
  "nama pegawai": "nama",
  nip: "nip",
  "nomor induk pegawai": "nip",
  "jenis kepegawaian": "jenisPegawai",
  jenis: "jenisPegawai",
  "tipe kepegawaian": "jenisPegawai",
  status: "jenisPegawai",
  "unit kerja": "unitKerja",
  unit: "unitKerja",
  departemen: "unitKerja",
  "sub unit": "subUnit",
  subunit: "subUnit",
  bagian: "subUnit",
  divisi: "subUnit",
  ruangan: "ruangan",
  "nama ruangan": "ruangan",
  jabatan: "jabatan",
  "nama jabatan": "jabatan",
  posisi: "jabatan",
  "tanggal masuk": "tanggalMasuk",
  "tgl masuk": "tanggalMasuk",
  "tanggal bergabung": "tanggalMasuk",
  bergabung: "tanggalMasuk",
  "mulai kerja": "tanggalMasuk",
  "join date": "tanggalMasuk",
  "link str": "linkSTR",
  str: "linkSTR",
  "link sip": "linkSIP",
  sip: "linkSIP",
  "link ijazah": "linkIjazah",
  ijazah: "linkIjazah",
  "link sk": "linkSK",
  sk: "linkSK",
  "surat keputusan": "linkSK",
  "link sertifikat": "linkSertifikat",
  sertifikat: "linkSertifikat",
  sertifikasi: "linkSertifikat",
};

// ─── Helper: parse tanggal fleksibel ─────────────────────────────────────────

function parseDateFlex(raw: string | number | undefined): string {
  if (raw === undefined || raw === null || raw === "") return "";
  // Jika angka (Excel serial date)
  if (typeof raw === "number") {
    const d = new Date((raw - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return "";
  }
  const str = String(raw).trim();
  if (!str) return "";
  // DD/MM/YYYY atau DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Excel serial sebagai string
  const serial = parseInt(str, 10);
  if (!isNaN(serial) && serial > 10000 && serial < 100000) {
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return "";
}

function normalizeJenis(val: string): JenisPegawai | "" {
  const map: Record<string, JenisPegawai> = {
    honorer: "Honorer",
    "p3k paruh waktu": "P3K Paruh Waktu",
    "paruh waktu": "P3K Paruh Waktu",
    "p3k penuh waktu": "P3K Penuh Waktu",
    "penuh waktu": "P3K Penuh Waktu",
    p3k: "P3K Penuh Waktu",
    pns: "PNS",
    "pegawai negeri sipil": "PNS",
  };
  const lo = val.toLowerCase().trim();
  return map[lo] || (JENIS_PEGAWAI_OPTIONS.includes(val.trim() as JenisPegawai) ? (val.trim() as JenisPegawai) : "");
}

function normalizeUnit(val: string): UnitKerja | "" {
  const lo = val.toLowerCase().trim();
  if (lo === "manajemen") return "Manajemen";
  if (lo === "pelayanan") return "Pelayanan";
  return "";
}

// ─── Build header map: hanya petakan header yang dikenali ────────────────────

function buildHeaderMap(headerRow: (string | number | undefined)[]): {
  map: Record<string, number>;
  recognized: string[];
  unrecognized: string[];
} {
  const map: Record<string, number> = {};
  const recognized: string[] = [];
  const unrecognized: string[] = [];

  headerRow.forEach((h, idx) => {
    const raw = String(h ?? "").trim();
    if (!raw) return;
    const lo = raw.toLowerCase();
    const key = HEADER_ALIASES[lo];
    if (key) {
      map[key] = idx;
      recognized.push(raw);
    } else {
      unrecognized.push(raw);
    }
  });

  return { map, recognized, unrecognized };
}

// ─── Validasi satu baris ──────────────────────────────────────────────────────

function validateRow(
  cells: (string | number | undefined)[],
  headerMap: Record<string, number>,
  rowNum: number,
  ruanganList: string[]
): PreviewRow {
  const get = (key: string): string => {
    const idx = headerMap[key];
    if (idx === undefined) return ""; // kolom tidak ada → kosongi saja
    const val = cells[idx];
    return String(val ?? "").trim();
  };

  const getRaw = (key: string): string | number | undefined => {
    const idx = headerMap[key];
    return idx !== undefined ? cells[idx] : undefined;
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  const nama = get("nama");
  if (!nama) errors.push("Nama wajib diisi");

  const jenisPegawaiRaw = get("jenisPegawai");
  const jenisPegawai = headerMap["jenisPegawai"] !== undefined
    ? normalizeJenis(jenisPegawaiRaw)
    : "Honorer" as JenisPegawai; // kolom tidak ada → default Honorer, tidak error
  if (headerMap["jenisPegawai"] !== undefined && !jenisPegawai) {
    errors.push(`Jenis Kepegawaian tidak valid: "${jenisPegawaiRaw}". Gunakan: Honorer / P3K Paruh Waktu / P3K Penuh Waktu / PNS`);
  }

  const unitKerjaRaw = get("unitKerja");
  const unitKerja = headerMap["unitKerja"] !== undefined
    ? normalizeUnit(unitKerjaRaw)
    : "Pelayanan" as UnitKerja; // kolom tidak ada → default Pelayanan
  if (headerMap["unitKerja"] !== undefined && !unitKerja) {
    errors.push(`Unit Kerja tidak valid: "${unitKerjaRaw}". Gunakan: Manajemen / Pelayanan`);
  }

  const subUnit = get("subUnit");
  if (unitKerja && subUnit && headerMap["subUnit"] !== undefined) {
    const validSubs = SUB_UNIT_OPTIONS[unitKerja] || [];
    if (!validSubs.includes(subUnit)) {
      warnings.push(`Sub Unit "${subUnit}" tidak ada di daftar standar, akan tetap disimpan`);
    }
  }

  const ruangan = get("ruangan");
  if (ruangan && !ruanganList.includes(ruangan)) {
    warnings.push(`Ruangan "${ruangan}" belum ada di daftar, akan tetap disimpan`);
  }

  const tanggalRaw = getRaw("tanggalMasuk");
  const tanggalMasuk = headerMap["tanggalMasuk"] !== undefined ? parseDateFlex(tanggalRaw) : "";
  if (headerMap["tanggalMasuk"] !== undefined && tanggalRaw && !tanggalMasuk) {
    warnings.push(`Format tanggal tidak dikenali: "${tanggalRaw}". Gunakan DD/MM/YYYY atau YYYY-MM-DD`);
  }

  return {
    rowNum,
    data: {
      nama,
      nip: get("nip"),
      jenisPegawai: (jenisPegawai || "Honorer") as JenisPegawai,
      unitKerja: (unitKerja || "Pelayanan") as UnitKerja,
      subUnit,
      ruangan,
      jabatan: get("jabatan"),
      tanggalMasuk,
      linkSTR: get("linkSTR"),
      linkSIP: get("linkSIP"),
      linkIjazah: get("linkIjazah"),
      linkSK: get("linkSK"),
      linkSertifikat: get("linkSertifikat"),
      dokumenTambahan: [],
    },
    errors,
    warnings,
    status: errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid",
  };
}

// ─── Parse CSV manual ─────────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const cells: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === "," && !inQ) { cells.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function parseTsv(text: string): string[][] {
  return text.trim().split(/\r?\n/).map((row) =>
    row.split("\t").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
}

// ─── Download template Excel ──────────────────────────────────────────────────

async function downloadTemplateExcel() {
  const XLSX = await import("xlsx");
  const headers = COLUMNS.map((c) => c.header);
  const example = [
    "dr. Budi Santoso", "197501012005011001", "PNS", "Pelayanan",
    "Pelayanan Medis", "IGD", "Dokter Umum", "01/01/2005",
    "", "", "https://drive.google.com/file/d/...", "", "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);

  // Lebar kolom otomatis
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");
  XLSX.writeFile(wb, "template_import_pegawai.xlsx");
}

function downloadTemplateCsv() {
  const headers = COLUMNS.map((c) => c.header).join(",");
  const example = [
    "dr. Budi Santoso", "197501012005011001", "PNS", "Pelayanan",
    "Pelayanan Medis", "IGD", "Dokter Umum", "01/01/2005",
    "", "", "https://drive.google.com/file/d/...", "", "",
  ].join(",");
  const blob = new Blob(["\uFEFF" + headers + "\n" + example], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "template_import_pegawai.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export default function ImportPegawai({ ruanganList, onClose, onImported, onBulkCreate }: Props) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [skipErrors, setSkipErrors] = useState(false);
  const [xlsxReady, setXlsxReady] = useState(false);
  const [headerInfo, setHeaderInfo] = useState<{ recognized: string[]; unrecognized: string[] }>({ recognized: [], unrecognized: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  // Preload xlsx library di background
  useEffect(() => {
    import("xlsx").then(() => setXlsxReady(true)).catch(() => {});
  }, []);

  // ── Parse matrix → preview rows ───────────────────────────────────────────

  const parseMatrix = useCallback((
    matrix: (string | number | undefined)[][],
    source: string,
    info: { recognized: string[]; unrecognized: string[] }
  ) => {
    if (matrix.length < 2) return;
    const headerRow = matrix[0];
    const { map: headerMap } = buildHeaderMap(headerRow);

    const dataRows = matrix.slice(1).filter((row) =>
      row.some((c) => c !== undefined && c !== null && String(c).trim() !== "")
    );

    const parsed: PreviewRow[] = dataRows.map((row, i) =>
      validateRow(row, headerMap, i + 2, ruanganList)
    );

    setHeaderInfo(info);
    setRows(parsed);
    setFileName(source);
    setStep("preview");
  }, [ruanganList]);

  // ── Handler file Excel / CSV ───────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const isCsv   = /\.(csv|txt)$/i.test(file.name);
    const isTsv   = /\.tsv$/i.test(file.name);

    if (isExcel) {
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellDates: false });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        // Ambil sebagai array of arrays dengan raw value (supaya tanggal serial tidak dikonversi)
        const matrix: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
          raw: true,
        });
        const headerRow = (matrix[0] || []).map((h) => String(h ?? "").trim());
        const { recognized, unrecognized } = buildHeaderMap(headerRow);
        parseMatrix(matrix, file.name, { recognized, unrecognized });
      } catch {
        alert("Gagal membaca file Excel. Pastikan format .xlsx atau .xls dan file tidak rusak.");
      }
    } else if (isCsv || isTsv) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const matrix = isTsv ? parseTsv(text) : parseCsv(text);
        const headerRow = matrix[0] || [];
        const { recognized, unrecognized } = buildHeaderMap(headerRow);
        parseMatrix(matrix, file.name, { recognized, unrecognized });
      };
      reader.readAsText(file, "UTF-8");
    } else {
      alert("Format tidak didukung. Gunakan file .xlsx, .xls, atau .csv");
    }
  }, [parseMatrix]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ── Handler paste Excel ────────────────────────────────────────────────────

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const matrix = parseTsv(pasteText);
    const headerRow = matrix[0] || [];
    const { recognized, unrecognized } = buildHeaderMap(headerRow);
    parseMatrix(matrix, "clipboard", { recognized, unrecognized });
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    const toImport = rows.filter((r) => skipErrors ? r.status !== "error" : true)
      .filter((r) => r.status !== "error" || skipErrors);
    const finalImport = skipErrors
      ? rows.filter((r) => r.status !== "error")
      : rows.filter((r) => r.status === "valid" || r.status === "warning");

    setImporting(true); setImportProgress(0);
    try {
      const batchSize = 20;
      for (let i = 0; i < finalImport.length; i += batchSize) {
        const chunk = finalImport.slice(i, i + batchSize).map((r) => r.data);
        await onBulkCreate(chunk);
        setImportProgress(Math.min(100, Math.round(((i + batchSize) / finalImport.length) * 100)));
      }
      setImportedCount(finalImport.length);
      setStep("done");
      onImported(finalImport.length);
    } catch {
      alert("Terjadi kesalahan saat mengimpor. Silakan coba lagi.");
    } finally {
      setImporting(false);
    }
  };

  const validCount  = rows.filter((r) => r.status === "valid").length;
  const warnCount   = rows.filter((r) => r.status === "warning").length;
  const errorCount  = rows.filter((r) => r.status === "error").length;
  const importable  = skipErrors ? validCount + warnCount : validCount + warnCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: "var(--hospital-blue)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Import Data Pegawai</p>
              <p className="text-white/70 text-xs mt-0.5">Upload Excel (.xlsx) atau CSV — header otomatis terdeteksi</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0">
            {(["input", "preview"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? "text-white" : step === "preview" && i === 0 ? "text-white" : "text-muted-foreground bg-muted"
                }`} style={step === s || (step === "preview" && i === 0) ? { background: "var(--hospital-blue)" } : {}}>
                  {step === "preview" && i === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                  {i === 0 ? "Pilih File" : "Preview & Validasi"}
                </span>
                {i < 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP: INPUT */}
          {step === "input" && (
            <div className="p-6 space-y-5">

              {/* Tabs */}
              <div className="flex border border-border rounded-xl overflow-hidden w-fit">
                {(["upload", "paste"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      tab === t ? "text-white" : "text-muted-foreground hover:text-foreground bg-background"
                    }`}
                    style={tab === t ? { background: "var(--hospital-blue)" } : {}}>
                    {t === "upload" ? <Upload className="w-4 h-4" /> : <ClipboardPaste className="w-4 h-4" />}
                    {t === "upload" ? "Upload File" : "Tempel dari Excel"}
                  </button>
                ))}
              </div>

              {/* Upload Tab */}
              {tab === "upload" && (
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "var(--hospital-light)" }}>
                    <FileSpreadsheet className="w-8 h-8" style={{ color: "var(--hospital-blue)" }} />
                  </div>
                  <p className="font-semibold text-foreground text-sm">Seret file ke sini atau klik untuk memilih</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Format didukung: <span className="font-medium text-foreground">.xlsx</span> (Excel),
                    <span className="font-medium text-foreground"> .xls</span>,
                    <span className="font-medium text-foreground"> .csv</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Header kolom dideteksi otomatis — urutan bebas, kolom tidak dikenal dilewati
                  </p>
                </div>
              )}

              {/* Paste Tab */}
              {tab === "paste" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                      Buka file Excel Anda, pilih semua data termasuk baris header, tekan{" "}
                      <kbd className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono">Ctrl+C</kbd>,
                      lalu tempel di bawah dengan{" "}
                      <kbd className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono">Ctrl+V</kbd>.
                    </p>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Tempel data dari Excel di sini..."
                    className="w-full h-52 px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleParsePaste}
                    disabled={!pasteText.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity"
                    style={{ background: "var(--hospital-blue)" }}
                  >
                    <ChevronRight className="w-4 h-4" />
                    Proses Data
                  </button>
                </div>
              )}

              {/* Template & Panduan */}
              <div className="border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" style={{ color: "var(--hospital-blue)" }} />
                    <p className="font-semibold text-sm text-foreground">Unduh Template</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadTemplateExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
                      style={{ background: "var(--hospital-blue)" }}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Template Excel (.xlsx)
                    </button>
                    <button
                      onClick={downloadTemplateCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/50 transition-colors text-foreground"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Template CSV
                    </button>
                  </div>
                </div>

                {/* Daftar kolom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COLUMNS.map((col) => (
                    <div key={col.key} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${col.required ? "bg-red-400" : "bg-muted-foreground/40"}`} />
                      <span className="font-medium text-foreground">{col.header}</span>
                      {col.required
                        ? <span className="text-red-400 text-[10px]">wajib</span>
                        : <span className="text-muted-foreground text-[10px]">opsional</span>
                      }
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p><span className="font-medium text-foreground">Jenis Kepegawaian:</span> Honorer / P3K Paruh Waktu / P3K Penuh Waktu / PNS</p>
                  <p><span className="font-medium text-foreground">Unit Kerja:</span> Manajemen / Pelayanan</p>
                  <p><span className="font-medium text-foreground">Tanggal:</span> DD/MM/YYYY, YYYY-MM-DD, atau serial Excel otomatis dikonversi</p>
                  <p><span className="font-medium text-foreground">Kolom tidak dikenal:</span> otomatis dilewati, tidak menyebabkan error</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === "preview" && (
            <div className="flex flex-col h-full">

              {/* Info header yang dideteksi */}
              {(headerInfo.recognized.length > 0 || headerInfo.unrecognized.length > 0) && (
                <div className="px-6 pt-4 pb-2 space-y-1.5 flex-shrink-0">
                  {headerInfo.recognized.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-muted-foreground font-medium">Kolom terdeteksi:</span>
                      {headerInfo.recognized.map((h) => (
                        <span key={h} className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">{h}</span>
                      ))}
                    </div>
                  )}
                  {headerInfo.unrecognized.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-muted-foreground font-medium">Kolom dilewati (tidak dikenal):</span>
                      {headerInfo.unrecognized.map((h) => (
                        <span key={h} className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">{h}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-y border-border bg-muted/20 flex-shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{rows.length} baris</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-emerald-600">{validCount} valid</span>
                </div>
                {warnCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-amber-600">{warnCount} peringatan</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-red-600">{errorCount} error</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <label className="ml-auto flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input type="checkbox" checked={skipErrors}
                      onChange={(e) => setSkipErrors(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-primary" />
                    <span className="text-muted-foreground">Lewati baris error ({errorCount})</span>
                  </label>
                )}
              </div>

              {/* Tabel preview */}
              <div className="overflow-auto flex-1 px-6 py-4">
                <table className="w-full text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["#", "Status", "Nama", "NIP", "Jenis", "Unit", "Sub Unit", "Jabatan", "Tgl Masuk", "Keterangan"].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowNum} className={`border-b border-border/50 transition-colors ${
                        row.status === "error"   ? "bg-red-50 dark:bg-red-950/20" :
                        row.status === "warning" ? "bg-amber-50 dark:bg-amber-950/20" :
                        "hover:bg-muted/20"
                      }`}>
                        <td className="py-2 px-2 text-muted-foreground">{row.rowNum}</td>
                        <td className="py-2 px-2">
                          {row.status === "valid"   && <CheckCircle2  className="w-3.5 h-3.5 text-emerald-500" />}
                          {row.status === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          {row.status === "error"   && <AlertCircle   className="w-3.5 h-3.5 text-red-500" />}
                        </td>
                        <td className="py-2 px-2 font-medium text-foreground max-w-[130px] truncate">
                          {row.data.nama || <span className="text-red-400 italic">kosong</span>}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground font-mono text-[10px]">{row.data.nip || "-"}</td>
                        <td className="py-2 px-2 text-foreground whitespace-nowrap">{row.data.jenisPegawai}</td>
                        <td className="py-2 px-2 text-foreground whitespace-nowrap">{row.data.unitKerja}</td>
                        <td className="py-2 px-2 text-muted-foreground">{row.data.subUnit || "-"}</td>
                        <td className="py-2 px-2 text-muted-foreground max-w-[120px] truncate">{row.data.jabatan || "-"}</td>
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                          {row.data.tanggalMasuk
                            ? new Date(row.data.tanggalMasuk).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                            : "-"}
                        </td>
                        <td className="py-2 px-2 max-w-[200px]">
                          {row.errors.map((e, i) => (
                            <p key={i} className="text-red-600 dark:text-red-400 flex items-start gap-1">
                              <span className="flex-shrink-0">•</span>{e}
                            </p>
                          ))}
                          {row.warnings.map((w, i) => (
                            <p key={i} className="text-amber-600 dark:text-amber-400 flex items-start gap-1">
                              <span className="flex-shrink-0">•</span>{w}
                            </p>
                          ))}
                          {row.status === "valid" && <span className="text-emerald-600">Siap diimpor</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center p-12 gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.92 0.05 150)" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "oklch(0.52 0.15 150)" }} />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">Import Berhasil</p>
                <p className="text-muted-foreground text-sm mt-1">
                  <span className="font-semibold text-foreground">{importedCount} pegawai</span> berhasil ditambahkan ke sistem.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setStep("input"); setRows([]); setFileName(""); setPasteText(""); setHeaderInfo({ recognized: [], unrecognized: [] }); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted/50 transition-colors text-foreground"
                >
                  <RotateCcw className="w-4 h-4" />
                  Import Lagi
                </button>
                <button onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{ background: "var(--hospital-blue)" }}>
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === "preview" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 flex-shrink-0 gap-3">
            <button
              onClick={() => { setStep("input"); setRows([]); setHeaderInfo({ recognized: [], unrecognized: [] }); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted/50 transition-colors text-foreground"
            >
              <RotateCcw className="w-4 h-4" />
              Kembali
            </button>
            <div className="flex items-center gap-3">
              {importing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengimpor... {importProgress}%
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={importing || importable === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "var(--hospital-blue)" }}
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {importing ? "Mengimpor..." : `Impor ${importable} Pegawai`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
