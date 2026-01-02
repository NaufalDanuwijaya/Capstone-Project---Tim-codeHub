const Auth = (() => {
  function _cache_() { return CacheService.getScriptCache(); }
  function _sessKey_(sid) { return `SESS_${String(sid || '').trim()}`; }

  function login(email, password) {
    email = Utils.normalizeEmail(email);
    password = String(password || '');

    if (!email) throw new Error('Email wajib');
    if (!password) throw new Error('Password wajib');

    const sh = DB.sh(CONFIG.SHEETS.USERS);
    const last = sh.getLastRow();
    if (last < 2) throw new Error('Belum ada user');

    const values = sh.getRange(2,1,last-1,8).getValues();
    const passHash = Utils.sha256(password);

    for (const r of values) {
      const isDeleted = r[7] === true;
      const isActive = r[4] === true;
      if (isDeleted) continue;

      if (Utils.normalizeEmail(r[1]) === email) {
        if (!isActive) throw new Error('Akun nonaktif');
        if (String(r[3] || '') !== passHash) throw new Error('Email atau password salah');

        const sid = Utils.uuid('S');
        const sess = { sessionId: sid, email, name: String(r[2] || ''), createdAt: new Date().toISOString() };

        _cache_().put(_sessKey_(sid), JSON.stringify(sess), CONFIG.SESSION_TTL_SECONDS);
        DB.log('LOGIN_OK', email, {});
        return { ok: true, sessionId: sid, email, name: sess.name };
      }
    }
    throw new Error('Email atau password salah');
  }

  function validate(sessionId) {
    const sid = String(sessionId || '').trim();
    if (!sid) return { ok: false, valid: false };
    const raw = _cache_().get(_sessKey_(sid));
    if (!raw) return { ok: false, valid: false };
    const sess = JSON.parse(raw);
    DB.log('VALIDATE_OK', sess.email || '', {});
    return { ok: true, valid: true, session: sess };
  }

  function requireSession(sessionId) {
    const v = validate(sessionId);
    if (!v.ok || !v.valid) throw new Error('Sesi tidak valid. Silakan login ulang.');
    return v.session;
  }

  function verifyAdminKey(adminKey) {
    const key = String(adminKey || '').trim();
    if (!key) return false;
    const saved = String(DB.getSetting(CONFIG.SET_ADMIN_KEY) || '').trim();
    return saved && key === saved;
  }

  return { login, validate, requireSession, verifyAdminKey };
})();