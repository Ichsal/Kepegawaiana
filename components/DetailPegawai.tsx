"use client";

import {
  X, ExternalLink, FileText, AlertCircle, Pencil,
  Trash2, Download, CloudUpload, Calendar, Plus,
} from "lucide-react";
import { Pegawai, DOKUMEN_FIELDS } from "@/lib/types";

interface Props {
  pegawai: Pegawai;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpload: () => void;
}

const JENIS_COLOR: Record<string, string> = {
  PNS: "bg-blue-100 text-blue-700",
  "P3K Penuh Waktu": "bg-teal-100 text-teal-700",
  "P3K Paruh Waktu": "bg-green-100 text-green-700",
  Honorer: "bg-amber-100 text-amber-700",
};

function formatTanggal(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function hitungMasaKerja(iso: string): string {
  if (!iso) return "";
  const start = new Date(iso);
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} bulan`;
  if (m === 0) return `${y} tahun`;
  return `${y} tahun ${m} bulan`;
}

export default function DetailPegawai({ pegawai, onClose, onEdit, onDelete, onUpload }: Props) {
  const dokumenStandarAda = DOKUMEN_FIELDS.filter((d) => pegawai[d.key as keyof Pegawai]);
  const dokumenStandarKosong = DOKUMEN_FIELDS.filter((d) => !pegawai[d.key as keyof Pegawai]);
  const dokumenTambahan = pegawai.dokumenTambahan || [];
  const totalDokumen = dokumenStandarAda.length + dokumenTambahan.filter((d) => d.url).length;

  const handleDownloadCSV = () => {
    const extraLabels = dokumenTambahan.map((d) => d.label).join(" | ");
    const extraUrls = dokumenTambahan.map((d) => d.url).join(" | ");
    const headers = [
      "Nama", "NIP", "Jenis Pegawai", "Unit Kerja", "Sub Unit", "Ruangan",
      "Jabatan", "Tanggal Masuk", "STR", "SIP", "Ijazah", "SK", "Sertifikat",
      "Dokumen Tambahan (Label)", "Dokumen Tambahan (URL)",
    ];
    const row = [
      pegawai.nama, pegawai.nip, pegawai.jenisPegawai, pegawai.unitKerja,
      pegawai.subUnit, pegawai.ruangan, pegawai.jabatan,
      pegawai.tanggalMasuk || "",
      pegawai.linkSTR, pegawai.linkSIP, pegawai.linkIjazah,
      pegawai.linkSK, pegawai.linkSertifikat,
      extraLabels, extraUrls,
    ].map((v) => `"${(v || "").replace(/"/g, '""')}"`);

    const csv = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pegawai_${pegawai.nama.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 rounded-t-2xl"
          style={{ background: "var(--hospital-blue)" }}
        >
          <div>
            <h2 className="text-white font-bold text-base leading-tight">{pegawai.nama}</h2>
            <p className="text-white/70 text-xs mt-0.5">{pegawai.jabatan}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${JENIS_COLOR[pegawai.jenisPegawai] || "bg-gray-100 text-gray-700"}`}>
              {pegawai.jenisPegawai}
            </span>
            {pegawai.unitKerja && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-secondary text-secondary-foreground">
                {pegawai.unitKerja}
              </span>
            )}
            {pegawai.subUnit && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-accent/20 text-accent">
                {pegawai.subUnit}
              </span>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "NIP", value: pegawai.nip || "-" },
              { label: "Ruangan", value: pegawai.ruangan || "-" },
              { label: "Unit Kerja", value: pegawai.unitKerja || "-" },
              { label: "Sub Unit", value: pegawai.subUnit || "-" },
            ].map((item) => (
              <div key={item.label} className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
              </div>
            ))}

            {/* Tanggal Masuk - spans full width */}
            <div className="col-span-2 bg-muted rounded-lg p-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Tanggal Masuk / Bergabung</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {formatTanggal(pegawai.tanggalMasuk)}
                </p>
              </div>
              {pegawai.tanggalMasuk && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                  {hitungMasaKerja(pegawai.tanggalMasuk)}
                </span>
              )}
            </div>
          </div>

          {/* Dokumen Standar */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Dokumen Standar ({dokumenStandarAda.length}/{DOKUMEN_FIELDS.length})
            </h3>
            {dokumenStandarAda.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada dokumen standar.</p>
            ) : (
              <div className="space-y-1.5">
                {dokumenStandarAda.map((d) => (
                  <a
                    key={d.key}
                    href={pegawai[d.key as keyof Pegawai] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium text-foreground">{d.label}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            )}

            {/* Dokumen standar kosong */}
            {dokumenStandarKosong.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">Belum ada:</span>
                {dokumenStandarKosong.map((d) => (
                  <span key={d.key} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {d.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dokumen Tambahan */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              Dokumen Tambahan ({dokumenTambahan.filter((d) => d.url).length})
            </h3>
            {dokumenTambahan.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada dokumen tambahan.</p>
            ) : (
              <div className="space-y-1.5">
                {dokumenTambahan.map((d) =>
                  d.url ? (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                        <span className="text-sm font-medium text-foreground">{d.label || "Dokumen Tanpa Nama"}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </a>
                  ) : (
                    <div key={d.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border">
                      <FileText className="w-4 h-4 text-muted-foreground/40" />
                      <span className="text-sm text-muted-foreground">{d.label} — belum ada link</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Ringkasan dokumen */}
          <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total dokumen tersedia</p>
            <p className="text-sm font-bold text-foreground">{totalDokumen} dokumen</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV
            </button>
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
              style={{ background: "var(--hospital-teal)" }}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              Upload Dokumen
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
                style={{ background: "var(--hospital-blue)" }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
