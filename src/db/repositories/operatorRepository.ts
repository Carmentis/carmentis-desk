import { getDb } from '../database';
import type { OperatorEntity } from '../../stores/storage';

interface DbRow {
    id: number;
    name: string;
    http_endpoint: string;
    wallet_id: number | null;
    public_key: string | null;
    pseudo: string | null;
}

function rowToEntity(row: DbRow): OperatorEntity {
    return {
        id: row.id,
        name: row.name,
        httpEndpoint: row.http_endpoint,
        walletId: row.wallet_id ?? undefined,
        publicKey: row.public_key ?? undefined,
        pseudo: row.pseudo ?? undefined,
    };
}

export async function getAllOperators(): Promise<OperatorEntity[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM operators ORDER BY id');
    return rows.map(rowToEntity);
}

export async function getOperatorById(id: number): Promise<OperatorEntity | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM operators WHERE id = ?', [id]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function insertOperator(data: Omit<OperatorEntity, 'id'>): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        'INSERT INTO operators (name, http_endpoint, wallet_id, public_key, pseudo) VALUES (?, ?, ?, ?, ?)',
        [data.name, data.httpEndpoint, data.walletId ?? null, data.publicKey ?? null, data.pseudo ?? null],
    );
    return result.lastInsertId;
}

export async function deleteOperatorById(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM operators WHERE id = ?', [id]);
}

export async function deleteAllOperators(): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM operators');
}

export async function insertManyOperators(operators: Omit<OperatorEntity, 'id'>[]): Promise<void> {
    for (const op of operators) {
        await insertOperator(op);
    }
}
