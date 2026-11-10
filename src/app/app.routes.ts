
import {
  Routes
} from '@angular/router';
import { AppShellComponent } from "./core/layout/shell/app-shell/app-shell.component";


export const routes: Routes = [

  {
    path: 'app',

    component: AppShellComponent,

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
    path: '',
    redirectTo: 'app/dashboard',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'app/dashboard'
  }

];
