import {ref, watch, type MaybeRefOrGetter, toValue} from "vue";
import {useAppStore} from "../stores/appStore.ts";
import {WalletUtils} from "../utils/WalletUtils.ts";

/**
 * Chooses the wallet an RPC request is meant for: the one owning the indicated public key when there is
 * one, the first wallet otherwise. The user can still change the choice afterwards.
 */
export function useWalletByPublicKey(publicKey: MaybeRefOrGetter<string | null | undefined>) {
    const {wallets} = useAppStore();
    const chosenWallet = ref(wallets.value[0]);

    watch(() => toValue(publicKey), async (indicated) => {
        if (!indicated) return;
        for (const wallet of wallets.value) {
            const pk = await WalletUtils.getPublicKeyFromWalletId(wallet.id);
            if (await WalletUtils.encodePublicKey(pk) === indicated) {
                chosenWallet.value = wallet;
                return;
            }
        }
        // No wallet owns this key: keep the default one rather than selecting nothing.
    }, {immediate: true});

    return {chosenWallet, wallets};
}
