import type {DcqlCredential} from "dcql";
import {digest, ES256, generateSalt} from "@sd-jwt/crypto-browser";
import {SDJwtVcInstance} from "@sd-jwt/sd-jwt-vc";

export async function convertSdJwtToDcqlCredential(sdJwt: string): Promise<DcqlCredential> {
    const {privateKey, publicKey} = await ES256.generateKeyPair();
    const signer = await ES256.getSigner(privateKey);
    const verifier = await ES256.getVerifier(publicKey);
    const sdjwt = new SDJwtVcInstance({
        signer,
        signAlg: ES256.alg,
        verifier,
        hasher: digest,
        saltGenerator: generateSalt,
    });

    const rawClaims = await sdjwt.getClaims(sdJwt);

    return {
        vct: 'EmailCredential',
        credential_format: 'vc+sd-jwt',
        cryptographic_holder_binding: true,
        claims: rawClaims,
        encoded: sdJwt
    };
}