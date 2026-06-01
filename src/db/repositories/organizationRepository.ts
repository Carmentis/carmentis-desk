import { getDb } from '../database';

export interface OrganizationRow {
    id: number;
    walletId: number;
    name: string;
    vbId?: string;
    countryCode?: string;
    city?: string;
    website?: string;
}

interface DbRow {
    id: number;
    wallet_id: number;
    name: string;
    vb_id: string | null;
    country_code: string | null;
    city: string | null;
    website: string | null;
}

function rowToEntity(row: DbRow): OrganizationRow {
    return {
        id: row.id,
        walletId: row.wallet_id,
        name: row.name,
        vbId: row.vb_id ?? undefined,
        countryCode: row.country_code ?? undefined,
        city: row.city ?? undefined,
        website: row.website ?? undefined,
    };
}

export async function getOrganizationsByWalletId(walletId: number): Promise<OrganizationRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM organizations WHERE wallet_id = ? ORDER BY id', [walletId]);
    return rows.map(rowToEntity);
}

export async function getOrganizationById(id: number): Promise<OrganizationRow | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM organizations WHERE id = ?', [id]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function insertOrganization(
    walletId: number,
    data: Omit<OrganizationRow, 'id' | 'walletId'>,
): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        'INSERT INTO organizations (wallet_id, name, vb_id, country_code, city, website) VALUES (?, ?, ?, ?, ?, ?)',
        [walletId, data.name, data.vbId ?? null, data.countryCode ?? null, data.city ?? null, data.website ?? null],
    );
    return result.lastInsertId;
}

export async function updateOrganization(
    id: number,
    data: Partial<Omit<OrganizationRow, 'id' | 'walletId'>>,
): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.vbId !== undefined) { fields.push('vb_id = ?'); values.push(data.vbId); }
    if (data.countryCode !== undefined) { fields.push('country_code = ?'); values.push(data.countryCode); }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }
    if (data.website !== undefined) { fields.push('website = ?'); values.push(data.website); }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteOrganizationById(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM nodes WHERE org_id = ?', [id]);
    await db.execute('DELETE FROM applications WHERE org_id = ?', [id]);
    await db.execute('DELETE FROM organizations WHERE id = ?', [id]);
}

export async function deleteOrganizationsByWalletId(walletId: number): Promise<void> {
    const db = await getDb();
    const orgs = await db.select<{ id: number }[]>('SELECT id FROM organizations WHERE wallet_id = ?', [walletId]);
    for (const org of orgs) {
        await deleteOrganizationById(org.id);
    }
}
