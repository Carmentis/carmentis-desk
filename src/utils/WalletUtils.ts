import {useStorageStore} from "../stores/storage.ts";
import {createIndexerClient} from "../api/indexer/client.ts";
import {
    CryptoEncoderFactory,
    PublicSignatureKey,
    SeedEncoder,
    WalletCrypto
} from "@cmts-dev/carmentis-sdk-core";
import {useSessionStore} from "../stores/sessionStore.ts";

export class WalletUtils {
    static async getIndexerFromWalletId(walletId: number) {
        const storageStore = useStorageStore();
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet?.indexer) throw new Error('Indexer not configured for this wallet');
        return createIndexerClient(wallet.indexer);
    }

    static async getPublicKeyFromWalletId(walletId: number) {
        const sk = await this.getPrivateKeyFromWalletId(walletId);
        return await sk.getPublicKey();
    }

    static async getPrivateKeyFromWalletId(walletId: number) {
        const storageStore = useStorageStore();
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet) throw new Error('Wallet not found');
        return this.getPrivateKeyFromSeedAndSignatureScheme(rawSeed, wallet.schemeId);
    }

    static async encodePublicKey(publicKey: PublicSignatureKey) {
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        return await encoder.encodePublicKey(publicKey);
    }

    static async getPublicKeyFromSeedAndSignatureScheme(rawSeed: string, signatureScheme: number) {
        const sk = await this.getPrivateKeyFromSeedAndSignatureScheme(rawSeed, signatureScheme);
        return await sk.getPublicKey();
    }

    static async getPrivateKeyFromSeedAndSignatureScheme(rawSeed: string, signatureScheme: number) {
        const encoder = new SeedEncoder();
        const seed = encoder.decode(rawSeed);
        const walletCrypto = WalletCrypto.fromSeed(seed);
        const accountCrypto = walletCrypto.getDefaultAccountCrypto();
        return await accountCrypto.getPrivateSignatureKey(
            signatureScheme
        );
    }
}