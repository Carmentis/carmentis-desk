import { getDb } from '../database';
import type { CredentialEntity } from '../../stores/storage';

interface DbRow {
    id: number;
    wallet_id: number;
    name: string;
    data: string;
}

function rowToEntity(row: DbRow): CredentialEntity {
    return { id: row.id, name: row.name, data: row.data };
}

export async function getCredentialsByWalletId(walletId: number): Promise<CredentialEntity[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>(
        'SELECT * FROM credentials WHERE wallet_id = ? ORDER BY id',
        [walletId],
    );
    return rows.map(rowToEntity);
}

export async function insertCredential(
    walletId: number,
    data: Omit<CredentialEntity, 'id'>,
): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        'INSERT INTO credentials (wallet_id, name, data) VALUES (?, ?, ?)',
        [walletId, data.name, data.data],
    );
    return result.lastInsertId!;
}

export async function deleteCredentialById(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM credentials WHERE id = ?', [id]);
}

export async function deleteCredentialsByWalletId(walletId: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM credentials WHERE wallet_id = ?', [walletId]);
}
