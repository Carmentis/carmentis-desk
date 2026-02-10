import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CreateOrganization from '../components/CreateOrganization.vue'
import OrganizationDetail from '../components/OrganizationDetail.vue'

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
      path: '/wallet/:id',
      name: 'organization-detail',
      component: OrganizationDetail
    }
  ]
})

export default router
