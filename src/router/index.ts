import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../components/layout/AppLayout.vue';
import Home from '../components/home/Home.vue';
import CreateWallet from '../components/layout/CreateWallet.vue';
import WalletLayout from '../components/home/wallet/WalletLayout.vue';
import WalletDetail from '../components/home/wallet/WalletDetail.vue';
import Organization from '../components/home/wallet/organization/Organization.vue';
import Node from '../components/home/wallet/organization/node/Node.vue';
import Application from '../components/home/wallet/organization/application/Application.vue';
import WalletAppLedgerExplorer from '../components/home/wallet/appLedgers/WalletAppLedgerExplorer.vue';
import WalletCredentials from '../components/home/wallet/credentials/WalletCredentials.vue';
import OperatorDetail from '../components/home/operator/OperatorDetail.vue';
import RpcSession from '../components/rpcSession/RpcSession.vue';
import Help from '../components/help/Help.vue';
import Settings from '../components/home/settings/Settings.vue';
import OnboardingView from '../views/OnboardingView.vue';
import LoginView from '../views/LoginView.vue';
import { useSessionStore } from '../stores/sessionStore';
import {match, P} from "ts-pattern";
import SplashscreenView from "../views/SplashscreenView.vue";
import {storeToRefs} from "pinia";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // Public routes (no layout)
        {
            path: '/onboarding',
            name: 'onboarding',
            component: OnboardingView,
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
        },
        {
            path: '/spash',
            name: 'splash',
            component: SplashscreenView,
        },
        // Protected routes (with AppLayout)
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '',
                    name: 'home',
                    component: Home,
                },
                {
                    path: 'wallet/new',
                    name: 'create-organization',
                    component: CreateWallet,
                },
                {
                    path: 'operator/:operatorId',
                    name: 'operator-detail',
                    component: OperatorDetail,
                },
                {
                    path: 'connect/rpc',
                    name: 'rpc-session',
                    component: RpcSession,
                },
                {
                    path: 'help',
                    name: 'help',
                    component: Help,
                },
                {
                    path: 'settings',
                    name: 'settings',
                    component: Settings,
                },
                {
                    path: 'wallet/:walletId',
                    component: WalletLayout,
                    children: [
                        {
                            path: '',
                            name: 'wallet-detail',
                            component: WalletDetail,
                        },
                        {
                            path: 'organization/:orgId',
                            name: 'organization-detail',
                            component: Organization,
                        },
                        {
                            path: 'organization/:orgId/node/:nodeId',
                            name: 'node-detail',
                            component: Node,
                        },
                        {
                            path: 'organization/:orgId/application/:appId',
                            name: 'application-detail',
                            component: Application,
                        },
                        {
                            path: 'participation/:appId',
                            name: 'app-ledger-explorer',
                            component: WalletAppLedgerExplorer,
                        },
                        {
                            path: 'credentials',
                            name: 'wallet-credentials',
                            component: WalletCredentials,
                        },
                    ],
                },
            ],
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/',
        },
    ],
});

router.beforeEach(async (to) => {
    console.log("Navigating to", to.fullPath);
    const session = useSessionStore();
    const { isOnboarded, isUnlocked, isLoading } = storeToRefs(session);
    return match({ to, isLoading: isLoading.value, isOnboarded: isOnboarded.value, isUnlocked: isUnlocked.value })
        .with({  isLoading: true }, () => {
            if (to.name === 'splash') return true;
            return { name: 'splash' }
        })
        .with({ to: { name: 'login' }, isOnboarded: true, isUnlocked: false }, () => true)
        .with({ to: { name: 'onboarding' }, isOnboarded: false }, () => true)
        .otherwise(() => {
            console.log("Current session", session);
            if (!session.isOnboarded) return { name: 'onboarding' };
            if (!session.isUnlocked) return { name: 'login', query: { redirect: to.fullPath } };
            return true;
        });
    /*
    return match({ to, session })
        .with({ to: { name: 'login' }, session: {  } }, () => true)
        .otherwise(() => {
            console.log("Current session", session);
            if (!session.isOnboarded) return { name: 'onboarding' };
            if (!session.isUnlocked) return { name: 'login', query: { redirect: to.fullPath } };
            return true;
        });

     */
});

export default router;
