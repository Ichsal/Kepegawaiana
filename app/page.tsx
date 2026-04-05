"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import Navbar from "@/components/Navbar";
import DashboardStats from "@/components/DashboardStats";
import FilterBar from "@/components/FilterBar";
import TabelPegawai from "@/components/TabelPegawai";
import PegawaiForm from "@/components/PegawaiForm";
import DetailPegawai from "@/components/DetailPegawai";
import ConfirmDialog from "@/components/ConfirmDialog";
import UploadDokumen from "@/components/UploadDokumen";
import KelolaRuangan from "@/components/KelolaRuangan";
import ImportPegawai from "@/components/ImportPegawai";
import SetupGoogleSheets from "@/components/SetupGoogleSheets";
import { Pegawai, FilterState } from "@/lib/types";
import { pegawaiService, ruanganService } from "@/lib/storage";

const LS_SHEETS_URL = "simrs_apps_script_url";

type Modal =
  | { type: "add" }
  | { type: "edit"; pegawai: Pegawai }
  | { type: "detail"; pegawai: Pegawai }
  | { type: "delete"; pegawai: Pegawai }
  | { type: "upload"; pegawai: Pegawai }
  | { type: "uploadPick" }
  | { type: "ruangan" }
  | { type: "import" }
  | { type: "setup" }
  | null;

const defaultFilters: FilterState = {
  search: "",
  unitKerja: "",
  subUnit: "",
  ruangan: "",
  jenisPegawai: "",
  tanggalDari: "",
  tanggalSampai: "",
};

export default function HomePage() {
  const [data, setData] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ruanganList, setRuanganList] = useState<string[]>([]);
  const [sheetsUrl, setSheetsUrl] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const d = await pegawaiService.getAll();
      setData(d);
    } catch {
      showToast("Gagal memuat data pegawai", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setRuanganList(ruanganService.getAll());
    // Baca URL Google Sheets yang tersimpan di localStorage
    const saved = localStorage.getItem(LS_SHEETS_URL) || "";
    setSheetsUrl(saved);
  }, [loadData]);

  // ── CRUD Pegawai ──────────────────────────────────────────────────────────
  const handleSave = async (formData: Omit<Pegawai, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (modal?.type === "edit") {
        await pegawaiService.update(modal.pegawai.id, formData);
        showToast("Data pegawai berhasil diperbarui");
      } else {
        await pegawaiService.create(formData);
        showToast("Pegawai baru berhasil ditambahkan");
      }
      setModal(null);
      loadData();
    } catch {
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleDelete = async () => {
    if (modal?.type !== "delete") return;
    setDeleting(true);
    try {
      await pegawaiService.delete(modal.pegawai.id);
      showToast("Data pegawai berhasil dihapus");
      setModal(null);
      loadData();
    } catch {
      showToast("Gagal menghapus data", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Upload Dokumen ────────────────────────────────────────────────────────
  const handleUploadSaved = async (updatedLinks: Partial<Pegawai>) => {
    if (modal?.type !== "upload") return;
    try {
      await pegawaiService.update(modal.pegawai.id, updatedLinks);
      showToast("Dokumen pegawai berhasil diperbarui");
      loadData();
    } catch {
      showToast("Gagal menyimpan dokumen", "error");
    }
  };

  // ── Kelola Ruangan ────────────────────────────────────────────────────────
  const handleRuanganChanged = (newList: string[]) => {
    setRuanganList(newList);
    // Reset filter ruangan jika ruangan yang dipilih sudah tidak ada
    if (filters.ruangan && !newList.includes(filters.ruangan)) {
      setFilters((prev) => ({ ...prev, ruangan: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onOpenUpload={() => setModal({ type: "uploadPick" })}
        onOpenRuangan={() => setModal({ type: "ruangan" })}
        onOpenImport={() => setModal({ type: "import" })}
        onOpenSetup={() => setModal({ type: "setup" })}
        isConnected={!!sheetsUrl}
      />

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">

        {/* Dashboard Stats */}
        {!loading && <DashboardStats data={data} />}

        {/* Filter & Search */}
        <FilterBar
          filters={filters}
          ruanganList={ruanganList}
          onChange={setFilters}
        />

        {/* Data Table */}
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Memuat data pegawai...</p>
          </div>
        ) : (
          <TabelPegawai
            data={data}
            filters={filters}
            onAdd={() => setModal({ type: "add" })}
            onView={(p) => setModal({ type: "detail", pegawai: p })}
            onEdit={(p) => setModal({ type: "edit", pegawai: p })}
            onDelete={(p) => setModal({ type: "delete", pegawai: p })}
          />
        )}

        {/* Info banner jika belum terhubung ke Sheets */}
        {!sheetsUrl && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl px-5 py-4 border"
            style={{ background: "oklch(0.97 0.03 240)", borderColor: "oklch(0.75 0.1 240)" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--hospital-blue)" }}>
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--hospital-blue)" }}>
                  Aplikasi berjalan dalam mode demo
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Data tersimpan di browser saja dan akan hilang jika cache dibersihkan. Hubungkan ke Google Sheets untuk data permanen yang bisa diakses banyak pengguna.
                </p>
              </div>
            </div>
            <button
              onClick={() => setModal({ type: "setup" })}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 whitespace-nowrap"
              style={{ background: "var(--hospital-blue)" }}
            >
              Setup Google Sheets
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            SIMRS Pegawai &mdash; Sistem Informasi Manajemen Kepegawaian Rumah Sakit
          </p>
        </footer>
      </main>

      {/* ── Modals ── */}

      {(modal?.type === "add" || modal?.type === "edit") && (
        <PegawaiForm
          pegawai={modal.type === "edit" ? modal.pegawai : null}
          ruanganList={ruanganList}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "detail" && (
        <DetailPegawai
          pegawai={modal.pegawai}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", pegawai: modal.pegawai })}
          onDelete={() => setModal({ type: "delete", pegawai: modal.pegawai })}
          onUpload={() => setModal({ type: "upload", pegawai: modal.pegawai })}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Hapus Data Pegawai"
          message={`Apakah Anda yakin ingin menghapus data "${modal.pegawai.nama}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          confirmLabel="Ya, Hapus"
          loading={deleting}
        />
      )}

      {modal?.type === "upload" && (
        <UploadDokumen
          pegawai={modal.pegawai}
          onClose={() => setModal(null)}
          onSaved={handleUploadSaved}
        />
      )}

      {/* Picker pegawai sebelum upload (dari navbar) */}
      {modal?.type === "uploadPick" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
              style={{ background: "var(--hospital-blue)" }}
            >
              <p className="text-white font-bold text-base">Pilih Pegawai</p>
              <button onClick={() => setModal(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-5 pt-4 pb-2 text-sm text-muted-foreground">
              Pilih pegawai yang ingin diupload dokumennya:
            </p>
            <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-1.5">
              {data.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setModal({ type: "upload", pegawai: p })}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 text-left transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ background: "var(--hospital-blue)" }}
                  >
                    {p.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{p.nama}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.jabatan} &bull; {p.subUnit || p.unitKerja}
                    </p>
                  </div>
                </button>
              ))}
              {data.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada data pegawai. Tambahkan pegawai terlebih dahulu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kelola Ruangan */}
      {modal?.type === "ruangan" && (
        <KelolaRuangan
          ruanganList={ruanganList}
          onClose={() => setModal(null)}
          onChanged={handleRuanganChanged}
        />
      )}

      {/* Setup Google Sheets */}
      {modal?.type === "setup" && (
        <SetupGoogleSheets
          currentUrl={sheetsUrl}
          onClose={() => setModal(null)}
          onUrlSaved={(url) => {
            setSheetsUrl(url);
            showToast("URL Google Sheets berhasil disimpan. Reload halaman untuk mengaktifkan koneksi.");
          }}
        />
      )}

      {/* Import Data Pegawai */}
      {modal?.type === "import" && (
        <ImportPegawai
          ruanganList={ruanganList}
          onClose={() => setModal(null)}
          onImported={(count) => {
            showToast(`${count} pegawai berhasil diimpor`);
            loadData();
          }}
          onBulkCreate={async (rows) => {
            await pegawaiService.bulkCreate(rows);
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200"
          style={{
            background:
              toast.type === "success"
                ? "oklch(0.52 0.15 150)"
                : "oklch(0.577 0.245 27.325)",
          }}
        >
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </div>
  );
}
