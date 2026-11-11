
import { Routes } from '@angular/router';

import { AppShellComponent } from './core/layout/shell/app-shell/app-shell.component';

import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },

  {
    path: '',
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/auth/auth.routes')
            .then(m => m.AUTH_ROUTES)
      }
    ]
  },

  {
    path: 'app',

    component: AppShellComponent,

    canActivate: [authGuard],

    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/dashboard/pages/dashboard-page/dashboard-page.component'
            ).then(m => m.DashboardPageComponent)
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
    redirectTo: 'login'
  }

];
