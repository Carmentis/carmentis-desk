import { defineStore } from 'pinia';
import { useStorageStore } from './storage.ts';
import { useSessionStore } from './sessionStore.ts';
import {
    HandlerBasedSignatureEncoder,
    CryptoEncoderFactory,
    PrivateSignatureKey,
    ProviderFactory,
    PublicSignatureKey,
    SeedEncoder,
    SignatureSchemeId,
    Utils,
    WalletCrypto,
    Secp256k1HCVSignatureEncoder,
    Secp256k1HCVSignatureDecoder,
} from '@cmts-dev/carmentis-sdk-core';
import { ref } from 'vue';
import { JwkSignatureKeyExporter } from '../utils/jwk-signature-key-exporter.ts';
import { createIndexerClient } from '../api/indexer/client.ts';
import {AppControllerGetAccountHistoryParams} from "../api/indexer/model";
import {match, P} from "ts-pattern";

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

    const storageStore = useStorageStore();

    const setSignatureSchemaType = (signatureSchemaType: SignatureSchemeId) => {
        state.value.signatureSchemaType = signatureSchemaType;
    }

    async function getIndexerFromWalletId(walletId: number) {
        const storageStore = useStorageStore();
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet?.indexer) throw new Error('Indexer not configured for this wallet');
        return createIndexerClient(wallet.indexer);
    }

    async function fetchAccountStateByAccountId(walletId: number, accountId: string) {
        const indexer = await getIndexerFromWalletId(walletId);
        const result = await indexer.getAccounts({ id: accountId });
        const account = result.items[0];
        if (!account) throw new Error('Account not found');
        return account;
    }

    async function getKeyPair(walletId: number, signatureScheme?: SignatureSchemeId) {
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        const encoder = new SeedEncoder();
        const seed = encoder.decode(rawSeed);
        const walletCrypto = WalletCrypto.fromSeed(seed);
        const accountCrypto = walletCrypto.getDefaultAccountCrypto();
        const sk = await accountCrypto.getPrivateSignatureKey(
            signatureScheme ?? state.value.signatureSchemaType
        );
        const pk = await sk.getPublicKey();
        return { sk, pk };
    }

    async function getDidJwk(walletId: number): Promise<string> {
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        return JwkSignatureKeyExporter.computeDidJwkFromSeed(rawSeed);
    }

    async function getAccountId(walletId: number): Promise<string | null> {
        try {
            console.log("Getting account id for wallet", walletId);
            // access the wallet to obtain the indexer endpoint
            const { pk } = await getKeyPair(walletId);
            const res = await getAccountIdFromPublicKey(walletId, pk);
            return match(res)
                .with(P.nullish, () => null)
                .otherwise((res) => res);
        } catch (e) {
            console.error("Error getting account id for wallet", walletId, e)
            return null;
        }
    }

    async function getAccountIdFromPublicKey(walletId: number, pk: PublicSignatureKey) {
        try {
            // access the account id from pk through indexer
            const indexer = await getIndexerFromWalletId(walletId);
            const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();//createStringSignatureEncoder();
            const encodedPk = await sigEncoder.encodePublicKey(pk);
            console.log("Searching for account id for public key", encodedPk);
            const accountsResponse = await indexer.getAccounts({
                public_key: encodedPk
            })
            const accounts = accountsResponse.items;
            console.log(`Found ${accounts.length} accounts for public key ${encodedPk}`);
            if (accounts.length !== 1) return undefined
            const account = accounts[0];
            return account.id;
        } catch (e) {
            console.error("Error getting account id from public key:", e);
            return null;
        }

        /*
        const session = useSessionStore();
        const { pk } = await getKeyPair(walletId);
        return await provider.getAccountIdByPublicKey(pk);

         */
    }

    function createStringSignatureEncoder() {
        const sigEncoder = new HandlerBasedSignatureEncoder();
        sigEncoder.clear();
        sigEncoder.registerEncoder(new Secp256k1HCVSignatureEncoder());
        sigEncoder.registerDecoder(new Secp256k1HCVSignatureDecoder());
        return sigEncoder;
    }


    async function getNodeEndpointFromWalletId(walletId: number) {
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet) throw new Error(`Wallet with id ${walletId} not found`);
        return wallet.nodeEndpoint;
    }

    async function fetchAccountTransactionsHistory(walletId: number, accountId: Uint8Array, params: AppControllerGetAccountHistoryParams) {
        const indexer = await getIndexerFromWalletId(walletId);
        const hexId = Utils.binaryToHexa(accountId);
        return indexer.getAccountHistory({ account_id: hexId, order: 'DESC', sort: 'height', ...params });
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
        setSignatureSchemaType,
        fetchAccountStateByAccountId,
        getAccountId,
        getAccountIdFromPublicKey,
        getKeyPair,
        getDidJwk,
        fetchAccountTransactionsHistory,
        isAccountFoundByPublicKey,
        getIndexerFromWalletId,
        getNodeEndpointFromWalletId
    };
});
