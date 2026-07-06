<script setup lang="ts">
import {useSessionStore} from "../stores/sessionStore";
import {onMounted, watch} from "vue";
import {getDb} from "../db/database";
import {useStorageStore} from "../stores/storage";
import {storeToRefs} from "pinia";
import {match} from "ts-pattern";
import {useRouter} from "vue-router";

const router = useRouter();
const sessionStore = useSessionStore();
const {isLoading, isOnboarded, isUnlocked} = storeToRefs(sessionStore)

onMounted(() => {
    // Open DB (runs migrations), initialize session state, THEN install router
// (router must be installed after session.initialize() because Vue Router 4
// triggers the initial navigation — and therefore beforeEach guards — at
// app.use(router) time, before app.mount()).
    getDb()
        .then(async () => {
            const storage = useStorageStore();
            const session = useSessionStore();
            await Promise.all([storage.initStorage(), session.initialize()]);
        })
        .catch((err) => console.error('Failed to initialize database:', err))
        .finally(() => {

        });
})

watch([isLoading, isOnboarded, isUnlocked], () => {
    console.log('isLoading', isLoading);
    console.log('isOnboarded', isOnboarded);
    console.log('isUnlocked', isUnlocked);

    const routeName = match({ isLoading: isLoading.value, isOnboarded: isOnboarded.value, isUnlocked: isUnlocked.value })
        .with({ isLoading: false, isOnboarded: false }, () => 'onboarding')
        .with({ isLoading: false, isUnlocked: false, isOnboarded: true }, () => 'login')
        .with({ isLoading: false, isUnlocked: true, isOnboarded: true }, () => 'home')
        .otherwise(() => null)
    if (routeName)
        return router.push(routeName)
})
</script>


<template>
    <div class="flex justify-center items-center w-screen h-screen">
        <div class="flex flex-col items-center">
            <img src="/carmentis-logo.png" alt="Carmentis" class="h-32 w-auto mx-auto" />
            <span>Loading</span>
        </div>
    </div>
</template>