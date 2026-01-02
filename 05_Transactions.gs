const Transactions = (() => {

  function _sheetByUmkm(umkm){
    const u = String(umkm || '').toUpperCase();
    if (u === 'BENGKEL') return CONFIG.SHEETS.TX_BENGKEL;
    if (u === 'CUCIAN') return CONFIG.SHEETS.TX_CUCIAN;
    throw new Error('UMKM tidak valid');
  }

  function _rowToObj(r){
    return {
      txId: String(r[0] || ''),
      date: (r[1] instanceof Date) ? Utils.formatYMD(r[1]) : Utils.formatYMD(r[1]) || String(r[1] || ''),
      umkm: String(r[2] || ''),
      type: String(r[3] || ''),
      method: String(r[4] || ''),
      amount: Number(r[5] || 0),
      note: String(r[6] || ''),
      createdAt: (r[7] instanceof Date) ? r[7].toISOString() : String(r[7] || ''),
      updatedAt: (r[8] instanceof Date) ? r[8].toISOString() : String(r[8] || ''),
      isDeleted: r[9] === true
    };
  }

  function add(sessionId, payload){
    const s = Auth.requireSession(sessionId);

    const umkm = String(payload.umkm || '').toUpperCase();
    const type = String(payload.type || '').toUpperCase();
    const method = String(payload.method || '').toUpperCase();
    const tanggal = Utils.toDate(payload.tanggal);
    const nominal = Utils.toNumber(payload.nominal);
    const note = String(payload.keterangan || '').trim();

    if (!tanggal) throw new Error('Tanggal wajib diisi');
    if (!(umkm === 'BENGKEL' || umkm === 'CUCIAN')) throw new Error('UMKM tidak valid');
    if (!(type === 'PEMASUKAN' || type === 'PENGELUARAN')) throw new Error('Tipe transaksi tidak valid');
    if (!(method === 'CASH' || method === 'TRANSFER')) throw new Error('Metode pembayaran tidak valid');
    if (!nominal || nominal <= 0) throw new Error('Nominal wajib diisi');

    const now = new Date();
    const txId = Utils.uuid('TX');

    const row = [txId,tanggal,umkm,type,method,nominal,note,now,now,false];

    DB.sh(CONFIG.SHEETS.TX).appendRow(row);

    const shName = _sheetByUmkm(umkm);
    DB.sh(shName).appendRow(row);

    DB.log('TX_ADD', s.email, { txId, umkm, type, nominal });
    return { ok: true, txId };
  }

  function _findRowByTxId_(sheetName, txId){
    const sh = DB.sh(sheetName);
    const last = sh.getLastRow();
    if (last < 2) return { rowIndex: -1 };
    const values = sh.getRange(2, 1, last - 1, 10).getValues();
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
    const nominal = Utils.toNumber(payload.nominal ?? oldRow[5]);
    const note = String(payload.keterangan ?? oldRow[6] ?? '').trim();

    if (!tanggal) throw new Error('Tanggal wajib diisi');
    if (!(umkm === 'BENGKEL' || umkm === 'CUCIAN')) throw new Error('UMKM tidak valid');
    if (!(type === 'PEMASUKAN' || type === 'PENGELUARAN')) throw new Error('Tipe transaksi tidak valid');
    if (!(method === 'CASH' || method === 'TRANSFER')) throw new Error('Metode pembayaran tidak valid');
    if (!nominal || nominal <= 0) throw new Error('Nominal wajib diisi');

    const now = new Date();
    const newRow = [txId,tanggal,umkm,type,method,nominal,note,oldRow[7],now,oldRow[9] === true];

    DB.sh(CONFIG.SHEETS.TX).getRange(master.rowIndex, 1, 1, 10).setValues([newRow]);

    try {
      const oldSheet = _sheetByUmkm(oldUmkm);
      const fOld = _findRowByTxId_(oldSheet, txId);
      if (fOld.rowIndex > 0) DB.sh(oldSheet).getRange(fOld.rowIndex, 1, 1, 10).setValues([newRow]);
    } catch(e){}

    if (umkm !== oldUmkm){
      const newSheet = _sheetByUmkm(umkm);
      const fNew = _findRowByTxId_(newSheet, txId);
      if (fNew.rowIndex > 0) DB.sh(newSheet).getRange(fNew.rowIndex, 1, 1, 10).setValues([newRow]);
      else DB.sh(newSheet).appendRow(newRow);
    }

    DB.log('TX_EDIT', s.email, { txId, umkm, type, nominal });
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

    let items = values.map(_rowToObj).filter(x => !x.isDeleted);

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

    const totalIn = inRange.filter(x=>String(x.type).toUpperCase()==='PEMASUKAN').reduce((a,t)=>a+Number(t.amount||0),0);
    const totalOut = inRange.filter(x=>String(x.type).toUpperCase()==='PENGELUARAN').reduce((a,t)=>a+Number(t.amount||0),0);

    const profit = Math.max(0, totalIn - totalOut);
    const loss = Math.max(0, totalOut - totalIn);
    const saldoAkhir = saldoAwal + (totalIn - totalOut);

    return { totalIn, totalOut, profit, loss, saldoAwal, saldoAkhir, count: inRange.length };
  }

  function rowReport(sessionId, filters){
    Auth.requireSession(sessionId);

    const umkm  = String(filters?.umkm || 'ALL').toUpperCase();
    const start = String(filters?.start || '').trim();
    const end   = String(filters?.end || '').trim();

    const all = listPaged(sessionId, { umkm, start:'', end:'', page:1, pageSize:999999 }).items.slice();
    all.sort((a,b)=> (a.date > b.date ? 1 : (a.date < b.date ? -1 : 0)));

    let saldo = 0;
    if (start) {
      for (const t of all) {
        if (t.date >= start) break;
        const type = String(t.type || '').toUpperCase();
        const amt = Number(t.amount || 0);
        saldo += (type === 'PEMASUKAN') ? amt : -amt;
      }
    }

    let rows = all;
    if (start) rows = rows.filter(x => x.date >= start);
    if (end)   rows = rows.filter(x => x.date <= end);

    const out = [];
    let no = 0;

    for (const t of rows) {
      const type = String(t.type || '').toUpperCase();
      const masuk = (type === 'PEMASUKAN') ? Number(t.amount || 0) : 0;
      const keluar = (type === 'PENGELUARAN') ? Number(t.amount || 0) : 0;

      saldo = saldo + masuk - keluar;
      no++;

      out.push({ no, tanggal: t.date, keterangan: String(t.note || ''), metode: String(t.method || ''), pemasukan: masuk, pengeluaran: keluar, saldo });
    }

    return { ok: true, period: { umkm, start, end }, rows: out };
  }

  function rowreport(sessionId, filters){ return rowReport(sessionId, filters); }
  function reportRows(sessionId, filters){ return (rowReport(sessionId, filters).rows || []); }

  return { add, get, update, remove, listPaged, dashboard, rowReport, rowreport, reportRows };
})();