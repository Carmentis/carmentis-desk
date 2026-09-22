import { Dexie, type EntityTable } from "dexie"
import {
    Application,
    Organization,
    Wallet,
    Node,
    ApplicationLedger,
    SubmittedMicroblock,
    DeskState
} from "../types/types.ts";

// primary key "id" (for the typings only)
const db = new Dexie('CarmentisDesk') as Dexie & {
    wallets: EntityTable<Wallet, 'id'>;
    organizations: EntityTable<Organization, 'id'>,
    applications: EntityTable<Application, 'id'>,
    nodes: EntityTable<Node, 'id'>,
    applicationLedgers: EntityTable<ApplicationLedger, 'id'>,
    submittedMicroblocks: EntityTable<SubmittedMicroblock, 'id'>,
    deskState: EntityTable<DeskState, 'id'>,
};

db
    .version(1)
    .stores({
        // primary key "id" (for the runtime!)
        wallets: '++id',
        organizations: '++id, walletId, organizationVbId',
        applications: '++id, organizationId, applicationVbId',
        nodes: '++id, organizationId, nodeVbId',
        applicationLedgers: '++id, applicationId, applicationLedgerVbId',
        submittedMicroblocks: '++id, height, microblockHash, vbId, vbType',
        deskState: 'id',
    });
export { db };