import {useRoute} from "vue-router";
import {computed} from "vue";
import {useOrganizationStore} from "../stores/organizationStore.ts";
import {useNodeStore} from "../stores/nodeStore.ts";

export function useCurrentNode() {
    const route = useRoute()
    const nodeId = computed(() => Number(route.params.nodeId))
    return useNodeStore(nodeId.value)
}