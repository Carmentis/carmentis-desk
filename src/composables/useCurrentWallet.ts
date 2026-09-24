import { useRoute } from 'vue-router'
import { computed, watch } from 'vue'
import {useWalletStore} from "../stores/walletStore.ts";


export function useCurrentWallet() {
    const route = useRoute()
    const walletId = computed(() => Number(route.params.walletId))
    return useWalletStore(walletId.value)
}