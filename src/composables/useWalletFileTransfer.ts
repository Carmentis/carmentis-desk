import {
    ExportedWalletMapper,
    KeyType as SdkKeyType,
    WalletKeyFileBuilder,
    WalletKeyFileService,
    type ExportedKey,
    type KeyFilePayload,
} from '@cmts-dev/carmentis-sdk-core';
import {open, save} from '@tauri-apps/plugin-dialog';
import {readFile, writeFile} from '@tauri-apps/plugin-fs';
import {useAppStore} from '../stores/appStore.ts';
import {useStrongholdStore} from '../stores/strongholdStore.ts';
import {KeyType, type WalletKey} from '../types/types.ts';

const WALLET_FILE_EXTENSION = 'ecw';
const WALLET_FILE_FILTERS = [{name: 'Encrypted Carmentis wallet', extensions: [WALLET_FILE_EXTENSION]}];

/** Raised when exporting a wallet whose private key lives in a KMS: there is nothing to put in the file. */
export class KmsWalletNotExportableError extends Error {
    constructor() {
        super('The private key of this wallet is managed by a Carmentis KMS: it cannot be exported to a file.');
        this.name = 'KmsWalletNotExportableError';
    }
}

function toExportedKey(key: WalletKey): ExportedKey {
    switch (key.keyType) {
        case KeyType.SEED:
            return {keyType: SdkKeyType.SEED, schemeId: key.schemeId, seed: key.seed, passphrase: key.passphrase};
        case KeyType.JWK:
            return {keyType: SdkKeyType.JWK, jwk: key.jwk as {kty: string}};
        case KeyType.KMS:
            throw new KmsWalletNotExportableError();
    }
}

function fromExportedKey(key: ExportedKey): WalletKey {
    return key.keyType === SdkKeyType.SEED
        ? {keyType: KeyType.SEED, schemeId: key.schemeId, seed: key.seed, passphrase: key.passphrase}
        : {keyType: KeyType.JWK, jwk: key.jwk};
}

// A file name must not contain path separators or other characters rejected by common file systems.
const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|\s]+/g, '_');

/**
 * Export and import of wallets as password-encrypted `.ecw` files.
 * The password is only used for the operation and is never stored.
 */
export function useWalletFileTransfer() {
    const appStore = useAppStore();
    const strongholdStore = useStrongholdStore();
    const service = new WalletKeyFileService();

    /** Decrypts the freshly encrypted bytes with the same password and checks they hold exactly the exported wallets. */
    async function assertRecoverable(encrypted: Uint8Array, expected: KeyFilePayload, password: string) {
        const recovered = await service.import(encrypted, password);
        if (JSON.stringify(recovered.wallets) !== JSON.stringify(expected.wallets)) {
            throw new Error('The encrypted wallet does not match the exported wallet: nothing was written.');
        }
    }

    /** Asks where to save the file, then writes the encrypted wallet. Returns the path, or undefined if cancelled. */
    async function exportWallet(walletId: number, password: string): Promise<string | undefined> {
        const wallet = await appStore.getWalletById(walletId);
        // fails before asking for a path when the key can't be exported (KMS wallets)
        const key = await strongholdStore.getWalletPrivateKeyFromStronghold(wallet.privateKeyStrongholdId);
        const privateKey = toExportedKey(key);

        const path = await save({
            defaultPath: `wallet-${sanitizeFileName(wallet.name)}.${WALLET_FILE_EXTENSION}`,
            filters: WALLET_FILE_FILTERS,
        });
        if (!path) return undefined;

        const actorPassphrase = await strongholdStore.getMnemonicFromStronghold(wallet.actorKeysMnemonicStrongholdId);
        const payload = new WalletKeyFileBuilder()
            .addWallet({
                name: wallet.name,
                createdAt: wallet.createdAt?.toISOString(),
                privateKey,
                actorPassphrase,
                connectivity: {
                    networkName: wallet.network.networkName,
                    nodeEndpoint: wallet.network.node,
                    indexerEndpoint: wallet.network.indexer,
                },
            })
            .build();
        const encrypted = await service.export(payload, password);
        await assertRecoverable(encrypted, payload, password);
        await writeFile(path, encrypted);
        return path;
    }

    /** Asks for an `.ecw` file. Returns its bytes, or undefined if cancelled. */
    async function pickWalletFile(): Promise<Uint8Array | undefined> {
        const path = await open({multiple: false, filters: WALLET_FILE_FILTERS});
        if (!path) return undefined;
        return readFile(path);
    }

    /** Decrypts the file and creates the wallets it contains. Throws if the password is wrong. */
    async function importWallets(bytes: Uint8Array, password: string): Promise<number[]> {
        const payload = await service.import(bytes, password);
        const ids: number[] = [];
        for (const exported of payload.wallets) {
            const connectivity = exported.connectivity;
            const network = connectivity
                ? {networkName: connectivity.networkName, node: connectivity.nodeEndpoint, indexer: connectivity.indexerEndpoint}
                : {networkName: 'mainnet', node: 'https://mercurius.carmentis.io', indexer: 'https://indexer.carmentis.io'};
            ids.push(await appStore.createWallet(exported.name, fromExportedKey(exported.privateKey), network, exported.actorPassphrase));
        }
        return ids;
    }

    return {exportWallet, pickWalletFile, importWallets};
}
