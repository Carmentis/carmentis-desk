import {PrivateSignatureKey, PublicSignatureKey} from "@cmts-dev/carmentis-sdk-core";
import {JWK} from "jose";

export interface IJsonWebKeyConverter<PK extends PublicSignatureKey, SK extends PrivateSignatureKey> {
    convertPublicKey(publicKey: PK): Promise<JWK>;
    convertPrivateKey(privateKey: SK): Promise<JWK>;
}