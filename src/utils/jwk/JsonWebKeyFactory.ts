import {
    Ed25519PrivateSignatureKey,
    Ed25519PublicSignatureKey,
    PrivateSignatureKey,
    PublicSignatureKey, Secp256k1PrivateSignatureKey,
    Secp256k1PublicSignatureKey
} from "@cmts-dev/carmentis-sdk-core";
import {Secp256k1JsonWebKeyConverter} from "./Secp256k1JsonWebKeyConverter.ts";
import {Ed25519JsonWebKeyConverter} from "./Ed25519JsonWebKeyConverter.ts";
import {match, P} from "ts-pattern";

export class JsonWebKeyFactory {
    private static readonly secp256k1Converter = new Secp256k1JsonWebKeyConverter();
    private static readonly ed25519Converter = new Ed25519JsonWebKeyConverter();

    static fromCarmentisPublicSignatureKey(publicKey: PublicSignatureKey) {
        return match (publicKey)
            .with(P.instanceOf(Ed25519PublicSignatureKey), publicKey => this.ed25519Converter.convertPublicKey(publicKey))
            .with(P.instanceOf(Secp256k1PublicSignatureKey), publicKey => this.secp256k1Converter.convertPublicKey(publicKey))
            .otherwise(() => Promise.reject('Unsupported key type'));
    }

    static fromCarmentisPrivateSignatureKey(privateKey: PrivateSignatureKey) {
        return match (privateKey)
            .with(P.instanceOf(Ed25519PrivateSignatureKey), privateKey => this.ed25519Converter.convertPrivateKey(privateKey))
            .with(P.instanceOf(Secp256k1PrivateSignatureKey), privateKey => this.secp256k1Converter.convertPrivateKey(privateKey))
            .otherwise(() => Promise.reject('Unsupported key type'));
    }
}