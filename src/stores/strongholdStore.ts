import {defineStore} from "pinia";
import {Client, Stronghold} from "@tauri-apps/plugin-stronghold";
import {computed, ref} from "vue";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {appDataDir} from "@tauri-apps/api/path";
import {Network, WalletKey, WalletKeySchema} from "../types/types.ts";
import {Bip39Utils} from "../utils/Bip39Utils.ts";
import {db} from "../db/db.ts";
import * as v from "valibot";
const STRONGHOLD_CLIENT = "DESK"

export const useStrongholdStore = defineStore('stronghold', () => {
    const stronghold = ref<Stronghold | null>(null);
    const client = ref<Client | null>(null);
    const isUnlocked = computed(() => client.value !== null);

    function getStrongholdStore() {
        if (!client.value || !stronghold.value) throw new Error('Session is locked');
        return client.value.getStore();
    }



    function flushToStronghold() {
        if (!stronghold.value) throw new Error('Session is locked');
        return stronghold.value.save();
    }

    function getFromStronghold(strongholdId: string) {
        const store = getStrongholdStore();
        return store.get(strongholdId);
    }

    async function storeToStronghold(strongholdId: string, data: any) {
        const store = getStrongholdStore();
        await store.insert(strongholdId, data);
        await flushToStronghold();
    }


    async function _getVaultPath(): Promise<string> {
        return `${await appDataDir()}/vault-v2.hold`;
    }

    async function storeMnemonicToStronghold(strongholdId: string, mnemonic: string) {
        return storeToStronghold(strongholdId, Array.from(new TextEncoder().encode(mnemonic)));
    }

    async function getMnemonicFromStronghold(strongholdId: string): Promise<string> {
        const rawMnemonic = await getFromStronghold(strongholdId);
        if (!rawMnemonic) throw new Error('Mnemonic not found in Stronghold');
        return new TextDecoder().decode(rawMnemonic);
    }




    async function storeWalletPrivateKeyToStronghold(strongholdId: string, privateKey: WalletKey) {
        // we convert the wallet key in binary
        const encodedPrivateKey = new TextEncoder().encode(JSON.stringify(privateKey));
        return await storeToStronghold(strongholdId, Array.from(encodedPrivateKey));
    }

    async function getWalletPrivateKeyFromStronghold(strongholdId: string): Promise<WalletKey> {
        const privateKey = await getFromStronghold(strongholdId);
        if (privateKey === null) throw new Error('Wallet private key not found in Stronghold');
        const unparsedWalletKey = JSON.parse(new TextDecoder().decode(privateKey));
        return v.parse(WalletKeySchema, unparsedWalletKey)
    }

    async function openStronghold(password: string): Promise<void> {
        const vaultPath = await _getVaultPath();
        stronghold.value = await Stronghold.load(vaultPath, password);
        try {
            client.value = await stronghold.value.loadClient(STRONGHOLD_CLIENT);
            console.log("Stronghold loaded");
        } catch {
            client.value = await stronghold.value.createClient(STRONGHOLD_CLIENT);
            console.log("Stronghold created");
        }
    }
    async function lockStronghold() {
        stronghold.value = null;
        client.value = null;
    }

    return {
        isUnlocked,
        openStronghold,
        storeToStronghold,
        getFromStronghold,
        lockStronghold,
        getWalletPrivateKeyFromStronghold,
        storeWalletPrivateKeyToStronghold,
        getMnemonicFromStronghold,
        storeMnemonicToStronghold
    }
})