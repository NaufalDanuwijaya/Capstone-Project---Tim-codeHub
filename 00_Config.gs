const CONFIG = (() => {
  const PROP_DB_ID = 'DB_ID';

  const SHEETS = {
    USERS: 'USERS',
    TX: 'TRANSACTIONS',
    TX_BENGKEL: 'TX_BENGKEL',
    TX_CUCIAN: 'TX_CUCIAN',
    LOG: 'ACTIVITY_LOG',
    SETTINGS: 'SETTINGS',
  };

  const SET_ADMIN_KEY = 'ADMIN_KEY';
  const REPORT_FOLDER_ID = 'REPORT_FOLDER_ID';

  // Default folder laporan (sesuai link kamu)
  const REPORT_FOLDER_ID_DEFAULT = '1QGB9-quFnMyijO576R56ar5pDr2waeRm';
  const REPORT_FOLDER_NAME = 'Keuangan UMKM - Laporan';

  const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 jam

  return {
    PROP_DB_ID,
    SHEETS,
    SET_ADMIN_KEY,
    REPORT_FOLDER_ID,
    REPORT_FOLDER_ID_DEFAULT,
    REPORT_FOLDER_NAME,
    SESSION_TTL_SECONDS,
  };
})();