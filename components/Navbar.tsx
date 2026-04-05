"use client";

import { Hospital, Menu, X, CloudUpload, DoorOpen, FileSpreadsheet, Database, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

interface Props {
  onOpenUpload?: () => void;
  onOpenRuangan?: () => void;
  onOpenImport?: () => void;
  onOpenSetup?: () => void;
  isConnected?: boolean;
}

export default function Navbar({ onOpenUpload, onOpenRuangan, onOpenImport, onOpenSetup, isConnected }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full shadow-md" style={{ background: "var(--hospital-blue)" }}>
      <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
            <Hospital className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-sm leading-none">SIMRS Pegawai</p>
            <p className="text-white/70 text-xs">Sistem Manajemen Kepegawaian</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <a href="#dashboard" className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-md text-sm transition-colors">
            Dashboard
          </a>
          <a href="#data-pegawai" className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-md text-sm transition-colors">
            Data Pegawai
          </a>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button
            onClick={onOpenRuangan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white/90 hover:text-white hover:bg-white/10"
          >
            <DoorOpen className="w-4 h-4" />
            Ruangan
          </button>
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white/90 hover:text-white hover:bg-white/10"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white/90 hover:text-white hover:bg-white/10"
          >
            <CloudUpload className="w-4 h-4" />
            Upload
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          {/* Tombol koneksi Google Sheets */}
          <button
            onClick={onOpenSetup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-white border border-white/30 hover:border-white/60"
            style={{ background: isConnected ? "rgba(22,163,74,0.35)" : "rgba(239,68,68,0.25)" }}
            title={isConnected ? "Terhubung ke Google Sheets" : "Belum terhubung — klik untuk setup"}
          >
            {isConnected
              ? <Wifi className="w-4 h-4 text-green-300" />
              : <WifiOff className="w-4 h-4 text-red-300" />
            }
            <Database className="w-4 h-4" />
            {isConnected ? "Sheets" : "Setup Sheets"}
          </button>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white p-1 rounded"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-3 space-y-1" style={{ background: "var(--hospital-blue)" }}>
          <a href="#dashboard" className="block text-white/80 hover:text-white px-3 py-2 rounded-md text-sm" onClick={() => setMenuOpen(false)}>Dashboard</a>
          <a href="#data-pegawai" className="block text-white/80 hover:text-white px-3 py-2 rounded-md text-sm" onClick={() => setMenuOpen(false)}>Data Pegawai</a>
          <div className="border-t border-white/10 pt-1 mt-1 space-y-1">
            <button
              onClick={() => { setMenuOpen(false); onOpenSetup?.(); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {isConnected
                ? <Wifi className="w-4 h-4 text-green-300" />
                : <WifiOff className="w-4 h-4 text-red-300" />
              }
              <Database className="w-4 h-4" />
              {isConnected ? "Google Sheets (Terhubung)" : "Setup Google Sheets"}
            </button>
            <button
              onClick={() => { setMenuOpen(false); onOpenRuangan?.(); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              <DoorOpen className="w-4 h-4" />
              Kelola Ruangan
            </button>
            <button
              onClick={() => { setMenuOpen(false); onOpenImport?.(); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Data
            </button>
            <button
              onClick={() => { setMenuOpen(false); onOpenUpload?.(); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              <CloudUpload className="w-4 h-4" />
              Upload Dokumen
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
