import {db} from "./db.ts";
import {Application, DeskState, Organization, Wallet, Node, VerifiableCredential} from "../types/types.ts";
import {InsertType} from "dexie";
export class DeskDatabase {
    // set tables
    private static deskStateTable = db.deskState;
    private static walletTable = db.wallets;
    private static organizationTable = db.organizations;
    private static applicationTable = db.applications;
    private static nodeTable = db.nodes;
    private static credentialsTable = db.credentials;

    private static DESK_STATE_ID: 0 = 0;

    static async hasOnboarded() {
        const count = await this.deskStateTable.count();
        console.log(`Found state: ${count}`)
        return count !== 0
    }

    static async markAsOnboarded() {
        await this.deskStateTable.put({
            id: this.DESK_STATE_ID,
            onboarded: true,
            isNodeHolder: false,
            isDeveloper: false
        })
    }

    private static async getDeskState() {
        const states = await this.deskStateTable.toArray();
        if (states.length !== 1) throw new Error('Desk state not found');
        console.log("Found state:", states[0]);
        return states[0]
    }

    private static async updateDeskState(deskState: DeskState) {
        return await this.deskStateTable.update(this.DESK_STATE_ID, deskState);
    }

    static async isNodeHolder() {
       return (await this.getDeskState()).isNodeHolder;
    }

    static async isDeveloper() {
        return (await this.getDeskState()).isDeveloper;
    }

    static async setIsNodeHolder(isNodeHolder: boolean) {
        const deskState = await this.getDeskState();
        deskState.isNodeHolder = isNodeHolder;
        return this.updateDeskState(deskState);
    }

    static async setIsDeveloper(isDeveloper: boolean) {
        const deskState = await this.getDeskState();
        deskState.isDeveloper = isDeveloper;
        return this.updateDeskState(deskState);
    }


    static getAllWallets() {
        return this.walletTable.toArray();
    }

    static getWalletById(walletId: number) {
        return this.walletTable.where({id: walletId}).first();
    }

    static deleteWalletById(walletId: number) {
        return this.walletTable.where({id: walletId}).delete();
    }



    static async createCredential(credential: InsertType<VerifiableCredential, 'id'>) {
        return this.credentialsTable.add(credential);
    }

    static getAllCredentialsInWallet(walletId: number) {
        return this.credentialsTable.where({walletId}).toArray();
    }

    static async deleteCredentialById(credentialId: number) {
        return this.credentialsTable.where({id: credentialId}).delete();
    }

    static async getAllOrganizationsInWallet(walletId: number) {
        return this.organizationTable.where({walletId}).toArray();
    }

    static deleteOrganizationById(organizationId: number) {
        return this.organizationTable.where({id: organizationId}).delete();
    }

    static async getApplicationById(applicationId: number) {
        return this.applicationTable.where({id: applicationId}).first();
    }

    static deleteApplicationById(applicationId: number) {
        return this.applicationTable.where({id: applicationId}).delete();
    }

    static async getNodeById(nodeId: number) {
        return this.nodeTable.where({id: nodeId}).first();
    }

    static deleteNodeById(nodeId: number) {
        return this.nodeTable.where({id: nodeId}).delete();
    }

    static async getOrganizationById(organizationId: number) {
        return this.organizationTable.where({id: organizationId}).first();
    }

    static async getAllApplicationsInOrganization(organizationId: number) {
        return this.applicationTable.where({organizationId}).toArray();
    }

    static async updateWallet(wallet: Wallet) {
        return this.walletTable.update(wallet.id, wallet);
    }

    static getAllNodesInOrganization(organizationId: number) {
        return this.nodeTable.where({organizationId}).toArray();
    }

    static async updateOrganization(orgId: number, organization: Organization) {
        return this.organizationTable.update(orgId, organization);
    }

    static async updateApplication(applicationId: number, application: Application) {
        return this.applicationTable.update(applicationId, application);
    }

    static async updateNode(nodeId: number, node: Node) {
        return this.nodeTable.update(nodeId, node);
    }
}