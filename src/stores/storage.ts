import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getDb } from '../db/database';
import * as walletRepo from '../db/repositories/walletRepository';
import * as operatorRepo from '../db/repositories/operatorRepository';
import * as orgRepo from '../db/repositories/organizationRepository';
import * as nodeRepo from '../db/repositories/nodeRepository';
import * as appRepo from '../db/repositories/applicationRepository';
import * as participationRepo from '../db/repositories/participationRepository';
import * as credentialRepo from '../db/repositories/credentialRepository';
import { useSessionStore } from './sessionStore';

// ─── Exported entity interfaces (unchanged for type compatibility) ────────────

export interface ApplicationEntity {
    id: number;
    vbId?: string;
    name: string;
    description?: string;
    website?: string;
}

export interface NodeEntity {
    id: number;
    vbId?: string;
    name: string;
    rpcEndpoint: string;
}

export interface OrganizationEntity {
    id: number;
    name: string;
    vbId?: string;
    countryCode?: string;
    city?: string;
    website?: string;
    nodes: NodeEntity[];
    applications: ApplicationEntity[];
}

export interface OperatorEntity {
    id: number;
    name: string;
    httpEndpoint: string;
    walletId?: number;
    publicKey?: string;
    pseudo?: string;
}

export interface AppLedgerParticipation {
    id: string;
    operatorEndpoint: string;
    b64EncodedMicroblock: string;
}

export interface ApplicationParticipation {
    id: string;
    appLedgers: AppLedgerParticipation[];
}

export interface CredentialEntity {
    id: number;
    name: string;
    data: string;
}

export interface WalletEntity {
    id: number;
    name: string;
    seed: string;
    nodeEndpoint: string;
    schemeId: number;
    indexer: string;
    organizations: OrganizationEntity[];
    participations: ApplicationParticipation[];
    credentials?: CredentialEntity[];
}

/** Shallow wallet — only top-level fields, no children loaded. Seed is in Stronghold. */
export type WalletStub = Pick<WalletEntity, 'id' | 'name' | 'nodeEndpoint' | 'indexer' | 'schemeId'>;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStorageStore = defineStore('storage', () => {
    const initialized = ref(false);
    /** Shallow wallet list — no organizations/participations/credentials loaded. */
    const organizations = ref<WalletStub[]>([]);
    const wallets = organizations; // alias
    const operators = ref<OperatorEntity[]>([]);

    async function initStorage(): Promise<void> {
        await getDb(); // ensure DB is open and migrations run
        organizations.value = await walletRepo.getAllWallets();
        operators.value = await operatorRepo.getAllOperators();
        initialized.value = true;
    }

    // ── Wallet CRUD ───────────────────────────────────────────────────────────

    async function addOrganization(
        data: Omit<WalletEntity, 'id' | 'organizations' | 'participations' | 'credentials'>,
    ): Promise<number> {
        const session = useSessionStore();
        const walletId = await walletRepo.insertWallet({
            name: data.name,
            nodeEndpoint: data.nodeEndpoint,
            indexer: data.indexer,
            schemeId: data.schemeId,
        });
        await session.storeWalletSeed(walletId, data.seed);
        organizations.value = await walletRepo.getAllWallets();
        return walletId
    }

    async function removeOrganizationById(walletId: number): Promise<void> {
        const session = useSessionStore();
        await session.deleteWalletSeed(walletId);
        await walletRepo.deleteWalletById(walletId);
        organizations.value = organizations.value.filter((w) => w.id !== walletId);
    }

    async function clearOrganizations(): Promise<void> {
        const session = useSessionStore();
        const ids = organizations.value.map((w) => w.id);
        for (const id of ids) {
            await session.deleteWalletSeed(id);
        }
        await walletRepo.deleteAllWallets();
        organizations.value = [];
    }

    async function getWalletById(walletId: number): Promise<WalletStub | null> {
        return walletRepo.getWalletById(walletId);
    }

    // ── Operator CRUD ─────────────────────────────────────────────────────────

    async function addOperator(data: Omit<OperatorEntity, 'id'>): Promise<void> {
        await operatorRepo.insertOperator(data);
        operators.value = await operatorRepo.getAllOperators();
    }

    async function deleteOperatorById(operatorId: number): Promise<void> {
        await operatorRepo.deleteOperatorById(operatorId);
        operators.value = operators.value.filter((op) => op.id !== operatorId);
    }

    async function clearOperators(): Promise<void> {
        await operatorRepo.deleteAllOperators();
        operators.value = [];
    }

    // ── Bulk import/export ────────────────────────────────────────────────────

    /**
     * Replaces all data with the provided nested structure.
     * Accepts the legacy WalletEntity[] + OperatorEntity[] format for compatibility
     * with the export feature.
     */
    async function importAllData(data: {
        organizations: WalletEntity[];
        operators: OperatorEntity[];
    }): Promise<void> {
        const session = useSessionStore();

        // Delete existing seeds from Stronghold before wiping DB
        for (const w of organizations.value) {
            await session.deleteWalletSeed(w.id);
        }
        await walletRepo.deleteAllWallets();
        await operatorRepo.deleteAllOperators();

        for (const wallet of data.organizations) {
            const walletId = await walletRepo.insertWallet({
                name: wallet.name,
                nodeEndpoint: wallet.nodeEndpoint,
                indexer: wallet.indexer,
                schemeId: wallet.schemeId,
            });
            await session.storeWalletSeed(walletId, wallet.seed);

            for (const org of wallet.organizations ?? []) {
                const orgId = await orgRepo.insertOrganization(walletId, {
                    name: org.name,
                    vbId: org.vbId,
                    countryCode: org.countryCode,
                    city: org.city,
                    website: org.website,
                });
                for (const node of org.nodes ?? []) {
                    await nodeRepo.insertNode(orgId, {
                        name: node.name,
                        vbId: node.vbId,
                        rpcEndpoint: node.rpcEndpoint,
                    });
                }
                for (const app of org.applications ?? []) {
                    await appRepo.insertApplication(orgId, {
                        name: app.name,
                        vbId: app.vbId,
                        description: app.description,
                        website: app.website,
                    });
                }
            }

            for (const participation of wallet.participations ?? []) {
                for (const ledger of participation.appLedgers ?? []) {
                    await participationRepo.insertAppLedger(walletId, participation.id, ledger);
                }
            }

            for (const credential of wallet.credentials ?? []) {
                await credentialRepo.insertCredential(walletId, {
                    name: credential.name,
                    data: credential.data,
                });
            }
        }

        for (const op of data.operators) {
            await operatorRepo.insertOperator({
                name: op.name,
                httpEndpoint: op.httpEndpoint,
                walletId: op.walletId,
                publicKey: op.publicKey,
                pseudo: op.pseudo,
            });
        }

        organizations.value = await walletRepo.getAllWallets();
        operators.value = await operatorRepo.getAllOperators();
    }

    return {
        initialized,
        organizations,
        wallets,
        operators,
        initStorage,
        // wallet ops
        addOrganization,
        removeOrganizationById,
        clearOrganizations,
        getWalletById,
        // operator ops
        addOperator,
        deleteOperatorById,
        clearOperators,
        importAllData,
    };
});
