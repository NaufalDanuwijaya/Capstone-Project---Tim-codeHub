const DB = (() => {
  function ss_() {
    // karena project ini dibuka dari spreadsheet itu sendiri (bound script)
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function sh_(name) {
    const sh = ss_().getSheetByName(name);
    if (!sh) throw new Error(`Sheet tidak ditemukan: ${name}. Jalankan runSetup() atau buat sheetnya.`);
    return sh;
  }

  function getSetting(key) {
    const sh = sh_(CONFIG.SHEETS.SETTINGS);
    const last = sh.getLastRow();
    if (last < 2) return '';
    const values = sh.getRange(2, 1, last - 1, 2).getValues();
    for (const r of values) if (String(r[0] || '') === key) return String(r[1] || '');
    return '';
  }

  function setSetting(key, value) {
    const sh = sh_(CONFIG.SHEETS.SETTINGS);
    const last = sh.getLastRow();
    if (last < 2) { sh.appendRow([key, value]); return; }

    const values = sh.getRange(2, 1, last - 1, 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '') === key) {
        sh.getRange(2 + i, 2).setValue(value);
        return;
      }
    }
    sh.appendRow([key, value]);
  }

  function log(action, email, detail) {
    sh_(CONFIG.SHEETS.LOG).appendRow([new Date(), action, email || '', Utils.safeJson(detail)]);
  }

  return { ss: ss_, sh: sh_, getSetting, setSetting, log };
})();
