import Database from '@tauri-apps/plugin-sql';

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
    if (_db) return _db;
    _db = await Database.load('sqlite:carmentis.db');
    await _db.execute('PRAGMA foreign_keys = ON;');
    return _db;
}
