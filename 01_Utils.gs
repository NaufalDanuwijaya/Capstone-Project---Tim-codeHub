const Utils = (() => {
  function toDate(value) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    const s = String(value).trim();
    if (!s) return null;

    // dd/mm/yyyy atau dd-mm-yyyy
    const m2 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m2) {
      const dd = Number(m2[1]);
      const mm = Number(m2[2]) - 1;
      const yy = Number(m2[3]);
      const d = new Date(yy, mm, dd);
      return isNaN(d.getTime()) ? null : d;
    }

    // yyyy-mm-dd atau yyyy/mm/dd
    const m3 = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (m3) {
      const yy = Number(m3[1]);
      const mm = Number(m3[2]) - 1;
      const dd = Number(m3[3]);
      const d = new Date(yy, mm, dd);
      return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function dateOnly(d) {
    if (!(d instanceof Date)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatYMD(d) {
    const dt = (d instanceof Date) ? d : toDate(d);
    if (!dt) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function toNumber(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const s = String(v);
    const digits = s.replace(/[^\d]/g, '');
    if (!digits) return 0;
    const n = Number(digits);
    return isNaN(n) ? 0 : n;
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function sha256(text) {
    const raw = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(text || ''),
      Utilities.Charset.UTF_8
    );
    return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  }

  function uuid(prefix) {
    const p = String(prefix || 'ID').trim();
    return `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  function safeJson(obj) {
    try { return JSON.stringify(obj || {}); }
    catch (e) { return '{}'; }
  }

  function clampInt(n, def, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = def;
    n = Math.floor(n);
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  return { toDate, dateOnly, formatYMD, toNumber, normalizeEmail, sha256, uuid, safeJson, clampInt };
})();
