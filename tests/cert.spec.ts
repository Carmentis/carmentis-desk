
import "reflect-metadata";
import {describe, expect, it} from "vitest";
import {X509Certificate} from "@peculiar/x509";
import {base64url, UnsecuredJWT, decodeJwt, SignJWT, importPKCS8} from "jose";
import {CryptoEncoderFactory, Secp256k1PrivateSignatureKey} from "@cmts-dev/carmentis-sdk-core";
import * as x509 from '@peculiar/x509';
import {CertificatesChain} from "../src/utils/CertificatesChain";
import {Certificate} from "../src/utils/Certificate";


// example of certificate in PEM format
const CERT = "-----BEGIN CERTIFICATE-----\n" +
    "MIIBijCCATygAwIBAgIUUFrvA1ZgZp/QUPoxOwjiSRw3EYAwBQYDK2VwMGUxETAP\n" +
    "BgNVBAMMCEpvaG4gRG9lMREwDwYDVQQLDAhPcmcgVW5pdDELMAkGA1UEBhMCVVMx\n" +
    "DjAMBgNVBAgMBVN0YXRlMQ0wCwYDVQQHDARDaXR5MREwDwYDVQQKDAhPcmcgTmFt\n" +
    "ZTAeFw0yNjA3MTMwODU0NTBaFw0yNzA3MTMwODU0NTBaMGUxETAPBgNVBAMMCEpv\n" +
    "aG4gRG9lMREwDwYDVQQLDAhPcmcgVW5pdDELMAkGA1UEBhMCVVMxDjAMBgNVBAgM\n" +
    "BVN0YXRlMQ0wCwYDVQQHDARDaXR5MREwDwYDVQQKDAhPcmcgTmFtZTAqMAUGAytl\n" +
    "cAMhACDgbtSpvdCCGtZmONULn25RyZuvytGN7H4woSkwyK9wMAUGAytlcANBAGSP\n" +
    "vMjKbD1S5pIB4W93yK5YRn/8cHaB/nolVheShBHf15WjyQHCMasHCmyHixYMkwuM\n" +
    "BDWGCaN3SytRA7jU5wE=\n" +
    "-----END CERTIFICATE-----"

/**
 * Convertit un PEM en ArrayBuffer (DER), sans dépendre de Buffer (donc utilisable navigateur/Node).
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace(/-----BEGIN [^-]+-----/, "")
        .replace(/-----END [^-]+-----/, "")
        .replace(/\s+/g, "");

    const binary = atob(b64); // atob dispo nativement en navigateur ET en Node ≥16 (global)
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Importe un certificat PEM et retourne un objet X509Certificate exploitable
 * (sujet, émetteur, clé publique, validité, extensions...).
 */
export async function importCertificateFromPem(pem: string): Promise<X509Certificate> {
    const der = pemToArrayBuffer(pem);
    return new X509Certificate(der);
}

async function importPublicKeyFromCertificate(
    cert: X509Certificate
): Promise<CryptoKey> {
    return cert.publicKey.export();
}

/**
 * Encode un ArrayBuffer en base64 standard (RFC 4648 §4), requis par x5c.
 * Attention : x5c utilise du base64 classique, PAS du base64url comme le reste du JWK.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary); // btoa natif navigateur + Node ≥16
}


// example of private key in PEM format
const SK = "-----BEGIN PRIVATE KEY-----\n" +
    "MC4CAQAwBQYDK2VwBCIEIIydEeW+WbtAixvvEhAnvN24SXQ/y+tnzM92O12ikLEk\n" +
    "-----END PRIVATE KEY-----"
function detectAlgorithmFromPem(pem: string): string {
    const der = pemToArrayBuffer(pem);
    const bytes = new Uint8Array(der);

    // OID Ed25519: 1.3.101.112 → 06 03 2B 65 70
    // OID ECDSA: 1.2.840.10045.2.1 → 06 07 2A 86 48 CE 3D 02 01
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hex.includes('2b6570')) return 'EdDSA';
    if (hex.includes('2a8648ce3d0201')) return 'EC';
    if (hex.includes('2a864886f70d010101')) return 'RSA';

    return 'EdDSA'; // default fallback
}

async function importSkFromPem(pem: string, alg?: string) {
    const algorithm = alg || detectAlgorithmFromPem(pem);
    return importPKCS8(pem, algorithm)
}

describe("Certificate", () => {
    it("Should validate chain of certificates", async () => {
        const res = await CertificatesChain.verifyX509Chain([CERT])
        expect(res).toBe(true)
    })
    it("Should be able to import a PEM certificate", async () => {
        // extract the public key from the certificate
        const cert = await importCertificateFromPem(CERT);
        console.log(cert)
        const pk = await importPublicKeyFromCertificate(cert);
        console.log(pk)

        // construct the JWK with the public key along the certificate chain
        // cert.rawData : ArrayBuffer du DER du certificat (propriété de @peculiar/x509)
        const x5c = [arrayBufferToBase64(cert.rawData)];
        const jwk = await crypto.subtle.exportKey("jwk", pk);
        const jwkWithChain = { ...jwk, x5c };
        const did = `did:jwk:${base64url.encode(JSON.stringify(jwkWithChain))}`;
        console.log(JSON.stringify(jwkWithChain))

        // construct an unsigned sd-jwt with the JWK
        const csk = Secp256k1PrivateSignatureKey.gen();
        const cpk = await csk.getPublicKey();
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const unsignedPayload = {
            iss: did,
            sub: await encoder.encodePublicKey(cpk),
            iat: Math.floor(Date.now() / 1000),
            exp: cert.notAfter.getTime() / 1000,
        };
        console.log(unsignedPayload)
        const unsignedJwt = new UnsecuredJWT(unsignedPayload)
            .setIssuedAt()
            .encode();
        console.log(unsignedJwt)

        // we now sign the unsigned JWT with the private key
        const alg = detectAlgorithmFromPem(CERT);
        const isk = await importSkFromPem(SK, alg);
        const payload = decodeJwt(unsignedJwt);
        const signedJwt = await new SignJWT(payload)
            .setProtectedHeader({alg: alg})
            .sign(isk);
        console.log(signedJwt)

    })

    it("Should be able to import a PEM certificate with a more compact version", async () => {
        // extract the public key from the certificate
        const cert = await Certificate.importFromPem(CERT);
        const pk = await cert.getPublicKeyAsCryptoKey();
        console.log(pk)

        // compute jwk with chains
        const jwkWithChain = await cert.getPublicKeyToJwkWithChain([CERT])
        const did = `did:jwk:${base64url.encode(JSON.stringify(jwkWithChain))}`;

        // construct an unsigned sd-jwt with the JWK
        const csk = Secp256k1PrivateSignatureKey.gen();
        const cpk = await csk.getPublicKey();
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const unsignedPayload = {
            iss: did,
            sub: await encoder.encodePublicKey(cpk),
            iat: Math.floor(Date.now() / 1000),
            exp: cert.getNotAfter(),
        };
        console.log(unsignedPayload)
        const unsignedJwt = new UnsecuredJWT(unsignedPayload)
            .setIssuedAt()
            .encode();
        console.log(unsignedJwt)

        // we now sign the unsigned JWT with the private key
        const alg = detectAlgorithmFromPem(CERT);
        const isk = await importSkFromPem(SK, alg);
        const payload = decodeJwt(unsignedJwt);
        const signedJwt = await new SignJWT(payload)
            .setProtectedHeader({alg: alg})
            .sign(isk);
        console.log(signedJwt)

        /*
        console.log(cert)
        const pk = await importPublicKeyFromCertificate(cert);
        console.log(pk)

        // construct the JWK with the public key along the certificate chain
        // cert.rawData : ArrayBuffer du DER du certificat (propriété de @peculiar/x509)
        const x5c = [arrayBufferToBase64(cert.rawData)];
        const jwk = await crypto.subtle.exportKey("jwk", pk);
        const jwkWithChain = { ...jwk, x5c };
        const did = `did:jwk:${base64url.encode(JSON.stringify(jwkWithChain))}`;
        console.log(JSON.stringify(jwkWithChain))

        // construct an unsigned sd-jwt with the JWK
        const csk = Secp256k1PrivateSignatureKey.gen();
        const cpk = await csk.getPublicKey();
        const encoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
        const unsignedPayload = {
            iss: did,
            sub: await encoder.encodePublicKey(cpk),
            iat: Math.floor(Date.now() / 1000),
            exp: cert.notAfter.getTime() / 1000,
        };
        console.log(unsignedPayload)
        const unsignedJwt = new UnsecuredJWT(unsignedPayload)
            .setIssuedAt()
            .encode();
        console.log(unsignedJwt)

        // we now sign the unsigned JWT with the private key
        const alg = detectAlgorithmFromPem(CERT);
        const isk = await importSkFromPem(SK, alg);
        const payload = decodeJwt(unsignedJwt);
        const signedJwt = await new SignJWT(payload)
            .setProtectedHeader({alg: alg})
            .sign(isk);
        console.log(signedJwt)

         */

    })

    it("Should sign", async () => {
        const unsignedJwt = "eyJhbGciOiJub25lIn0.eyJpYXQiOjE3ODM5NTMwNjksImV4cCI6MTgxNTQ2ODg5MH0.";

        const alg = detectAlgorithmFromPem(CERT);
        const isk = await importSkFromPem(SK, alg);
        const payload = decodeJwt(unsignedJwt);
        const signedJwt = await new SignJWT(payload)
            .setProtectedHeader({alg: alg})
            .sign(isk);
        console.log(signedJwt)
    })
})