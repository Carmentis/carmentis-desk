import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CreateOrganization from '../components/CreateOrganization.vue'
import WalletLayout from '../components/WalletLayout.vue'
import WalletDetail from '../components/WalletDetail.vue'
import OrganizationDetailNew from '../components/OrganizationDetailNew.vue'
import NodeDetail from '../components/NodeDetail.vue'
import ApplicationDetail from '../components/ApplicationDetail.vue'
import WalletAppLedgerExplorer from '../components/WalletAppLedgerExplorer.vue'
import WalletCredentials from '../components/WalletCredentials.vue'
import OperatorDetail from '../components/operator/OperatorDetail.vue'
import Connect from "../components/Connect.vue";
import WalletRequest from "../components/walletRequest/WalletRequest.vue";
import ProofChecker from "../components/checker/ProofChecker.vue";
import WalletRequestDocumentationView from "../components/walletRequest/WalletRequestDocumentationView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/connect/walletRequest',
      name: 'connect/walletRequest',
      component: WalletRequest
    },
    {
      path: '/proof-checker',
      name: 'proof-checker',
      component: ProofChecker
    },
    {
      path: '/wallet-request-docs',
      name: 'wallet-request-docs',
      component: WalletRequestDocumentationView
    },
    {
      path: '/wallet/new',
      name: 'create-organization',
      component: CreateOrganization
    },
    {
      path: '/operator/:operatorId',
      name: 'operator-detail',
      component: OperatorDetail
    },
    {
      path: '/wallet/:walletId',
      component: WalletLayout,
      children: [
        {
          path: '',
          name: 'wallet-detail',
          component: WalletDetail
        },
        {
          path: 'organization/:orgId',
          name: 'organization-detail',
          component: OrganizationDetailNew
        },
        {
          path: 'organization/:orgId/node/:nodeId',
          name: 'node-detail',
          component: NodeDetail
        },
        {
          path: 'organization/:orgId/application/:appId',
          name: 'application-detail',
          component: ApplicationDetail
        },
        {
          path: 'participation/:appId',
          name: 'app-ledger-explorer',
          component: WalletAppLedgerExplorer
        },
        {
          path: 'credentials',
          name: 'wallet-credentials',
          component: WalletCredentials
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router
