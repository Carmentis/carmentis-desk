import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CreateOrganization from '../components/CreateOrganization.vue'
import WalletLayout from '../components/WalletLayout.vue'
import WalletDetail from '../components/WalletDetail.vue'
import OrganizationDetailNew from '../components/OrganizationDetailNew.vue'
import NodeDetail from '../components/NodeDetail.vue'
import ApplicationDetail from '../components/ApplicationDetail.vue'
import OperatorDetail from '../components/operator/OperatorDetail.vue'
import Connect from "../components/Connect.vue";
import WalletRequest from "../components/walletRequest/WalletRequest.vue";

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
