import {
    Ed25519PrivateSignatureKey,
    Ed25519PublicSignatureKey,
    PrivateSignatureKey,
    PublicSignatureKey,
    SeedEncoder,
    SignatureSchemeId,
    WalletCrypto,
} from '@cmts-dev/carmentis-sdk-core';
import * as jose from 'jose';
import { base64url, JWK } from 'jose';

export class JwkSignatureKeyExporter {
    static async exportPrivateKey(key: PrivateSignatureKey): Promise<JWK> {
        if (key instanceof Ed25519PrivateSignatureKey) {
            const sk = key.getPrivateKeyAsBytes();
            const publicKey = await key.getPublicKey();
            const publicKeyBytes = await publicKey.getPublicKeyAsBytes();
            return {
                kty: 'OKP',
                crv: 'Ed25519',
                alg: 'EdDSA',
                d: jose.base64url.encode(sk),
                x: jose.base64url.encode(publicKeyBytes),
            };
        }
        throw new Error('Private key not exportable as JWK');
    }

    static async exportPublicKey(key: PublicSignatureKey): Promise<JWK> {
        if (key instanceof Ed25519PublicSignatureKey) {
            const publicKeyBytes = await key.getPublicKeyAsBytes();
            return {
                kty: 'OKP',
                crv: 'Ed25519',
                alg: 'EdDSA',
                x: jose.base64url.encode(publicKeyBytes),
            };
        }
        throw new Error('Private key not exportable as JWK');
    }

    static async exportPublicKeyAsDidJwk(key: PublicSignatureKey): Promise<string> {
        const jwk = await JwkSignatureKeyExporter.exportPublicKey(key);
        return `did:jwk:${base64url.encode(JSON.stringify(jwk))}`;
    }

    static async computeDidJwkFromSeed(encodedSeed: string): Promise<string> {
        const wc = WalletCrypto.fromSeed(new SeedEncoder().decode(encodedSeed));
        const sk = await wc.getDefaultAccountCrypto().getPrivateSignatureKey(SignatureSchemeId.ED25519);
        const pk = await sk.getPublicKey();
        return JwkSignatureKeyExporter.exportPublicKeyAsDidJwk(pk);
    }
}
