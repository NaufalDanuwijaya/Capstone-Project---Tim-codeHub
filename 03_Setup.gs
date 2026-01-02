function runSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Buka spreadsheet DB lalu jalankan runSetup()');

  PropertiesService.getScriptProperties().setProperty(CONFIG.PROP_DB_ID, ss.getId());

  ensureSheet_(ss, CONFIG.SHEETS.USERS, [['USER_ID','EMAIL','NAME','PASS_HASH','IS_ACTIVE','CREATED_AT','UPDATED_AT','IS_DELETED']]);
  ensureSheet_(ss, CONFIG.SHEETS.TX, [['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED']]);
  ensureSheet_(ss, CONFIG.SHEETS.TX_BENGKEL, [['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED']]);
  ensureSheet_(ss, CONFIG.SHEETS.TX_CUCIAN, [['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED']]);
  ensureSheet_(ss, CONFIG.SHEETS.LOG, [['TIME','ACTION','EMAIL','DETAIL']]);
  ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, [['KEY','VALUE']]);

  const existingKey = DB.getSetting(CONFIG.SET_ADMIN_KEY);
  if (!existingKey) {
    const key = String(Math.floor(100000 + Math.random() * 900000));
    DB.setSetting(CONFIG.SET_ADMIN_KEY, key);
  }

  const fId = DB.getSetting(CONFIG.REPORT_FOLDER_ID);
  if (!fId) DB.setSetting(CONFIG.REPORT_FOLDER_ID, CONFIG.REPORT_FOLDER_ID_DEFAULT);

  const userSh = DB.sh(CONFIG.SHEETS.USERS);
  if (userSh.getLastRow() < 2) {
    const now = new Date();
    userSh.appendRow([Utils.uuid('U'),'admin@local','Admin',Utils.sha256('admin123'),true,now,now,false]);
  }

  DB.log('SETUP_OK', Session.getActiveUser().getEmail() || '', { dbId: ss.getId() });
  return debugInfo();
}

function ensureSheet_(ss, name, headerRows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, headerRows.length, headerRows[0].length).setValues(headerRows);
  } else {
    const expected = headerRows[0];
    const h = sh.getRange(1, 1, 1, expected.length).getValues()[0];
    const isHeaderEmpty = expected.every((_, i) => !h[i]);
    if (isHeaderEmpty) sh.getRange(1, 1, 1, expected.length).setValues([expected]);
  }
}

function debugInfo() {
  const ss = DB.ss();
  const tx = DB.sh(CONFIG.SHEETS.TX);
  const last = tx.getLastRow();

  return {
    ok: true,
    dbId: ss.getId(),
    dbUrl: ss.getUrl(),
    sheets: ss.getSheets().map(s => s.getName()),
    txLastRow: last,
    txSample: (last >= 2) ? tx.getRange(2,1,Math.min(3,last-1),10).getValues() : []
  };
}