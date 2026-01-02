# Keuangan UMKM (Google Apps Script Web App)

Aplikasi web sederhana untuk pencatatan pemasukan/pengeluaran UMKM (Bengkel & Cucian) berbasis Google Apps Script + Spreadsheet.

## Fitur
- Login (email + password) + session
- Dashboard ringkasan (pemasukan, pengeluaran, laba/rugi, saldo awal/akhir, jumlah transaksi)
- Input transaksi (Bengkel/Cucian)
- Riwayat transaksi (filter + paging + detail/edit/hapus soft delete)
- Activity Log (paging)
- Manage Akun (admin key: tambah/edit/hapus user)
- Export laporan PDF & Excel (XLSX) ke folder Google Drive

---

## Persiapan
Yang kamu butuhkan:
- Akun Google
- Google Drive
- 1 Spreadsheet kosong (sebagai DB)

> Disarankan: buat folder khusus di Drive dulu, lalu buat Spreadsheet DB di dalam folder itu.

---

## Struktur Sheet (WAJIB ADA)
Di spreadsheet DB, buat sheet berikut (nama harus sama persis):

1. `USERS`
2. `TRANSACTIONS`
3. `TX_BENGKEL`
4. `TX_CUCIAN`
5. `ACTIVITY_LOG`
6. `SETTINGS`

### Kolom USERS (baris 1 = header)
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| userId | email | name | passwordHash | isActive | createdAt | updatedAt | isDeleted |

### Kolom TRANSACTIONS / TX_BENGKEL / TX_CUCIAN (baris 1 = header)
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| TX_ID | DATE | UMKM | TYPE | PAYMENT_METHOD | AMOUNT | NOTE | CREATED_AT | UPDATED_AT | IS_DELETED |

### Kolom ACTIVITY_LOG (baris 1 = header)
| A | B | C | D |
|---|---|---|---|
| TIME | ACTION | EMAIL | DETAIL |

### Kolom SETTINGS (baris 1 = header)
| A | B |
|---|---|
| KEY | VALUE |

---

## Instalasi (Apps Script)

### 1) Buka Apps Script dari Spreadsheet DB
1. Buka spreadsheet DB
2. Menu: **Extensions → Apps Script**
3. Hapus semua file default (jika ada)

### 2) Masukkan file project
Copy semua file dari repo ini ke Apps Script:
- File `.gs`
- File `.html`
- `appsscript.json`

> Pastikan nama file sama seperti di repo (misal: `00_Config.gs`, `05_Transactions.gs`, `Index.html`, `Css.html`, `AppJs.html`, dll).

---

## Konfigurasi

### 1) Set `DB Spreadsheet ID`
Project ini membaca ID spreadsheet DB dari Script Properties.

Cari fungsi setup (biasanya `runSetup()` / `setup()` di file `03_Setup.gs`), lalu jalankan sekali untuk:
- menyimpan Spreadsheet ID ke Script Properties
- memastikan sheet dan header sudah ada

Kalau project kamu pakai Spreadsheet yang sama dengan script (container-bound), biasanya ID bisa otomatis terbaca.
Kalau project kamu standalone, overcome dengan set property `PROP_DB_ID`.

**Cara cek Script Properties:**
- Apps Script → **Project Settings (⚙️) → Script Properties**

Pastikan ada key yang sesuai config, misalnya:
- `DB_ID` / atau sesuai `CONFIG.PROP_DB_ID`

> Lihat file `00_Config.gs` untuk nama key yang dipakai.

---

## Enable Services (WAJIB untuk Export)
Export PDF/XLSX butuh akses Drive & UrlFetch.

### 1) Advanced Google Services (Apps Script)
Apps Script → **Services (+)** → Tambah:
- **Drive API** (versi v2 atau v3 sesuai kebutuhan project)

### 2) Google Cloud Console (WAJIB juga)
Apps Script → **Project Settings → Google Cloud Platform (GCP) project**
Klik link project → buka Cloud Console → **APIs & Services**
Aktifkan:
- **Google Drive API**

### 3) Pastikan `appsscript.json` benar
Contoh minimal (Drive API enabled):
```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "version": "v2",
        "serviceId": "drive"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}
