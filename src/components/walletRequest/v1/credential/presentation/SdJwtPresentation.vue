<script setup lang="ts">
import {WalletSdJwtSigner} from "../../../../../utils/WalletSdJwtSigner.ts";
import {computed, ref} from "vue";
import {CredentialPresentation} from "./SdJwtPresentationRequestType.ts";
import DropdownWalletSelection from "../../../../DropdownWalletSelection.vue";
import {useStorageStore} from "../../../../../stores/storage.ts";
import {storeToRefs} from "pinia";
import {type DcqlCredential, DcqlQuery, DcqlQueryResult} from 'dcql'
import {SdJwtUtils} from "../../../../../utils/SdJwtUtils.ts";
import {computedAsync} from "@vueuse/core";
import {convertSdJwtToDcqlCredential} from "../../../../../utils/utils.ts";
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

// define the expected parameters
const props = defineProps<{
    credentialPresentationRequest: CredentialPresentation;
}>();

const emit = defineEmits<{
    present: [token: string];
    reject: [];
}>();

// extract and parse the DCQL query from the params
const dcqlQuery = computed(() => {
	try {
		const query = props.credentialPresentationRequest.query;
		if (DcqlQuery.parse(query)) {
			return query;
		}
		return null;
	} catch (e) {
		console.error(`An error occurred during the parsing of the DCQL query: ${e.message ?? 'Unknown error'}` );
	}
})

// extract the desired claims to reveal
const desiredClaims = computed(() => {
	const query = dcqlQuery.value;
	if (query === null || query === undefined) return [];
	const credentials = query.credentials;
	if (credentials.length !== 1) return [];
	const credential = credentials[0];
	const claims = credential.claims;
	if (!claims) return [];
	return claims.map(claim => claim["path"]).flat();
})

// load all wallets
const store = useStorageStore();
const { wallets } = storeToRefs(store);
const chosenWallet = ref(wallets.value[0]);

// load credentials from the selected wallet
const credentialsInWallet = computed(() => {
    return chosenWallet.value.credentials ?? [];
})

// filter credentials to recover only sd-jwt-based credentials
const sdJwtCredentials = computedAsync(async () => {
	try {
		const rawCredentials = credentialsInWallet.value.map((credential) =>
			credential.data
		);

		const checks = await Promise.all(
			rawCredentials.map((credential) =>
				SdJwtUtils.isSdJwt(credential)
			)
		);
		const wellFormedCredentials = rawCredentials.filter(
			(_, index) => checks[index]
		);

		const encodedCredentials = [];
		for (const credential of wellFormedCredentials) {
			const parsedSdjwt = await SdJwtUtils.parseSdJWt(credential)
			const encodedSdjwt = await SdJwtUtils.encodeSdJwt(parsedSdjwt)
			encodedCredentials.push(encodedSdjwt)
		}
		return encodedCredentials
	} catch (e) {
		console.error(e)
		return []
	}
});

const querySatisfactionResult = computedAsync<DcqlQueryResult | null>(async () => {
	const credentials = sdJwtCredentials.value;
	const query = dcqlQuery.value;
	if (credentials === undefined || query === undefined) return null;

	// Parse (structural) and validate (content) the query
	const parsedQuery = DcqlQuery.parse(query)
	DcqlQuery.validate(parsedQuery)

	// Execute the query against credentials
	const dcqlFriendlyCredentials = await Promise.all(
		credentials.map((credential) => convertSdJwtToDcqlCredential(credential))
	)
	const queryResult = DcqlQuery.query(parsedQuery, dcqlFriendlyCredentials)
	return queryResult;
})

const canBeSatisfied = computed(() => {
	return querySatisfactionResult.value?.can_be_satisfied ?? false
})

const satisfyingSdJwtCredential = computed(() => {
	// we cannot do anything if the query or the query result not defined
	const query = dcqlQuery.value;
	const queryResult = querySatisfactionResult.value;
	if (queryResult === undefined || queryResult === null || query == null) return null;

	// also, we cannot satisfy the query if no sd-jwt credential found
	const sdjwts = sdJwtCredentials.value;
	if (sdjwts === undefined || sdjwts === null) return null;

	const entries = query.credentials.map(credentialRequest => credentialRequest.id);
	if (entries.length !== 1) {
		console.warn("Only one request is currently supported")
		return null;
	};


	const entry = entries[0];
	console.log(`Seaching for credential ${entry}`)
	console.log(JSON.stringify(queryResult))
	const validCredentials = queryResult.credential_matches[entry].valid_credentials
	if (validCredentials === undefined || validCredentials.length !== 1)
		return null; // TODO: we only support one fullfilled credential for now
	const validCredential = validCredentials[0]
	const index = validCredential.input_credential_index;
	return sdjwts[index]
})

const isPresenting = ref(false);

async function handlePresent() {
    const credential = satisfyingSdJwtCredential.value;
    if (!credential) return;

    isPresenting.value = true;
    try {
        const ws = await WalletSdJwtSigner.createFromSeed(chosenWallet.value.seed);
        const sdjwt = ws.getSdJwtInstance();

        const claims: Record<string, boolean> = {};
        for (const claim of desiredClaims.value) {
            claims[String(claim)] = true;
        }

        const vp = await sdjwt.present(credential, claims, {
            kb: {
                payload: {
                    nonce: props.credentialPresentationRequest.nonce,
                    iat: Math.floor(Date.now() / 1000),
                    aud: props.credentialPresentationRequest.audience,
                },
            },
        });

        emit('present', vp);
    } catch (e) {
        console.error('Error presenting credential:', e);
    } finally {
        isPresenting.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Wallet selector -->
        <div class="flex items-center gap-3">
            <span class="text-sm font-semibold">Wallet</span>
            <DropdownWalletSelection
                :wallets="wallets"
                :chosen-wallet="chosenWallet"
                @selected-wallet-index="chosenWallet = wallets[$event]"
            />
        </div>

        <!-- Two cards side by side -->
        <div class="flex gap-4">
            <!-- Left card: Presentation request -->
            <Card class="flex-1">
                <template #header>
                    <div class="flex items-center gap-2 px-4 pt-4">
                        <i class="pi pi-send text-primary"></i>
                        <span class="font-bold text-lg">Presentation Request</span>
                    </div>
                </template>
                <template #content>
                    <div class="flex flex-col gap-4">
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Audience</p>
                            <p class="font-mono text-sm mt-1">{{ credentialPresentationRequest.audience }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Nonce</p>
                            <p class="font-mono text-sm mt-1">{{ credentialPresentationRequest.nonce }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Requested Claims</p>
                            <div v-if="desiredClaims.length > 0" class="flex flex-wrap gap-2 mt-2">
                                <Tag
                                    v-for="claim in desiredClaims"
                                    :key="String(claim)"
                                    :value="String(claim)"
                                    severity="info"
                                    icon="pi pi-key"
                                />
                            </div>
                            <p v-else class="text-sm text-gray-400 mt-1">No specific claims requested</p>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <Tag
                        v-if="canBeSatisfied"
                        value="Satisfiable"
                        severity="success"
                        icon="pi pi-check-circle"
                    />
                    <Tag
                        v-else
                        value="Cannot be satisfied"
                        severity="danger"
                        icon="pi pi-times-circle"
                    />
                </template>
            </Card>

            <!-- Right card: Matching credential -->
            <Card class="flex-1">
                <template #header>
                    <div class="flex items-center gap-2 px-4 pt-4">
                        <i class="pi pi-id-card text-primary"></i>
                        <span class="font-bold text-lg">Credential</span>
                    </div>
                </template>
                <template #content>
                    <div v-if="satisfyingSdJwtCredential" class="flex flex-col gap-4">
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Type</p>
                            <div class="mt-2">
                                <Tag value="SD-JWT VC" severity="info" icon="pi pi-verified" />
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Token</p>
                            <p class="font-mono text-xs mt-1 bg-gray-50 p-2 rounded text-gray-500 break-all">
                                {{ satisfyingSdJwtCredential.slice(0, 80) }}…
                            </p>
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase text-gray-400">Disclosed Claims</p>
                            <div v-if="desiredClaims.length > 0" class="flex flex-wrap gap-2 mt-2">
                                <Tag
                                    v-for="claim in desiredClaims"
                                    :key="String(claim)"
                                    :value="String(claim)"
                                    severity="success"
                                    icon="pi pi-eye"
                                />
                            </div>
                            <p v-else class="text-sm text-gray-400 mt-1">All claims will be disclosed</p>
                        </div>
                    </div>
                    <Message v-else severity="warn" :closable="false">
                        No matching credential found in this wallet.
                    </Message>
                </template>
                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            label="Reject"
                            severity="secondary"
                            outlined
                            icon="pi pi-times"
                            @click="emit('reject')"
                        />
                        <Button
                            label="Present"
                            icon="pi pi-send"
                            :loading="isPresenting"
                            :disabled="!canBeSatisfied || !satisfyingSdJwtCredential"
                            @click="handlePresent"
                        />
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
