import {defineStore} from "pinia";
import {
	FeesCalculationFormulaFactory,
	Hash, IProvider, Microblock, OrganizationDescriptionSection,
	ProviderFactory, SectionType,
	SeedEncoder,
	SignatureSchemeId,
	WalletCrypto,
	ValidatorNodeCreationSection,
	ValidatorNodeRpcEndpointSection,
	ValidatorNodeCometbftPublicKeyDeclarationSection
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

export interface ClaimNodeParams {
	walletId: number;
	orgId: number;
	nodeId: number;
}

export const useOnChainStore = defineStore('onchain', () => {
	const storageStore = useStorageStore();
	const toast = useToast();


	const isPublishingOrganization = ref(false);
	const isClaimingNode = ref(false);

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

	/**
	 * Claims a node for an organization on-chain
	 * Creates a validator node virtual blockchain and associates it with the organization
	 */
	async function claimNode(params: ClaimNodeParams) {
		isClaimingNode.value = true;
		try {
			const {walletId, orgId, nodeId} = params;

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

			// Check if organization is published
			if (!organization.vbId) {
				throw new Error(`Organization must be published before claiming nodes`);
			}

			// Get node from organization
			const node = organization.nodes.find(n => n.id === nodeId);
			if (!node) {
				throw new Error(`Node with id ${nodeId} not found in organization ${orgId}`);
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

			// Get organization ID
			const organizationId = Hash.from(organization.vbId);
			const organisationPrivateKey = sk;
			const nodeRpcEndpoint = node.rpcEndpoint;

			// Get node status to retrieve CometBFT public key
			const nodeStatus = await provider.getNodeStatus(node.rpcEndpoint);
			const { type: cometPublicKeyType, value: cometPublicKey } = nodeStatus.result.validator_info.pub_key;

			// Create the node claim request
			console.log(`Creating node claiming request for node: organizationId=${organizationId.encode()}, public key=${cometPublicKey}, public key type=${cometPublicKeyType}, rpc endpoint=${nodeRpcEndpoint}`);

			const mb = Microblock.createGenesisValidatorNodeMicroblock();

			const vnCreationSection: ValidatorNodeCreationSection = {
				type: SectionType.VN_CREATION,
				organizationId: organizationId.toBytes(),
			}

			const vnRpcEndpointDeclarationSection: ValidatorNodeRpcEndpointSection = {
				type: SectionType.VN_RPC_ENDPOINT,
				rpcEndpoint: nodeRpcEndpoint
			}

			const vnCometBFTPublicKeyDeclarationSection: ValidatorNodeCometbftPublicKeyDeclarationSection = {
				type: SectionType.VN_COMETBFT_PUBLIC_KEY_DECLARATION,
				cometPublicKeyType: cometPublicKeyType,
				cometPublicKey: cometPublicKey
			}

			mb.addSections([vnCreationSection, vnRpcEndpointDeclarationSection, vnCometBFTPublicKeyDeclarationSection]);

			await updateGasInMicroblock(provider, mb, organisationPrivateKey.getSignatureSchemeId());
			await mb.seal(organisationPrivateKey, { feesPayerAccount: accountId });

			const microblockHash = await provider.publishMicroblock(mb);

			// Update node in storage with the VB ID
			const nodeVbId = microblockHash.encode();
			await storageStore.updateNode(walletId, orgId, nodeId, {
				vbId: nodeVbId
			});

			console.log(`Node claimed successfully with VB ID: ${nodeVbId}`);
			toast.add({severity: 'success', summary: 'Node claimed', detail: `Node "${node.name}" claimed successfully`, life: 3000});

			return microblockHash;
		} catch (e) {
			console.error('Error claiming node:', e);
			toast.add({severity: 'error', summary: 'Error claiming node', detail: e instanceof Error ? e.message : 'Unknown error', life: 5000});
			throw e;
		} finally {
			isClaimingNode.value = false;
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
		isClaimingNode,
		publishOrganization,
		claimNode
	};
});
