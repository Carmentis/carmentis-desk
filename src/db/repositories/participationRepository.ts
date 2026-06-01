import { getDb } from '../database';
import type { ApplicationParticipation, AppLedgerParticipation } from '../../stores/storage';

interface LedgerDbRow {
    id: string;
    app_participation_id: string;
    wallet_id: number;
    operator_endpoint: string;
    b64_encoded_microblock: string;
}

function ledgerRowToEntity(row: LedgerDbRow): AppLedgerParticipation {
    return {
        id: row.id,
        operatorEndpoint: row.operator_endpoint,
        b64EncodedMicroblock: row.b64_encoded_microblock,
    };
}

export async function getAppParticipationsByWalletId(walletId: number): Promise<ApplicationParticipation[]> {
    const db = await getDb();
    const participations = await db.select<{ id: string }[]>(
        'SELECT id FROM app_participations WHERE wallet_id = ? ORDER BY id',
        [walletId],
    );
    return Promise.all(
        participations.map(async (p) => {
            const ledgers = await getAppLedgersByParticipation(walletId, p.id);
            return { id: p.id, appLedgers: ledgers };
        }),
    );
}

export async function getAppLedgersByParticipation(
    walletId: number,
    appParticipationId: string,
): Promise<AppLedgerParticipation[]> {
    const db = await getDb();
    const rows = await db.select<LedgerDbRow[]>(
        'SELECT * FROM app_ledger_entries WHERE wallet_id = ? AND app_participation_id = ? ORDER BY id',
        [walletId, appParticipationId],
    );
    return rows.map(ledgerRowToEntity);
}

export async function upsertAppParticipation(walletId: number, appId: string): Promise<void> {
    const db = await getDb();
    await db.execute(
        'INSERT OR IGNORE INTO app_participations (id, wallet_id) VALUES (?, ?)',
        [appId, walletId],
    );
}

export async function insertAppLedger(
    walletId: number,
    appParticipationId: string,
    ledger: AppLedgerParticipation,
): Promise<void> {
    await upsertAppParticipation(walletId, appParticipationId);
    const db = await getDb();
    await db.execute(
        'INSERT OR IGNORE INTO app_ledger_entries (id, app_participation_id, wallet_id, operator_endpoint, b64_encoded_microblock) VALUES (?, ?, ?, ?, ?)',
        [ledger.id, appParticipationId, walletId, ledger.operatorEndpoint, ledger.b64EncodedMicroblock],
    );
}

export async function deleteAppLedger(
    walletId: number,
    appParticipationId: string,
    ledgerVbId: string,
): Promise<void> {
    const db = await getDb();
    await db.execute(
        'DELETE FROM app_ledger_entries WHERE id = ? AND app_participation_id = ? AND wallet_id = ?',
        [ledgerVbId, appParticipationId, walletId],
    );
    // Remove parent participation if it has no ledgers left
    const remaining = await db.select<{ count: number }[]>(
        'SELECT COUNT(*) as count FROM app_ledger_entries WHERE app_participation_id = ? AND wallet_id = ?',
        [appParticipationId, walletId],
    );
    if ((remaining[0]?.count ?? 0) === 0) {
        await db.execute(
            'DELETE FROM app_participations WHERE id = ? AND wallet_id = ?',
            [appParticipationId, walletId],
        );
    }
}

export async function deleteAppParticipationsByWalletId(walletId: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM app_ledger_entries WHERE wallet_id = ?', [walletId]);
    await db.execute('DELETE FROM app_participations WHERE wallet_id = ?', [walletId]);
}
