import { getDb } from '../database';

export interface WalletRow {
    id: number;
    name: string;
    nodeEndpoint: string;
    indexer: string;
    schemeId: number;
}

interface DbRow {
    id: number;
    name: string;
    node_endpoint: string;
    indexer: string;
    schemeId: number;
}

function rowToEntity(row: DbRow): WalletRow {
    return {
        id: row.id,
        name: row.name,
        nodeEndpoint: row.node_endpoint,
        indexer: row.indexer,
        schemeId: row.schemeId,
    };
}

export async function getAllWallets(): Promise<WalletRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM wallets ORDER BY id');
    return rows.map(rowToEntity);
}

export async function getWalletById(id: number): Promise<WalletRow | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM wallets WHERE id = ?', [id]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function insertWallet(data: Omit<WalletRow, 'id'>): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        'INSERT INTO wallets (name, node_endpoint, indexer, schemeId) VALUES (?, ?, ?, ?)',
        [data.name, data.nodeEndpoint, data.indexer ?? null, data.schemeId],
    );
    return result.lastInsertId!;
}

export async function updateWallet(id: number, data: Partial<Omit<WalletRow, 'id'>>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.nodeEndpoint !== undefined) { fields.push('node_endpoint = ?'); values.push(data.nodeEndpoint); }
    if (data.indexer !== undefined) { fields.push('indexer = ?'); values.push(data.indexer); }
    if (data.schemeId !== undefined) { fields.push('schemeId = ?'); values.push(data.schemeId); }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteWalletById(id: number): Promise<void> {
    const db = await getDb();
    // Cascade manually: delete children first
    const orgs = await db.select<{ id: number }[]>('SELECT id FROM organizations WHERE wallet_id = ?', [id]);
    for (const org of orgs) {
        await db.execute('DELETE FROM nodes WHERE org_id = ?', [org.id]);
        await db.execute('DELETE FROM applications WHERE org_id = ?', [org.id]);
    }
    await db.execute('DELETE FROM organizations WHERE wallet_id = ?', [id]);
    await db.execute('DELETE FROM app_ledger_entries WHERE wallet_id = ?', [id]);
    await db.execute('DELETE FROM app_participations WHERE wallet_id = ?', [id]);
    await db.execute('DELETE FROM credentials WHERE wallet_id = ?', [id]);
    await db.execute('DELETE FROM wallets WHERE id = ?', [id]);
}

export async function deleteAllWallets(): Promise<void> {
    const db = await getDb();
    const wallets = await db.select<{ id: number }[]>('SELECT id FROM wallets');
    for (const w of wallets) {
        await deleteWalletById(w.id);
    }
}
