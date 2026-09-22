import {defineStore} from "pinia";
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

//const STRONGHOLD_CLIENT = 'carmentis-desk';
const STRONGHOLD_CLIENT = "DESK"
function seedKey(walletId: number): string {
    return `wallet_seed_${walletId}`;
}

export const useAppStateStore = defineStore("appState", () => {
    // we store the stronghold client.
    let _stronghold: Stronghold | null = null;
    let _client: Client | null = null;

    // store the stronghold password in the session, mainly for development purpose.
    // the password is always removed when the app is closed.
    const strongholdPassword = useSessionStorage<string | undefined>('strongholdPassword', undefined);



    const router = useRouter();
    const isOnboarded = useObservable(
        from(liveQuery(() => DeskDatabase.hasOnboarded())),
        { initialValue: undefined }
    );
    const isLoadingSetup = computed(() => {
        return isOnboarded.value === undefined;
    });
    const isUnlocked = ref(false);


    // we put here the logic to redirect the user to the correct page
    // automatically
    watch([isLoadingSetup, isOnboarded], () => {
        console.log('isLoadingSetup.value', isLoadingSetup.value);
        console.log('isOnboarded.value', isOnboarded.value);
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



    async function _getVaultPath(): Promise<string> {
        return `${await appDataDir()}/vault-v2.hold`;
    }

    async function _openStronghold(password: string): Promise<void> {
        const vaultPath = await _getVaultPath();
        _stronghold = await Stronghold.load(vaultPath, password);
        try {
            _client = await _stronghold.loadClient(STRONGHOLD_CLIENT);
            console.log("Stronghold loaded");
        } catch {
            _client = await _stronghold.createClient(STRONGHOLD_CLIENT);
            console.log("Stronghold created");
        }
    }

    /**
     * Call once at app start. Checks if a user profile exists in the DB.
     * Does NOT open the Stronghold vault (requires password → done in login/onboard).
     */
    async function initialize(): Promise<void> {
        // load the application state
        isUnlocked.value = false;
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
        await _openStronghold(password);

        // mark the application in onboarded state
        await DeskDatabase.markAsOnboarded();

        // mark values as onboarded and unlocked
        isUnlocked.value = true;
    }

    /**
     * Opens the Stronghold vault with the given password.
     * Throws if the password is wrong.
     */
    async function login(password: string): Promise<void> {
        await _openStronghold(password);
        isUnlocked.value = true;
    }

    /**
     * Locks the session by dropping the Stronghold reference.
     */
    function lock(): void {
        _stronghold = null;
        _client = null;
        isUnlocked.value = false;
    }

    async function getWalletSeed(walletId: number): Promise<string> {
        if (!_client) throw new Error('Session is locked');
        const store = _client.getStore();
        const rawBytes = await store.get(seedKey(walletId));
        if (!rawBytes) throw new Error(`No seed found for wallet ${walletId}`);
        return new TextDecoder().decode(new Uint8Array(rawBytes));
    }

    async function storeWalletSeed(walletId: number, seed: string): Promise<void> {
        if (!_client || !_stronghold) throw new Error('Session is locked');
        const store = _client.getStore();
        await store.insert(seedKey(walletId), Array.from(new TextEncoder().encode(seed)));
        await _stronghold.save();
    }

    async function deleteWalletSeed(walletId: number): Promise<void> {
        if (!_client || !_stronghold) return; // best-effort
        const store = _client.getStore();
        try {
            await store.remove(seedKey(walletId));
            await _stronghold.save();
        } catch {
            // key may not exist — ignore
        }
    }

    return {
        isOnboarded,
        isUnlocked,
        initialize,
        onboard,
        login,
        lock,
        getWalletSeed,
        storeWalletSeed,
        deleteWalletSeed,
    };
})