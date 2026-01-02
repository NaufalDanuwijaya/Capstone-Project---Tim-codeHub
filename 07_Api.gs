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
  return withApiLog_('ADD_TX', s.email, payload || {}, () => Transactions.add(sessionId, payload));
}

function api_listTx(sessionId, filters) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('LIST_TX', s.email, filters || {}, () => Transactions.listPaged(sessionId, filters || {}));
}

function api_getTx(sessionId, txId) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('GET_TX', s.email, { txId }, () => Transactions.get(sessionId, txId));
}

function api_updateTx(sessionId, payload) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('UPDATE_TX', s.email, payload || {}, () => Transactions.update(sessionId, payload));
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

    const values = sh.getRange(2, 1, last - 1, 4).getValues()
      .map(r => ({
        time: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ''),
        action: String(r[1] || ''),
        email: String(r[2] || ''),
        detail: String(r[3] || ''),
      }));

    values.sort((a, b) => (a.time < b.time ? 1 : -1));

    page = Math.max(1, Number(page || 1));
    pageSize = Math.max(1, Number(pageSize || 10));
    const offset = (page - 1) * pageSize;

    const items = values.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < values.length;

    return { items, page, pageSize, hasMore };
  });
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
    return Users.upsert_(s.email, payload);
  });
}

function api_usersDelete(sessionId, adminKey, userId) {
  const s = Auth.requireSession(sessionId);
  return withApiLog_('USERS_DELETE', s.email, { userId }, () => {
    if (!Auth.verifyAdminKey(adminKey)) throw new Error('Admin key salah');
    return Users.remove_(s.email, userId);
  });
}

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

const Users = (() => {
  function list_() {
    const sh = DB.sh(CONFIG.SHEETS.USERS);
    const last = sh.getLastRow();
    if (last < 2) return [];
    const values = sh.getRange(2, 1, last - 1, 8).getValues();

    return values
      .filter(r => r[7] !== true)
      .map(r => ({
        userId: r[0],
        email: String(r[1] || ''),
        name: String(r[2] || ''),
        isActive: r[4] === true,
        createdAt: (r[5] instanceof Date) ? r[5].toISOString() : '',
      }));
  }

  function upsert_(actorEmail, payload) {
    const userId = String(payload.userId || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
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

      for (const r of values) {
        if (String(r[1] || '').toLowerCase() === email && r[7] !== true) {
          throw new Error('Email sudah terdaftar');
        }
      }
    }

    if (!password) throw new Error('Password wajib untuk akun baru');

    sh.appendRow([Utils.uuid('U'), email, name, Utils.sha256(password), isActive, now, now, false]);

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