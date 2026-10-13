import {
    BalanceAvailability,
    CryptoEncoderFactory, Hash, JwkPrivateSignatureKey, Lock, LockType,
    PrivateSignatureKey, ProviderFactory,
    PublicSignatureKey,
    SeedEncoder, SignatureJwk,
    SignatureSchemeId, TokenUnit,
    Utils,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import {computed, type MaybeRefOrGetter, Ref, ref, toValue} from 'vue';
import { JwkSignatureKeyExporter } from '../utils/jwk-signature-key-exporter.ts';
import {AccountDto, AppControllerGetAccountHistoryParams} from "../api/indexer/model";
import {match, P} from "ts-pattern";
import {DeskLogger} from "../utils/DeskLogger.ts";
import {WalletUtils} from "../utils/WalletUtils.ts";
import {from, useObservable} from "@vueuse/rxjs";
import {InsertType, liveQuery} from "dexie";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {useStrongholdStore} from "./strongholdStore.ts";
import {computedAsync} from "@vueuse/core";
import {CredentialType, KeyType, Network, Organization, VerifiableCredential} from "../types/types.ts";
import {db} from "../db/db.ts";
import {useQuery} from "@tanstack/vue-query";
import {createIndexerClient} from "../api/indexer/client.ts";




export const useWalletStore = (walletId: number) => {
    const strongholdStore = useStrongholdStore();

    const walletIdRef = computed(() => walletId);

    // the wallet object
    const wallet = useObservable(
        from(liveQuery(() => DeskDatabase.getWalletById(walletId))),
        { initialValue: undefined }
    );

    // the credentials contained in the wallet
    const walletCredentials = useObservable(
        from(liveQuery(() => DeskDatabase.getAllCredentialsInWallet(walletId))),
        { initialValue: [] }
    );

    // organizations contained in the wallet
    const walletOrganizations = useObservable(
        from(liveQuery(() => DeskDatabase.getAllOrganizationsInWallet(walletId))),
        { initialValue: [] }
    );

    // network of the wallet
    const walletNetwork = computed(() => {
        if (!wallet.value) return undefined;
        return wallet.value.network;
    })

    // create the provider
    const walletProvider = computed(() => {
        if (!walletNetwork.value) return undefined;
        return ProviderFactory.createInMemoryProviderWithExternalProvider(walletNetwork.value.node);
    })

    // create the indexer
    const walletIndexer = computed(() => {
        console.log("Create wallet indexer", walletNetwork.value)
        if (!walletNetwork.value) return undefined;
        return createIndexerClient(walletNetwork.value.indexer);
    })

    // the private key of the wallet
    const walletKeyObject = computedAsync(async () => {
        if (!wallet.value) return undefined;
        return strongholdStore.getWalletPrivateKeyFromStronghold(wallet.value.privateKeyStrongholdId);
    })

    // the actor keys passphrase
    const walletKeyActorKeysPassphrase = computedAsync(async () => {
        if (!wallet.value) return undefined;
        const strongholdId = wallet.value.actorKeysMnemonicStrongholdId;
        return strongholdStore.getMnemonicFromStronghold(strongholdId);
    })

    // the type of the wallet key
    const walletKeyType = computed(() => {
        if (!walletKeyObject.value) return undefined;
        return walletKeyObject.value.keyType;
    })


    // private key of the wallet
    const walletPrivateKey = computedAsync(async () => {
        if (!walletKeyObject.value) return undefined;
        const key = walletKeyObject.value;
        if (key.keyType === KeyType.SEED) {
            return await WalletUtils.getPrivateKeyFromSeedAndSignatureScheme(
                key.seed,
                key.schemeId
            );
        } else {
            return JwkPrivateSignatureKey.fromJwk(key.jwk as SignatureJwk);
        }
    })

    // public key of the wallet
    const walletPublicKey = computedAsync(async () => {
        if (!walletPrivateKey.value) return undefined;
        return await walletPrivateKey.value.getPublicKey();
    })

    // private and public JWK (only defined for wallets backed by a JWK key)
    const walletPrivateJwk = computed(() => {
        const sk = walletPrivateKey.value;
        return sk instanceof JwkPrivateSignatureKey ? sk.getPrivateJwk() : undefined;
    })
    const walletPublicJwk = computed(() => {
        const sk = walletPrivateKey.value;
        return sk instanceof JwkPrivateSignatureKey ? sk.getPublicJwk() : undefined;
    })

    // key pair of the wallet (mainly used when both sk and pk should be used)
    const walletKeyPair = computed(() => ({
        sk: walletPrivateKey.value,
        pk: walletPublicKey.value
    }))


    // encoded private and public key
    const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
    const encodedWalletPrivateKey = computedAsync(async () => {
        if (!walletPrivateKey.value) return undefined;
        return encoder.encodePrivateKey(walletPrivateKey.value);
    })
    const encodedWalletPublicKey = computedAsync(() => {
        if (!walletPublicKey.value) return undefined;
        return encoder.encodePublicKey(walletPublicKey.value);
    })

    async function createSdJwtCredential(name: string, sdjwt: string) {
        return await DeskDatabase.createCredential({
            walletId,
            credentialType: CredentialType.SDJWT,
            name,
            sdjwt,
            createdAt: new Date(),
        })
    }

    async function deleteCredential(credentialId: number) {
        return await DeskDatabase.deleteCredentialById(credentialId);
    }


    async function updateNetwork(network: Network) {
        const updated = await DeskDatabase.updateWalletNetwork(walletId, network);
        if (updated === 0) throw new Error("Wallet not found");
    }

    async function createOrganization(organizationName: string) {
        console.log("Creating organization", organizationName);
        return db.organizations.add({
            walletId,
            city: '',
            createdAt: new Date(),
            website: '',
            name: organizationName,
            countryCode: ''
        })
    }

    async function importExistingOrganization(organization: InsertType<Organization, 'id' | 'walletId'>) {
        // we reject if the provided existed organization does not have virtual blockchain yet
        if (!organization.organizationVbId) {
            throw new Error("Organization does not have virtual blockchain id");
        }

        // we allow import only if no existing organizatino with the same virtual blockchain id exists
        const existingOrganization = await db.organizations
            .where('organizationVbId')
            .equals(organization.organizationVbId)
            .first();
        if (existingOrganization) {
            throw new Error("Organization with the same virtual blockchain id already exists");
        }

        return db.organizations.add({
            ...organization,
            walletId
        })
    }

    async function deleteOrganization(organizationId: number) {
        return DeskDatabase.deleteOrganizationById(organizationId);
    }



    // Refetch interval in milliseconds
    const logger = DeskLogger.getLogger().getChild("fetcher");
    const DEFAULT_REFETCH_INTERVAL = 3000;

    function useAccountIdQuery() {
        return useQuery({
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
            refetchInterval: DEFAULT_REFETCH_INTERVAL,
            queryKey: computed(() => ['account-id', walletId]),
            queryFn: async () => {
                logger.info(`Searching account id for wallet id ${walletId}`)
                console.log(walletProvider.value, walletPublicKey.value)
                if (!walletProvider.value || !walletPublicKey.value) return undefined;
                logger.info(`Searching account id for wallet id ${walletId}`)
                const accountId = await walletProvider.value.getAccountIdByPublicKey(walletPublicKey.value);
                console.log(`Found account id: ${accountId}`)
                return Hash.from(accountId).encode();
            },
            retry: 1,
        });
    }

    function useAccountStateQuery() {
        const accountIdQuery = useAccountIdQuery();
        const enabled = computed(() => !!accountIdQuery.data.value);
        return useQuery({
            enabled,
            queryKey: computed(() => ['account-state', toValue(walletId), accountIdQuery.data.value]),
            queryFn: async () => {
                const accountId = accountIdQuery.data.value;
                logger.info(`Searching account state for account id ${accountId}`)
                if (accountId) {
                    if (!walletIndexer.value) throw new Error('Indexer not found');
                    const result = await walletIndexer.value.getAccounts({ id: accountId });
                    const account = result.items[0];
                    if (!account) throw new Error('Account not found');
                    return account;
                } else {
                    throw new Error('Account ID is undefined');
                }
            },
            staleTime: 1000,
            refetchIntervalInBackground: true,
            refetchInterval: DEFAULT_REFETCH_INTERVAL,
            refetchOnReconnect: true,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
        });
    }

    function useAccountTransactionsHistory(fromHeight: Ref<number>, nbLimit: Ref<number>) {
        const accountIdQuery = useAccountIdQuery();
        const enabled = computed(() => !!accountIdQuery.data.value);
        const accountHistoryQuery = useQuery({
            enabled,
            refetchInterval: DEFAULT_REFETCH_INTERVAL,
            refetchIntervalInBackground: true,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
            queryKey: computed(() => [
                'account-transactions-history',
                toValue(walletId),
                accountIdQuery.data.value,
                fromHeight,
                nbLimit
            ]),
            queryFn: async () => {
                const accountId = accountIdQuery.data.value;
                logger.info(`Searching account transactions for account id ${accountId}`)
                if (!!accountIdQuery.data.value && !!walletIndexer.value) {
                    return await walletIndexer
                        .value
                        .getAccountHistory({
                            account_id: accountId,
                            order: 'DESC',
                            sort: 'height',
                        });
                } else {
                    console.warn("No account id or indexer")
                    return undefined;
                }
            },
        });

        return { accountHistoryQuery };
    }

    function getBalanceAvailability(account: AccountDto) {
        const locks: Lock[] = []
        for (const lock of account.escrowLocks) {
            locks.push({
                type: LockType.Escrow,
                lockedAmountInAtomics: lock.amount,
                parameters: {
                    escrowIdentifier: Utils.binaryFromHexa(lock.escrowIdentifier),
                    fundEmitterAccountId: Utils.binaryFromHexa(lock.fundEmitterAccountId),
                    transferAuthorizerAccountId: Utils.binaryFromHexa(lock.transferAuthorizerAccountId),
                    startTimestamp: lock.startTimestamp,
                    durationDays: lock.durationDays,
                }
            });
        }
        for (const lock of account.stakingLocks) {
            locks.push({
                type: LockType.NodeStaking,
                lockedAmountInAtomics: lock.amount,
                parameters: {
                    validatorNodeId: Utils.binaryFromHexa(lock.validatorNodeId),
                    plannedUnlockAmountInAtomics: lock.plannedSlashingAmountInAtomics,
                    plannedUnlockTimestamp: lock.plannedUnlockTimestamp,
                    slashed: lock.slashed,
                    plannedSlashingAmountInAtomics: lock.plannedUnlockAmountInAtomics,
                    plannedSlashingTimestamp: lock.plannedUnlockTimestamp,
                }
            });
        }
        for (const lock of account.vestingLocks) {
            locks.push({
                type: LockType.Vesting,
                lockedAmountInAtomics: lock.amount,
                parameters: {
                    initialVestedAmountInAtomics: lock.initialVestedAmountInAtomics,
                    cliffStartTimestamp: lock.cliffStartTimestamp,
                    cliffDurationDays: lock.cliffDurationDays,
                    vestingDurationDays: lock.vestingDurationDays,
                }
            });
        }
        return new BalanceAvailability(account.balance, locks);
    }

    function useAccountBreakdownQuery() {
        const accountStateQuery = useAccountStateQuery();
        const enabled = computed(() => !!accountStateQuery.data.value);
        return useQuery({
            enabled,
            refetchIntervalInBackground: true,
            refetchInterval: DEFAULT_REFETCH_INTERVAL,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
            queryKey: computed(() => ['account-breakdown', toValue(walletId), accountStateQuery.data.value]),
            queryFn: async () => {
                const acc = accountStateQuery.data.value;
                if (!acc) throw new Error('Account state is undefined');
                const breakdown = getBalanceAvailability(acc);
                return {
                    getSpendable: () => {
                        return breakdown.getSpendable().toString(
                            TokenUnit.TOKEN,
                            { locale: "system", grouping: true, decimalPlaces: 2 }
                        )
                    },
                    getStaked:    () => {
                        return breakdown.getStaked().toString(
                            TokenUnit.TOKEN,
                            { locale: "system", grouping: true, decimalPlaces: 2 }
                        )
                    },
                    getVested:    () => {
                        return breakdown.getVested().toString(
                            TokenUnit.TOKEN,
                            { locale: "system", grouping: true, decimalPlaces: 2 }
                        )
                    },
                    getEscrowed: () => {
                        return breakdown.getEscrowed().toString(
                            TokenUnit.TOKEN,
                            { locale: "system", grouping: true, decimalPlaces: 2 }
                        )
                    },
                };
            },
        });
    }

    function useHasAccountOnChainQuery() {
        const accountIdQuery = useAccountIdQuery();
        return computed(() => accountIdQuery.isSuccess.value && accountIdQuery.data.value !== undefined);
    }


    function useFoundOrganizationsOnchain() {
        const accountIdQuery = useAccountIdQuery();
        return useQuery({
            queryKey: computed(() => [
                'account-organizations-onchain',
                toValue(walletId),
            ]),
            queryFn: async () => {
                const indexer = walletIndexer.value
                if (!indexer) return [];
                if (!accountIdQuery.data.value) return [];
                const accountId = accountIdQuery.data.value;
                const items = await indexer.getOrganizations({
                    account_id: accountId,
                })
                return items.items;
            },
        });

    }



    async function isAccountFoundByPublicKey( pk: PublicSignatureKey) {
        try {
            if (!walletProvider.value) return undefined;
            const accountId = await walletProvider.value.getAccountIdByPublicKey(pk);
            return true
        } catch {
            return false;
        }
    }


    return {
        walletId: walletIdRef,
        wallet,
        walletCredentials,
        walletNetwork,
        walletPrivateKey,
        walletPublicKey,
        walletKeyType,
        walletPrivateJwk,
        walletPublicJwk,
        walletKeyPair,
        walletKeyActorKeysPassphrase,
        encodedWalletPrivateKey,
        encodedWalletPublicKey,
        walletOrganizations,
        indexer: walletIndexer,
        walletProvider,

        // methods
        createSdJwtCredential,
        deleteCredential,
        updateNetwork,
        createOrganization,
        deleteOrganization,
        importExistingOrganization,

        // on-chain queries
        useFoundOrganizationsOnchain,
        isAccountFoundByPublicKey,
        useAccountIdQuery,
        useAccountBreakdownQuery,
        useAccountTransactionsHistory,
        useAccountStateQuery,
        useHasAccountOnChainQuery,
    }
}

/*
const useWalletStore = defineStore('wallet', () => {
    const logger = DeskLogger.getLogger().getChild("wallet-store")


    const storageStore = useStorageStore();


    async function fetchAccountStateByAccountId(walletId: number, accountId: string) {
        const indexer = await WalletUtils.getIndexerFromWalletId(walletId);
        const result = await indexer.getAccounts({ id: accountId });
        const account = result.items[0];
        if (!account) throw new Error('Account not found');
        return account;
    }

    async function getKeyPair(walletId: number) {
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

 */
