import {Ed25519PrivateSignatureKey, Ed25519PublicSignatureKey} from "@cmts-dev/carmentis-sdk-core";
import {IJsonWebKeyConverter} from "./IJsonWebKeyConverter.ts";
import { JWK } from "jose";
import * as jose from "jose";

export class Ed25519JsonWebKeyConverter implements IJsonWebKeyConverter<Ed25519PublicSignatureKey, Ed25519PrivateSignatureKey> {
    async convertPublicKey(publicKey: Ed25519PublicSignatureKey): Promise<JWK> {
        const publicKeyBytes = await publicKey.getPublicKeyAsBytes();
        return {
            kty: 'OKP',
            crv: 'Ed25519',
            alg: 'EdDSA',
            x: jose.base64url.encode(publicKeyBytes),
        }
    }

    async convertPrivateKey(privateKey: Ed25519PrivateSignatureKey): Promise<JWK> {
            const sk = privateKey.getPrivateKeyAsBytes();
            const publicKey = await privateKey.getPublicKey();
            const publicKeyBytes = await publicKey.getPublicKeyAsBytes();
            return {
                kty: 'OKP',
                crv: 'Ed25519',
                alg: 'EdDSA',
                d: jose.base64url.encode(sk),
                x: jose.base64url.encode(publicKeyBytes),
            }
    }
}