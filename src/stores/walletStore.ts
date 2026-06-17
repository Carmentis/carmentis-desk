import { defineStore } from 'pinia';
import { useStorageStore } from './storage.ts';
import { useSessionStore } from './sessionStore.ts';
import {
    CryptoEncoderFactory,
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
import { createIndexerClient } from '../api/indexer/client.ts';
import {AppControllerGetAccountHistoryParams} from "../api/indexer/model";

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

    async function fetchAccountStateByAccountId(walletId: number, accountId: string) {
        const storageStore = useStorageStore();
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet?.indexer) throw new Error('Indexer not configured for this wallet');
        const result = await createIndexerClient(wallet.indexer).getAccounts({ id: accountId });
        const account = result.items[0];
        if (!account) throw new Error('Account not found');
        return account;
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

    async function getAccountId(walletId: number): Promise<string | undefined> {
        // access the wallet to obtain the indexer endpoint
        const { pk } = await getKeyPair(walletId);
        return getAccountIdFromPublicKey(walletId, pk);
    }

    async function getAccountIdFromPublicKey(walletId: number, pk: PublicSignatureKey) {
        // access the wallet to obtain the indexer endpoint
        const storageStore = useStorageStore();
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet?.indexer) throw new Error('Indexer not configured for this wallet');
        const indexerEndpoint = wallet.indexer;

        // access the account id from pk through indexer
        const indexer = createIndexerClient(indexerEndpoint)
        const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const accountsResponse = await indexer.getAccounts({
            public_key: await sigEncoder.encodePublicKey(pk)
        })
        console.log("Found client:", accountsResponse);
        const accounts = accountsResponse.items;
        if (accounts.length !== 1) return undefined
        const account = accounts[0];
        return account.id;

        /*
        const session = useSessionStore();
        const { pk } = await getKeyPair(walletId);
        return await provider.getAccountIdByPublicKey(pk);

         */
    }

    async function fetchAccountTransactionsHistory(walletId: number, accountId: Uint8Array, params: AppControllerGetAccountHistoryParams) {
        const storageStore = useStorageStore();
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet?.indexer) throw new Error('Indexer not configured for this wallet');
        const hexId = Utils.binaryToHexa(accountId);
        return createIndexerClient(wallet.indexer).getAccountHistory({ account_id: hexId, order: 'DESC', sort: 'height', ...params });
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
