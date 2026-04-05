"use client";

import { useState, useEffect } from "react";
import { X, Save, User, Plus, Trash2, FileText, Link2 } from "lucide-react";
import {
  Pegawai,
  JenisPegawai,
  UnitKerja,
  DokumenTambahan,
  UNIT_KERJA_OPTIONS,
  SUB_UNIT_OPTIONS,
  JENIS_PEGAWAI_OPTIONS,
} from "@/lib/types";

interface Props {
  pegawai?: Pegawai | null;
  ruanganList: string[];
  onSave: (data: Omit<Pegawai, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}

const emptyForm = {
  nama: "",
  nip: "",
  jenisPegawai: "Honorer" as JenisPegawai,
  unitKerja: "Pelayanan" as UnitKerja,
  subUnit: "",
  ruangan: "",
  jabatan: "",
  tanggalMasuk: "",
  linkSTR: "",
  linkSIP: "",
  linkIjazah: "",
  linkSK: "",
  linkSertifikat: "",
  dokumenTambahan: [] as DokumenTambahan[],
};

export default function PegawaiForm({ pegawai, ruanganList, onSave, onClose }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"data" | "dokumen">("data");

  useEffect(() => {
    if (pegawai) {
      setForm({
        nama: pegawai.nama,
        nip: pegawai.nip,
        jenisPegawai: pegawai.jenisPegawai,
        unitKerja: pegawai.unitKerja,
        subUnit: pegawai.subUnit,
        ruangan: pegawai.ruangan,
        jabatan: pegawai.jabatan,
        tanggalMasuk: pegawai.tanggalMasuk || "",
        linkSTR: pegawai.linkSTR,
        linkSIP: pegawai.linkSIP,
        linkIjazah: pegawai.linkIjazah,
        linkSK: pegawai.linkSK,
        linkSertifikat: pegawai.linkSertifikat,
        dokumenTambahan: pegawai.dokumenTambahan || [],
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setActiveTab("data");
  }, [pegawai]);

  const set = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "unitKerja") next.subUnit = "";
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ── Dokumen Tambahan ──────────────────────────────────────────────────────
  const addDokumenTambahan = () => {
    setForm((prev) => ({
      ...prev,
      dokumenTambahan: [
        ...prev.dokumenTambahan,
        { id: crypto.randomUUID(), label: "", url: "" },
      ],
    }));
  };

  const updateDokumenTambahan = (id: string, field: "label" | "url", value: string) => {
    setForm((prev) => ({
      ...prev,
      dokumenTambahan: prev.dokumenTambahan.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      ),
    }));
  };

  const removeDokumenTambahan = (id: string) => {
    setForm((prev) => ({
      ...prev,
      dokumenTambahan: prev.dokumenTambahan.filter((d) => d.id !== id),
    }));
  };

  // ── Validasi & Submit ─────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nama.trim()) errs.nama = "Nama wajib diisi";
    if (!form.jabatan.trim()) errs.jabatan = "Jabatan wajib diisi";
    if (!form.unitKerja) errs.unitKerja = "Unit kerja wajib dipilih";
    // Validasi dokumen tambahan: jika ada baris, keduanya harus terisi
    form.dokumenTambahan.forEach((d, i) => {
      if (!d.label.trim()) errs[`dt_label_${i}`] = "Nama dokumen wajib diisi";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Jika error ada di dokumen, switch ke tab dokumen
      const hasDocError = Object.keys(errors).some((k) => k.startsWith("dt_"));
      if (hasDocError) setActiveTab("dokumen");
      return;
    }
    onSave(form);
  };

  const subUnitList = SUB_UNIT_OPTIONS[form.unitKerja] || [];

  const inputClass = (field: string) =>
    `w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
      errors[field] ? "border-destructive" : "border-border"
    }`;

  const tabClass = (tab: "data" | "dokumen") =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab === tab
        ? "text-primary border-b-2 border-primary bg-primary/5"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const dokumenStandar = [
    { key: "linkSTR", label: "STR", desc: "Surat Tanda Registrasi" },
    { key: "linkSIP", label: "SIP", desc: "Surat Izin Praktik" },
    { key: "linkIjazah", label: "Ijazah", desc: "Ijazah Pendidikan" },
    { key: "linkSK", label: "SK", desc: "Surat Keputusan" },
    { key: "linkSertifikat", label: "Sertifikat", desc: "Sertifikat Pelatihan/Kompetensi" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ background: "var(--hospital-blue)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-white font-bold text-base">
              {pegawai ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 flex-shrink-0 bg-card">
          <button className={tabClass("data")} onClick={() => setActiveTab("data")}>
            Data Pegawai
          </button>
          <button className={tabClass("dokumen")} onClick={() => setActiveTab("dokumen")}>
            Dokumen
            {form.dokumenTambahan.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                +{form.dokumenTambahan.length}
              </span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-6">

            {/* ── TAB: DATA PEGAWAI ── */}
            {activeTab === "data" && (
              <div className="space-y-5">
                {/* Data Dasar */}
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Data Dasar
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Nama Lengkap <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: dr. Budi Santoso, Sp.PD"
                        value={form.nama}
                        onChange={(e) => set("nama", e.target.value)}
                        className={inputClass("nama")}
                      />
                      {errors.nama && <p className="text-xs text-destructive mt-1">{errors.nama}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">NIP</label>
                      <input
                        type="text"
                        placeholder="Kosongkan jika tidak ada NIP"
                        value={form.nip}
                        onChange={(e) => set("nip", e.target.value)}
                        className={inputClass("nip")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Jabatan <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Perawat Pelaksana"
                        value={form.jabatan}
                        onChange={(e) => set("jabatan", e.target.value)}
                        className={inputClass("jabatan")}
                      />
                      {errors.jabatan && <p className="text-xs text-destructive mt-1">{errors.jabatan}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Tanggal Masuk / Bergabung
                      </label>
                      <input
                        type="date"
                        value={form.tanggalMasuk}
                        onChange={(e) => set("tanggalMasuk", e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className={inputClass("tanggalMasuk")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Jenis Kepegawaian
                      </label>
                      <select
                        value={form.jenisPegawai}
                        onChange={(e) => set("jenisPegawai", e.target.value)}
                        className={inputClass("jenisPegawai")}
                      >
                        {JENIS_PEGAWAI_OPTIONS.map((j) => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Unit Kerja <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={form.unitKerja}
                        onChange={(e) => set("unitKerja", e.target.value)}
                        className={inputClass("unitKerja")}
                      >
                        {UNIT_KERJA_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      {errors.unitKerja && <p className="text-xs text-destructive mt-1">{errors.unitKerja}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Sub Unit</label>
                      <select
                        value={form.subUnit}
                        onChange={(e) => set("subUnit", e.target.value)}
                        className={inputClass("subUnit")}
                      >
                        <option value="">Pilih sub unit...</option>
                        {subUnitList.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Ruangan</label>
                      <select
                        value={form.ruangan}
                        onChange={(e) => set("ruangan", e.target.value)}
                        className={inputClass("ruangan")}
                      >
                        <option value="">Tidak ada / tidak berlaku</option>
                        {ruanganList.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: DOKUMEN ── */}
            {activeTab === "dokumen" && (
              <div className="space-y-5">

                {/* Dokumen Standar */}
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Dokumen Standar
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tempel link Google Drive. Pastikan file sudah diset &quot;Anyone with link can view&quot;.
                  </p>
                  <div className="space-y-3">
                    {dokumenStandar.map((doc) => (
                      <div key={doc.key}>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {doc.label}
                          <span className="text-xs text-muted-foreground font-normal ml-1">— {doc.desc}</span>
                        </label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={form[doc.key as keyof typeof form] as string}
                            onChange={(e) => set(doc.key, e.target.value)}
                            className={`${inputClass(doc.key)} pl-8`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dokumen Tambahan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Dokumen Tambahan
                    </h3>
                    <button
                      type="button"
                      onClick={addDokumenTambahan}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Dokumen
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tambahkan dokumen apa saja sesuai kebutuhan (sertifikat pelatihan, SK tambahan, dll).
                  </p>

                  {form.dokumenTambahan.length === 0 ? (
                    <div
                      onClick={addDokumenTambahan}
                      className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    >
                      <FileText className="w-7 h-7 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        Klik untuk menambahkan dokumen bebas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.dokumenTambahan.map((d, i) => (
                        <div
                          key={d.id}
                          className="flex items-start gap-2 p-3 border border-border rounded-xl bg-muted/20"
                        >
                          <div className="flex-1 space-y-2">
                            <div>
                              <input
                                type="text"
                                placeholder="Nama dokumen (contoh: Sertifikat ACLS 2024)"
                                value={d.label}
                                onChange={(e) => updateDokumenTambahan(d.id, "label", e.target.value)}
                                className={`w-full text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                                  errors[`dt_label_${i}`] ? "border-destructive" : "border-border"
                                }`}
                              />
                              {errors[`dt_label_${i}`] && (
                                <p className="text-xs text-destructive mt-0.5">{errors[`dt_label_${i}`]}</p>
                              )}
                            </div>
                            <div className="relative">
                              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                type="url"
                                placeholder="https://drive.google.com/..."
                                value={d.url}
                                onChange={(e) => updateDokumenTambahan(d.id, "url", e.target.value)}
                                className="w-full text-sm border border-border rounded-lg pl-8 pr-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDokumenTambahan(d.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 mt-0.5"
                            title="Hapus dokumen ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addDokumenTambahan}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors w-full justify-center py-2 border border-dashed border-primary/30 rounded-lg hover:bg-primary/5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah dokumen lagi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <div>
              {activeTab === "data" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("dokumen")}
                  className="px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Lanjut ke Dokumen
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                style={{ background: "var(--hospital-blue)" }}
              >
                <Save className="w-4 h-4" />
                {pegawai ? "Simpan Perubahan" : "Tambah Pegawai"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
