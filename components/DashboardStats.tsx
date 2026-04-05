"use client";

import { Users, Building2, Stethoscope, FileText } from "lucide-react";
import { Pegawai } from "@/lib/types";

interface Props {
  data: Pegawai[];
}

export default function DashboardStats({ data }: Props) {
  const totalPegawai = data.length;
  const totalManajemen = data.filter((p) => p.unitKerja === "Manajemen").length;
  const totalPelayanan = data.filter((p) => p.unitKerja === "Pelayanan").length;
  const totalDokumenLengkap = data.filter((p) =>
    p.linkSTR || p.linkSIP || p.linkIjazah || p.linkSK || p.linkSertifikat
  ).length;

  const stats = [
    {
      label: "Total Pegawai",
      value: totalPegawai,
      icon: Users,
      color: "var(--hospital-blue)",
      bg: "oklch(0.94 0.04 240)",
    },
    {
      label: "Unit Manajemen",
      value: totalManajemen,
      icon: Building2,
      color: "oklch(0.5 0.15 195)",
      bg: "oklch(0.94 0.04 195)",
    },
    {
      label: "Unit Pelayanan",
      value: totalPelayanan,
      icon: Stethoscope,
      color: "oklch(0.52 0.15 150)",
      bg: "oklch(0.94 0.04 150)",
    },
    {
      label: "Punya Dokumen",
      value: totalDokumenLengkap,
      icon: FileText,
      color: "oklch(0.6 0.16 80)",
      bg: "oklch(0.96 0.04 80)",
    },
  ];

  // Per jenis kepegawaian
  const jenisCounts: Record<string, number> = {};
  data.forEach((p) => {
    jenisCounts[p.jenisPegawai] = (jenisCounts[p.jenisPegawai] || 0) + 1;
  });

  return (
    <section id="dashboard" className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
          {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-muted-foreground leading-snug">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown Jenis Kepegawaian */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Rekap Jenis Kepegawaian</h3>
        <div className="flex flex-wrap gap-3">
          {["PNS", "P3K Penuh Waktu", "P3K Paruh Waktu", "Honorer"].map((jenis) => {
            const count = jenisCounts[jenis] || 0;
            const pct = totalPegawai > 0 ? Math.round((count / totalPegawai) * 100) : 0;
            const colors: Record<string, string> = {
              PNS: "var(--hospital-blue)",
              "P3K Penuh Waktu": "oklch(0.5 0.15 195)",
              "P3K Paruh Waktu": "oklch(0.52 0.15 150)",
              Honorer: "oklch(0.6 0.16 80)",
            };
            return (
              <div key={jenis} className="flex-1 min-w-32">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{jenis}</span>
                  <span className="text-xs font-semibold" style={{ color: colors[jenis] }}>{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: colors[jenis] }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
