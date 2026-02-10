import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CreateOrganization from '../components/CreateOrganization.vue'
import WalletLayout from '../components/WalletLayout.vue'
import WalletDetail from '../components/WalletDetail.vue'
import OrganizationDetailNew from '../components/OrganizationDetailNew.vue'
import NodeDetail from '../components/NodeDetail.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/wallet/new',
      name: 'create-organization',
      component: CreateOrganization
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
        }
      ]
    }
  ]
})

export default router
