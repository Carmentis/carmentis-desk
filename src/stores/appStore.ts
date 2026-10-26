import {defineStore, storeToRefs} from "pinia";
import {computed, ref, watch} from "vue";
import {Client, Stronghold} from "@tauri-apps/plugin-stronghold";
import {appDataDir} from "@tauri-apps/api/path";
import * as userProfileRepo from "../db/repositories/userProfileRepository.ts";
import {useSessionStore} from "./sessionStore.ts";
import {useAsyncState, useSessionStorage} from "@vueuse/core";
import {db} from "../db/db.ts";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {from, useObservable} from "@vueuse/rxjs";
import {liveQuery} from "dexie";
import {useRouter} from "vue-router";
import * as walletRepo from "../db/repositories/walletRepository.ts";
import {WalletEntity} from "./storage.ts";
import {Network, Wallet, WalletKey, WalletKeySchema} from "../types/types.ts";
import {generateMnemonic} from "@scure/bip39";
import {Bip39Utils} from "../utils/Bip39Utils.ts";
import * as v from 'valibot';
import {useStrongholdStore} from "./strongholdStore.ts";

//const STRONGHOLD_CLIENT = 'carmentis-desk';
const STRONGHOLD_CLIENT = "DESK"
function seedKey(walletId: number): string {
    return `wallet_seed_${walletId}`;
}

export const useAppStore = () => {
    // we store the stronghold client.
    const strongholdStore = useStrongholdStore();
    const { isUnlocked } = storeToRefs(strongholdStore);
    const router = useRouter();

    const deskState = useObservable(
        from(liveQuery(() => {
            console.log("Fetching desk state");
            return db.deskState.toArray()
        }))
    );

    // onboarding variable
    const isOnboarded = useObservable(
        from(liveQuery(() => DeskDatabase.hasOnboarded())),
        { initialValue: undefined }
    );




    // developper/node holder variables
    const hasDeveloperRole = computed(() => {
        return !!deskState.value && deskState.value.length > 0 && deskState.value[0]?.isDeveloper;
    });

    /*
    const hasDeveloperRole = useObservable(
        from(liveQuery(async () => {
            const states = await db.deskState.toArray();
            if (states.length !== 1) throw new Error('Desk state not found');
            console.log("Found state:", states[0]);
            return states[0].isDeveloper
        })),
        { initialValue: true }
    );

     */

    const hasNodeHolderRole = useObservable(
        from(liveQuery(async () => {
            const states = await db.deskState.toArray();
            if (states.length !== 1) throw new Error('Desk state not found');
            console.log("Found state:", states[0]);
            return states[0].isNodeHolder
        })),
        { initialValue: true }
    );

    const shouldDisplayOrganizations = computed(() => {
        return hasDeveloperRole.value || hasNodeHolderRole.value;
    })

    const shouldDisplayApplications = computed(() => {
        return hasDeveloperRole.value;
    })

    const shouldDisplayNodes = computed(() => {
        return hasNodeHolderRole.value;
    })



    async function setDeveloperRoleToUser(isDeveloper: boolean) {
        return DeskDatabase.setIsDeveloper(isDeveloper);
    }

    async function setNodeHolderRoleToUser(isNodeHolder: boolean) {
        return DeskDatabase.setIsNodeHolder(isNodeHolder);
    }



    const isStarting = computed(() => {
        return isOnboarded.value === undefined;
    });



    // we put here the logic to redirect the user to the correct page
    // automatically
    /*
    watch([isLoadingSetup, isOnboarded], () => {
        if (isLoadingSetup.value === true) {
            router.push('/splash');
            return
        }

        if (isOnboarded.value === true) {
            if (isUnlocked.value === false) {
                router.push({ name: 'login' });
            }
        } else {

        }
    })

     */



    const wallets = useObservable(
        from(liveQuery(() => DeskDatabase.getAllWallets())),
        { initialValue: [] }
    );



    async function storeMnemonicToStronghold(strongholdId: string, mnemonic: string) {
        return strongholdStore.storeToStronghold(strongholdId, Array.from(new TextEncoder().encode(mnemonic)));
    }

    async function getMnemonicFromStronghold(strongholdId: string): Promise<string> {
        const rawMnemonic = await strongholdStore.getFromStronghold(strongholdId);
        if (!rawMnemonic) throw new Error('Mnemonic not found in Stronghold');
        return new TextDecoder().decode(rawMnemonic);
    }


    async function createWallet(
        walletName: string,
        walletKey: WalletKey,
        walletNetwork: Network,
        actorKeysMnemonic?: string,
    ): Promise<number> {
        if (!strongholdStore.isUnlocked) throw new Error('Stronghold Client not initialized');

        // generate the private key stronghold identifier
        const privateKeyStrongholdId = crypto.randomUUID();

        // generate a random actor keys seed
        const mnemonic = actorKeysMnemonic ?? Bip39Utils.generateMnemonic();
        const mnemonicStronholdId = crypto.randomUUID();
        const walletId = db.wallets.add({
            name: walletName,
            network: walletNetwork,
            privateKeyStrongholdId: privateKeyStrongholdId,
            actorKeysMnemonicStrongholdId: mnemonicStronholdId,
            createdAt: new Date(),
        })

        // store the private key and the mnemonic in stronghold
        await storeMnemonicToStronghold(mnemonicStronholdId, mnemonic);
        await strongholdStore.storeWalletPrivateKeyToStronghold(privateKeyStrongholdId, walletKey);

        return walletId;
    }

    async function getWalletById(walletId: number) {
        const wallet = await DeskDatabase.getWalletById(walletId);
        if (!wallet) throw new Error('Wallet not found')
        return wallet;
    }

    async function deleteWalletById(walletId: number) {
        return DeskDatabase.deleteWalletById(walletId);
    }


    /**
     * Call once at app start. Checks if a user profile exists in the DB.
     * Does NOT open the Stronghold vault (requires password → done in login/onboard).
     */
    async function initialize(): Promise<void> {
        // load the application state
        //isUnlocked.value = false;
    }

    /**
     * First-time setup: opens Stronghold with the chosen password.
     */
    async function onboard(password: string): Promise<void> {
        // reject if the user already onboarded
        const hasOnboarded = await DeskDatabase.hasOnboarded();
        if (hasOnboarded) {
            throw new Error("Already onboarded");
        }

        // open the stronghold the password which automatically creates the vault if it doesn't exist
        console.log("Opening Stronghold with password:", password);
        await strongholdStore.openStronghold(password);

        // mark the application in onboarded state
        await DeskDatabase.markAsOnboarded();
    }

    /**
     * Opens the Stronghold vault with the given password.
     * Throws if the password is wrong.
     */
    async function login(password: string): Promise<void> {
        await strongholdStore.openStronghold(password);
        //isUnlocked.value = true;
    }

    /**
     * Locks the session by dropping the Stronghold reference.
     */
    function lock(): void {
        strongholdStore.lockStronghold();
    }

    async function getWalletSeed(walletId: number): Promise<string> {
        return ''
        /*
        if (!_client) throw new Error('Session is locked');
        const store = _client.getStore();
        const rawBytes = await store.get(seedKey(walletId));
        if (!rawBytes) throw new Error(`No seed found for wallet ${walletId}`);
        return new TextDecoder().decode(new Uint8Array(rawBytes));

         */
    }

    async function storeWalletSeed(walletId: number, seed: string): Promise<void> {
        /*
        if (!_client || !_stronghold) throw new Error('Session is locked');
        const store = _client.getStore();
        await store.insert(seedKey(walletId), Array.from(new TextEncoder().encode(seed)));
        await _stronghold.save();

         */
    }

    async function deleteWalletSeed(walletId: number): Promise<void> {
        /*
        if (!_client || !_stronghold) return; // best-effort
        const store = _client.getStore();
        try {
            await store.remove(seedKey(walletId));
            await _stronghold.save();
        } catch {
            // key may not exist — ignore
        }

         */
    }

    return {
        // states
        isStarting,
        isOnboarded,
        isUnlocked,
        wallets,
        hasDeveloperRole,
        hasNodeHolderRole,
        shouldDisplayApplications,
        shouldDisplayNodes,
        shouldDisplayOrganizations,

        // functions
        initialize,
        onboard,
        login,
        lock,
        setDeveloperRoleToUser,
        setNodeHolderRoleToUser,
        getWalletSeed,
        storeWalletSeed,
        deleteWalletSeed,

        // CRUDs
        createWallet,
        getWalletById,
        deleteWalletById,
    };
}