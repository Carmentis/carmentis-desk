import {computed, inject, provide, ref, shallowRef, watch, type InjectionKey} from 'vue';
import {useRouter} from 'vue-router';
import {useToast} from 'primevue/usetoast';
import {storeToRefs} from 'pinia';
import {mnemonicToSeedSync} from '@scure/bip39';
import {
    JwkPrivateSignatureKey,
    SeedEncoder,
    SignatureSchemeId,
    WalletCrypto,
    type KmsPlugin,
} from '@cmts-dev/carmentis-sdk-core';
import {KeyType, type KmsKey, type Network, type WalletKey} from '../types/types.ts';
import {networkFromPreset} from '../utils/networkPresets.ts';
import {Bip39Utils} from '../utils/Bip39Utils.ts';
import {useAppStore} from '../stores/appStore.ts';
import {useStrongholdStore} from '../stores/strongholdStore.ts';
import {describeKmsError, getKeyCreationSchema, useKmsStore} from '../stores/useKmsStore.ts';
import {useJsonSchemaForm} from './useJsonSchemaForm.ts';

export type KeyCustody = 'local' | 'kms';
export type LocalKeyMethod = 'passphrase' | 'seed' | 'jwk';

export const WIZARD_STEPS = [
    {value: 1, label: 'Basics'},
    {value: 2, label: 'Key custody'},
    {value: 3, label: 'Key setup'},
    {value: 4, label: 'Review'},
] as const;
export type WizardStep = typeof WIZARD_STEPS[number]['value'];

export const SIGNATURE_SCHEME_OPTIONS = [
    {label: 'Secp256k1', value: SignatureSchemeId.SECP256K1},
    {label: 'MLDSA65', value: SignatureSchemeId.ML_DSA_65},
];

/** The seed is derived from the passphrase, used as a BIP39 mnemonic. */
function deriveSeedFromPassphrase(passphrase: string): string {
    return new SeedEncoder().encode(mnemonicToSeedSync(passphrase, ''));
}

/**
 * State of the wallet creation wizard, shared by its steps.
 *
 * Nothing is created before {@link submit}, called from the review step: no secret is stored and no
 * KMS wallet is created while the user goes back and forth between the steps.
 */
function createWalletCreationWizard() {
    const router = useRouter();
    const toast = useToast();
    const appStore = useAppStore();
    const strongholdStore = useStrongholdStore();
    const kmsStore = useKmsStore();
    const {servers: kmsServers} = storeToRefs(kmsStore);

    const step = ref<WizardStep>(1);

    // ---- step 1: basics ----
    const walletName = ref('');
    const network = ref<Network>(networkFromPreset('mainnet'));

    // ---- step 2: custody ----
    const custody = ref<KeyCustody | undefined>(undefined);
    const hasKmsServers = computed(() => kmsServers.value.length > 0);

    // ---- step 3a: local key ----
    const localMethod = ref<LocalKeyMethod>('passphrase');
    const schemeId = ref<number>(SIGNATURE_SCHEME_OPTIONS[0].value);
    const seed = ref('');
    const passphrase = ref('');
    const jwkInput = ref('');
    const isJwkValid = ref(false);

    function generateSeed() {
        seed.value = new SeedEncoder().encode(WalletCrypto.generateWallet().getSeedAsBytes());
    }

    function generatePassphrase() {
        passphrase.value = Bip39Utils.generateMnemonic();
    }

    const isLocalKeyValid = computed(() => {
        switch (localMethod.value) {
            case 'passphrase': return passphrase.value.trim() !== '';
            case 'seed': return seed.value.trim() !== '';
            case 'jwk': return isJwkValid.value;
        }
    });

    // ---- step 3b: KMS key ----
    const kmsServerUrl = ref<string | undefined>(undefined);
    const kmsPlugins = shallowRef<KmsPlugin[]>([]);
    const isLoadingPlugins = ref(false);
    const pluginsError = ref('');
    const kmsPluginId = ref<string | undefined>(undefined);
    const kmsLabel = ref('');

    const kmsServer = computed(() => kmsServers.value.find(s => s.url === kmsServerUrl.value));
    const kmsPlugin = computed(() => kmsPlugins.value.find(p => p.id === kmsPluginId.value));
    const paramsForm = useJsonSchemaForm(() => kmsPlugin.value && getKeyCreationSchema(kmsPlugin.value));

    // the first server is preselected
    watch(kmsServers, (list) => {
        if (!kmsServerUrl.value && list.length > 0) kmsServerUrl.value = list[0].url;
    }, {immediate: true});

    // URL of the server whose plugins are loaded (or loading)
    let loadedUrl: string | undefined;

    async function loadPlugins(refresh = false) {
        const url = kmsServerUrl.value;
        loadedUrl = url;
        kmsPlugins.value = [];
        kmsPluginId.value = undefined;
        pluginsError.value = '';
        if (!url) return;
        isLoadingPlugins.value = true;
        try {
            const plugins = await kmsStore.fetchPlugins(url, refresh);
            if (kmsServerUrl.value !== url) return; // another server was chosen meanwhile
            kmsPlugins.value = plugins;
            // the built-in plugin is preselected, or the only one
            kmsPluginId.value = (plugins.find(p => p.builtin) ?? (plugins.length === 1 ? plugins[0] : undefined))?.id;
            if (plugins.length === 0) pluginsError.value = 'This KMS has no plugin able to create wallets.';
        } catch (e) {
            if (kmsServerUrl.value === url) pluginsError.value = describeKmsError(e);
        } finally {
            if (kmsServerUrl.value === url) isLoadingPlugins.value = false;
        }
    }

    // the plugins are only fetched once the user reaches the KMS setup, and again when the server changes
    watch([kmsServerUrl, () => custody.value === 'kms' && step.value >= 3], ([url, needed]) => {
        if (!needed || url === loadedUrl) return;
        loadedUrl = url;
        void loadPlugins();
    });

    const isKmsKeyValid = computed(() => !!kmsServer.value && !!kmsPlugin.value && paramsForm.isValid.value);

    // ---- navigation ----
    const canProceed = computed(() => {
        switch (step.value) {
            case 1: return walletName.value.trim() !== '';
            case 2: return custody.value === 'local' || (custody.value === 'kms' && hasKmsServers.value);
            case 3: return custody.value === 'kms' ? isKmsKeyValid.value : isLocalKeyValid.value;
            case 4: return true;
        }
    });

    function next() {
        if (canProceed.value && step.value < 4) step.value = (step.value + 1) as WizardStep;
    }

    function back() {
        if (step.value > 1) step.value = (step.value - 1) as WizardStep;
    }

    // ---- review ----
    const localMethodLabels: Record<LocalKeyMethod, string> = {
        passphrase: 'Passphrase (BIP39)',
        seed: 'Seed',
        jwk: 'Imported JWK',
    };
    const schemeLabel = computed(() => SIGNATURE_SCHEME_OPTIONS.find(o => o.value === schemeId.value)?.label ?? '');

    const summary = computed(() => {
        const rows: { label: string; value: string }[] = [
            {label: 'Name', value: walletName.value.trim()},
            {label: 'Network', value: network.value.networkName},
        ];
        if (custody.value === 'kms') {
            rows.push(
                {label: 'Private key', value: 'Held by a Carmentis KMS'},
                {label: 'KMS', value: kmsServer.value ? `${kmsServer.value.name} (${kmsServer.value.url})` : ''},
                {label: 'Plugin', value: kmsPlugin.value?.name ?? ''},
            );
            const params = Object.entries(paramsForm.params.value);
            if (params.length > 0) {
                rows.push({
                    label: 'Key parameters',
                    value: params.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(', '),
                });
            }
            rows.push({label: 'KMS label', value: kmsLabel.value.trim() || walletName.value.trim()});
        } else {
            rows.push(
                {label: 'Private key', value: 'Stored on this device'},
                {label: 'Method', value: localMethodLabels[localMethod.value]},
            );
            if (localMethod.value !== 'jwk') rows.push({label: 'Signature algorithm', value: schemeLabel.value});
        }
        return rows;
    });

    // ---- creation ----
    const isCreating = ref(false);

    async function buildLocalKey(): Promise<WalletKey> {
        switch (localMethod.value) {
            case 'passphrase': {
                const value = passphrase.value.trim();
                return {keyType: KeyType.SEED, schemeId: schemeId.value, passphrase: value, seed: deriveSeedFromPassphrase(value)};
            }
            case 'seed':
                return {keyType: KeyType.SEED, schemeId: schemeId.value, seed: seed.value.trim()};
            case 'jwk': {
                const sk = await JwkPrivateSignatureKey.fromJwk(JSON.parse(jwkInput.value));
                return {keyType: KeyType.JWK, jwk: sk.getPrivateJwk()};
            }
        }
    }

    /** Creates the KMS wallet, then the local wallet; destroys the KMS wallet if the local one can't be saved. */
    async function createKmsBackedWallet(name: string, walletNetwork: Network): Promise<number> {
        if (!kmsServer.value || !kmsPlugin.value) throw new Error('No KMS or plugin selected');
        const kmsKey: KmsKey = await kmsStore.createKmsWallet(kmsServer.value.url, {
            pluginId: kmsPlugin.value.id,
            params: paramsForm.params.value,
            label: kmsLabel.value.trim() || name,
        });
        try {
            return await appStore.createWallet(name, kmsKey, walletNetwork);
        } catch (e) {
            // the API key would be lost: the KMS wallet would be unusable
            await kmsStore.deleteKmsWallet(kmsKey).catch(rollbackError =>
                console.error('Failed to delete the KMS wallet after a failed creation:', rollbackError));
            throw e;
        }
    }

    async function submit() {
        if (isCreating.value) return;
        const name = walletName.value.trim();
        if (!name || !custody.value || !isLocalOrKmsValid()) return;
        isCreating.value = true;
        try {
            if (!strongholdStore.isUnlocked) throw new Error('The vault is locked: unlock Desk and try again.');
            const walletNetwork: Network = {...network.value};
            const walletId = custody.value === 'kms'
                ? await createKmsBackedWallet(name, walletNetwork)
                : await appStore.createWallet(name, await buildLocalKey(), walletNetwork);
            toast.add({severity: 'success', summary: 'Wallet created', detail: name, life: 3000});
            await router.push(`/wallet/${walletId}`);
        } catch (e) {
            console.error('Failed to create the wallet:', e);
            toast.add({severity: 'error', summary: 'Wallet not created', detail: describeKmsError(e), life: 6000});
        } finally {
            isCreating.value = false;
        }
    }

    function isLocalOrKmsValid() {
        return custody.value === 'kms' ? isKmsKeyValid.value : isLocalKeyValid.value;
    }

    return {
        step, canProceed, next, back,
        walletName, network,
        custody, hasKmsServers,
        localMethod, schemeId, seed, passphrase, jwkInput, isJwkValid, generateSeed, generatePassphrase,
        kmsServers, kmsServerUrl, kmsServer, kmsPlugins, isLoadingPlugins, pluginsError, kmsPluginId, kmsPlugin,
        kmsLabel, paramsForm, loadPlugins, pluginIconUrl: kmsStore.pluginIconUrl,
        summary, isCreating, submit,
    };
}

export type WalletCreationWizard = ReturnType<typeof createWalletCreationWizard>;
const WIZARD_KEY: InjectionKey<WalletCreationWizard> = Symbol('walletCreationWizard');

/** Creates the wizard state and shares it with the steps. Call it in the page holding the stepper. */
export function provideWalletCreationWizard(): WalletCreationWizard {
    const wizard = createWalletCreationWizard();
    provide(WIZARD_KEY, wizard);
    return wizard;
}

/** The wizard state, in a step of the wizard. */
export function useWalletCreationWizard(): WalletCreationWizard {
    const wizard = inject(WIZARD_KEY);
    if (!wizard) throw new Error('useWalletCreationWizard() called outside of the wallet creation wizard');
    return wizard;
}
