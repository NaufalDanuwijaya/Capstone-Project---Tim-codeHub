function api_login(email, password) {
  return withApiLog_('LOGIN', email, { email }, () => Auth.login(email, password));
}

function api_validate(sessionId) {
  return withApiLog_('VALIDATE', '(session)', {}, () => Auth.validate(sessionId));
}

function api_dashboard(sessionId, filters) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('DASHBOARD', s.email, filters || {}, () => Transactions.dashboard(sessionId, filters || {}));
}

function api_addTx(sessionId, payload) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('ADD_TX', s.email, payload || {}, () => Transactions.add(sessionId, payload || {}));
}

// Riwayat
function api_listTx(sessionId, filters) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('LIST_TX', s.email, filters || {}, () => {
    const f = filters || {};
    const page = Math.max(1, Number(f.page || 1));
    const pageSize = Math.max(1, Number(f.pageSize || 10));

    const out = Transactions.listPaged(sessionId, f);

    // Kalau out null/undefined, jangan pernah balikin null ke client
    if (!out || typeof out !== 'object') {
      return { items: [], page, pageSize, hasMore: false, total: 0 };
    }

    // Paksa items jadi array dan buang property yang bisa bikin client dapat null
    const items = Array.isArray(out.items) ? out.items : [];

    // Pastikan item hanya berisi data “aman” (tanpa Date object)
    const safeItems = items.map(it => ({
      txId: String(it.txId || ''),
      date: String(it.date || ''),        // yyyy-mm-dd
      umkm: String(it.umkm || ''),
      type: String(it.type || ''),
      method: String(it.method || ''),
      amount: Number(it.amount || 0),
      note: String(it.note || ''),
    }));

    return {
      items: safeItems,
      page: Number(out.page || page),
      pageSize: Number(out.pageSize || pageSize),
      hasMore: !!out.hasMore,
      total: Number(out.total || safeItems.length),
    };
  });
}


function api_getTx(sessionId, txId) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('GET_TX', s.email, { txId }, () => Transactions.get(sessionId, txId));
}

function api_updateTx(sessionId, payload) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('UPDATE_TX', s.email, payload || {}, () => Transactions.update(sessionId, payload || {}));
}

function api_deleteTx(sessionId, txId) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('DELETE_TX', s.email, { txId }, () => Transactions.remove(sessionId, txId));
}

function api_exportReport(sessionId, filters) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('EXPORT_REPORT', s.email, filters || {}, () => Reports.exportReport(sessionId, filters || {}));
}

function api_activityList(sessionId, page, pageSize) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('ACTIVITY_LIST', s.email, { page, pageSize }, () => {
    const sh = DB.sh(CONFIG.SHEETS.LOG);
    const last = sh.getLastRow();
    if (last < 2) return { items: [], page: 1, pageSize, hasMore: false };

    const tz = Session.getScriptTimeZone();

    const values = sh.getRange(2, 1, last - 1, 4).getValues().map(r => {
      const timeObj = (r[0] instanceof Date) ? r[0] : null;
      const timeLabel = timeObj ? Utilities.formatDate(timeObj, tz, 'dd/MM/yyyy HH:mm:ss') : String(r[0] || '');
      const action = String(r[1] || '');
      const email = String(r[2] || '');
      const detail = String(r[3] || '');
      const info = parseActionInfo_(action);

      return {
        timeLabel,
        action,
        title: info.title,
        where: info.where,
        email,
        detail
      };
    });

    // terbaru dulu
    values.sort((a, b) => (a.timeLabel < b.timeLabel ? 1 : -1));

    page = Math.max(1, Number(page || 1));
    pageSize = Math.max(1, Number(pageSize || 10));
    const offset = (page - 1) * pageSize;

    const items = values.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < values.length;

    return { items, page, pageSize, hasMore };
  });
}

function parseActionInfo_(action) {
  const a = String(action || '');

  // transaksi
  if (a === 'TX_ADD') return { title: 'Tambah transaksi', where: 'Halaman: Input Transaksi' };
  if (a === 'TX_EDIT') return { title: 'Edit transaksi', where: 'Halaman: Riwayat Transaksi' };
  if (a === 'TX_DELETE') return { title: 'Hapus transaksi', where: 'Halaman: Riwayat Transaksi' };

  // user admin
  if (a === 'ADMIN_USER_ADD') return { title: 'Tambah akun', where: 'Halaman: Manage Akun' };
  if (a === 'ADMIN_USER_EDIT') return { title: 'Edit akun', where: 'Halaman: Manage Akun' };
  if (a === 'ADMIN_USER_DELETE') return { title: 'Hapus akun', where: 'Halaman: Manage Akun' };

  // API logs
  if (a.startsWith('API_') && a.endsWith('_OK')) {
    const name = a.replace(/^API_/, '').replace(/_OK$/, '');
    return { title: `Akses fitur berhasil: ${prettyApi_(name)}`, where: whereFromApi_(name) };
  }
  if (a.startsWith('API_') && a.endsWith('_ERR')) {
    const name = a.replace(/^API_/, '').replace(/_ERR$/, '');
    return { title: `Akses fitur gagal: ${prettyApi_(name)}`, where: whereFromApi_(name) };
  }

  // fallback
  return { title: a.replace(/_/g, ' '), where: '' };
}

function prettyApi_(name) {
  const n = String(name || '');
  const map = {
    LOGIN: 'Login',
    VALIDATE: 'Validasi sesi',
    DASHBOARD: 'Dashboard',
    ADD_TX: 'Tambah transaksi',
    LIST_TX: 'Riwayat transaksi',
    GET_TX: 'Detail transaksi',
    UPDATE_TX: 'Update transaksi',
    DELETE_TX: 'Hapus transaksi',
    EXPORT_REPORT: 'Export laporan',
    ACTIVITY_LIST: 'Activity log',
    USERS_LIST: 'List akun',
    USERS_UPSERT: 'Simpan akun',
    USERS_DELETE: 'Hapus akun'
  };
  return map[n] || n.replace(/_/g,' ');
}

function whereFromApi_(name) {
  const n = String(name || '');
  if (n === 'DASHBOARD') return 'Halaman: Dashboard';
  if (n === 'ADD_TX') return 'Halaman: Input Transaksi';
  if (n === 'LIST_TX' || n === 'GET_TX' || n === 'UPDATE_TX' || n === 'DELETE_TX') return 'Halaman: Riwayat Transaksi';
  if (n === 'ACTIVITY_LIST') return 'Halaman: Activity Log';
  if (n.startsWith('USERS_')) return 'Halaman: Manage Akun';
  if (n === 'EXPORT_REPORT') return 'Halaman: Dashboard (Export)';
  if (n === 'LOGIN' || n === 'VALIDATE') return 'Halaman: Login';
  return '';
}


function api_usersList(sessionId, adminKey) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('USERS_LIST', s.email, { hasKey: !!adminKey }, () => {
    if (!Auth.verifyAdminKey(adminKey)) throw new Error('Admin key salah');
    return Users.list_();
  });
}

function api_usersUpsert(sessionId, adminKey, payload) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('USERS_UPSERT', s.email, payload || {}, () => {
    if (!Auth.verifyAdminKey(adminKey)) throw new Error('Admin key salah');
    return Users.upsert_(s.email, payload || {});
  });
}

function api_usersDelete(sessionId, adminKey, userId) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('USERS_DELETE', s.email, { userId }, () => {
    if (!Auth.verifyAdminKey(adminKey)) throw new Error('Admin key salah');
    return Users.remove_(s.email, userId);
  });
}

// ===== wrapper log =====
function withApiLog_(name, email, detail, fn) {
  try {
    const res = fn();
    DB.log(`API_${name}_OK`, email || '', detail || {});
    return res;
  } catch (e) {
    DB.log(`API_${name}_ERR`, email || '', {
      detail: detail || {},
      error: e && e.message ? e.message : String(e),
      stack: e && e.stack ? String(e.stack).slice(0, 1500) : ''
    });
    throw e;
  }
}

function humanizeAction_(action) {
  const a = String(action || '');
  if (a === 'API_LOGIN_OK') return 'Login berhasil';
  if (a === 'API_LOGIN_ERR') return 'Login gagal';
  if (a === 'TX_ADD') return 'Tambah transaksi';
  if (a === 'TX_EDIT') return 'Edit transaksi';
  if (a === 'TX_DELETE') return 'Hapus transaksi';
  if (a.indexOf('EXPORT') >= 0) return 'Export laporan';
  if (a.indexOf('API_') === 0 && a.endsWith('_OK')) return 'Akses fitur berhasil';
  if (a.indexOf('API_') === 0 && a.endsWith('_ERR')) return 'Akses fitur gagal';
  return a.replace(/_/g, ' ');
}

// ===== Users module =====
const Users = (() => {
  function list_() {
    const sh = DB.sh(CONFIG.SHEETS.USERS);
    const last = sh.getLastRow();
    if (last < 2) return [];
    const values = sh.getRange(2, 1, last - 1, 8).getValues();

    return values
      .filter(r => r[7] !== true)
      .map(r => ({
        userId: String(r[0] || ''),
        email: String(r[1] || ''),
        name: String(r[2] || ''),
        isActive: r[4] === true,
        createdAt: (r[5] instanceof Date) ? r[5].toISOString() : ''
      }));
  }

  function upsert_(actorEmail, payload) {
    const userId = String(payload.userId || '').trim();
    const email = Utils.normalizeEmail(payload.email);
    const name = String(payload.name || '').trim();
    const password = String(payload.password || '');
    const isActive = payload.isActive !== false;

    if (!email) throw new Error('Email wajib');
    if (!name) throw new Error('Nama wajib');

    const sh = DB.sh(CONFIG.SHEETS.USERS);
    const last = sh.getLastRow();
    const now = new Date();

    if (last >= 2) {
      const range = sh.getRange(2, 1, last - 1, 8);
      const values = range.getValues();

      // update
      if (userId) {
        for (let i = 0; i < values.length; i++) {
          if (String(values[i][0]) === userId && values[i][7] !== true) {
            values[i][1] = email;
            values[i][2] = name;
            if (password) values[i][3] = Utils.sha256(password);
            values[i][4] = isActive;
            values[i][6] = now;
            range.setValues(values);

            DB.log('ADMIN_USER_EDIT', actorEmail, { userId, email });
            return { ok: true };
          }
        }
      }

      // create: cek duplikat email
      for (const r of values) {
        if (Utils.normalizeEmail(r[1]) === email && r[7] !== true) throw new Error('Email sudah terdaftar');
      }
    }

    if (!password) throw new Error('Password wajib untuk akun baru');

    sh.appendRow([
      Utils.uuid('U'),
      email,
      name,
      Utils.sha256(password),
      isActive,
      now,
      now,
      false
    ]);

    DB.log('ADMIN_USER_ADD', actorEmail, { email });
    return { ok: true };
  }

  function remove_(actorEmail, userId) {
    userId = String(userId || '').trim();
    if (!userId) throw new Error('userId wajib');

    const sh = DB.sh(CONFIG.SHEETS.USERS);
    const last = sh.getLastRow();
    if (last < 2) throw new Error('Belum ada user');

    const range = sh.getRange(2, 1, last - 1, 8);
    const values = range.getValues();

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]) === userId) {
        values[i][7] = true;
        values[i][6] = new Date();
        range.setValues(values);

        DB.log('ADMIN_USER_DELETE', actorEmail, { userId });
        return { ok: true };
      }
    }
    throw new Error('User tidak ditemukan');
  }

  return { list_, upsert_, remove_ };
})();
