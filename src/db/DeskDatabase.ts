import {db} from "./db.ts";
import {DeskState} from "../types/types.ts";
export class DeskDatabase {
    private static deskStateTable = db.deskState;

    static async hasOnboarded() {
        const count = await this.deskStateTable.count();
        console.log(`Found state: ${count}`)
        return count !== 0
    }

    static async markAsOnboarded() {
        await this.deskStateTable.put({
            id: 0,
            onboarded: true
        })
    }
}