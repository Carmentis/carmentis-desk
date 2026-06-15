import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/home/Home.vue';
import CreateWallet from '../components/wallet/CreateWallet.vue';
import WalletLayout from '../components/wallet/WalletLayout.vue';
import WalletDetail from '../components/wallet/WalletDetail.vue';
import Organization from '../components/wallet/Organization.vue';
import Node from '../components/wallet/Node.vue';
import Application from '../components/wallet/Application.vue';
import WalletAppLedgerExplorer from '../components/wallet/WalletAppLedgerExplorer.vue';
import WalletCredentials from '../components/wallet/WalletCredentials.vue';
import OperatorDetail from '../components/operator/OperatorDetail.vue';
import RpcSession from '../components/rpcSession/RpcSession.vue';
import Help from '../components/help/Help.vue';
import Settings from '../components/settings/Settings.vue';
import OnboardingView from '../views/OnboardingView.vue';
import LoginView from '../views/LoginView.vue';
import { useSessionStore } from '../stores/sessionStore';

const router = createRouter({
    history: createWebHistory(),
    routes: [
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
            path: '/',
            name: 'home',
            component: Home,
        },
        {
            path: '/connect/rpc',
            name: 'rpc-session',
            component: RpcSession,
        },
        {
            path: '/wallet/new',
            name: 'create-organization',
            component: CreateWallet,
        },
        {
            path: '/operator/:operatorId',
            name: 'operator-detail',
            component: OperatorDetail,
        },
        {
            path: '/wallet/:walletId',
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
        {
            path: '/help',
            name: 'help',
            component: Help,
        },
        {
            path: '/settings',
            name: 'settings',
            component: Settings,
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/',
        },
    ],
});

router.beforeEach(async (to) => {
    if (to.name === 'onboarding' || to.name === 'login') return true;
    const session = useSessionStore();
    if (!session.isOnboarded) return { name: 'onboarding' };
    if (!session.isUnlocked) return { name: 'login', query: { redirect: to.fullPath } };
    return true;
});

export default router;
