import {describe, expect, it} from "vitest";
import { digest, generateSalt, ES256 } from '@sd-jwt/crypto-nodejs';
import {SDJwtVcInstance} from "@sd-jwt/sd-jwt-vc";
import base64url from 'base64url';
import {CryptoEncoderFactory, Secp256k1PrivateSignatureKey} from "@cmts-dev/carmentis-sdk-core";

class DidCmtsPkResolver {
    resolve(did: string): string | undefined {
        if (did.startsWith("did:cmts:")) {
            return did.substring("did:cmts:".length);
        }
        return undefined;
    }

    toDid(pk: string): string {
        return `did:cmts:${pk}`;
    }
}

describe("SD-JWT test", () => {

    it("Should encode a pk into did:cmts", () => {
        const pk = "SIG:SECP256K1:PK{02374b39521dc08cbafc76d78e9b444330d2ad1ba1b0167063044e3827385492dc}";
        const expected = `did:cmts:sig:secp256k1:pk:02374b39521dc08cbafc76d78e9b444330d2ad1ba1b0167063044e3827385492dc`
        const expectedDidVb = `did:cmts:vb:02374b39521dc08cbafc76d78e9b444330d2ad1ba1b0167063044e3827385492dc`
        const resolver = new DidCmtsPkResolver();
        const did = resolver.toDid(pk);
        expect(expected).toEqual(did);
        console.log(did);
    })
    it("Should create a VC", async () => {
        const { privateKey, publicKey } = await ES256.generateKeyPair();
        expect(privateKey).toBeDefined();
        expect(publicKey).toBeDefined();

        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const userPrivateKey = Secp256k1PrivateSignatureKey.gen();
        const userPublicKey = await userPrivateKey.getPublicKey();

        const signer = await ES256.getSigner(privateKey);
        const verifier = await ES256.getVerifier(publicKey);
        const issuerCredentialEmission = new SDJwtVcInstance({
            hasher: digest,
            saltGenerator: generateSalt,
            signAlg: ES256.alg, // "ES256"
            signer,
            verifier,
        });

        const now = Math.floor(Date.now() / 1000);
        const iat = now + 365 * 24 * 60 * 60;
        const issuer = process.env.ISSUER_URL ?? 'http://localhost:3000';

        // create the payload for the credential
        const payload = {
            vct: 'EmailCredential',
            email: 'gamarcadet@gmail.com',
            issuer,

            // did:jwk:e......

            // SIG:SEP256K1:PK{....}
            // did:cmts:pk_<PK>

            // did:cmts:vb_<VB_ID>
            sub: await encoder.encodePublicKey(userPublicKey),
        }
        const credential = await issuerCredentialEmission.issue(payload);

        expect(credential).toBeDefined();

        // create the Carmentis signer
        const kbSigner = async (data: string) => {
            const bytes = new TextEncoder().encode(data);
            const signature = await userPrivateKey.sign(bytes);
            return base64url.encode(Buffer.from(signature));
        };

        const kbVerifier = async (data: string, signature: string) => {
            const message = new TextEncoder().encode(data);
            const sig = base64url.toBuffer(signature);

            return await userPublicKey.verify(message, sig);
        };

        const nonce = "1234";
        const userPresentationEmission = new SDJwtVcInstance({
            hasher: digest,
            kbSignAlg: 'ES256K',
            saltGenerator: generateSalt,
            kbSigner,
        });
        const presentation = await userPresentationEmission.present(credential, {}, {
            kb: {
                payload: {
                    nonce,
                    iat: Math.floor(Date.now() / 1000),
                    aud: 'test-audience',
                },
            },
        });
        expect(presentation).toBeDefined();

        const issuerPresentationVerification = new SDJwtVcInstance({
            hasher: digest,
            saltGenerator: generateSalt,
            signAlg: ES256.alg, // "ES256"
            signer,
            verifier,
            kbVerifier: kbVerifier,
            kbSigner: kbSigner,
        });

        // verify instance
        const result = await issuerPresentationVerification.verify(presentation, {
            keyBindingNonce: nonce,
        });
        expect(result).toBeDefined()
        expect(result.payload).toBeDefined()

    })
})