import {useRouter} from "vue-router";

export const useNavigation = () => {
    const router = useRouter();

    return {
        goToHome: () => router.push('/home'),
        goToLogin: () => router.push('/login'),
        goToOnboarding: () => router.push('/onboarding'),
        goToRpc: (path: string) => router.push(`/connect/rpc${path}`),
        goToOrganization: (walletId: number, orgId: number) => router.push(`/wallet/${walletId}/organization/${orgId}`),
        goToApplication: (walletId: number, orgId: number, appId: number) => router.push(`/wallet/${walletId}/organization/${orgId}/application/${appId}`),
        goToNode: (walletId: number, orgId: number, nodeId: number) => router.push(`/wallet/${walletId}/organization/${orgId}/node/${nodeId}`),
        goToWallet: (walletId: number) => router.push(`/wallet/${walletId}`),
        goToSettings: () => router.push('/settings'),
        goToHelp: () => router.push('/help'),
        goToNewWallet: () => router.push('/wallet/new'),
        goToSplash: () => router.push('/splash'),
    }
}