// scripts/import-gtfs.js
import { importGtfs } from 'gtfs';
import sqlite3 from 'sqlite3';

importGtfs({
  agencies: [{
    path: 'src/data/ro-ratbv.zip',
    agency_key: 'ratbv'
  }],
  sqlitePath: 'src/data/ratbv.db',
  sqlite: sqlite3
})
  .then(() => console.log('✅ GTFS import complet!'))
  .catch(err => console.error('❌ Eroare la import:', err));