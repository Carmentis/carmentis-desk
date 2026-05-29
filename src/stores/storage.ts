import { defineStore } from 'pinia';
import { load, Store } from '@tauri-apps/plugin-store';
import { ref } from 'vue';

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
    id: string; // VB id in hex
    operatorEndpoint: string; // operator HTTP endpoint used during approval
    b64EncodedMicroblock: string; // base64-encoded validated microblock
}

export interface ApplicationParticipation {
    id: string; // application id in hex
    appLedgers: AppLedgerParticipation[];
}

export interface CredentialEntity {
    id: number;
    name: string;
    data: string; // raw JSON string
}

export interface WalletEntity {
    id: number;
    name: string;
    seed: string;
    nodeEndpoint: string;
    organizations: OrganizationEntity[];
    participations: ApplicationParticipation[];
    credentials?: CredentialEntity[];
}

export const useStorageStore = defineStore('storage', () => {
    let store: Store | undefined = undefined;
    const initialized = ref(false);
    const organizations = ref<WalletEntity[]>([]);
    const operators = ref<OperatorEntity[]>([]);

    async function initStorage() {
        store = await load('store.json');
        initialized.value = true;
        organizations.value = await loadOrganizations();
        operators.value = await loadOperators();
    }

    function getStorage() {
        if (store === undefined) throw new Error('Storage not initialized');
        return store;
    }

    async function loadOrganizations() {
        const storage = getStorage();
        return (await storage.get<WalletEntity[]>('organizations')) || [];
    }

    async function addOrganization(organization: Omit<WalletEntity, 'id'>) {
        const currentOrganizations = await loadOrganizations();
        const nextId = currentOrganizations.length > 0 ? Math.max(...currentOrganizations.map((org) => org.id)) + 1 : 1;
        const newOrganization = { ...organization, id: nextId };
        const updatedOrganizations = [...currentOrganizations, newOrganization];
        const storage = getStorage();
        await storage.set('organizations', updatedOrganizations);
        organizations.value = updatedOrganizations;
    }

    async function removeOrganizationById(orgId: number) {
        const currentOrganizations = await loadOrganizations();
        const updatedOrganizations = currentOrganizations.filter((org) => org.id !== orgId);
        const storage = getStorage();
        await storage.set('organizations', updatedOrganizations);
        organizations.value = updatedOrganizations;
    }

    async function clearOrganizations() {
        const store = getStorage();
        organizations.value = [];
        await store.set('organizations', []);
    }

    async function clearOperators() {
        const store = getStorage();
        operators.value = [];
        await store.set('operators', []);
    }

    async function importAllData(data: { organizations: WalletEntity[]; operators: OperatorEntity[] }) {
        const store = getStorage();
        organizations.value = data.organizations;
        operators.value = data.operators;
        await store.set('organizations', data.organizations);
        await store.set('operators', data.operators);
    }

    async function addOrganizationToWallet(walletId: number, organization: Omit<OrganizationEntity, 'id'>) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const nextOrgId =
            wallet.organizations.length > 0 ? Math.max(...wallet.organizations.map((org) => org.id)) + 1 : 1;
        const newOrganization = { ...organization, id: nextOrgId };
        const updatedWallet = {
            ...wallet,
            organizations: [...wallet.organizations, newOrganization],
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function addVbIdToOrganization(walletId: number, orgId: number, vbId: string) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? { ...org, vbId } : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function isNodeDeclared(walletId: number, orgId: number, nodeId: string) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) {
            console.error(`Wallet with id ${walletId} not found`);
            return false;
        }
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) {
            console.error(`Organization with id ${orgId} not found in wallet ${walletId}`);
            return false;
        }
        const formattedNodeId = nodeId.trim().toLowerCase();
        const nodesIds = organization.nodes
            .filter((node) => node.vbId !== undefined)
            .map((node) => node.vbId?.trim().toLowerCase());
        return nodesIds.includes(formattedNodeId);
    }

    async function importExistingNodes(walletId: number, orgId: number, nodes: Omit<NodeEntity, 'id'>[]) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) return;

        // Generate IDs for new nodes
        const existingNodes = organization.nodes;
        const maxId = existingNodes.length > 0 ? Math.max(...existingNodes.map((n) => n.id)) : 0;
        const nodesWithIds = nodes.map((node, index) => ({
            ...node,
            id: maxId + index + 1,
        }));

        const updatedOrganization = {
            ...organization,
            nodes: [...organization.nodes, ...nodesWithIds],
        };
        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? updatedOrganization : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function deleteNodeById(walletId: number, orgId: number, nodeId: number) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) return;

        const updatedOrganization = {
            ...organization,
            nodes: organization.nodes.filter((node) => node.id !== nodeId),
        };
        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? updatedOrganization : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function getWalletById(walletId: number) {
        const currentWallets = await loadOrganizations();
        return currentWallets.find((w) => w.id === walletId);
    }

    async function updateOrganizationDetails(
        walletId: number,
        orgId: number,
        details: {
            name: string;
            countryCode?: string;
            city?: string;
            website?: string;
        },
    ) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const updatedOrganizations = wallet.organizations.map((org) =>
            org.id === orgId ? { ...org, ...details } : org,
        );
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function deleteOrganizationById(walletId: number, orgId: number) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const updatedOrganizations = wallet.organizations.filter((org) => org.id !== orgId);
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function updateNode(walletId: number, orgId: number, nodeId: number, updates: Partial<NodeEntity>) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) return;

        const updatedNodes = organization.nodes.map((node) => (node.id === nodeId ? { ...node, ...updates } : node));
        const updatedOrganization = { ...organization, nodes: updatedNodes };
        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? updatedOrganization : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function addApplicationToOrganization(
        walletId: number,
        orgId: number,
        application: Omit<ApplicationEntity, 'id'>,
    ) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) return;

        const nextAppId =
            organization.applications.length > 0 ? Math.max(...organization.applications.map((app) => app.id)) + 1 : 1;
        const newApplication = { ...application, id: nextAppId };
        const updatedOrganization = {
            ...organization,
            applications: [...organization.applications, newApplication],
        };
        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? updatedOrganization : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function updateApplication(
        walletId: number,
        orgId: number,
        appId: number,
        updates: Partial<ApplicationEntity>,
    ) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) return;

        const updatedApplications = organization.applications.map((app) =>
            app.id === appId ? { ...app, ...updates } : app,
        );
        const updatedOrganization = {
            ...organization,
            applications: updatedApplications,
        };
        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? updatedOrganization : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function deleteApplicationById(walletId: number, orgId: number, appId: number) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;
        const organization = wallet.organizations.find((org) => org.id === orgId);
        if (!organization) return;

        const updatedApplications = organization.applications.filter((app) => app.id !== appId);
        const updatedOrganization = {
            ...organization,
            applications: updatedApplications,
        };
        const updatedOrganizations = wallet.organizations.map((org) => (org.id === orgId ? updatedOrganization : org));
        const updatedWallet = {
            ...wallet,
            organizations: updatedOrganizations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function addAppLedgerParticipation(
        walletId: number,
        appId: string,
        vbId: string,
        operatorEndpoint: string,
        b64EncodedMicroblock: string,
    ) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const participations = wallet.participations ?? [];
        const existingApp = participations.find((p) => p.id === appId);
        const newEntry: AppLedgerParticipation = {
            id: vbId,
            operatorEndpoint,
            b64EncodedMicroblock,
        };

        let updatedParticipations: ApplicationParticipation[];
        if (existingApp) {
            const alreadyRegistered = existingApp.appLedgers.some((al) => al.id === vbId);
            if (alreadyRegistered) return;
            updatedParticipations = participations.map((p) =>
                p.id === appId ? { ...p, appLedgers: [...p.appLedgers, newEntry] } : p,
            );
        } else {
            updatedParticipations = [...participations, { id: appId, appLedgers: [newEntry] }];
        }

        const updatedWallet = {
            ...wallet,
            participations: updatedParticipations,
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function addCredential(walletId: number, credential: Omit<CredentialEntity, 'id'>) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const credentials = wallet.credentials ?? [];
        const nextId = credentials.length > 0 ? Math.max(...credentials.map((c) => c.id)) + 1 : 1;
        const newCredential = { ...credential, id: nextId };
        const updatedWallet = {
            ...wallet,
            credentials: [...credentials, newCredential],
        };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function deleteCredentialById(walletId: number, credentialId: number) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const updatedCredentials = (wallet.credentials ?? []).filter((c) => c.id !== credentialId);
        const updatedWallet = { ...wallet, credentials: updatedCredentials };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function deleteAppLedger(walletId: number, appId: string, vbId: string) {
        const currentWallets = await loadOrganizations();
        const wallet = currentWallets.find((w) => w.id === walletId);
        if (!wallet) return;

        const updatedParticipations = (wallet.participations ?? [])
            .map((p) =>
                p.id === appId ? { ...p, appLedgers: p.appLedgers.filter((al) => al.id !== vbId) } : p,
            )
            .filter((p) => p.appLedgers.length > 0);

        const updatedWallet = { ...wallet, participations: updatedParticipations };
        const updatedWallets = currentWallets.map((w) => (w.id === walletId ? updatedWallet : w));
        const storage = getStorage();
        await storage.set('organizations', updatedWallets);
        organizations.value = updatedWallets;
    }

    async function loadOperators() {
        const storage = getStorage();
        return (await storage.get<OperatorEntity[]>('operators')) || [];
    }

    async function addOperator(operator: Omit<OperatorEntity, 'id'>) {
        const currentOperators = await loadOperators();
        const nextId = currentOperators.length > 0 ? Math.max(...currentOperators.map((op) => op.id)) + 1 : 1;
        const newOperator = { ...operator, id: nextId };
        const updatedOperators = [...currentOperators, newOperator];
        const storage = getStorage();
        await storage.set('operators', updatedOperators);
        operators.value = updatedOperators;
    }

    async function deleteOperatorById(operatorId: number) {
        const currentOperators = await loadOperators();
        const updatedOperators = currentOperators.filter((op) => op.id !== operatorId);
        const storage = getStorage();
        await storage.set('operators', updatedOperators);
        operators.value = updatedOperators;
    }

    return {
        initStorage,
        getStorage,
        organizations,
        wallets: organizations,
        addOrganization,
        deleteOrganizationById,
        removeOrganizationById,
        clearOrganizations,
        addOrganizationToWallet,
        addVbIdToOrganization,
        isNodeDeclared,
        importExistingNodes,
        deleteNodeById,
        getWalletById,
        updateOrganizationDetails,
        updateNode,
        addApplicationToOrganization,
        updateApplication,
        deleteApplicationById,
        addAppLedgerParticipation,
        deleteAppLedger,
        addCredential,
        deleteCredentialById,

        // operators
        operators,
        loadOperators,
        clearOperators,
        addOperator,
        deleteOperatorById,
        importAllData,
    };
});
