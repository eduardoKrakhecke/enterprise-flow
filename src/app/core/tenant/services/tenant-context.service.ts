
import {
  Injectable,
  signal,
  computed,
  inject,
  PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

import { Tenant } from '../models/tenant.model';

import {
  TenantMember,
  TenantPermissions
} from '../models/tenant-member.model';

const FULL_PERMISSIONS: TenantPermissions = {
  view: true,
  create: true,
  update: true,
  delete: true
};

const NO_PERMISSIONS: TenantPermissions = {
  view: false,
  create: false,
  update: false,
  delete: false
};

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {

  private readonly platformId = inject(PLATFORM_ID);

  readonly activeTenant = signal<Tenant | null>(null);
  readonly activeMember = signal<TenantMember | null>(null);

  readonly activeTenantId = computed(
    () => this.activeTenant()?.id ?? null
  );

  readonly activeRole = computed(
    () => this.activeMember()?.role ?? null
  );

  readonly isActiveMember = computed(() => {
    const tenant = this.activeTenant();
    const member = this.activeMember();

    return !!tenant &&
      !!member &&
      member.active === true &&
      member.tenantId === tenant.id;
  });

  readonly canManageMembers = computed(() => {
    if (!this.isActiveMember()) {
      return false;
    }

    const role = this.activeRole();

    return role === 'owner' || role === 'admin';
  });

  readonly activePermissions = computed<TenantPermissions>(() => {

    const member = this.activeMember();

    if (!this.isActiveMember() || !member) {
      return NO_PERMISSIONS;
    }

    // O proprietário possui todas as permissões.
    if (member.role === 'owner') {
      return FULL_PERMISSIONS;
    }

    // Para os demais papéis, respeita as permissões.
    return member.permissions ?? NO_PERMISSIONS;
  });

  readonly canView = computed(
    () => this.activePermissions().view
  );

  readonly canCreate = computed(
    () => this.activePermissions().create
  );

  readonly canUpdate = computed(
    () => this.activePermissions().update
  );

  readonly canDelete = computed(
    () => this.activePermissions().delete
  );

  setActiveTenant(
    tenant: Tenant,
    member?: TenantMember
  ): void {

    this.activeTenant.set(tenant);
    this.activeMember.set(member ?? null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(
        'enterprise-flow-active-tenant',
        tenant.id
      );
    }
  }

  getSavedTenantId(): string | null {

    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return localStorage.getItem(
      'enterprise-flow-active-tenant'
    );
  }

  clear(): void {

    this.activeTenant.set(null);
    this.activeMember.set(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(
        'enterprise-flow-active-tenant'
      );
    }
  }

  hasPermission(
    permission: keyof TenantPermissions
  ): boolean {
    return this.activePermissions()[permission];
  }
}
