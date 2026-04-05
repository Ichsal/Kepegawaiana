"use client";

import { Search, Filter, X, Calendar } from "lucide-react";
import {
  FilterState,
  UNIT_KERJA_OPTIONS,
  SUB_UNIT_OPTIONS,
  JENIS_PEGAWAI_OPTIONS,
} from "@/lib/types";

interface Props {
  filters: FilterState;
  ruanganList: string[];
  onChange: (filters: FilterState) => void;
}

export default function FilterBar({ filters, ruanganList, onChange }: Props) {
  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value });

  const resetAll = () =>
    onChange({
      search: "",
      unitKerja: "",
      subUnit: "",
      ruangan: "",
      jenisPegawai: "",
      tanggalDari: "",
      tanggalSampai: "",
    });

  const hasFilter =
    filters.search ||
    filters.unitKerja ||
    filters.subUnit ||
    filters.ruangan ||
    filters.jenisPegawai ||
    filters.tanggalDari ||
    filters.tanggalSampai;

  const subUnitList =
    filters.unitKerja && (filters.unitKerja === "Manajemen" || filters.unitKerja === "Pelayanan")
      ? SUB_UNIT_OPTIONS[filters.unitKerja as "Manajemen" | "Pelayanan"]
      : [...SUB_UNIT_OPTIONS.Manajemen, ...SUB_UNIT_OPTIONS.Pelayanan];

  const selectClass =
    "w-full text-sm border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Pencarian &amp; Filter</span>
          {hasFilter && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Aktif
            </span>
          )}
        </div>
        {hasFilter && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset Semua
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari nama atau NIP pegawai..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {/* Dropdown filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">Unit Kerja</label>
          <select
            value={filters.unitKerja}
            onChange={(e) =>
              onChange({ ...filters, unitKerja: e.target.value, subUnit: "" })
            }
            className={selectClass}
          >
            <option value="">Semua Unit</option>
            {UNIT_KERJA_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">Sub Unit</label>
          <select
            value={filters.subUnit}
            onChange={(e) => set("subUnit", e.target.value)}
            className={selectClass}
          >
            <option value="">Semua Sub Unit</option>
            {subUnitList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">Ruangan</label>
          <select
            value={filters.ruangan}
            onChange={(e) => set("ruangan", e.target.value)}
            className={selectClass}
          >
            <option value="">Semua Ruangan</option>
            {ruanganList.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">Jenis Pegawai</label>
          <select
            value={filters.jenisPegawai}
            onChange={(e) => set("jenisPegawai", e.target.value)}
            className={selectClass}
          >
            <option value="">Semua Jenis</option>
            {JENIS_PEGAWAI_OPTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Tanggal Masuk */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Tgl Masuk:</span>
        </div>
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground flex-shrink-0">Dari</label>
            <input
              type="date"
              value={filters.tanggalDari}
              onChange={(e) => set("tanggalDari", e.target.value)}
              className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground flex-shrink-0">Sampai</label>
            <input
              type="date"
              value={filters.tanggalSampai}
              min={filters.tanggalDari || undefined}
              onChange={(e) => set("tanggalSampai", e.target.value)}
              className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          {(filters.tanggalDari || filters.tanggalSampai) && (
            <button
              onClick={() => onChange({ ...filters, tanggalDari: "", tanggalSampai: "" })}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors"
            >
              <X className="w-3 h-3" /> Hapus tanggal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
