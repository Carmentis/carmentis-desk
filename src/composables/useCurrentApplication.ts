
import { useRoute } from 'vue-router'
import { computed, watch } from 'vue'
import {useWalletStore} from "../stores/walletStore.ts";
import {useOrganizationStore} from "../stores/organizationStore.ts";
import {useApplicationStore} from "../stores/applicationStore.ts";


export function useCurrentApplication() {
    const route = useRoute()
    const appId = computed(() => Number(route.params.appId))
    return useApplicationStore(appId.value)
}