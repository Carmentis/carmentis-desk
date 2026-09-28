import {useStrongholdStore} from "./strongholdStore.ts";
import {from, useObservable} from "@vueuse/rxjs";
import {InsertType, liveQuery} from "dexie";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {computed, toValue} from "vue";
import {db} from "../db/db.ts";
import {Application, Organization} from "../types/types.ts";
import {useQuery} from "@tanstack/vue-query";
import {useCurrentWallet} from "../composables/useCurrentWallet.ts";

export const useOrganizationStore = (organizationId: number) => {

    const {indexer: walletIndexer} = useCurrentWallet();

    const organization = useObservable(
        from(liveQuery(() => DeskDatabase.getOrganizationById(organizationId))),
        { initialValue: undefined }
    );

    const organizationApplications = useObservable(
        from(liveQuery(() => DeskDatabase.getAllApplicationsInOrganization(organizationId))),
        { initialValue: [] }
    );

    const organizationNodes = useObservable(
        from(liveQuery(() => DeskDatabase.getAllNodesInOrganization(organizationId))),
        { initialValue: [] }
    );

    const organizationVbId = computed(() => organization.value?.organizationVbId ?? undefined)

    function deleteOrganization() {
        return DeskDatabase.deleteOrganizationById(organizationId);
    }

    function updateOrganization(updatedOrganization: Partial<Organization>) {
        if (!organization.value) throw new Error('Organization not found')
        return DeskDatabase.updateOrganization(organizationId, {
            ...organization.value,
            ...updatedOrganization,
        });
    }

    function createApplication(applicationName: string) {
        return db.applications.add({
            name: applicationName,
            createdAt: new Date(),
            organizationId,
            website: '',
            description: '',
        })
    }

    function deleteApplication(applicationId: number) {
        return db.applications.delete(applicationId);
    }

    async function createNode(nodeName: string, rpcEndpoint:string, vbId?: string) {
        // we reject the creation of a node having the same virtual blockchain id
        if (vbId) {
            const nodesWithSameVbId = await db.nodes
                .where('nodeVbId')
                .equals(vbId)
                .first();
            if (nodesWithSameVbId) {
                throw new Error("Node with the same virtual blockchain id already exists");
            }
        }


        return db.nodes.add({
            name: nodeName,
            createdAt: new Date(),
            organizationId,
            rpcEndpoint,
            nodeVbId: vbId
        })
    }

    async function importExistingApplication(application: InsertType<Application, 'id' | 'organizationId'>) {
        // we reject if the provided existed organization does not have virtual blockchain yet
        if (!application.applicationVbId) {
            throw new Error("Organization does not have virtual blockchain id");
        }

        // we allow import only if no existing application with the same virtual blockchain id exists
        const existingApplication = await db.applications
            .where('applicationVbId')
            .equals(application.applicationVbId)
            .first();
        if (existingApplication) {
            throw new Error("Application with the same virtual blockchain id already exists");
        }

        return db.applications.add({
            ...application,
            organizationId
        })
    }

    function deleteNode(nodeId: number) {
        return db.nodes.delete(nodeId);
    }

    function useFoundApplicationsOnChain() {
        return useQuery({
            queryKey: computed(() => [
                `organization-${organizationId}-applications-onchain`
            ]),
            queryFn: async () => {
                const indexer = walletIndexer.value
                if (!indexer) return [];
                const vbId = organizationVbId.value;
                if (!vbId) return [];
                const items = await indexer.getApplications({
                    organization_id: vbId,
                })
                return items.items;
            },
        });
    }

    function useFoundNodesOnChain() {
        return useQuery({
            queryKey: computed(() => [
                `organization-${organizationId}-nodes-onchain`
            ]),
            queryFn: async () => {
                const indexer = walletIndexer.value
                if (!indexer) return [];
                const vbId = organizationVbId.value;
                if (!vbId) return [];
                const items = await indexer.getValidatorNodes({
                    organization_id: vbId,
                })
                return items.items;
            },
        });

    }

    return {
        organization,
        organizationApplications,
        organizationNodes,
        organizationVbId,

        // methods
        importExistingApplication,
        createApplication,
        deleteApplication,
        createNode,
        deleteNode,
        updateOrganization,
        deleteOrganization,

        // queries
        useFoundApplicationsOnChain,
        useFoundNodesOnChain,
    }
}
