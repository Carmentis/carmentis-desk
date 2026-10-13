import type {Network} from "../types/types.ts";

export type NetworkPresetId = 'mainnet' | 'testnet' | 'devnet' | 'custom';

export interface NetworkPreset {
    label: string;
    value: NetworkPresetId;
    node: string;
    indexer: string;
}

export const NETWORK_PRESETS: NetworkPreset[] = [
    { label: 'Mainnet', value: 'mainnet', node: 'https://mercurius.carmentis.io', indexer: 'https://indexer.carmentis.io' },
    { label: 'Testnet', value: 'testnet', node: 'https://ares.testnet.carmentis.io', indexer: 'https://indexer.testnet.carmentis.io' },
    { label: 'Devnet', value: 'devnet', node: 'https://node2.server2.devnet.carmentis.io', indexer: 'https://indexer.server4.devnet.carmentis.io' },
    { label: 'Custom', value: 'custom', node: '', indexer: '' },
];

export function networkFromPreset(id: NetworkPresetId): Network {
    const preset = NETWORK_PRESETS.find(p => p.value === id) ?? NETWORK_PRESETS[0];
    return { networkName: preset.value, node: preset.node, indexer: preset.indexer };
}

/**
 * Returns the preset matching the network name, falling back to the custom preset.
 */
export function presetIdFromNetwork(network: Network | undefined): NetworkPresetId {
    const preset = NETWORK_PRESETS.find(p => p.value === network?.networkName);
    return preset?.value ?? 'custom';
}
