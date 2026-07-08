import {useStorageStore} from "../stores/storage.ts";
import {createIndexerClient} from "../api/indexer/client.ts";
import {
    CryptoEncoderFactory,
    PublicSignatureKey,
    SeedEncoder,
    SignatureSchemeId,
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
        const storageStore = useStorageStore();
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        const wallet = await storageStore.getWalletById(walletId);
        if (!wallet) throw new Error('Wallet not found');
        return this.getPublicKeyFromSeedAndSignatureScheme(rawSeed, wallet.schemeId);
    }

    static async encodePublicKey(publicKey: PublicSignatureKey) {
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        return await encoder.encodePublicKey(publicKey);
    }

    static async getPublicKeyFromSeedAndSignatureScheme(rawSeed: string, signatureScheme: number) {
        const encoder = new SeedEncoder();
        const seed = encoder.decode(rawSeed);
        const walletCrypto = WalletCrypto.fromSeed(seed);
        const accountCrypto = walletCrypto.getDefaultAccountCrypto();
        const sk = await accountCrypto.getPrivateSignatureKey(
            signatureScheme
        );
        return await sk.getPublicKey();
    }

    async getKeyPair(walletId: number, signatureScheme?: SignatureSchemeId) {
        const session = useSessionStore();
        const rawSeed = await session.getWalletSeed(walletId);
        const encoder = new SeedEncoder();
        const seed = encoder.decode(rawSeed);
        const walletCrypto = WalletCrypto.fromSeed(seed);
        const accountCrypto = walletCrypto.getDefaultAccountCrypto();
        const sk = await accountCrypto.getPrivateSignatureKey(
            signatureScheme
        );
        const pk = await sk.getPublicKey();
        return { sk, pk };
    }
}