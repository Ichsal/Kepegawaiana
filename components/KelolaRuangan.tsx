"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  DoorOpen,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { ruanganService } from "@/lib/storage";
import { DEFAULT_RUANGAN } from "@/lib/types";

interface Props {
  ruanganList: string[];
  onClose: () => void;
  onChanged: (newList: string[]) => void;
}

export default function KelolaRuangan({ ruanganList, onClose, onChanged }: Props) {
  const [list, setList] = useState<string[]>(ruanganList);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState("");
  const [editError, setEditError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  // ── Tambah ──────────────────────────────────────────────────────────────
  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNewError("Nama ruangan tidak boleh kosong");
      return;
    }
    if (list.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setNewError("Ruangan sudah ada");
      return;
    }
    const updated = ruanganService.add(trimmed);
    setList(updated);
    onChanged(updated);
    setNewName("");
    setNewError("");
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditVal(list[idx]);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditIdx(null);
    setEditVal("");
    setEditError("");
  };

  const handleEdit = () => {
    if (editIdx === null) return;
    const trimmed = editVal.trim();
    if (!trimmed) {
      setEditError("Nama tidak boleh kosong");
      return;
    }
    if (list.some((r, i) => i !== editIdx && r.toLowerCase() === trimmed.toLowerCase())) {
      setEditError("Nama ruangan sudah ada");
      return;
    }
    const oldName = list[editIdx];
    const updated = ruanganService.update(oldName, trimmed);
    setList(updated);
    onChanged(updated);
    cancelEdit();
  };

  // ── Hapus ─────────────────────────────────────────────────────────────────
  const handleDelete = (idx: number) => {
    const updated = ruanganService.delete(list[idx]);
    setList(updated);
    onChanged(updated);
    setConfirmDeleteIdx(null);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    const updated = ruanganService.resetToDefault();
    setList(updated);
    onChanged(updated);
    setConfirmReset(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl flex-shrink-0"
          style={{ background: "var(--hospital-blue)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <DoorOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Kelola Ruangan</h2>
              <p className="text-white/70 text-xs">{list.length} ruangan terdaftar</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tambah Ruangan Baru */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tambah Ruangan Baru
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: Rawat Inap - Melati"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNewError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className={`flex-1 text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                newError ? "border-destructive" : "border-border"
              }`}
            />
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors flex-shrink-0"
              style={{ background: "var(--hospital-blue)" }}
            >
              <Plus className="w-4 h-4" />
              Tambah
            </button>
          </div>
          {newError && (
            <p className="flex items-center gap-1 text-xs text-destructive mt-1.5">
              <AlertCircle className="w-3 h-3" /> {newError}
            </p>
          )}
        </div>

        {/* List Ruangan */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {list.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Belum ada ruangan. Tambahkan ruangan di atas.
            </div>
          )}
          {list.map((ruangan, idx) => (
            <div key={idx}>
              {/* Konfirmasi hapus */}
              {confirmDeleteIdx === idx ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/5">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-xs text-foreground flex-1">
                    Hapus ruangan <strong>&quot;{ruangan}&quot;</strong>?
                  </p>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-destructive rounded-lg hover:opacity-90"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => setConfirmDeleteIdx(null)}
                    className="px-2.5 py-1 text-xs font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80"
                  >
                    Batal
                  </button>
                </div>
              ) : editIdx === idx ? (
                /* Mode Edit */
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editVal}
                      autoFocus
                      onChange={(e) => { setEditVal(e.target.value); setEditError(""); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className={`flex-1 text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                        editError ? "border-destructive" : "border-border"
                      }`}
                    />
                    <button
                      onClick={handleEdit}
                      className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      title="Simpan"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                      title="Batal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {editError && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="w-3 h-3" /> {editError}
                    </p>
                  )}
                </div>
              ) : (
                /* Mode Normal */
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <DoorOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground font-medium">{ruangan}</span>
                    {DEFAULT_RUANGAN.includes(ruangan) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(idx)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteIdx(idx)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0">
          {/* Reset default */}
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke Default
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Reset semua ke default?</p>
              <button
                onClick={handleReset}
                className="text-xs px-2 py-1 rounded-md bg-destructive text-white hover:opacity-90"
              >
                Ya, Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="text-xs px-2 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80"
              >
                Batal
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
