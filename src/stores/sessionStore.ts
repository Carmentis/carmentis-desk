import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Stronghold, Client } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';
import * as userProfileRepo from '../db/repositories/userProfileRepository';

const STRONGHOLD_CLIENT = 'carmentis-desk';

function seedKey(walletId: number): string {
    return `wallet_seed_${walletId}`;
}

export const useSessionStore = defineStore('session', () => {
    const isOnboarded = ref(false);
    const isUnlocked = ref(false);
    const pseudo = ref('');
    const isLoading = ref(true);

    let _stronghold: Stronghold | null = null;
    let _client: Client | null = null;

    async function _getVaultPath(): Promise<string> {
        return `${await appDataDir()}/vault.hold`;
    }

    async function _openStronghold(password: string): Promise<void> {
        const vaultPath = await _getVaultPath();
        _stronghold = await Stronghold.load(vaultPath, password);
        try {
            _client = await _stronghold.loadClient(STRONGHOLD_CLIENT);
        } catch {
            _client = await _stronghold.createClient(STRONGHOLD_CLIENT);
        }
    }

    /**
     * Call once at app start. Checks if a user profile exists in the DB.
     * Does NOT open the Stronghold vault (requires password → done in login/onboard).
     */
    async function initialize(): Promise<void> {
        console.log('Initialize session');
        isLoading.value = true;
        const profile = await userProfileRepo.getUserProfile();
        if (profile) {
            isOnboarded.value = true;
            pseudo.value = profile.pseudo;
        } else {
            isOnboarded.value = false;
        }
        isUnlocked.value = false;
        isLoading.value = false;
    }

    /**
     * First-time setup: saves user profile and opens Stronghold with the chosen password.
     */
    async function onboard(userPseudo: string, password: string): Promise<void> {
        await userProfileRepo.setUserProfile(userPseudo);
        await _openStronghold(password);
        isOnboarded.value = true;
        isUnlocked.value = true;
        pseudo.value = userPseudo;
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
        isLoading,
        isOnboarded,
        isUnlocked,
        pseudo,
        initialize,
        onboard,
        login,
        lock,
        getWalletSeed,
        storeWalletSeed,
        deleteWalletSeed,
    };
});
