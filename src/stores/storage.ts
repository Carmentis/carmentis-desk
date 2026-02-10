import {defineStore} from "pinia";
import {load, Store} from "@tauri-apps/plugin-store";
import {ref} from "vue";

export interface NodeEntity {
	vbId?: string,
	name: string,
	rpcEndpoint: string,
}

export interface WalletEntity {
	id: number,
	name: string,
	seed: string,
	nodeEndpoint: string,
	vbId?: string | undefined,
	nodes: NodeEntity[]
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

	async function addVbIdToOrganization(orgId: number, vbId: string) {
		const currentOrganizations = await loadOrganizations();
		const updatedOrganizations = currentOrganizations.map(org => org.id === orgId ? {...org, vbId} : org);
		const storage = getStorage();
		await storage.set("organizations", updatedOrganizations)
		organizations.value = updatedOrganizations;
	}

	async function isNodeDeclared(orgId: number, nodeId: string) {
		const currentOrganizations = await loadOrganizations();
		const formattedNodeId = nodeId.trim().toLowerCase();
		const organization = currentOrganizations.find(org => org.id === orgId);
		if (!organization) {
			console.error(`Organization with id ${orgId} not found`);
			return false;
		};
		console.log("node in input:", nodeId)
		const nodesIds = organization.nodes
			.filter(node => node.vbId !== undefined)
			.map(node => node.vbId?.trim().toLowerCase());
		console.log("nodesIds:", nodesIds)
		return nodesIds.includes(formattedNodeId);
	}

	async function importExistingNodes(orgId: number, nodes: NodeEntity[]) {
		const currentOrganizations = await loadOrganizations();
		const organization = currentOrganizations.find(org => org.id === orgId);
		if (!organization) return;
		const updatedOrganization = {...organization, nodes: [...organization.nodes, ...nodes]};
		const updatedOrganizations = currentOrganizations.map(org => org.id === orgId ? updatedOrganization : org);
		const storage = getStorage();
		await storage.set("organizations", updatedOrganizations)
		organizations.value = updatedOrganizations;
	}

	async function deleteNodeByVbId(orgId: number, nodeId: string) {
		const currentOrganizations = await loadOrganizations();
		const organization = currentOrganizations.find(org => org.id === orgId);
		if (!organization) return;
		const updatedOrganization = {...organization, nodes: organization.nodes.filter(node => node.vbId !== nodeId)};
		const updatedOrganizations = currentOrganizations.map(org => org.id === orgId ? updatedOrganization : org);
		const storage = getStorage();
		await storage.set("organizations", updatedOrganizations)
		organizations.value = updatedOrganizations;
	}

	return {
		initStorage,
		organizations,
		addOrganization,
		removeOrganizationById,
		clearOrganizations,
		addVbIdToOrganization,
		isNodeDeclared,
		importExistingNodes,
		deleteNodeByVbId
	}
})