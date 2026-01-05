const Auth = (() => {
  function login(email, password) {
    const em = Utils.normalizeEmail(email);
    const pass = String(password || '');

    if (!em || !pass) throw new Error('Email dan password wajib');

    const user = findUserByEmail_(em);
    if (!user || user.isDeleted || !user.isActive) throw new Error('Akun tidak aktif / tidak ditemukan');

    const passHash = Utils.sha256(pass);
    if (passHash !== user.passwordHash) throw new Error('Email atau password salah');

    const sessionId = createSession_(user);
    return { ok: true, sessionId, email: user.email, name: user.name };
  }

  function validate(sessionId) {
    const s = getSession_(sessionId);
    return s ? { ok: true, email: s.email, name: s.name } : { ok: false };
  }

  function requireSession(sessionId) {
    const s = getSession_(sessionId);
    if (!s) throw new Error('Sesi tidak valid. Silakan login lagi.');
    return s;
  }

  function verifyAdminKey(adminKey) {
    const key = String(adminKey || '').trim();
    if (!key) return false;
    const hash = DB.getSetting(CONFIG.ADMIN_KEY_HASH);
    if (!hash) return false;
    return Utils.sha256(key) === hash;
  }

  // ===== internal =====
  function findUserByEmail_(email) {
    const sh = DB.sh(CONFIG.SHEETS.USERS);
    const last = sh.getLastRow();
    if (last < 2) return null;

    const values = sh.getRange(2, 1, last - 1, 8).getValues();
    for (const r of values) {
      const isDeleted = r[7] === true;
      const em = Utils.normalizeEmail(r[1]);
      if (em === email && !isDeleted) {
        return {
          userId: String(r[0] || ''),
          email: em,
          name: String(r[2] || ''),
          passwordHash: String(r[3] || ''),
          isActive: r[4] === true,
          isDeleted: false
        };
      }
    }
    return null;
  }

  function createSession_(user) {
    const sessionId = `S-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const ttl = Number(CONFIG.SESSION_TTL_MINUTES || 720);
    const cache = CacheService.getScriptCache();
    cache.put(sessionId, JSON.stringify({
      email: user.email,
      name: user.name,
      userId: user.userId,
      exp: Date.now() + ttl * 60 * 1000
    }), ttl * 60);
    return sessionId;
  }

  function getSession_(sessionId) {
    sessionId = String(sessionId || '').trim();
    if (!sessionId) return null;

    const cache = CacheService.getScriptCache();
    const raw = cache.get(sessionId);
    if (!raw) return null;

    try {
      const obj = JSON.parse(raw);
      if (!obj || !obj.exp || Date.now() > obj.exp) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  return { login, validate, requireSession, verifyAdminKey };
})();
