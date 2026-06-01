import { defineStore } from 'pinia';
import { useStorageStore } from './storage.ts';
import { useSessionStore } from './sessionStore.ts';
import {
    AccountTransactions,
    PrivateSignatureKey,
    ProviderFactory,
    PublicSignatureKey,
    SeedEncoder,
    SignatureSchemeId,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import { ref } from 'vue';
import { JwkSignatureKeyExporter } from '../utils/jwk-signature-key-exporter.ts';

interface WalletState {
    isLoadingAccount: boolean;
    accountId?: undefined | Uint8Array;
    signatureSchemaType: SignatureSchemeId;
    sk?: PrivateSignatureKey;
    pk?: PublicSignatureKey;
}

export const useWalletStore = defineStore('wallet', () => {
    const state = ref<WalletState>({
        // account
        isLoadingAccount: false,
        signatureSchemaType: SignatureSchemeId.SECP256K1,
    });

    async function getProvider(walletId: number) {
        const storageStore = useStorageStore();
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet) {
            throw new Error(`Wallet with id ${walletId} not found`);
        }
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.nodeEndpoint);
        return provider;
    }

    async function fetchAccountStateByAccountId(walletId: number, accountId: Uint8Array) {
        const provider = await getProvider(walletId);
        return provider.getAccountState(accountId);
    }

    async function getKeyPair(walletId: number) {
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        const encoder = new SeedEncoder();
        const seed = encoder.decode(rawSeed);
        const walletCrypto = WalletCrypto.fromSeed(seed);
        const accountCrypto = walletCrypto.getDefaultAccountCrypto();
        const sk = await accountCrypto.getPrivateSignatureKey(state.value.signatureSchemaType);
        const pk = await sk.getPublicKey();
        return { sk, pk };
    }

    async function getDidJwk(walletId: number): Promise<string> {
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        return JwkSignatureKeyExporter.computeDidJwkFromSeed(rawSeed);
    }

    async function getAccountId(walletId: number) {
        const provider = await getProvider(walletId);
        const { pk } = await getKeyPair(walletId);
        return await provider.getAccountIdByPublicKey(pk);
    }

    async function getAccountIdFromPublicKey(walletId: number, pk: PublicSignatureKey) {
        const provider = await getProvider(walletId);
        return await provider.getAccountIdByPublicKey(pk);
    }

    async function fetchAccountTransactionsHistory(
        walletId: number,
        accountId: Uint8Array,
        lastAccountHistoryHash: Uint8Array,
        limit: number,
    ) {
        try {
            const provider = await getProvider(walletId);
            const history = await provider.getAccountHistory(accountId, lastAccountHistoryHash, limit);
            return AccountTransactions.createFromAbciResponse(history);
        } catch (e) {
            throw new Error('Unable to retrieve the account history');
        }
    }

    async function isAccountFoundByPublicKey(walletId: number, pk: PublicSignatureKey) {
        try {
            await getAccountIdFromPublicKey(walletId, pk);
            return true;
        } catch {
            return false;
        }
    }

    return {
        state,
        fetchAccountStateByAccountId,
        getAccountId,
        getAccountIdFromPublicKey,
        getKeyPair,
        getDidJwk,
        fetchAccountTransactionsHistory,
        isAccountFoundByPublicKey,
    };
});
