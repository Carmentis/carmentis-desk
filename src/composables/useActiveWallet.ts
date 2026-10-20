import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStorage } from '@vueuse/core';
import { useAppStore } from '../stores/appStore.ts';

/**
 * The wallet the user is currently working with, for navigation purposes (app bar, bottom navigation).
 *
 * Unlike `useCurrentWallet` it is safe on routes without a wallet: it falls back to the last wallet
 * that was opened, then to the first one. `routeWalletId` is only set on wallet routes.
 */
export function useActiveWallet() {
    const route = useRoute();
    const { wallets } = useAppStore();
    const lastWalletId = useStorage<number | null>('carmentis_last_wallet_id', null);

    const routeWalletId = computed(() => {
        const id = Number(route.params.walletId);
        return Number.isInteger(id) ? id : null;
    });

    watch(routeWalletId, (id) => {
        if (id !== null) lastWalletId.value = id;
    }, { immediate: true });

    const activeWallet = computed(() =>
        wallets.value.find((wallet) => wallet.id === (routeWalletId.value ?? lastWalletId.value))
        ?? wallets.value[0]
        ?? null,
    );
    const activeWalletId = computed(() => activeWallet.value?.id ?? null);

    return { routeWalletId, activeWallet, activeWalletId };
}
