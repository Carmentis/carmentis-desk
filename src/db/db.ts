import { Dexie, type EntityTable } from "dexie"
import {
    Application,
    Organization,
    Wallet,
    Node,
    ApplicationLedger,
    SubmittedMicroblock,
    DeskState,
    VerifiableCredential
} from "../types/types.ts";
import type { Activity } from "../types/activity.ts";

// primary key "id" (for the typings only)
const db = new Dexie('CarmentisDesk') as Dexie & {
    wallets: EntityTable<Wallet, 'id'>;
    credentials: EntityTable<VerifiableCredential, 'id'>,
    organizations: EntityTable<Organization, 'id'>,
    applications: EntityTable<Application, 'id'>,
    nodes: EntityTable<Node, 'id'>,
    applicationLedgers: EntityTable<ApplicationLedger, 'id'>,
    submittedMicroblocks: EntityTable<SubmittedMicroblock, 'id'>,
    deskState: EntityTable<DeskState, 'id'>,
    activities: EntityTable<Activity, 'id'>,
};

db
    .version(1)
    .stores({
        // primary key "id" (for the runtime!)
        wallets: '++id',
        credentials: '++id, walletId',
        organizations: '++id, walletId, organizationVbId',
        applications: '++id, organizationId, applicationVbId',
        nodes: '++id, organizationId, nodeVbId',
        applicationLedgers: '++id, applicationId, applicationLedgerVbId',
        submittedMicroblocks: '++id, height, microblockHash, vbId, vbType',
        deskState: 'id',
    });

// version 2: activity history (walletId is optional: undefined means a Desk-scoped activity)
db
    .version(2)
    .stores({
        activities: '++id, walletId, date',
    });
export { db };