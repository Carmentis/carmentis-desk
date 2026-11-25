import {useAppStore} from '../stores/appStore.ts';
import {useStrongholdStore} from '../stores/strongholdStore.ts';
import {useKmsStore} from '../stores/useKmsStore.ts';
import {KeyType} from '../types/types.ts';

/**
 * Deletion of a KMS wallet: the wallet is destroyed on the KMS first, then removed from this device.
 * If the KMS refuses, nothing is deleted locally, so the user keeps the access to the wallet.
 */
export function useKmsWalletDeletion() {
    const appStore = useAppStore();
    const strongholdStore = useStrongholdStore();
    const kmsStore = useKmsStore();

    async function deleteWalletWithKms(walletId: number) {
        const wallet = await appStore.getWalletById(walletId);
        const key = await strongholdStore.getWalletPrivateKeyFromStronghold(wallet.privateKeyStrongholdId);
        if (key.keyType === KeyType.KMS) {
            await kmsStore.deleteKmsWallet(key);
        }
        await appStore.deleteWalletById(walletId);
    }

    return {deleteWalletWithKms};
}
