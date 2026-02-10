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
	ValidatorNodeCometbftPublicKeyDeclarationSection,
	CMTSToken,
	VirtualBlockchainType, Provider
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

export interface StakeOnNodeParams {
	walletId: number;
	orgId: number;
	nodeId: number;
	amount: CMTSToken;
}

export interface UnstakeFromNodeParams {
	walletId: number;
	orgId: number;
	nodeId: number;
	amount: CMTSToken;
}

export const useOnChainStore = defineStore('onchain', () => {
	const storageStore = useStorageStore();
	const toast = useToast();


	const isPublishingOrganization = ref(false);
	const isClaimingNode = ref(false);
	const isStakingOnNode = ref(false);
	const isUnstakingFromNode = ref(false);

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

	/**
	 * Stakes tokens on a node
	 * Creates a microblock with an ACCOUNT_STAKE section to lock tokens for the node
	 */
	async function stakeOnNode(params: StakeOnNodeParams) {
		isStakingOnNode.value = true;
		try {
			const {walletId, orgId, nodeId, amount} = params;

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
				throw new Error(`Organization must be published before staking on nodes`);
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
			if (accountId === undefined) throw new Error('Error getting account id');
			const organisationPrivateKey = sk;

			// Get node status to retrieve CometBFT public key
			const nodeStatus = await provider.getNodeStatus(node.rpcEndpoint);
			const cometbftPublicKey = nodeStatus.result.validator_info.pub_key.value;

			// Check if the node is declared
			const isDeclared = await isDeclaredValidatorNodeByCometbftPublicKey(provider, cometbftPublicKey);
			if (!isDeclared) {
				throw new Error('The node must be declared before staking');
			}

			// Get validator node id from CometBFT public key
			const nodeAddress = await provider.getValidatorNodeIdByCometbftPublicKey(cometbftPublicKey);

			console.log(`Creating staking request for node: validator node address=${Hash.from(nodeAddress).encode()}, amount=${amount.toString()}`);

			// Create the staking request
			const accountVb = await provider.loadAccountVirtualBlockchain(Hash.from(accountId));
			const mb = await accountVb.createMicroblock();

			mb.addSection({
				type: SectionType.ACCOUNT_STAKE,
				amount: amount.getAmountAsAtomic(),
				objectType: VirtualBlockchainType.NODE_VIRTUAL_BLOCKCHAIN,
				objectIdentifier: nodeAddress
			});

			await updateGasInMicroblock(provider, mb, organisationPrivateKey.getSignatureSchemeId());
			await mb.seal(organisationPrivateKey, { feesPayerAccount: accountId });

			const microblockHash = await provider.publishMicroblock(mb);

			console.log(`Staked ${amount.toString()} successfully on node`);
			toast.add({severity: 'success', summary: 'Staking successful', detail: `Staked ${amount.toString()} on node "${node.name}"`, life: 3000});

			return microblockHash;
		} catch (e) {
			console.error('Error staking on node:', e);
			toast.add({severity: 'error', summary: 'Error staking', detail: e instanceof Error ? e.message : 'Unknown error', life: 5000});
			throw e;
		} finally {
			isStakingOnNode.value = false;
		}
	}

	/**
	 * Unstakes tokens from a node
	 * Creates a microblock with an ACCOUNT_UNSTAKE section to unlock tokens from the node
	 */
	async function unstakeFromNode(params: UnstakeFromNodeParams) {
		isUnstakingFromNode.value = true;
		try {
			const {walletId, orgId, nodeId, amount} = params;

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
				throw new Error(`Organization must be published before unstaking from nodes`);
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
			const organisationPrivateKey = sk;

			// Get node status to retrieve CometBFT public key
			const nodeStatus = await provider.getNodeStatus(node.rpcEndpoint);
			const cometbftPublicKey = nodeStatus.result.validator_info.pub_key.value;

			// Get validator node id from CometBFT public key
			const nodeAddress = await provider.getValidatorNodeIdByCometbftPublicKey(cometbftPublicKey);

			console.log(`Creating unstaking request for ${amount.toString()} node: validator node id=${Hash.from(nodeAddress).encode()}`);

			// Create the unstaking request
			const accountVb = await provider.loadAccountVirtualBlockchain(accountId);
			const mb = await accountVb.createMicroblock();

			mb.addSection({
				type: SectionType.ACCOUNT_UNSTAKE,
				amount: amount.getAmountAsAtomic(),
				objectType: VirtualBlockchainType.NODE_VIRTUAL_BLOCKCHAIN,
				objectIdentifier: nodeAddress
			});

			await updateGasInMicroblock(provider, mb, organisationPrivateKey.getSignatureSchemeId());
			await mb.seal(organisationPrivateKey, { feesPayerAccount: accountId });

			const microblockHash = await provider.publishMicroblock(mb);

			console.log(`Unstaked ${amount.toString()} successfully from node`);
			toast.add({severity: 'success', summary: 'Unstaking successful', detail: `Unstaked ${amount.toString()} from node "${node.name}"`, life: 3000});

			return microblockHash;
		} catch (e) {
			console.error('Error unstaking from node:', e);
			toast.add({severity: 'error', summary: 'Error unstaking', detail: e instanceof Error ? e.message : 'Unknown error', life: 5000});
			throw e;
		} finally {
			isUnstakingFromNode.value = false;
		}
	}

	/**
	 * Helper function to check if a validator node is declared by CometBFT public key
	 */
	async function isDeclaredValidatorNodeByCometbftPublicKey(provider: Provider, cometbftPublicKey: string): Promise<boolean> {
		try {
			await provider.getValidatorNodeIdByCometbftPublicKey(cometbftPublicKey);
			return true;
		} catch (e) {
			console.error("Error checking if validator node is declared: ", e);
			return false;
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
		isStakingOnNode,
		isUnstakingFromNode,
		publishOrganization,
		claimNode,
		stakeOnNode,
		unstakeFromNode
	};
});
