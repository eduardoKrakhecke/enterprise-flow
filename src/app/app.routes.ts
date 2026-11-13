
import { Routes } from '@angular/router';

import {
  AppShellComponent
} from './core/layout/shell/app-shell/app-shell.component';

import {
  authGuard
} from './core/auth/guards/auth.guard';

import {
  tenantGuard
} from './core/tenant/guards/tenant.guard';

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },

  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES)
  },

  {
    path: 'onboarding',
    canActivate: [authGuard],
    children: [
      {
        path: 'create-organization',
        loadComponent: () =>
          import(
            './features/onboarding/pages/create-organization/create-organization-page/create-organization-page.component'
            ).then(m => m.CreateOrganizationPage)
      }
    ]
  },

  {
    path: 'organizations',
    canActivate: [authGuard],
    children: [
      {
        path: 'select',
        loadComponent: () =>
          import(
            './features/onboarding/pages/organization-selection/organization-selection-page/organization-selection-page.component'
            ).then(m => m.OrganizationSelectionPage)
      }
    ]
  },

  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard, tenantGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/dashboard/pages/dashboard-page/dashboard-page.component'
            ).then(m => m.DashboardPageComponent)
      },

      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes')
            .then(m => m.PROJECTS_ROUTES)
      },
      {
        path: 'clients',
        loadChildren: () =>
          import('./features/clients/clients.routes')
            .then(m => m.CLIENTS_ROUTES)
      },

      {
        path: 'members',
        loadChildren: () =>
          import('./features/members/members.routes')
            .then(m => m.MEMBERS_ROUTES)
      },


      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'app/dashboard'
  }

];
