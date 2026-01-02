# Cara Install (Ringkas)

Panduan ini untuk menjalankan **Keuangan UMKM** sebagai **Google Apps Script Web App** dengan database di **Google Spreadsheet**.

---

## 1) Siapkan Spreadsheet DB
1. Buat folder di Google Drive (bebas).
2. Buat **Google Spreadsheet** baru di folder tersebut (misal: `Keuangan UMKM - DB`).
3. Buka spreadsheet → **Extensions → Apps Script**.

---

## 2) Buat Sheet Database
Di spreadsheet DB, buat sheet dengan nama persis berikut:
- `USERS`
- `TRANSACTIONS`
- `TX_BENGKEL`
- `TX_CUCIAN`
- `ACTIVITY_LOG`
- `SETTINGS`

Isi header baris pertama (row 1) sesuai ini:

### USERS
`userId | email | name | passwordHash | isActive | createdAt | updatedAt | isDeleted`

### TRANSACTIONS, TX_BENGKEL, TX_CUCIAN
`TX_ID | DATE | UMKM | TYPE | PAYMENT_METHOD | AMOUNT | NOTE | CREATED_AT | UPDATED_AT | IS_DELETED`

### ACTIVITY_LOG
`TIME | ACTION | EMAIL | DETAIL`

### SETTINGS
`KEY | VALUE`

---

## 3) Copy File Kode ke Apps Script
Di Apps Script editor, buat/copy file-file project:
- Semua file `.gs`
- Semua file `.html`
- `appsscript.json`

> Pastikan nama file & isi kodenya sesuai project kamu.

---

## 4) Aktifkan Drive API (Wajib untuk Export PDF/XLSX)

### A. Advanced Google Services (Apps Script)
Apps Script → **Services (+)** → tambah:
- **Drive API**

### B. Google Cloud Console
Apps Script → **Project Settings** → lihat **Google Cloud Platform (GCP) project**
Lalu di Google Cloud Console:
- APIs & Services → Library → enable:
  - **Google Drive API**

---

## 5) Set Folder Export Laporan (Opsional tapi disarankan)
Kalau kamu ingin pakai folder khusus export, isi di sheet `SETTINGS`:

- KEY: `REPORT_FOLDER_ID`
- VALUE: `1QGB9-quFnMyijO576R56ar5pDr2waeRm`

Folder ini dari link:
`https://drive.google.com/drive/folders/1QGB9-quFnMyijO576R56ar5pDr2waeRm`

---

## 6) Jalankan Setup Awal (Jika Ada)
Di Apps Script editor, jalankan fungsi setup (contoh: `runSetup()`), lalu **Authorize** saat diminta.

> Jalankan hanya jika memang project kamu butuh setup.  
> Kalau `runSetup()` membuat template/clear sheet, jalankan di DB kosong.

---

## 7) Deploy Web App
1. Apps Script → **Deploy → New deployment**
2. Select type: **Web app**
3. Execute as: **User deploying**
4. Who has access: **Anyone**
5. Klik **Deploy**
6. Copy **Web app URL**

Jika update kode:
- Deploy → **Manage deployments** → Edit → **New version** → Deploy

---

## 8) Login
- Buka URL Web App
- Login pakai akun yang ada di sheet `USERS`

---
