
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { TenantService } from '../services/tenant.service';

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

    const activeOrganizations = organizations.filter(
      item => item.member.active === true &&
        item.tenant.status === 'active'
    );

    if (activeOrganizations.length === 0) {

      tenantContext.clear();

      return router.createUrlTree([
        '/onboarding/create-organization'
      ]);
    }

    const savedTenantId =
      tenantContext.getSavedTenantId();

    const selectedOrganization = activeOrganizations.find(
      item => item.tenant.id === savedTenantId
    );

    if (selectedOrganization) {

      tenantContext.setActiveTenant(
        selectedOrganization.tenant,
        selectedOrganization.member
      );

      return true;
    }

    if (activeOrganizations.length === 1) {

      tenantContext.setActiveTenant(
        activeOrganizations[0].tenant,
        activeOrganizations[0].member
      );

      return true;
    }

    tenantContext.clear();

    return router.createUrlTree([
      '/organizations/select'
    ]);

  } catch (error) {

    console.error(
      '[TENANT GUARD] Erro ao validar organização:',
      error
    );

    tenantContext.clear();

    // Não confundir falha de consulta com ausência de login.
    // Mantemos a rota protegida e direcionamos para uma
    // página de erro dedicada.
    return router.createUrlTree([
      '/organization-error'
    ]);
  }
};
