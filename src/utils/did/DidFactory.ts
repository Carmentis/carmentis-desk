import {base64url} from "jose";

export class DidFactory {
    static fromJsonWebKey(jwk: any) {
        return `did:jwk:${base64url.encode(JSON.stringify(jwk))}`;
    }
}