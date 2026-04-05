import { Pegawai, DEFAULT_RUANGAN } from "./types";

const LS_SHEETS_URL_KEY = "simrs_apps_script_url";

// Baca URL dari localStorage secara dinamis agar tidak perlu hardcode
function getAppsScriptUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_SHEETS_URL_KEY) || "";
}

const STORAGE_KEY = "simrs_pegawai";
const RUANGAN_KEY = "simrs_ruangan";

// ─── Ruangan Service (localStorage) ────────────────────────────────────────

export const ruanganService = {
  getAll(): string[] {
    try {
      const raw = localStorage.getItem(RUANGAN_KEY);
      return raw ? JSON.parse(raw) : [...DEFAULT_RUANGAN];
    } catch {
      return [...DEFAULT_RUANGAN];
    }
  },

  save(list: string[]): void {
    localStorage.setItem(RUANGAN_KEY, JSON.stringify(list));
  },

  add(nama: string): string[] {
    const current = this.getAll();
    const trimmed = nama.trim();
    if (!trimmed || current.includes(trimmed)) return current;
    const updated = [...current, trimmed];
    this.save(updated);
    return updated;
  },

  update(oldName: string, newName: string): string[] {
    const current = this.getAll();
    const trimmed = newName.trim();
    if (!trimmed) return current;
    const updated = current.map((r) => (r === oldName ? trimmed : r));
    this.save(updated);
    // Juga update semua pegawai yang pakai ruangan lama
    const allPegawai = pegawaiService.getAllSync();
    allPegawai.forEach((p) => {
      if (p.ruangan === oldName) {
        pegawaiLocalUpdate(p.id, { ruangan: trimmed });
      }
    });
    return updated;
  },

  delete(nama: string): string[] {
    const current = this.getAll();
    const updated = current.filter((r) => r !== nama);
    this.save(updated);
    return updated;
  },

  resetToDefault(): string[] {
    this.save([...DEFAULT_RUANGAN]);
    return [...DEFAULT_RUANGAN];
  },
};

// ─── Local Storage (mode offline / demo) ───────────────────────────────────

function getAll(): Pegawai[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSampleData();
  } catch {
    return getSampleData();
  }
}

function saveAll(data: Pegawai[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function create(pegawai: Omit<Pegawai, "id" | "createdAt" | "updatedAt">): Pegawai {
  const now = new Date().toISOString();
  const newPegawai: Pegawai = {
    ...pegawai,
    dokumenTambahan: pegawai.dokumenTambahan || [],
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const all = getAll();
  all.push(newPegawai);
  saveAll(all);
  return newPegawai;
}

function update(id: string, updates: Partial<Pegawai>): Pegawai | null {
  const all = getAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

// Exposed for ruanganService to use synchronously
function pegawaiLocalUpdate(id: string, updates: Partial<Pegawai>): void {
  update(id, updates);
}

function remove(id: string): boolean {
  const all = getAll();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

// ─── Google Apps Script (mode online) ──────────────────────────────────────

async function fetchFromSheets(): Promise<Pegawai[]> {
  const url = getAppsScriptUrl();
  if (!url) return getAll();
  try {
    const res = await fetch(`${url}?action=getAll`);
    const json = await res.json();
    return json.data as Pegawai[];
  } catch {
    return getAll();
  }
}

async function createOnSheets(pegawai: Omit<Pegawai, "id" | "createdAt" | "updatedAt">): Promise<Pegawai> {
  const url = getAppsScriptUrl();
  if (!url) return create(pegawai);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "create", data: pegawai }),
    });
    const json = await res.json();
    return json.data as Pegawai;
  } catch {
    return create(pegawai);
  }
}

async function updateOnSheets(id: string, updates: Partial<Pegawai>): Promise<Pegawai | null> {
  const url = getAppsScriptUrl();
  if (!url) return update(id, updates);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "update", id, data: updates }),
    });
    const json = await res.json();
    return json.data as Pegawai;
  } catch {
    return update(id, updates);
  }
}

async function removeOnSheets(id: string): Promise<boolean> {
  const url = getAppsScriptUrl();
  if (!url) return remove(id);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "delete", id }),
    });
    const json = await res.json();
    return json.success as boolean;
  } catch {
    return remove(id);
  }
}

async function bulkCreateLocal(items: Omit<Pegawai, "id" | "createdAt" | "updatedAt">[]): Promise<void> {
  const now = new Date().toISOString();
  const all = getAll();
  const newItems: Pegawai[] = items.map((p) => ({
    ...p,
    dokumenTambahan: p.dokumenTambahan || [],
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }));
  saveAll([...all, ...newItems]);
}

async function bulkCreateOnSheets(items: Omit<Pegawai, "id" | "createdAt" | "updatedAt">[]): Promise<void> {
  const url = getAppsScriptUrl();
  if (!url) return bulkCreateLocal(items);
  try {
    await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "bulkCreate", data: items }),
    });
  } catch {
    return bulkCreateLocal(items);
  }
}

// Semua method selalu resolve URL saat dipanggil (dinamis dari localStorage)
export const pegawaiService = {
  getAllSync: getAll,
  getAll: () => (getAppsScriptUrl() ? fetchFromSheets() : Promise.resolve(getAll())),
  create: (p: Omit<Pegawai, "id" | "createdAt" | "updatedAt">) =>
    getAppsScriptUrl() ? createOnSheets(p) : Promise.resolve(create(p)),
  update: (id: string, u: Partial<Pegawai>) =>
    getAppsScriptUrl() ? updateOnSheets(id, u) : Promise.resolve(update(id, u)),
  delete: (id: string) =>
    getAppsScriptUrl() ? removeOnSheets(id) : Promise.resolve(remove(id)),
  bulkCreate: (items: Omit<Pegawai, "id" | "createdAt" | "updatedAt">[]) =>
    getAppsScriptUrl() ? bulkCreateOnSheets(items) : bulkCreateLocal(items),
};

// ─── Sample Data ────────────────────────────────────────────────────────────

function getSampleData(): Pegawai[] {
  const samples: Pegawai[] = [
    {
      id: "1",
      nama: "dr. Budi Santoso, Sp.PD",
      nip: "197501012005011001",
      jenisPegawai: "PNS",
      unitKerja: "Pelayanan",
      subUnit: "Pelayanan Medis",
      ruangan: "Rawat Inap - Mawar",
      jabatan: "Dokter Spesialis Penyakit Dalam",
      tanggalMasuk: "2005-01-01",
      linkSTR: "https://drive.google.com/file/d/example1/view",
      linkSIP: "https://drive.google.com/file/d/example2/view",
      linkIjazah: "https://drive.google.com/file/d/example3/view",
      linkSK: "https://drive.google.com/file/d/example4/view",
      linkSertifikat: "",
      dokumenTambahan: [
        { id: "dt1", label: "Sertifikat ACLS", url: "https://drive.google.com/file/d/example_acls/view" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      nama: "Ns. Sari Dewi, S.Kep",
      nip: "199003152015032002",
      jenisPegawai: "P3K Penuh Waktu",
      unitKerja: "Pelayanan",
      subUnit: "Keperawatan",
      ruangan: "IGD",
      jabatan: "Perawat Pelaksana",
      tanggalMasuk: "2015-03-15",
      linkSTR: "https://drive.google.com/file/d/example5/view",
      linkSIP: "https://drive.google.com/file/d/example6/view",
      linkIjazah: "https://drive.google.com/file/d/example7/view",
      linkSK: "",
      linkSertifikat: "https://drive.google.com/file/d/example8/view",
      dokumenTambahan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      nama: "Rini Astuti, SE",
      nip: "198507222010012003",
      jenisPegawai: "PNS",
      unitKerja: "Manajemen",
      subUnit: "Keuangan",
      ruangan: "",
      jabatan: "Bendahara Pengeluaran",
      tanggalMasuk: "2010-01-12",
      linkSTR: "",
      linkSIP: "",
      linkIjazah: "https://drive.google.com/file/d/example9/view",
      linkSK: "https://drive.google.com/file/d/example10/view",
      linkSertifikat: "https://drive.google.com/file/d/example11/view",
      dokumenTambahan: [
        { id: "dt2", label: "SK Bendahara 2023", url: "https://drive.google.com/file/d/example_sk2/view" },
        { id: "dt3", label: "Sertifikat Keuangan Negara", url: "https://drive.google.com/file/d/example_sertif/view" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "4",
      nama: "Ahmad Fauzi, S.Farm, Apt",
      nip: "",
      jenisPegawai: "Honorer",
      unitKerja: "Pelayanan",
      subUnit: "Pelayanan Medis",
      ruangan: "Rawat Jalan (Poli)",
      jabatan: "Apoteker",
      tanggalMasuk: "2021-06-01",
      linkSTR: "https://drive.google.com/file/d/example12/view",
      linkSIP: "https://drive.google.com/file/d/example13/view",
      linkIjazah: "https://drive.google.com/file/d/example14/view",
      linkSK: "",
      linkSertifikat: "",
      dokumenTambahan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "5",
      nama: "Hendra Kusuma, S.Kep",
      nip: "199210052020121001",
      jenisPegawai: "P3K Paruh Waktu",
      unitKerja: "Pelayanan",
      subUnit: "Keperawatan",
      ruangan: "Rawat Inap - Anggrek",
      jabatan: "Perawat Pelaksana",
      tanggalMasuk: "2020-12-01",
      linkSTR: "https://drive.google.com/file/d/example15/view",
      linkSIP: "",
      linkIjazah: "https://drive.google.com/file/d/example16/view",
      linkSK: "https://drive.google.com/file/d/example17/view",
      linkSertifikat: "",
      dokumenTambahan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "6",
      nama: "Dewi Puspitasari, S.Sos",
      nip: "198801172012022001",
      jenisPegawai: "PNS",
      unitKerja: "Manajemen",
      subUnit: "Kepegawaian",
      ruangan: "",
      jabatan: "Analis Kepegawaian",
      tanggalMasuk: "2012-02-17",
      linkSTR: "",
      linkSIP: "",
      linkIjazah: "https://drive.google.com/file/d/example18/view",
      linkSK: "https://drive.google.com/file/d/example19/view",
      linkSertifikat: "https://drive.google.com/file/d/example20/view",
      dokumenTambahan: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  saveAll(samples);
  return samples;
}
