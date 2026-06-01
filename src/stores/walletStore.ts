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
    Utils,
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
        console.log(`Fetching account state for account id ${Utils.binaryToHexa(accountId)} (wallet ID: ${walletId})`);
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
            console.error(e);
            throw new Error('Unable to retreive the account history');
        }
    }

    async function isAccountFoundByPublicKey(walletId: number, pk: PublicSignatureKey) {
        try {
            const id = await getAccountIdFromPublicKey(walletId, pk);
            console.log(`Account found with id ${Utils.binaryToHexa(id)}`);
            return true;
        } catch (e) {
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
