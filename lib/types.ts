export type JenisPegawai = "Honorer" | "P3K Paruh Waktu" | "P3K Penuh Waktu" | "PNS";
export type UnitKerja = "Manajemen" | "Pelayanan";

export interface DokumenTambahan {
  id: string;
  label: string;
  url: string;
}

export interface Pegawai {
  id: string;
  nama: string;
  nip: string;
  jenisPegawai: JenisPegawai;
  unitKerja: UnitKerja;
  subUnit: string;
  ruangan: string;
  jabatan: string;
  tanggalMasuk: string; // ISO date string YYYY-MM-DD
  // Dokumen bawaan (5 standar)
  linkSTR: string;
  linkSIP: string;
  linkIjazah: string;
  linkSK: string;
  linkSertifikat: string;
  // Dokumen tambahan (bebas oleh admin)
  dokumenTambahan: DokumenTambahan[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  search: string;
  unitKerja: string;
  subUnit: string;
  ruangan: string;
  jenisPegawai: string;
  tanggalDari: string;
  tanggalSampai: string;
}

export const UNIT_KERJA_OPTIONS: UnitKerja[] = ["Manajemen", "Pelayanan"];

export const SUB_UNIT_OPTIONS: Record<UnitKerja, string[]> = {
  Manajemen: ["Kepegawaian", "Umum dan Perlengkapan", "Direktur", "Keuangan"],
  Pelayanan: ["Keperawatan", "Pelayanan Medis"],
};

export const DEFAULT_RUANGAN: string[] = [
  "IGD",
  "Rawat Jalan (Poli)",
  "Rawat Inap - Anggrek",
  "Rawat Inap - Mawar",
  "Rawat Inap - Amarilis",
  "Rawat Inap - Asoka / Sakura",
  "Rawat Inap - Lavender",
  "Rawat Inap - Teratai",
];

export const JENIS_PEGAWAI_OPTIONS: JenisPegawai[] = [
  "Honorer",
  "P3K Paruh Waktu",
  "P3K Penuh Waktu",
  "PNS",
];

export const DOKUMEN_FIELDS: { key: keyof Pegawai; label: string }[] = [
  { key: "linkSTR", label: "STR" },
  { key: "linkSIP", label: "SIP" },
  { key: "linkIjazah", label: "Ijazah" },
  { key: "linkSK", label: "SK" },
  { key: "linkSertifikat", label: "Sertifikat" },
];

// URL Google Apps Script disimpan di localStorage (key: "simrs_apps_script_url")
// Dikelola lewat menu "Setup Google Sheets" di aplikasi — tidak perlu edit kode
