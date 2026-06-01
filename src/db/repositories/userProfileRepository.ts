import { getDb } from '../database';

interface UserProfileRow {
    id: number;
    pseudo: string;
}

export async function getUserProfile(): Promise<{ pseudo: string } | null> {
    const db = await getDb();
    const rows = await db.select<UserProfileRow[]>('SELECT pseudo FROM user_profile WHERE id = 1');
    if (rows.length === 0) return null;
    return { pseudo: rows[0].pseudo };
}

export async function setUserProfile(pseudo: string): Promise<void> {
    const db = await getDb();
    await db.execute('INSERT OR REPLACE INTO user_profile (id, pseudo) VALUES (1, ?)', [pseudo]);
}
