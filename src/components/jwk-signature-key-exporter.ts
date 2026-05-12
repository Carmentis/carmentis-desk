import {
    Ed25519PrivateSignatureKey,
    Ed25519PublicSignatureKey,
    PrivateSignatureKey,
    PublicSignatureKey,
} from '@cmts-dev/carmentis-sdk-core';
import * as jose from 'jose';
import { JWK } from 'jose';

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
}
