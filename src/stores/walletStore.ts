import { defineStore } from 'pinia';
import { useStorageStore } from './storage.ts';
import { useSessionStore } from './sessionStore.ts';
import {
    CryptoEncoderFactory,
    PrivateSignatureKey,
    PublicSignatureKey,
    SeedEncoder,
    SignatureSchemeId,
    Utils,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import { ref } from 'vue';
import { JwkSignatureKeyExporter } from '../utils/jwk-signature-key-exporter.ts';
import {AppControllerGetAccountHistoryParams} from "../api/indexer/model";
import {match, P} from "ts-pattern";
import {DeskLogger} from "../utils/DeskLogger.ts";
import {WalletUtils} from "../utils/WalletUtils.ts";

interface WalletState {
    isLoadingAccount: boolean;
    accountId?: undefined | Uint8Array;
    sk?: PrivateSignatureKey;
    pk?: PublicSignatureKey;
}

export const useWalletStore = defineStore('wallet', () => {
    const logger = DeskLogger.getLogger().getChild("wallet-store")

    const state = ref<WalletState>({
        // account
        isLoadingAccount: false,
    });

    const storageStore = useStorageStore();


    async function fetchAccountStateByAccountId(walletId: number, accountId: string) {
        const indexer = await WalletUtils.getIndexerFromWalletId(walletId);
        const result = await indexer.getAccounts({ id: accountId });
        const account = result.items[0];
        if (!account) throw new Error('Account not found');
        return account;
    }

    async function getKeyPair(walletId: number, signatureScheme: SignatureSchemeId) {
        const sk = await WalletUtils.getPrivateKeyFromWalletId(walletId);
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
            // access the wallet to obtain the indexer endpoint
            const pk = await WalletUtils.getPublicKeyFromWalletId(walletId);
            const res = await getAccountIdFromPublicKey(walletId, pk);
            return match(res)
                .with(P.nullish, () => null)
                .otherwise((res) => res);
        } catch (e) {
            logger.error(`Error getting account id for wallet: ${walletId} {e}`, {e})
            return null;
        }
    }

    async function getAccountIdFromPublicKey(walletId: number, pk: PublicSignatureKey) {
        try {
            // access the account id from pk through indexer
            const indexer = await WalletUtils.getIndexerFromWalletId(walletId);
            const encodedPk = await WalletUtils.encodePublicKey(pk)
            console.log("Searching for account id for public key", encodedPk);
            const accountsResponse = await indexer.getAccounts({
                public_key: encodedPk
            })
            const accounts = accountsResponse.items;
            if (accounts.length !== 1) return undefined
            const account = accounts[0];
            return account.id;
        } catch (e) {
            console.error("Error getting account id from public key:", e);
            return null;
        }
    }


    async function getNodeEndpointFromWalletId(walletId: number) {
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet) throw new Error(`Wallet with id ${walletId} not found`);
        return wallet.nodeEndpoint;
    }

    async function fetchAccountTransactionsHistory(walletId: number, accountId: Uint8Array, params: AppControllerGetAccountHistoryParams) {
        const indexer = await WalletUtils.getIndexerFromWalletId(walletId);
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
        fetchAccountStateByAccountId,
        getAccountId,
        getAccountIdFromPublicKey,
        getKeyPair,
        getDidJwk,
        fetchAccountTransactionsHistory,
        isAccountFoundByPublicKey,
        getNodeEndpointFromWalletId
    };
});
