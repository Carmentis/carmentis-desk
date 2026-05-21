import {SeedEncoder, WalletCrypto, SignatureSchemeId} from "@cmts-dev/carmentis-sdk-core";
import {Ed25519PrivateSignatureKey} from "@cmts-dev/carmentis-sdk-core";
import {JwkSignatureKeyExporter} from "./jwk-signature-key-exporter.ts";
import * as jose from "jose";
import {SDJwtVcInstance} from "@sd-jwt/sd-jwt-vc";
import {digest, ES256, generateSalt} from "@sd-jwt/crypto-browser";
import {base64url} from "jose";

export class WalletSdJwtSigner {

    static async createFromCryptoKeyGenerator(jwkGenerator: () => Promise<{privateKey: CryptoKey, publicKey: CryptoKey}>) {
        const {privateKey, publicKey} = await jwkGenerator();
        // we now create a new signer/verifier pair
        const signer = async (data: string) => {
            console.log("Asking to sign:", data)
            const encoder = new TextEncoder();
            const rawData = encoder.encode(data);
            const sig = await window.crypto.subtle.sign({name: "Ed25519"}, privateKey, rawData);
            return base64url.encode(new Uint8Array(sig));
        }

        const verifier = async (data: string, signature: string) => {
            const encoder = new TextEncoder();
            const rawData = encoder.encode(data);
            const sig = await window.crypto.subtle.verify(
                {name: "Ed25519"},
                publicKey,
                base64url.decode(signature),
                rawData
            );
            return sig;
        }

        return new WalletSdJwtSigner(signer, verifier);
    }
    static async createFromSeed(seed: string) {
        // we derive a private key from the seed
        const wc = WalletCrypto.fromSeed(new SeedEncoder().decode(seed));
        const privateKey = await wc.getDefaultAccountCrypto().getPrivateSignatureKey(SignatureSchemeId.ED25519);
        const publicKey = await privateKey.getPublicKey();

        // we then construct a jwk from them
        const privateJwk = await JwkSignatureKeyExporter.exportPrivateKey(privateKey)
        const publicJwk = await JwkSignatureKeyExporter.exportPublicKey(publicKey)

        // and then create a jose-compliant CryptoKey object
        const privateCryptoKey = await jose.importJWK(privateJwk, 'Ed25519') as CryptoKey;
        const publicCryptoKey = await jose.importJWK(publicJwk, 'Ed25519') as CryptoKey;

        return WalletSdJwtSigner.createFromCryptoKeyGenerator(async () => ({privateKey: privateCryptoKey, publicKey: publicCryptoKey}));
    }

    private readonly sdjwt: SDJwtVcInstance;

    constructor(
        private readonly signer: (data: string) => Promise<string>,
        private readonly verifier: (data: string, signature: string) => Promise<boolean>,
    ) {
        this.sdjwt = new SDJwtVcInstance({
            hasher: digest,
            saltGenerator: generateSalt,
            kbSigner: this.signer,
            kbSignAlg: ES256.alg,
            kbVerifier: this.verifier,
        });
    }

    getSdJwtInstance() {
        return this.sdjwt;
    }
}

