import { getDb } from '../database';

export interface MicroblockRow {
    microblockHash: string;
    vbId: string;
    b64EncodedMicroblock: string | null;
    createdAt: string;
    height: number;
    publishedByMe: number;
    publishedToOperator: string | null;
}

interface DbRow {
    microblock_hash: string;
    vb_id: string;
    b64_encoded_microblock: string | null;
    created_at: string;
    height: number;
    published_by_me: number;
    published_to_operator: string | null;
}

function rowToEntity(row: DbRow): MicroblockRow {
    return {
        microblockHash: row.microblock_hash,
        vbId: row.vb_id,
        b64EncodedMicroblock: row.b64_encoded_microblock,
        createdAt: row.created_at,
        height: row.height,
        publishedByMe: row.published_by_me,
        publishedToOperator: row.published_to_operator,
    };
}

export async function getAllMicroblocks(): Promise<MicroblockRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM microblock ORDER BY microblock_hash');
    return rows.map(rowToEntity);
}

export async function getMicroblockById(microblockHash: string): Promise<MicroblockRow | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM microblock WHERE microblock_hash = ?', [microblockHash]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function getMicroblocksByVbId(vbId: string): Promise<MicroblockRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM microblock WHERE vb_id = ? ORDER BY microblock_hash', [vbId]);
    return rows.map(rowToEntity);
}

export async function insertMicroblock(data: Omit<MicroblockRow, 'createdAt'>): Promise<void> {
    const db = await getDb();
    await db.execute(
        'INSERT INTO microblock (microblock_hash, vb_id, b64_encoded_microblock, height, published_by_me, published_to_operator) VALUES (?, ?, ?, ?, ?, ?)',
        [data.microblockHash, data.vbId, data.b64EncodedMicroblock ?? null, data.height, data.publishedByMe, data.publishedToOperator ?? null],
    );
}

export async function updateMicroblock(microblockHash: string, data: Partial<Omit<MicroblockRow, 'microblockHash' | 'createdAt'>>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.vbId !== undefined) { fields.push('vb_id = ?'); values.push(data.vbId); }
    if (data.b64EncodedMicroblock !== undefined) { fields.push('b64_encoded_microblock = ?'); values.push(data.b64EncodedMicroblock); }
    if (data.height !== undefined) { fields.push('height = ?'); values.push(data.height); }
    if (data.publishedByMe !== undefined) { fields.push('published_by_me = ?'); values.push(data.publishedByMe); }
    if (data.publishedToOperator !== undefined) { fields.push('published_to_operator = ?'); values.push(data.publishedToOperator); }
    if (fields.length === 0) return;
    values.push(microblockHash);
    await db.execute(`UPDATE microblock SET ${fields.join(', ')} WHERE microblock_hash = ?`, values);
}

export async function deleteMicroblockById(microblockHash: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM microblock WHERE microblock_hash = ?', [microblockHash]);
}

export async function deleteAllMicroblocks(): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM microblock');
}
