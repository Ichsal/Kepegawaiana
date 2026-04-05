"use client";

import { useState, useRef, useCallback } from "react";
import {
  X, Upload, FileText, CheckCircle2, AlertCircle,
  Loader2, FolderOpen, Link2, Trash2, ExternalLink,
  CloudUpload, Plus,
} from "lucide-react";
import { Pegawai, DokumenTambahan } from "@/lib/types";

// Baca URL Apps Script dari localStorage (diisi lewat menu "Setup Google Sheets")
function getAppsScriptUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("simrs_apps_script_url") || "";
}

interface UploadSlot {
  key: string;       // e.g. "linkSTR" or "extra_<id>"
  label: string;
  desc: string;
  url: string;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  fileName?: string;
  isExtra?: boolean; // true = dokumen tambahan bebas
  extraId?: string;  // id for DokumenTambahan
}

interface Props {
  pegawai: Pegawai;
  onClose: () => void;
  onSaved: (updatedLinks: Partial<Pegawai>) => void;
}

const STANDAR_DOKUMEN = [
  { key: "linkSTR", label: "STR", desc: "Surat Tanda Registrasi" },
  { key: "linkSIP", label: "SIP", desc: "Surat Izin Praktik" },
  { key: "linkIjazah", label: "Ijazah", desc: "Ijazah Pendidikan" },
  { key: "linkSK", label: "SK", desc: "Surat Keputusan" },
  { key: "linkSertifikat", label: "Sertifikat", desc: "Sertifikat Pelatihan / Kompetensi" },
];

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadToGoogleDrive(
  file: File,
  pegawaiNama: string,
  dokumenLabel: string
): Promise<string> {
  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) {
    throw new Error(
      "URL Apps Script belum dikonfigurasi. Buka menu 'Setup Google Sheets' untuk menghubungkan ke Google Drive."
    );
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const body = {
    action: "uploadFile",
    data: {
      fileName: `[${dokumenLabel}] ${pegawaiNama} - ${file.name}`,
      mimeType: file.type || "application/octet-stream",
      base64Content: base64,
      folderName: `SIMRS_Dokumen/${pegawaiNama}`,
    },
  };

  const res = await fetch(appsScriptUrl, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Gagal terhubung ke server Apps Script");
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Upload gagal di server");
  return json.fileUrl as string;
}

function buildInitialSlots(pegawai: Pegawai): UploadSlot[] {
  const standar: UploadSlot[] = STANDAR_DOKUMEN.map((d) => ({
    key: d.key,
    label: d.label,
    desc: d.desc,
    url: (pegawai[d.key as keyof Pegawai] as string) || "",
    status: "idle",
  }));

  const extra: UploadSlot[] = (pegawai.dokumenTambahan || []).map((d) => ({
    key: `extra_${d.id}`,
    label: d.label,
    desc: "Dokumen Tambahan",
    url: d.url || "",
    status: "idle",
    isExtra: true,
    extraId: d.id,
  }));

  return [...standar, ...extra];
}

export default function UploadDokumen({ pegawai, onClose, onSaved }: Props) {
  const [slots, setSlots] = useState<UploadSlot[]>(() => buildInitialSlots(pegawai));
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateSlot = (key: string, patch: Partial<UploadSlot>) => {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  // ── Upload file ──────────────────────────────────────────────────────────
  const handleFile = useCallback(
    async (key: string, file: File, label: string) => {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) {
        updateSlot(key, { status: "error", error: `Ukuran file maks 20 MB (saat ini ${formatFileSize(file.size)})` });
        return;
      }
      updateSlot(key, { status: "uploading", fileName: file.name, error: undefined });
      try {
        const url = await uploadToGoogleDrive(file, pegawai.nama, label);
        updateSlot(key, { status: "success", url, fileName: file.name });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload gagal";
        updateSlot(key, { status: "error", error: msg });
      }
    },
    [pegawai.nama]
  );

  const handleDrop = (key: string, label: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(key, file, label);
  };

  // ── Tambah dokumen bebas baru ────────────────────────────────────────────
  const handleAddNewDoc = () => {
    const trimmed = newDocLabel.trim();
    if (!trimmed) return;
    const newId = crypto.randomUUID();
    const newSlot: UploadSlot = {
      key: `extra_${newId}`,
      label: trimmed,
      desc: "Dokumen Tambahan",
      url: "",
      status: "idle",
      isExtra: true,
      extraId: newId,
    };
    setSlots((prev) => [...prev, newSlot]);
    setNewDocLabel("");
    setAddingNew(false);
  };

  const handleRemoveSlot = (key: string) => {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  };

  // ── Simpan ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const updatedLinks: Partial<Pegawai> = {};

    // Dokumen standar
    slots.filter((s) => !s.isExtra).forEach((s) => {
      (updatedLinks as Record<string, string>)[s.key] = s.url;
    });

    // Dokumen tambahan
    const dokumenTambahan: DokumenTambahan[] = slots
      .filter((s) => s.isExtra)
      .map((s) => ({
        id: s.extraId || crypto.randomUUID(),
        label: s.label,
        url: s.url,
      }));
    updatedLinks.dokumenTambahan = dokumenTambahan;

    await onSaved(updatedLinks);
    setSaving(false);
    onClose();
  };

  const successCount = slots.filter((s) => s.url).length;
  const hasChanges = slots.some((s) => {
    if (s.isExtra) return true; // selalu anggap berubah kalau ada extra baru
    const original = (pegawai[s.key as keyof Pegawai] as string) || "";
    return s.url !== original;
  });

  const standarSlots = slots.filter((s) => !s.isExtra);
  const extraSlots = slots.filter((s) => s.isExtra);

  const renderSlot = (slot: UploadSlot) => {
    const isUploading = slot.status === "uploading";
    const isSuccess = slot.status === "success" || (slot.status === "idle" && !!slot.url);
    const isError = slot.status === "error";
    const isDragging = dragOver === slot.key;

    return (
      <div
        key={slot.key}
        className={`rounded-xl border transition-all ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : isError
            ? "border-destructive/50 bg-destructive/5"
            : isSuccess
            ? "border-green-300 bg-green-50"
            : "border-border bg-background"
        }`}
      >
        {/* Judul slot */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isSuccess ? "bg-green-100" : isError ? "bg-red-100" : "bg-muted"
            }`}>
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : isError ? (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{slot.label}</p>
              <p className="text-xs text-muted-foreground">{slot.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {slot.url && (
              <a
                href={slot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Lihat
              </a>
            )}
            {slot.url && (
              <button
                onClick={() => updateSlot(slot.key, { url: "", status: "idle", fileName: undefined, error: undefined })}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
            )}
            {slot.isExtra && (
              <button
                onClick={() => handleRemoveSlot(slot.key)}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Hapus dokumen ini"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Area upload drag-drop */}
        <div
          className={`mx-4 mb-2 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(slot.key); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop(slot.key, slot.label, e)}
          onClick={() => inputRefs.current[slot.key]?.click()}
        >
          <input
            ref={(el) => { inputRefs.current[slot.key] = el; }}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(slot.key, file, slot.label);
              e.target.value = "";
            }}
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 py-3 px-4">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">
                Mengupload <strong>{slot.fileName}</strong>...
              </span>
            </div>
          ) : slot.fileName && isSuccess ? (
            <div className="flex items-center gap-2 py-3 px-4">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs text-green-700 font-medium truncate">{slot.fileName}</span>
              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">Berhasil diupload</span>
            </div>
          ) : (
            <div className="flex flex-col items-center py-3 gap-1">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center px-2">
                <span className="font-medium text-primary">Klik upload</span> atau seret file ke sini
              </p>
              <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG, DOC, XLS, PPT, ZIP (maks 20 MB)</p>
            </div>
          )}
        </div>

        {/* Error */}
        {isError && (
          <div className="mx-4 mb-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {slot.error}
          </div>
        )}

        {/* Input manual link */}
        <div className="mx-4 mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="url"
              placeholder="Atau tempel link Google Drive langsung..."
              value={slot.url}
              onChange={(e) => updateSlot(slot.key, {
                url: e.target.value,
                status: e.target.value ? "success" : "idle",
                fileName: undefined,
              })}
              className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ background: "var(--hospital-blue)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Upload Dokumen ke Google Drive</h2>
              <p className="text-white/70 text-xs mt-0.5">{pegawai.nama}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Dokumen tersedia</span>
            <span className="text-xs font-semibold text-foreground">{successCount} / {slots.length}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: slots.length ? `${(successCount / slots.length) * 100}%` : "0%",
                background: "var(--hospital-teal)",
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Banner jika belum connect */}
          {!getAppsScriptUrl() && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Apps Script belum terhubung</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Upload otomatis ke Drive memerlukan koneksi Apps Script. Untuk saat ini, tempel link
                  Google Drive secara manual. Lihat Panduan Setup untuk konfigurasi.
                </p>
              </div>
            </div>
          )}

          {/* Dokumen Standar */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Dokumen Standar
            </h3>
            <div className="space-y-3">
              {standarSlots.map(renderSlot)}
            </div>
          </div>

          {/* Dokumen Tambahan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Dokumen Tambahan ({extraSlots.length})
              </h3>
              <button
                onClick={() => setAddingNew(true)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Dokumen Baru
              </button>
            </div>

            {/* Form tambah dokumen baru */}
            {addingNew && (
              <div className="flex items-center gap-2 mb-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Nama dokumen (contoh: Sertifikat PPGD 2024)"
                  value={newDocLabel}
                  onChange={(e) => setNewDocLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddNewDoc(); if (e.key === "Escape") setAddingNew(false); }}
                  autoFocus
                  className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <button
                  onClick={handleAddNewDoc}
                  disabled={!newDocLabel.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  style={{ background: "var(--hospital-blue)" }}
                >
                  Tambah
                </button>
                <button
                  onClick={() => { setAddingNew(false); setNewDocLabel(""); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {extraSlots.length === 0 && !addingNew ? (
              <button
                onClick={() => setAddingNew(true)}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Tambahkan dokumen bebas apa saja</p>
                <p className="text-[10px] text-muted-foreground/60">SK Tambahan, Sertifikat Kompetensi, Kontrak Kerja, dll</p>
              </button>
            ) : (
              <div className="space-y-3">
                {extraSlots.map(renderSlot)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="truncate">Drive: <strong>SIMRS_Dokumen/{pegawai.nama}</strong></span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--hospital-blue)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
