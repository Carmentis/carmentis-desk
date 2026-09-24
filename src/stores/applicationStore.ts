import {from, useObservable} from "@vueuse/rxjs";
import {liveQuery} from "dexie";
import {DeskDatabase} from "../db/DeskDatabase.ts";
import {Application} from "../types/types.ts";

export const useApplicationStore = (applicationId: number) => {
    const application = useObservable(
        from(liveQuery(() => DeskDatabase.getApplicationById(applicationId))),
        {initialValue: undefined}
    );


    async function updateApplication(updatedApplication: Partial<Application>) {
        if (!application.value) throw new Error('Application not found')
        await DeskDatabase.updateApplication(applicationId, {
            ...application.value,
            ...updatedApplication,
        });
    }

    async function deleteApplication() {
        await DeskDatabase.deleteApplicationById(applicationId);
    }


    return {
        application,
        updateApplication,
        deleteApplication,
    }
}