function runSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ensure sheet exist
  const shUsers = ensureSheet_(ss, CONFIG.SHEETS.USERS);
  const shTx = ensureSheet_(ss, CONFIG.SHEETS.TX);
  const shB = ensureSheet_(ss, CONFIG.SHEETS.TX_BENGKEL);
  const shC = ensureSheet_(ss, CONFIG.SHEETS.TX_CUCIAN);
  const shLog = ensureSheet_(ss, CONFIG.SHEETS.LOG);
  const shSet = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS);

  // headers (set ONLY if row 1 empty)
  setHeaderIfEmpty_(shUsers, ['USER_ID','EMAIL','NAME','PASSWORD_HASH','IS_ACTIVE','CREATED_AT','UPDATED_AT','IS_DELETED']);
  setHeaderIfEmpty_(shTx, ['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED']);
  setHeaderIfEmpty_(shB,  ['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED']);
  setHeaderIfEmpty_(shC,  ['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED']);
  setHeaderIfEmpty_(shLog, ['TIME','ACTION','EMAIL','DETAIL']);
  setHeaderIfEmpty_(shSet, ['KEY','VALUE']);

  // seed admin key if empty
  const adminHash = DB.getSetting(CONFIG.ADMIN_KEY_HASH);
  if (!adminHash) {
    // default admin key: 123456 (kamu bisa ganti nanti)
    DB.setSetting(CONFIG.ADMIN_KEY_HASH, Utils.sha256('123456'));
  }

  // seed user admin if USERS empty
  if (shUsers.getLastRow() < 2) {
    const now = new Date();
    shUsers.appendRow([
      Utils.uuid('U'),
      'admin@local',
      'Admin',
      Utils.sha256('admin123'),
      true,
      now,
      now,
      false
    ]);
  }

  DB.log('SETUP_OK', 'system', {
    sheets: ss.getSheets().map(s => s.getName()),
    defaultAdmin: 'admin@local / admin123',
    defaultAdminKey: '123456'
  });

  Logger.log({ ok:true, msg:'Setup selesai', url:ss.getUrl() });
  return { ok:true };
}

function ensureSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function setHeaderIfEmpty_(sh, headers) {
  const r = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = r.every(x => String(x || '').trim() === '');
  if (isEmpty) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}
