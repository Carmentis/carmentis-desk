import { useRoute } from 'vue-router'
import { computed, watch } from 'vue'
import {useWalletStore} from "../stores/walletStore.ts";
import {useOrganizationStore} from "../stores/organizationStore.ts";


export function useCurrentOrganization() {
    const route = useRoute()
    const walletId = computed(() => Number(route.params.orgId))
    return useOrganizationStore(walletId.value)
}