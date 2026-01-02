# Keuangan UMKM (Google Apps Script Web App)

Aplikasi web berbasis **Google Apps Script + Google Spreadsheet** untuk mencatat **pemasukan & pengeluaran** UMKM (contoh: **Bengkel** dan **Cucian**) lengkap dengan **dashboard**, **riwayat transaksi**, **log aktivitas**, **manage akun**, serta **export laporan PDF & Excel (XLSX)**.

---

## Daftar Isi
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Arsitektur Singkat](#arsitektur-singkat)
- [Struktur Database Spreadsheet](#struktur-database-spreadsheet)
- [Instalasi dari Nol](#instalasi-dari-nol)
- [Konfigurasi](#konfigurasi)
- [Enable Drive API (WAJIB untuk Export)](#enable-drive-api-wajib-untuk-export)
- [Setup Awal](#setup-awal)
- [Deploy Web App](#deploy-web-app)
- [Cara Pakai](#cara-pakai)
- [Export Laporan (PDF/XLSX)](#export-laporan-pdfxlsx)
- [Admin / Manage Akun](#admin--manage-akun)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Catatan Keamanan](#catatan-keamanan)
- [Lisensi](#lisensi)

---

## Fitur
### 1) Login + Session
- Login pakai **email + password**
- Setelah login, sistem membuat **sessionId** dan disimpan di browser (**localStorage**)
- Saat halaman dibuka, sistem menjalankan **validasi session** (auto login jika session valid)
- Logout menghapus sessionId

### 2) Dashboard
Menampilkan ringkasan:
- Total pemasukan
- Total pengeluaran
- Laba dan rugi
- Saldo awal dan saldo akhir
- Jumlah transaksi

Filter:
- Tanggal (start–end)
- UMKM: Bengkel / Cucian / Semua

Aksi:
- Print PDF
- Export Excel (XLSX)

### 3) Input Transaksi
Input transaksi untuk Bengkel/Cucian:
- Tanggal
- Tipe: Pemasukan / Pengeluaran
- Metode pembayaran: Cash / Transfer
- Nominal (format rupiah)
- Keterangan (opsional)
- Setelah sukses simpan, field otomatis **kosong lagi**

### 4) Riwayat Transaksi
- Default memuat transaksi saat halaman dibuka
- Paging (Prev/Next)
- Filter tanggal + UMKM
- Aksi per transaksi:
  - Detail (modal)
  - Edit (modal)
  - Hapus (soft delete)

### 5) Activity Log
- Mencatat aksi penting:
  - Login / validasi
  - Tambah/edit/hapus transaksi
  - Export laporan
  - Request API (API_..._OK / API_..._ERR)
- Halaman log dengan paging

### 6) Manage Akun (Admin)
- Halaman admin pakai **Admin Key**
- Setelah key valid:
  - List akun
  - Tambah akun
  - Edit akun
  - Hapus akun (soft delete / nonaktif)
- Semua aksi admin masuk log

### 7) Database Spreadsheet
Sheet utama:
- USERS
- TRANSACTIONS
- TX_BENGKEL
- TX_CUCIAN
- ACTIVITY_LOG
- SETTINGS

### 8) Export Laporan
- Output: PDF & XLSX
- Disimpan ke folder Drive “Keuangan UMKM - Laporan” (bisa pakai folder custom)
- Dari web: tombol export akan membuka **downloadUrl** (atau minimal fileUrl)

---

## Teknologi
- Google Apps Script (V8 runtime)
- Google Spreadsheet (sebagai database)
- HTML/CSS/JS (front-end via HtmlService)
- Drive API + UrlFetchApp (export PDF/XLSX)

---

## Arsitektur Singkat
**Frontend (HTML/JS)** memanggil fungsi Apps Script lewat:
```js
google.script.run.api_listTx(sessionId, filters)
google.script.run.api_addTx(sessionId, payload)
google.script.run.api_exportReport(sessionId, filters)
