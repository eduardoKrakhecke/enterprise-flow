
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  TenantService
} from '../services/tenant.service';

import {
  TenantContextService
} from '../services/tenant-context.service';

export const tenantGuard: CanActivateFn = async () => {

  const tenantService = inject(TenantService);
  const tenantContext = inject(TenantContextService);
  const router = inject(Router);

  try {

    const organizations =
      await tenantService.getMyTenants();

    if (organizations.length === 0) {
      return router.createUrlTree([
        '/onboarding/create-organization'
      ]);
    }

    const savedTenantId =
      tenantContext.getSavedTenantId();

    const selectedOrganization = organizations.find(
      item => item.tenant.id === savedTenantId
    );

    if (selectedOrganization) {

      tenantContext.setActiveTenant(
        selectedOrganization.tenant
      );

      return true;
    }

    if (organizations.length === 1) {

      tenantContext.setActiveTenant(
        organizations[0].tenant
      );

      return true;
    }

    tenantContext.clear();

    return router.createUrlTree([
      '/organizations/select'
    ]);

  } catch (error) {

    console.error(
      'Erro ao validar organização:',
      error
    );

    return router.createUrlTree(['/login']);

  }
};
