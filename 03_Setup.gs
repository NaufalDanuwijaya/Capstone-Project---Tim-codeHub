/**
 * Fungsi utama Setup
 */
function runSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const shUsers = ensureSheet_(ss, CONFIG.SHEETS.USERS);
  const shTx = ensureSheet_(ss, CONFIG.SHEETS.TX);
  const shB = ensureSheet_(ss, CONFIG.SHEETS.TX_BENGKEL);
  const shC = ensureSheet_(ss, CONFIG.SHEETS.TX_CUCIAN);
  const shLog = ensureSheet_(ss, CONFIG.SHEETS.LOG);
  const shSet = ensureSheet_(ss, CONFIG.SHEETS.SETTINGS);

  // Header definisi (Updated dengan ROLE di USERS)
  const headerUsers = ['USER_ID','EMAIL','NAME','PASSWORD_HASH','IS_ACTIVE','CREATED_AT','UPDATED_AT','IS_DELETED','ROLE'];
  const headerTx    = ['TX_ID','DATE','UMKM','TYPE','PAYMENT_METHOD','AMOUNT','NOTE','CREATED_AT','UPDATED_AT','IS_DELETED','USER'];
  const headerLog   = ['TIME','ACTION','EMAIL','DETAIL'];
  const headerSet   = ['KEY','VALUE'];

  setHeaderIfEmpty_(shUsers, headerUsers);
  setHeaderIfEmpty_(shTx, headerTx);
  setHeaderIfEmpty_(shB, headerTx);
  setHeaderIfEmpty_(shC, headerTx);
  setHeaderIfEmpty_(shLog, headerLog);
  setHeaderIfEmpty_(shSet, headerSet);

  // Seed admin key
  const adminHash = DB.getSetting(CONFIG.ADMIN_KEY_HASH);
  if (!adminHash) {
    DB.setSetting(CONFIG.ADMIN_KEY_HASH, Utils.sha256('123456'));
  }

  // Seed user owner default
  if (shUsers.getLastRow() < 2) {
    const now = new Date();
    shUsers.appendRow([
      Utils.uuid('U'),
      'admin@local',
      'Owner Default',
      Utils.sha256('admin123'),
      true,
      now,
      now,
      false,
      'OWNER' // Default role
    ]);
  }

  DB.log('SETUP_OK', 'system', {
    sheets: ss.getSheets().map(s => s.getName()),
    msg: 'Setup berhasil dijalankan'
  });

  Logger.log({ ok:true, msg:'Setup selesai' });
  return { ok:true };
}

/**
 * --- FUNGSI MIGRASI ROLE ---
 * Pilih fungsi ini dan klik RUN untuk menambah kolom ROLE di sheet USERS
 */
function tambahKolomRole() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.SHEETS.USERS);
  
  if (sh) {
    // Cek header di kolom 9 (I)
    const range = sh.getRange(1, 9); 
    const val = range.getValue();
    
    if (String(val).toUpperCase() !== 'ROLE') {
      range.setValue('ROLE').setFontWeight('bold');
      
      // Update user yang sudah ada menjadi OWNER agar tidak terkunci
      const last = sh.getLastRow();
      if (last >= 2) {
        // Set range dari baris 2 s/d terakhir, kolom 9
        sh.getRange(2, 9, last - 1, 1).setValue('OWNER');
      }
      
      Logger.log(`[OK] Kolom ROLE ditambahkan.`);
    } else {
      Logger.log(`[SKIP] Sheet USERS sudah punya kolom ROLE.`);
    }
  } else {
    Logger.log(`[WARN] Sheet USERS tidak ditemukan.`);
  }
  return "Proses migrasi Role selesai.";
}

function tambahKolomUser() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheets = [CONFIG.SHEETS.TX, CONFIG.SHEETS.TX_BENGKEL, CONFIG.SHEETS.TX_CUCIAN];
  
  targetSheets.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) {
      const range = sh.getRange(1, 11); 
      const val = range.getValue();
      if (String(val).toUpperCase() !== 'USER') {
        range.setValue('USER').setFontWeight('bold');
        Logger.log(`[OK] Kolom USER ditambahkan ke sheet: ${name}`);
      }
    }
  });
  return "Proses penambahan kolom User selesai.";
}

// Helper
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
