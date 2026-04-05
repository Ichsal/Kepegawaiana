"use client";

import { useState } from "react";
import {
  Eye, Pencil, Trash2, FileText, ChevronLeft, ChevronRight,
  UserPlus, Download, CheckSquare, Calendar,
} from "lucide-react";
import { Pegawai, FilterState, DOKUMEN_FIELDS } from "@/lib/types";

interface Props {
  data: Pegawai[];
  filters: FilterState;
  onAdd: () => void;
  onView: (p: Pegawai) => void;
  onEdit: (p: Pegawai) => void;
  onDelete: (p: Pegawai) => void;
}

const JENIS_COLOR: Record<string, string> = {
  PNS: "bg-blue-100 text-blue-700",
  "P3K Penuh Waktu": "bg-teal-100 text-teal-700",
  "P3K Paruh Waktu": "bg-green-100 text-green-700",
  Honorer: "bg-amber-100 text-amber-700",
};

const PAGE_SIZE = 10;

function formatTanggalShort(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TabelPegawai({ data, filters, onAdd, onView, onEdit, onDelete }: Props) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Apply filters
  const filtered = data.filter((p) => {
    const q = filters.search.toLowerCase();
    if (q && !p.nama.toLowerCase().includes(q) && !p.nip.toLowerCase().includes(q)) return false;
    if (filters.unitKerja && p.unitKerja !== filters.unitKerja) return false;
    if (filters.subUnit && p.subUnit !== filters.subUnit) return false;
    if (filters.ruangan && p.ruangan !== filters.ruangan) return false;
    if (filters.jenisPegawai && p.jenisPegawai !== filters.jenisPegawai) return false;

    // Filter tanggal masuk
    if (filters.tanggalDari && p.tanggalMasuk) {
      if (p.tanggalMasuk < filters.tanggalDari) return false;
    }
    if (filters.tanggalSampai && p.tanggalMasuk) {
      if (p.tanggalMasuk > filters.tanggalSampai) return false;
    }
    // Jika filter tanggal aktif tapi data tidak punya tanggalMasuk, exclude
    if ((filters.tanggalDari || filters.tanggalSampai) && !p.tanggalMasuk) return false;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginated.length && paginated.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((p) => p.id)));
    }
  };

  const handleDownloadBatch = () => {
    const rows = filtered.filter((p) => selected.size === 0 || selected.has(p.id));
    const headers = [
      "Nama", "NIP", "Jenis Pegawai", "Unit Kerja", "Sub Unit", "Ruangan",
      "Jabatan", "Tanggal Masuk", "STR", "SIP", "Ijazah", "SK", "Sertifikat",
      "Jumlah Dokumen Tambahan",
    ];
    const csvRows = rows.map((p) =>
      [
        p.nama, p.nip, p.jenisPegawai, p.unitKerja, p.subUnit, p.ruangan,
        p.jabatan, p.tanggalMasuk || "",
        p.linkSTR, p.linkSIP, p.linkIjazah, p.linkSK, p.linkSertifikat,
        String((p.dokumenTambahan || []).length),
      ]
        .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data_pegawai_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDokumenBadge = (p: Pegawai) => {
    const standar = DOKUMEN_FIELDS.filter((d) => p[d.key as keyof Pegawai]).length;
    const extra = (p.dokumenTambahan || []).filter((d) => d.url).length;
    const total = standar + extra;
    const maxStandar = DOKUMEN_FIELDS.length;
    if (total === 0) return <span className="text-xs text-muted-foreground">-</span>;
    if (standar === maxStandar)
      return (
        <span className="text-xs font-medium text-green-600">
          {standar}/{maxStandar}{extra > 0 ? ` +${extra}` : " Lengkap"}
        </span>
      );
    return (
      <span className="text-xs font-medium text-amber-600">
        {standar}/{maxStandar}{extra > 0 ? ` +${extra}` : ""}
      </span>
    );
  };

  const activeFiltersCount = [
    filters.search, filters.unitKerja, filters.subUnit,
    filters.ruangan, filters.jenisPegawai, filters.tanggalDari, filters.tanggalSampai,
  ].filter(Boolean).length;

  return (
    <div id="data-pegawai" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-bold text-foreground">Data Pegawai</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} pegawai
            {activeFiltersCount > 0 && (
              <span className="ml-1 text-primary font-medium">(difilter)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs font-medium" style={{ color: "var(--hospital-teal)" }}>
              {selected.size} dipilih
            </span>
          )}
          <button
            onClick={handleDownloadBatch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {selected.size > 0 ? `Unduh (${selected.size})` : "Unduh Semua"}
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-colors"
            style={{ background: "var(--hospital-blue)" }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Tambah
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="px-4 py-3 text-left w-10">
                <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground transition-colors">
                  <CheckSquare className="w-4 h-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Nama / NIP
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                Jabatan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                Unit / Ruangan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Tgl Masuk
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                Dokumen
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Tidak ada data pegawai ditemukan</p>
                    {activeFiltersCount > 0 ? (
                      <p className="text-xs">Coba ubah atau hapus filter yang aktif</p>
                    ) : (
                      <button onClick={onAdd} className="text-xs text-primary hover:underline">
                        Tambah pegawai pertama
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-muted/30 transition-colors ${selected.has(p.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded border-border accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onView(p)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      <p className="font-medium text-foreground leading-tight">{p.nama}</p>
                      <p className="text-xs text-muted-foreground">{p.nip || "Tanpa NIP"}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-foreground">{p.jabatan || "-"}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-sm text-foreground">{p.unitKerja}</p>
                    <p className="text-xs text-muted-foreground">{p.subUnit || "-"}</p>
                    {p.ruangan && (
                      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--hospital-teal)" }}>
                        {p.ruangan}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <p className="text-xs text-foreground">{formatTanggalShort(p.tanggalMasuk)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JENIS_COLOR[p.jenisPegawai] || "bg-gray-100 text-gray-700"}`}>
                      {p.jenisPegawai}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {getDokumenBadge(p)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onView(p)}
                        title="Lihat Detail"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        title="Edit"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        title="Hapus"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Hal {safeCurrentPage} dari {totalPages} ({filtered.length} data)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                const start = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));
                pageNum = start + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    pageNum === safeCurrentPage
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  style={pageNum === safeCurrentPage ? { background: "var(--hospital-blue)" } : {}}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
