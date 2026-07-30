import { invoke } from '@tauri-apps/api/core';

export interface CertificateInfo {
    thumbprint: string;
    subject: string;
    issuer: string;
    friendly_name: string | null;
}

export async function listCertificates(): Promise<CertificateInfo[]> {
    return invoke<CertificateInfo[]>('list_certificates');
}

export async function signData(payload: Uint8Array, certThumbprint: string): Promise<Uint8Array> {
    const result = await invoke<number[]>('sign_data', {
        payload: Array.from(payload),
        certThumbprint,
    });
    return new Uint8Array(result);
}

export async function getCertificatePem(certThumbprint: string): Promise<string> {
    const der = await invoke<number[]>('get_certificate_der', { certThumbprint });
    return derToPem(new Uint8Array(der));
}

export async function getCertificateChainPem(certThumbprint: string): Promise<string[]> {
    const chain = await invoke<number[][]>('get_certificate_chain_der', { certThumbprint });
    return chain.map(der => derToPem(new Uint8Array(der)));
}

export async function isCertificateStoreAvailable(): Promise<boolean> {
    return invoke<boolean>('is_certificate_store_available');
}

function derToPem(der: Uint8Array): string {
    const b64 = btoa(String.fromCharCode(...der));
    const lines = b64.match(/.{1,64}/g) ?? [];
    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}
