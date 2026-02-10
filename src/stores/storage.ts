import {defineStore} from "pinia";
import {load, Store} from "@tauri-apps/plugin-store";
import {ref} from "vue";

export interface ApplicationEntity {
	id: number,
	vbId?: string,
	name: string,
}

export interface NodeEntity {
	id: number,
	vbId?: string,
	name: string,
	rpcEndpoint: string,
}

export interface OrganizationEntity {
	id: number,
	name: string,
	vbId?: string,
	nodes: NodeEntity[],
	applications: ApplicationEntity[]
}

export interface WalletEntity {
	id: number,
	name: string,
	seed: string,
	nodeEndpoint: string,
	organizations: OrganizationEntity[]
}

export const useStorageStore = defineStore('storage', () => {

	let store: Store | undefined = undefined;
	const initialized = ref(false);
	const organizations = ref<WalletEntity[]>([]);




	async function initStorage() {
		store = await load('store.json');
		initialized.value = true;
		organizations.value = await loadOrganizations();
	}

	function getStorage() {
		if (store === undefined) throw new Error("Storage not initialized");
		return store;
	}


	async function loadOrganizations() {
		const storage = getStorage();
		return await storage.get<WalletEntity[]>('organizations') || [];
	}

	async function addOrganization(organization: Omit<WalletEntity, 'id'>) {
		const currentOrganizations = await loadOrganizations();
		const nextId = currentOrganizations.length > 0
			? Math.max(...currentOrganizations.map(org => org.id)) + 1
			: 1;
		const newOrganization = { ...organization, id: nextId };
		const updatedOrganizations = [...currentOrganizations, newOrganization];
		const storage = getStorage();
		await storage.set('organizations', updatedOrganizations);
		organizations.value = updatedOrganizations;
	}


	async function removeOrganizationById(orgId: number) {
		const currentOrganizations = await loadOrganizations();
		const updatedOrganizations = currentOrganizations.filter(org => org.id !== orgId);
		const storage = getStorage();
		await storage.set("organizations", updatedOrganizations)
		organizations.value = updatedOrganizations;
	}

	async function clearOrganizations() {
		const store = getStorage();
		organizations.value = [];
		await store.set("organizations", [])
	}

	async function addOrganizationToWallet(walletId: number, organization: Omit<OrganizationEntity, 'id'>) {
		const currentWallets = await loadOrganizations();
		const wallet = currentWallets.find(w => w.id === walletId);
		if (!wallet) return;

		const nextOrgId = wallet.organizations.length > 0
			? Math.max(...wallet.organizations.map(org => org.id)) + 1
			: 1;
		const newOrganization = { ...organization, id: nextOrgId };
		const updatedWallet = { ...wallet, organizations: [...wallet.organizations, newOrganization] };
		const updatedWallets = currentWallets.map(w => w.id === walletId ? updatedWallet : w);
		const storage = getStorage();
		await storage.set("organizations", updatedWallets);
		organizations.value = updatedWallets;
	}

	async function addVbIdToOrganization(walletId: number, orgId: number, vbId: string) {
		const currentWallets = await loadOrganizations();
		const wallet = currentWallets.find(w => w.id === walletId);
		if (!wallet) return;

		const updatedOrganizations = wallet.organizations.map(org =>
			org.id === orgId ? {...org, vbId} : org
		);
		const updatedWallet = { ...wallet, organizations: updatedOrganizations };
		const updatedWallets = currentWallets.map(w => w.id === walletId ? updatedWallet : w);
		const storage = getStorage();
		await storage.set("organizations", updatedWallets);
		organizations.value = updatedWallets;
	}

	async function isNodeDeclared(walletId: number, orgId: number, nodeId: string) {
		const currentWallets = await loadOrganizations();
		const wallet = currentWallets.find(w => w.id === walletId);
		if (!wallet) {
			console.error(`Wallet with id ${walletId} not found`);
			return false;
		}
		const organization = wallet.organizations.find(org => org.id === orgId);
		if (!organization) {
			console.error(`Organization with id ${orgId} not found in wallet ${walletId}`);
			return false;
		}
		const formattedNodeId = nodeId.trim().toLowerCase();
		const nodesIds = organization.nodes
			.filter(node => node.vbId !== undefined)
			.map(node => node.vbId?.trim().toLowerCase());
		return nodesIds.includes(formattedNodeId);
	}

	async function importExistingNodes(walletId: number, orgId: number, nodes: Omit<NodeEntity, 'id'>[]) {
		const currentWallets = await loadOrganizations();
		const wallet = currentWallets.find(w => w.id === walletId);
		if (!wallet) return;
		const organization = wallet.organizations.find(org => org.id === orgId);
		if (!organization) return;

		// Generate IDs for new nodes
		const existingNodes = organization.nodes;
		const maxId = existingNodes.length > 0 ? Math.max(...existingNodes.map(n => n.id)) : 0;
		const nodesWithIds = nodes.map((node, index) => ({
			...node,
			id: maxId + index + 1
		}));

		const updatedOrganization = {...organization, nodes: [...organization.nodes, ...nodesWithIds]};
		const updatedOrganizations = wallet.organizations.map(org => org.id === orgId ? updatedOrganization : org);
		const updatedWallet = { ...wallet, organizations: updatedOrganizations };
		const updatedWallets = currentWallets.map(w => w.id === walletId ? updatedWallet : w);
		const storage = getStorage();
		await storage.set("organizations", updatedWallets);
		organizations.value = updatedWallets;
	}

	async function deleteNodeById(walletId: number, orgId: number, nodeId: number) {
		const currentWallets = await loadOrganizations();
		const wallet = currentWallets.find(w => w.id === walletId);
		if (!wallet) return;
		const organization = wallet.organizations.find(org => org.id === orgId);
		if (!organization) return;

		const updatedOrganization = {...organization, nodes: organization.nodes.filter(node => node.id !== nodeId)};
		const updatedOrganizations = wallet.organizations.map(org => org.id === orgId ? updatedOrganization : org);
		const updatedWallet = { ...wallet, organizations: updatedOrganizations };
		const updatedWallets = currentWallets.map(w => w.id === walletId ? updatedWallet : w);
		const storage = getStorage();
		await storage.set("organizations", updatedWallets);
		organizations.value = updatedWallets;
	}

	async function getWalletById(walletId: number) {
		const currentWallets = await loadOrganizations();
		return currentWallets.find(w => w.id === walletId);
	}

	return {
		initStorage,
		organizations,
		addOrganization,
		removeOrganizationById,
		clearOrganizations,
		addOrganizationToWallet,
		addVbIdToOrganization,
		isNodeDeclared,
		importExistingNodes,
		deleteNodeById,
		getWalletById
	}
})