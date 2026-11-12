

import { Routes } from '@angular/router';

export const MEMBERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/members-page/members-page')
        .then(m => m.MembersPage)
  }
];
