import {useStrongholdStore} from "./strongholdStore.ts";
import {from, useObservable} from "@vueuse/rxjs";
import {InsertType, liveQuery} from "dexie";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {computed} from "vue";
import {db} from "../db/db.ts";
import {Organization} from "../types/types.ts";

export const useOrganizationStore = (organizationId: number) => {
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

    function createNode(nodeName: string, rpcEndpoint:string, vbId?: string) {
        return db.nodes.add({
            name: nodeName,
            createdAt: new Date(),
            organizationId,
            rpcEndpoint,
            nodeVbId: vbId
        })
    }

    function deleteNode(nodeId: number) {
        return db.nodes.delete(nodeId);
    }

    return {
        organization,
        organizationApplications,
        organizationNodes,
        organizationVbId,

        // methods
        createApplication,
        deleteApplication,
        createNode,
        deleteNode,
        updateOrganization,
        deleteOrganization,
    }
}
