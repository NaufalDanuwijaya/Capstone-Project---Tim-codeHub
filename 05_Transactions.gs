const Transactions = (() => {

  function _sheetByUmkm(umkm){
    const u = String(umkm || '').toUpperCase();
    if (u === 'BENGKEL') return CONFIG.SHEETS.TX_BENGKEL;
    if (u === 'CUCIAN') return CONFIG.SHEETS.TX_CUCIAN;
    throw new Error('UMKM tidak valid');
  }

  function _rowToObj(r){
    const umkm = String(r[2] || '').toUpperCase();
    const type = String(r[3] || '').toUpperCase();
    const method = String(r[4] || '').toUpperCase();
    const dateObj = (r[1] instanceof Date) ? r[1] : Utils.toDate(r[1]);

    return {
      txId: String(r[0] || ''),
      date: dateObj ? Utils.formatYMD(dateObj) : String(r[1] || ''),
      umkm,
      type,
      method,
      amount: Number(r[5] || 0),
      note: String(r[6] || ''),
      createdAt: (r[7] instanceof Date) ? r[7].toISOString() : String(r[7] || ''),
      updatedAt: (r[8] instanceof Date) ? r[8].toISOString() : String(r[8] || ''),
      isDeleted: r[9] === true
    };
  }

  function add(sessionId, payload){
    const s = Auth.requireSession(sessionId);

    // Tambahkan .trim() agar input lebih bersih
    const umkm = String(payload.umkm || '').trim().toUpperCase();
    const type = String(payload.type || '').toUpperCase();
    const method = String(payload.method || '').toUpperCase();
    const tanggal = Utils.toDate(payload.tanggal);
    const nominal = Utils.toNumber(payload.nominal);
    const note = String(payload.keterangan || payload.note || '').trim();

    if (!tanggal) throw new Error('Tanggal wajib diisi');
    if (!(umkm === 'BENGKEL' || umkm === 'CUCIAN')) throw new Error('UMKM tidak valid');
    if (!(type === 'PEMASUKAN' || type === 'PENGELUARAN')) throw new Error('Tipe transaksi tidak valid');
    if (!(method === 'CASH' || method === 'TRANSFER')) throw new Error('Metode pembayaran tidak valid');
    if (!nominal || nominal <= 0) throw new Error('Nominal wajib diisi');

    // --- PERBAIKAN BUG DI SINI ---
    // 1. Tentukan nama sheet tujuan
    const shName = _sheetByUmkm(umkm);
    
    // 2. Cek apakah sheet tersebut benar-benar ada SEBELUM menulis ke Master.
    // Jika sheet TX_BENGKEL/CUCIAN hilang, kode ini akan error di sini (melalui DB.sh),
    // sehingga data BELUM masuk ke TRANSACTIONS (mencegah data tidak sinkron).
    DB.sh(shName); 
    // -----------------------------

    const now = new Date();
    const txId = Utils.uuid('TX');
    
    const row = [
      txId,
      new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate()), // date-only
      umkm,
      type,
      method,
      nominal,
      note,
      now,
      now,
      false
    ];

    // 3. Tulis ke Master (TRANSACTIONS)
    DB.sh(CONFIG.SHEETS.TX).appendRow(row);

    // 4. Tulis ke Sheet UMKM
    // (Aman dilakukan karena keberadaan sheet sudah divalidasi di langkah no 2)
    DB.sh(shName).appendRow(row);

    DB.log('TX_ADD', s.email, { txId, umkm, type, nominal, method });
    return { ok: true, txId };
  }

  function _findRowByTxId_(sheetName, txId){
    const sh = DB.sh(sheetName);
    const last = sh.getLastRow();
    if (last < 2) return { rowIndex: -1 };

    const range = sh.getRange(2, 1, last - 1, 10);
    const values = range.getValues();

    for (let i = 0; i < values.length; i++){
      if (String(values[i][0]) === String(txId)) return { rowIndex: 2 + i };
    }
    return { rowIndex: -1 };
  }

  function get(sessionId, txId){
    Auth.requireSession(sessionId);
    txId = String(txId || '').trim();
    if (!txId) throw new Error('txId wajib');

    const found = _findRowByTxId_(CONFIG.SHEETS.TX, txId);
    if (found.rowIndex < 0) throw new Error('Data tidak ditemukan');

    const r = DB.sh(CONFIG.SHEETS.TX).getRange(found.rowIndex, 1, 1, 10).getValues()[0];
    const obj = _rowToObj(r);
    if (obj.isDeleted) throw new Error('Data tidak ditemukan');
    return obj;
  }

  function update(sessionId, payload){
    const s = Auth.requireSession(sessionId);

    const txId = String(payload.txId || '').trim();
    if (!txId) throw new Error('txId wajib');

    const master = _findRowByTxId_(CONFIG.SHEETS.TX, txId);
    if (master.rowIndex < 0) throw new Error('Data tidak ditemukan');

    const oldRow = DB.sh(CONFIG.SHEETS.TX).getRange(master.rowIndex, 1, 1, 10).getValues()[0];
    const oldUmkm = String(oldRow[2] || '').toUpperCase();

    const umkm = String(payload.umkm || oldUmkm).toUpperCase();
    const type = String(payload.type || oldRow[3] || '').toUpperCase();
    const method = String(payload.method || oldRow[4] || '').toUpperCase();
    const tanggal = Utils.toDate(payload.tanggal) || oldRow[1];
    const nominal = Utils.toNumber(payload.nominal || oldRow[5]);
    const note = String((payload.keterangan ?? payload.note) ?? oldRow[6] ?? '').trim();

    if (!tanggal) throw new Error('Tanggal wajib diisi');
    if (!(umkm === 'BENGKEL' || umkm === 'CUCIAN')) throw new Error('UMKM tidak valid');
    if (!(type === 'PEMASUKAN' || type === 'PENGELUARAN')) throw new Error('Tipe transaksi tidak valid');
    if (!(method === 'CASH' || method === 'TRANSFER')) throw new Error('Metode pembayaran tidak valid');
    if (!nominal || nominal <= 0) throw new Error('Nominal wajib diisi');

    const now = new Date();

    const newRow = [
      txId,
      new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate()),
      umkm,
      type,
      method,
      nominal,
      note,
      oldRow[7], // createdAt tetap
      now,
      oldRow[9] === true
    ];

    // update master
    DB.sh(CONFIG.SHEETS.TX).getRange(master.rowIndex, 1, 1, 10).setValues([newRow]);

    // update sheet lama
    const oldSheet = _sheetByUmkm(oldUmkm);
    const fOld = _findRowByTxId_(oldSheet, txId);
    if (fOld.rowIndex > 0){
      DB.sh(oldSheet).getRange(fOld.rowIndex, 1, 1, 10).setValues([newRow]);
    }

    // kalau pindah UMKM, pastikan ada di sheet tujuan
    if (umkm !== oldUmkm){
      const newSheet = _sheetByUmkm(umkm);
      const fNew = _findRowByTxId_(newSheet, txId);
      if (fNew.rowIndex > 0){
        DB.sh(newSheet).getRange(fNew.rowIndex, 1, 1, 10).setValues([newRow]);
      } else {
        DB.sh(newSheet).appendRow(newRow);
      }
    }

    DB.log('TX_EDIT', s.email, { txId, umkm, type, nominal, method });
    return { ok: true };
  }

  function remove(sessionId, txId){
    const s = Auth.requireSession(sessionId);
    txId = String(txId || '').trim();
    if (!txId) throw new Error('txId wajib');

    const master = _findRowByTxId_(CONFIG.SHEETS.TX, txId);
    if (master.rowIndex < 0) throw new Error('Data tidak ditemukan');

    const row = DB.sh(CONFIG.SHEETS.TX).getRange(master.rowIndex, 1, 1, 10).getValues()[0];
    row[9] = true;
    row[8] = new Date();
    DB.sh(CONFIG.SHEETS.TX).getRange(master.rowIndex, 1, 1, 10).setValues([row]);

    // mark di dua sheet juga (kalau ada)
    [CONFIG.SHEETS.TX_BENGKEL, CONFIG.SHEETS.TX_CUCIAN].forEach(shName=>{
      const f = _findRowByTxId_(shName, txId);
      if (f.rowIndex > 0){
        const r2 = DB.sh(shName).getRange(f.rowIndex, 1, 1, 10).getValues()[0];
        r2[9] = true;
        r2[8] = new Date();
        DB.sh(shName).getRange(f.rowIndex, 1, 1, 10).setValues([r2]);
      }
    });

    DB.log('TX_DELETE', s.email, { txId });
    return { ok: true };
  }

  function listPaged(sessionId, filters){
    Auth.requireSession(sessionId);

    const start = Utils.formatYMD(filters?.start || '');
    const end = Utils.formatYMD(filters?.end || '');
    const umkm = String(filters?.umkm || 'ALL').toUpperCase();

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.max(1, Number(filters?.pageSize || 10));

    const sh = DB.sh(CONFIG.SHEETS.TX);
    const last = sh.getLastRow();
    if (last < 2) return { items: [], page, pageSize, total: 0, hasMore: false };

    const values = sh.getRange(2, 1, last - 1, 10).getValues();

    let items = values
      .map(_rowToObj)
      .filter(x => !x.isDeleted);

    if (umkm !== 'ALL') items = items.filter(x => String(x.umkm).toUpperCase() === umkm);
    if (start) items = items.filter(x => x.date >= start);
    if (end) items = items.filter(x => x.date <= end);

    items.sort((a,b)=> (a.date < b.date ? 1 : -1));

    const total = items.length;
    const offset = (page - 1) * pageSize;
    const paged = items.slice(offset, offset + pageSize);

    return { items: paged, page, pageSize, total, hasMore: offset + pageSize < total };
  }

  function dashboard(sessionId, filters){
    Auth.requireSession(sessionId);
    const start = Utils.formatYMD(filters?.start || '');
    const end = Utils.formatYMD(filters?.end || '');
    const umkm = String(filters?.umkm || 'ALL').toUpperCase();

    const all = listPaged(sessionId, { start:'', end:'', umkm, page:1, pageSize:999999 }).items;

    let saldoAwal = 0;
    if (start){
      const before = all.filter(x => x.date < start);
      saldoAwal = before.reduce((acc, t)=>{
        const sign = (String(t.type).toUpperCase() === 'PEMASUKAN') ? 1 : -1;
        return acc + sign * Number(t.amount || 0);
      }, 0);
    }

    let inRange = all;
    if (start) inRange = inRange.filter(x => x.date >= start);
    if (end) inRange = inRange.filter(x => x.date <= end);

    const totalIn = inRange
      .filter(x=>String(x.type).toUpperCase()==='PEMASUKAN')
      .reduce((a,t)=>a+Number(t.amount||0),0);

    const totalOut = inRange
      .filter(x=>String(x.type).toUpperCase()==='PENGELUARAN')
      .reduce((a,t)=>a+Number(t.amount||0),0);

    const profit = Math.max(0, totalIn - totalOut);
    const loss = Math.max(0, totalOut - totalIn);
    const saldoAkhir = saldoAwal + (totalIn - totalOut);

    return {
      totalIn, totalOut, profit, loss,
      saldoAwal, saldoAkhir,
      count: inRange.length
    };
  }

  // ====== INI YANG DIBUTUHKAN 06_report.gs ======
  // 06_report.gs memanggil Transactions.reportRows(...)
  function reportRows(sessionId, filters){
    Auth.requireSession(sessionId);

    const umkm  = String(filters?.umkm || 'ALL').toUpperCase();
    const start = String(filters?.start || '').trim();
    const end   = String(filters?.end || '').trim();

    // ambil semua transaksi untuk hitung saldo awal + saldo berjalan
    const all = listPaged(sessionId, { umkm, start:'', end:'', page:1, pageSize:999999 }).items.slice();
    all.sort((a,b)=> (a.date > b.date ? 1 : (a.date < b.date ? -1 : 0))); // ASC

    let saldo = 0;

    // saldo awal = transaksi sebelum start
    if (start){
      for (const t of all){
        if (t.date >= start) break;
        const sign = (String(t.type).toUpperCase() === 'PEMASUKAN') ? 1 : -1;
        saldo += sign * Number(t.amount || 0);
      }
    }

    // filter periode
    let rows = all;
    if (start) rows = rows.filter(x => x.date >= start);
    if (end)   rows = rows.filter(x => x.date <= end);

    const out = [];
    let no = 0;

    for (const t of rows){
      const type = String(t.type || '').toUpperCase();
      const pemasukan = (type === 'PEMASUKAN') ? Number(t.amount || 0) : 0;
      const pengeluaran = (type === 'PENGELUARAN') ? Number(t.amount || 0) : 0;

      saldo = saldo + pemasukan - pengeluaran;
      no++;

      // biar kalau ALL tetap kebaca transaksi UMKM mana
      const ketBase = String(t.note || '').trim() || '-';
      const keterangan = (umkm === 'ALL') ? `${t.umkm} - ${ketBase}` : ketBase;

      out.push({
        no,
        tanggal: t.date,
        keterangan,
        metode: t.method || '-',
        pemasukan,
        pengeluaran,
        saldo
      });
    }

    return out;
  }

  // alias opsional (kalau ada sisa pemanggilan lama)
  function rowReport(sessionId, filters){
    const rows = reportRows(sessionId, filters);
    return { ok: true, rows };
  }
  function rowreport(sessionId, filters){
    return rowReport(sessionId, filters);
  }

  return {
    add, get, update, remove,
    listPaged, dashboard,

    // untuk laporan
    reportRows,
    rowReport,
    rowreport
  };
})();
