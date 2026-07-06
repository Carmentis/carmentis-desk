import { getDb } from '../database';

export interface VirtualBlockchainRow {
    vbId: string;
    walletId: number;
    vbType: number;
}

interface DbRow {
    vb_id: string;
    wallet_id: number;
    vb_type: number;
}

function rowToEntity(row: DbRow): VirtualBlockchainRow {
    return {
        vbId: row.vb_id,
        walletId: row.wallet_id,
        vbType: row.vb_type,
    };
}

export async function getAllVirtualBlockchains(): Promise<VirtualBlockchainRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM virtual_blockchain ORDER BY vb_id');
    return rows.map(rowToEntity);
}

export async function getVirtualBlockchainById(vbId: string): Promise<VirtualBlockchainRow | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM virtual_blockchain WHERE vb_id = ?', [vbId]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function getVirtualBlockchainsByWalletId(walletId: number): Promise<VirtualBlockchainRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM virtual_blockchain WHERE wallet_id = ? ORDER BY vb_id', [walletId]);
    return rows.map(rowToEntity);
}

export async function insertVirtualBlockchain(data: VirtualBlockchainRow): Promise<void> {
    const db = await getDb();
    await db.execute(
        'INSERT INTO virtual_blockchain (vb_id, wallet_id, vb_type) VALUES (?, ?, ?)',
        [data.vbId, data.walletId, data.vbType],
    );
}

export async function updateVirtualBlockchain(vbId: string, data: Partial<Omit<VirtualBlockchainRow, 'vbId'>>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.walletId !== undefined) { fields.push('wallet_id = ?'); values.push(data.walletId); }
    if (data.vbType !== undefined) { fields.push('vb_type = ?'); values.push(data.vbType); }
    if (fields.length === 0) return;
    values.push(vbId);
    await db.execute(`UPDATE virtual_blockchain SET ${fields.join(', ')} WHERE vb_id = ?`, values);
}

export async function deleteVirtualBlockchainById(vbId: string): Promise<void> {
    const db = await getDb();
    // ON DELETE CASCADE in the database will handle microblock deletion
    await db.execute('DELETE FROM virtual_blockchain WHERE vb_id = ?', [vbId]);
}

export async function deleteAllVirtualBlockchains(): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM virtual_blockchain');
}
