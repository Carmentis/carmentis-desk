import {describe, expect, it} from "vitest";
import {computed, createApp, h, ref, watch} from "vue";
import {QueryClient, useQuery, VueQueryPlugin} from "@tanstack/vue-query";
import {useSettledOnChainSearch} from "../src/composables/useSettledOnChainSearch";
import {useAccountResolved} from "../src/composables/useAccountResolved";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wallet whose account search first succeeds with `null` (provider not ready), then answers, like the
 * real queries do; the organization search returns `[]` while it has no account. Returns the successive
 * states of the publication badge of an organization that is published.
 */
async function badgeStates(accountAnswers: (Error | string | null)[]): Promise<string[]> {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: 0}}});
    const states: string[] = [];
    const app = createApp({render: () => h("div")});
    app.use(VueQueryPlugin, {queryClient});

    await app.runWithContext(async () => {
        let call = 0;
        const useAccountId = () => useQuery({
            queryKey: ["account-id"],
            queryFn: async () => {
                const answer = accountAnswers[Math.min(call++, accountAnswers.length - 1)];
                await sleep(5);
                if (answer instanceof Error) throw answer;
                return answer;
            },
        });
        const storeAccount = useAccountId();           // read by the search, like in the store
        const found = useQuery({
            queryKey: ["organizations"],
            queryFn: async () => (storeAccount.data.value ? [{id: "org"}] : []),
        });
        const pageAccount = useAccountId();            // read by the page
        const indexer = ref({});
        const settled = useSettledOnChainSearch(
            found,
            computed(() => useAccountResolved(pageAccount).value && !!indexer.value),
        );

        const state = computed(() =>
            !settled.value ? "loading" : (found.data.value ?? []).some((o) => o.id === "org") ? "published" : "draft");
        watch(state, (value) => states.push(value), {immediate: true, flush: "sync"});
        // polling is disabled by vue-query outside a browser: do the poll of the account search by hand,
        // and not that of the organization search, so that only the refresh made by the composable can fix it
        setTimeout(() => queryClient.refetchQueries({queryKey: ["account-id"]}), 60);
        await sleep(300);
    });
    queryClient.clear();
    return states;
}

describe("publication badge while the blockchain is searched", () => {
    it("never says Draft for a published organization whose account search first answers null", async () => {
        const states = await badgeStates([null, "account-id"]);
        expect(states).not.toContain("draft");
        expect(states[0]).toBe("loading");
        expect(states[states.length - 1]).toBe("published");
    });

    it("settles on Draft for a wallet that has no account", async () => {
        const states = await badgeStates([new Error("[0] Remote error: unknown account key hash")]);
        expect(states[0]).toBe("loading");
        expect(states[states.length - 1]).toBe("draft");
    });
});
