import {describe, it} from 'vitest';
import {Ed25519PrivateSignatureKey} from "@cmts-dev/carmentis-sdk-core";
import * as jose from "jose";
import {JwkSignatureKeyExporter} from "../src/components/jwk-signature-key-exporter";


describe('derive-cmts-key-to-jwk', () => {
    it("Should create", async () => {
        const key = Ed25519PrivateSignatureKey.gen();
        const pk = await key.getPublicKey();
        const jwk = await JwkSignatureKeyExporter.exportPrivateKey(key);
        const msg = new Uint8Array([1, 2, 3]);
        const sig = await new jose.GeneralSign(msg).addSignature(jwk).setProtectedHeader({alg: 'EdDSA'}).sign();
        const verified = await jose.generalVerify(
            sig,
            await JwkSignatureKeyExporter.exportPublicKey(pk)
        );
        console.log(verified)

        const res = await window.crypto.subtle.sign(
            { name: 'Ed25519' },
            await jose.importJWK(jwk, 'EdDSA', {extractable: true}) as CryptoKey,
            new Uint8Array([1, 2, 3])
        );
        console.log(res)

    })
});