const Reports = (() => {
  // Folder laporan yang kamu kasih (fallback kalau SETTINGS belum diisi)
  const FIXED_REPORT_FOLDER_ID = '1QGB9-quFnMyijO576R56ar5pDr2waeRm';

  function exportReport(sessionId, filters) {
    Auth.requireSession(sessionId);

    const format = String(filters?.format || 'PDF').toUpperCase();
    if (!['PDF', 'XLSX'].includes(format)) throw new Error('Format tidak valid');

    const umkm = String(filters?.umkm || 'ALL').toUpperCase();
    const start = String(filters?.start || '').trim();
    const end = String(filters?.end || '').trim();

    // ambil data laporan + dashboard
    const rows = Transactions.reportRows(sessionId, { umkm, start, end });
    const dash = Transactions.dashboard(sessionId, { umkm, start, end });

    const periodText = periodText_(start, end);
    const umkmText = (umkm === 'ALL') ? 'SEMUA UMKM' : umkm;

    const folder = getReportFolder_(); // pakai folder tetap kamu

    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
    const baseName = `Laporan-${umkmText}-${start || 'ALL'}-${end || 'ALL'}-${ts}`;

    // spreadsheet sementara untuk diexport PDF/XLSX
    const ss = SpreadsheetApp.create(baseName);
    const ssId = ss.getId();

    // pindahkan file sementara ke folder laporan biar rapi (opsional)
    try {
      const f = DriveApp.getFileById(ssId);
      folder.addFile(f);
      DriveApp.getRootFolder().removeFile(f);
    } catch (e) {}

    const sh = ss.getSheets()[0];
    sh.setName('LAPORAN');

    buildTemplate_(sh, { umkmText, periodText, dash, rows });
    SpreadsheetApp.flush();

    const gid = sh.getSheetId();
    const blob = exportBlob_(ssId, gid, format);

    const outName = `${baseName}.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
    const outMime = (format === 'PDF')
      ? MimeType.PDF
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const outFile = folder.createFile(blob.setName(outName).setContentType(outMime));

    // hapus spreadsheet sementara
    try { DriveApp.getFileById(ssId).setTrashed(true); } catch (e) {}

    const fid = outFile.getId();
    const viewUrl = `https://drive.google.com/file/d/${fid}/view`;
    const dlUrl = `https://drive.google.com/uc?export=download&id=${fid}`;

    return {
      ok: true,
      fileId: fid,
      name: outName,
      totalRows: Array.isArray(rows) ? rows.length : 0,
      fileUrl: viewUrl,
      downloadUrl: dlUrl,

      // alias biar kompatibel kalau FE kamu nyari key lain
      url: viewUrl,
      download: dlUrl
    };
  }

  function buildTemplate_(sh, ctx) {
    const { umkmText, periodText, dash, rows } = ctx;

    sh.clear({ contentsOnly: true });

    // width
    sh.setColumnWidth(1, 50);
    sh.setColumnWidth(2, 110);
    sh.setColumnWidth(3, 320);
    sh.setColumnWidth(4, 140);
    sh.setColumnWidth(5, 130);
    sh.setColumnWidth(6, 130);
    sh.setColumnWidth(7, 130);

    // Title
    sh.getRange('A1:G1').merge();
    sh.getRange('A1')
      .setValue(`LAPORAN PEMASUKAN & PENGELUARAN - ${umkmText}`)
      .setFontWeight('bold')
      .setFontSize(14)
      .setHorizontalAlignment('center');

    // Period
    sh.getRange('A2:G2').merge();
    sh.getRange('A2')
      .setValue(`Periode: ${periodText}`)
      .setFontSize(11)
      .setHorizontalAlignment('center');

    // Summary (kanan)
    sh.getRange('A4:D8').merge();
    sh.getRange('E4:G8').setValues([
      ['Saldo Awal', '', dash.saldoAwal || 0],
      ['Total Pemasukan', '', dash.totalIn || 0],
      ['Total Pengeluaran', '', dash.totalOut || 0],
      ['Saldo Akhir', '', dash.saldoAkhir || 0],
      ['Jumlah Transaksi', '', dash.count || 0],
    ]);
    sh.getRange('E4:E8').setFontWeight('bold');
    sh.getRange('G4:G8').setNumberFormat('#,##0');

    // Header row
    const headerRow = 10;
    sh.getRange(headerRow, 1, 1, 7).setValues([[
      'NO','TANGGAL','KETERANGAN','METODE PEMBAYARAN','PEMASUKAN','PENGELUARAN','SALDO'
    ]])
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#e8f1ff');

    sh.setFrozenRows(headerRow);

    const startRow = headerRow + 1;

    const safeRows = Array.isArray(rows) ? rows : [];
    const values = safeRows.map(r => ([
      r.no,
      Utils.toDate(r.tanggal),
      r.keterangan || '-',
      r.metode || '-',
      r.pemasukan || 0,
      r.pengeluaran || 0,
      r.saldo || 0
    ]));

    if (values.length) {
      sh.getRange(startRow, 1, values.length, 7).setValues(values);

      sh.getRange(startRow, 1, values.length, 1).setHorizontalAlignment('center');
      sh.getRange(startRow, 2, values.length, 1).setNumberFormat('dd/MM/yyyy');
      sh.getRange(startRow, 4, values.length, 1).setHorizontalAlignment('center');
      sh.getRange(startRow, 5, values.length, 3).setNumberFormat('#,##0');

      sh.getRange(headerRow, 1, values.length + 1, 7)
        .setBorder(true, true, true, true, true, true);
    } else {
      sh.getRange(startRow, 1).setValue('Tidak ada data pada periode ini.');
      sh.getRange(headerRow, 1, 2, 7).setBorder(true, true, true, true, true, true);
    }

    // Total row
    const totalRow = startRow + (values.length || 1) + 1;
    sh.getRange(totalRow, 1, 1, 4).merge();
    sh.getRange(totalRow, 1).setValue('TOTAL')
      .setFontWeight('bold')
      .setHorizontalAlignment('right')
      .setBackground('#f6faff');

    sh.getRange(totalRow, 5, 1, 3).setValues([[
      dash.totalIn || 0,
      dash.totalOut || 0,
      dash.saldoAkhir || 0
    ]]).setFontWeight('bold').setNumberFormat('#,##0').setBackground('#f6faff');

    sh.getRange(totalRow, 1, 1, 7).setBorder(true, true, true, true, true, true);
  }

  function exportBlob_(ssId, gid, format) {
    const token = ScriptApp.getOAuthToken();
    let url = `https://docs.google.com/spreadsheets/d/${ssId}/export?`;

    if (format === 'PDF') {
      url += [
        `format=pdf`,
        `gid=${gid}`,
        `size=A4`,
        `portrait=true`,
        `fitw=true`,
        `sheetnames=false`,
        `printtitle=false`,
        `pagenumbers=false`,
        `gridlines=false`,
        `fzr=false`,
        `top_margin=0.5`,
        `bottom_margin=0.5`,
        `left_margin=0.5`,
        `right_margin=0.5`
      ].join('&');
    } else {
      url += `format=xlsx`;
    }

    const resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });

    const code = resp.getResponseCode();
    if (code !== 200) throw new Error(`Gagal export (${format}). HTTP ${code}. ${resp.getContentText().slice(0, 200)}`);
    return resp.getBlob();
  }

  function getReportFolder_() {
    // prioritas: SETTINGS -> folder id
    const key = CONFIG.REPORT_FOLDER_SETTING; // pastikan config kamu ada ini
    const fromSetting = DB.getSetting(key);

    if (fromSetting) {
      try { return DriveApp.getFolderById(fromSetting); } catch (e) {}
    }

    // fallback: folder id tetap kamu
    try {
      const f = DriveApp.getFolderById(FIXED_REPORT_FOLDER_ID);
      DB.setSetting(key, FIXED_REPORT_FOLDER_ID); // simpan agar berikutnya konsisten
      return f;
    } catch (e) {}

    // fallback terakhir: bikin folder baru
    const name = CONFIG.REPORT_FOLDER_NAME || 'Keuangan UMKM - Laporan';
    const it = DriveApp.getFoldersByName(name);
    const folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
    DB.setSetting(key, folder.getId());
    return folder;
  }

  function periodText_(start, end) {
    if (!start && !end) return 'Semua periode';
    if (start && !end) return `${start} s/d (hari ini)`;
    if (!start && end) return `(awal) s/d ${end}`;
    return `${start} s/d ${end}`;
  }

  return { exportReport };
})();
