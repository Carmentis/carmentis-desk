import { getDb } from '../database';

export interface NodeRow {
    id: number;
    orgId: number;
    name: string;
    vbId?: string;
    rpcEndpoint: string;
}

interface DbRow {
    id: number;
    org_id: number;
    name: string;
    vb_id: string | null;
    rpc_endpoint: string;
}

function rowToEntity(row: DbRow): NodeRow {
    return {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        vbId: row.vb_id ?? undefined,
        rpcEndpoint: row.rpc_endpoint,
    };
}

export async function getNodesByOrgId(orgId: number): Promise<NodeRow[]> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM nodes WHERE org_id = ? ORDER BY id', [orgId]);
    return rows.map(rowToEntity);
}

export async function getNodeById(id: number): Promise<NodeRow | null> {
    const db = await getDb();
    const rows = await db.select<DbRow[]>('SELECT * FROM nodes WHERE id = ?', [id]);
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
}

export async function insertNode(orgId: number, data: Omit<NodeRow, 'id' | 'orgId'>): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        'INSERT INTO nodes (org_id, name, vb_id, rpc_endpoint) VALUES (?, ?, ?, ?)',
        [orgId, data.name, data.vbId ?? null, data.rpcEndpoint],
    );
    return result.lastInsertId;
}

export async function insertManyNodes(orgId: number, nodes: Omit<NodeRow, 'id' | 'orgId'>[]): Promise<NodeRow[]> {
    const inserted: NodeRow[] = [];
    for (const node of nodes) {
        const id = await insertNode(orgId, node);
        inserted.push({ id, orgId, ...node });
    }
    return inserted;
}

export async function updateNode(id: number, data: Partial<Omit<NodeRow, 'id' | 'orgId'>>): Promise<void> {
    const db = await getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.vbId !== undefined) { fields.push('vb_id = ?'); values.push(data.vbId); }
    if (data.rpcEndpoint !== undefined) { fields.push('rpc_endpoint = ?'); values.push(data.rpcEndpoint); }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE nodes SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteNodeById(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM nodes WHERE id = ?', [id]);
}

export async function deleteNodesByOrgId(orgId: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM nodes WHERE org_id = ?', [orgId]);
}

export async function isNodeDeclared(orgId: number, vbId: string): Promise<boolean> {
    const db = await getDb();
    const rows = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM nodes WHERE org_id = ? AND lower(trim(vb_id)) = lower(trim(?))',
        [orgId, vbId],
    );
    return (rows[0]?.count ?? 0) > 0;
}
