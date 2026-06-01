import { getDb } from '../database';

export interface ApplicationRow {
    id: number;
    orgId: number;
    name: string;
    vbId?: string;
    description?: string;
    website?: string;
}

interface DbRow {
    id: number;
    org_id: number;
    name: string;
    vb_id: string | null;
    description: string | null;
    website: string | null;
}

function rowToEntity(row: DbRow): ApplicationRow {
    return {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        vbId: row.vb_id ?? undefined,
        description: row.description ?? undefined,
        website: row.website ?? undefined,
    };
}

export async function getApplicationsByOrgId(orgId: number): Promise<ApplicationRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM applications WHERE org_id = ? ORDER BY id', [orgId]);
    return rows.map(rowToEntity);
}

export async function getApplicationById(id: number): Promise<ApplicationRow | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM applications WHERE id = ?', [id]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function insertApplication(orgId: number, data: Omit<ApplicationRow, 'id' | 'orgId'>): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        'INSERT INTO applications (org_id, name, vb_id, description, website) VALUES (?, ?, ?, ?, ?)',
        [orgId, data.name, data.vbId ?? null, data.description ?? null, data.website ?? null],
    );
    return result.lastInsertId;
}

export async function updateApplication(
    id: number,
    data: Partial<Omit<ApplicationRow, 'id' | 'orgId'>>,
): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.vbId !== undefined) { fields.push('vb_id = ?'); values.push(data.vbId); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.website !== undefined) { fields.push('website = ?'); values.push(data.website); }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE applications SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteApplicationById(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM applications WHERE id = ?', [id]);
}

export async function deleteApplicationsByOrgId(orgId: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM applications WHERE org_id = ?', [orgId]);
}
