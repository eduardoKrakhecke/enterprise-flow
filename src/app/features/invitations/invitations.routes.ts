
import { Routes } from '@angular/router';

export const INVITATIONS_ROUTES: Routes = [
  {
    path: 'accept',
    loadComponent: () =>
      import('./pages/accept-invitation/accept-invitation-page')
        .then(m => m.AcceptInvitationPage)
  }
];

