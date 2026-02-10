import {defineStore} from "pinia";
import {
	FeesCalculationFormulaFactory,
	Hash, IProvider, Microblock, OrganizationDescriptionSection,
	ProviderFactory, SectionType,
	SeedEncoder,
	SignatureSchemeId,
	WalletCrypto
} from "@cmts-dev/carmentis-sdk/client";
import {useStorageStore} from "./storage";
import {ref} from "vue";
import {useToast} from "primevue/usetoast";

export interface PublishOrganizationParams {
	walletId: number;
	orgId: number;
	organizationName: string;
	countryCode: string;
	city: string;
	website: string;
}

export const useOnChainStore = defineStore('onchain', () => {
	const storageStore = useStorageStore();
	const toast = useToast();


	const isPublishingOrganization = ref(false);
	/**
	 * Publishes an organization on-chain
	 * Creates a new virtual blockchain for the organization and stores the VB ID
	 */
	async function publishOrganization(params: PublishOrganizationParams) {
		isPublishingOrganization.value = true;
		try {
			const {walletId, orgId, organizationName, countryCode, city, website} = params;

			// Get wallet from storage
			const wallet = await storageStore.getWalletById(walletId);
			if (!wallet) {
				throw new Error(`Wallet with id ${walletId} not found`);
			}

			// Get organization from wallet
			const organization = wallet.organizations.find(org => org.id === orgId);
			if (!organization) {
				throw new Error(`Organization with id ${orgId} not found in wallet ${walletId}`);
			}

			// Check if organization is already published
			if (organization.vbId) {
				throw new Error(`Organization "${organizationName}" is already published with VB ID: ${organization.vbId}`);
			}

			// Initialize wallet crypto from seed
			const seedEncoder = new SeedEncoder();
			const walletSeed = WalletCrypto.fromSeed(seedEncoder.decode(wallet.seed));
			const accountCrypto = walletSeed.getDefaultAccountCrypto();


			// Create provider
			const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(wallet.nodeEndpoint);

			// Get signing keys
			const sk = await accountCrypto.getPrivateSignatureKey(SignatureSchemeId.SECP256K1);
			const pk = await sk.getPublicKey();

			// Get the account id
			const accountId = await provider.getAccountIdByPublicKey(pk);

			// construct the microblock to publish
			const organisationPrivateKey = sk;
			let organisationId = organization.vbId;
			const orgDescSection: OrganizationDescriptionSection = {
				type: SectionType.ORG_DESCRIPTION,
				city,
				name: organizationName,
				website,
				countryCode,
			}
			if (organisationId) {
				console.log(`Organisation already published on chain, updating it`)
				const orgVB = await provider.loadOrganizationVirtualBlockchain(Hash.from(organisationId));
				const mb = await orgVB.createMicroblock();
				mb.addSection(orgDescSection);
				await updateGasInMicroblock(provider,mb, organisationPrivateKey.getSignatureSchemeId())
				await mb.seal(organisationPrivateKey, {
					feesPayerAccount: accountId
				});
				await provider.publishMicroblock(mb);
			} else {
				console.log(`Organisation not published on chain, publishing it`);
				const mb = Microblock.createGenesisOrganizationMicroblock();
				mb.addSections([
					{
						type: SectionType.ORG_CREATION,
						accountId: accountId,
					},
					orgDescSection,
				])
				await updateGasInMicroblock(provider, mb, organisationPrivateKey.getSignatureSchemeId())

				await mb.seal(organisationPrivateKey, {
					feesPayerAccount: accountId
				});
				await provider.publishMicroblock(mb);
				organisationId = mb.getHash().encode();
			}

			// Update organization in storage with the VB ID
			await storageStore.addVbIdToOrganization(walletId, orgId, organisationId);

			toast.add({severity: 'success', summary: 'Organization published', detail: `Organization "${organizationName}" published successfully`, life: 3000});
		} catch (e) {
			console.error(e);
			toast.add({severity: 'error', summary: 'Error publishing organization', life: 3000});
		} finally {
			isPublishingOrganization.value = false;
		}
	}

	async function updateGasInMicroblock(provider: IProvider, mb: Microblock, usedSigSchemeId: SignatureSchemeId) {
		const protocolVariables = await provider.getProtocolState();
		const feesCalculationFormulaVersion = protocolVariables.getFeesCalculationVersion();
		const feesCalculationFormula = FeesCalculationFormulaFactory.getFeesCalculationFormulaByVersion(feesCalculationFormulaVersion);
		mb.setGas(await feesCalculationFormula.computeFees(usedSigSchemeId, mb))
	}

	return {
		isPublishingOrganization,
		publishOrganization
	};
});
