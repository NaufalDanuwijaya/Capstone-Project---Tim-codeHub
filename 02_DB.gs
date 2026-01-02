const DB = (() => {
  function getDbId_() {
    const id = PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_DB_ID);
    if (!id) throw new Error('DB belum diset. Jalankan runSetup() dulu.');
    return id;
  }

  function ss_() { return SpreadsheetApp.openById(getDbId_()); }

  function sh_(name) {
    const sh = ss_().getSheetByName(name);
    if (!sh) throw new Error(`Sheet tidak ditemukan: ${name}`);
    return sh;
  }

  function getSetting(key) {
    const sh = sh_(CONFIG.SHEETS.SETTINGS);
    const last = sh.getLastRow();
    if (last < 2) return '';
    const values = sh.getRange(2, 1, last - 1, 2).getValues();
    for (const r of values) if (r[0] === key) return String(r[1] || '');
    return '';
  }

  function setSetting(key, value) {
    const sh = sh_(CONFIG.SHEETS.SETTINGS);
    const last = sh.getLastRow();
    if (last < 2) { sh.appendRow([key, value]); return; }
    const values = sh.getRange(2, 1, last - 1, 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === key) { sh.getRange(2 + i, 2).setValue(value); return; }
    }
    sh.appendRow([key, value]);
  }

  function appendRow(sheetName, row) { sh_(sheetName).appendRow(row); }

  function log(action, email, detail) {
    appendRow(CONFIG.SHEETS.LOG, [new Date(), action, email || '', Utils.safeJson(detail)]);
  }

  return { ss: ss_, sh: sh_, getSetting, setSetting, appendRow, log };
})();