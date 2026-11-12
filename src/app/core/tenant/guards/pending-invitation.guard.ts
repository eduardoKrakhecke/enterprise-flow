import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { TenantInvitationService } from '../services/tenant-invitation.service';

export const pendingInvitationGuard: CanActivateFn = async () => {
  const invitationService = inject(TenantInvitationService);
  const router = inject(Router);

  try {
    const invitationId =
      await invitationService.getPendingInvitationForCurrentUser();

    if (invitationId) {
      return router.createUrlTree(
        ['/invitations/accept'],
        { queryParams: { code: invitationId } }
      );
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar convite pendente:', error);

    return router.createUrlTree(
      ['/invitations/accept'],
      { queryParams: { lookupError: 'true' } }
    );
  }
};
