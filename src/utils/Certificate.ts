import {Name, X509Certificate} from "@peculiar/x509";
import {JWK} from "jose";
import {EncoderFactory} from "@cmts-dev/carmentis-sdk-core";

export class Certificate {
    static async importFromPem(pem: string): Promise<Certificate> {
        const der = Certificate.pemToArrayBuffer(pem);
        return new Certificate(pem, new X509Certificate(der));
    }

    private static pemToArrayBuffer(pem: string): ArrayBuffer {
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
     * Encode un ArrayBuffer en base64 standard (RFC 4648 §4), requis par x5c.
     * Attention : x5c utilise du base64 classique, PAS du base64url comme le reste du JWK.
     */
    private static  arrayBufferToBase64(buffer: ArrayBuffer): string {
        const b64 = EncoderFactory.bytesToBase64Encoder();
        return b64.encode(new Uint8Array(buffer));
    }

    constructor(
        private readonly pem: string,
        private readonly cert: X509Certificate
    ) {}

    getName(): Name {
        return this.cert.issuerName;
    }

    getSubjectName(): Name {
        return this.cert.subjectName;
    }

    isSelfSigned(): boolean {
        return this.cert.issuerName === this.cert.subjectName;
    }

    getCN(): string {
        try {
            const subject = this.cert.subjectName;
            return subject.getField('CN')[0];
        } catch (e) {
            return "N/A";
        }
    }

    getNotBefore() {
        return Math.floor(this.cert.notBefore.getTime() / 1000);
    }

    getNotAfter() {
        return Math.floor(this.cert.notAfter.getTime() / 1000);
    }

    getKeyType(): string {
        const der = Certificate.pemToArrayBuffer(this.pem);
        const bytes = new Uint8Array(der);

        // OID Ed25519: 1.3.101.112 → 06 03 2B 65 70
        // OID ECDSA: 1.2.840.10045.2.1 → 06 07 2A 86 48 CE 3D 02 01
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

        if (hex.includes('2b6570')) return 'EdDSA';
        if (hex.includes('2a8648ce3d0201')) return 'EC';
        if (hex.includes('2a864886f70d010101')) return 'RSA';

        return 'EdDSA'; // default fallback
    }

    getPublicKeyAsCryptoKey() {
        return this.cert.publicKey.export();
    }

    async getPublicKeyToJwk() {
        return await crypto.subtle.exportKey(
            "jwk",
            await this.getPublicKeyAsCryptoKey());
    }

    getBase64EncodedDer() {
        return Certificate.arrayBufferToBase64(this.cert.rawData);
    }

    async getPublicKeyToJwkWithChain(chains: string[]): Promise<JWK> {
        const publicKeyJwk = await this.getPublicKeyToJwk();
        const x5c = [];// chains.map()[Certificate.arrayBufferToBase64(this.cert.rawData)];
        for (const pem of chains) {
            const cert = await Certificate.importFromPem(pem);
            x5c.push(cert.getBase64EncodedDer());
        }
        return {
            ...publicKeyJwk,
            x5c
        };
    }
}