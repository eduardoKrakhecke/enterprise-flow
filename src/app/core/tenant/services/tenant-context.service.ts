
import {
  Injectable,
  signal,
  computed,
  inject,
  PLATFORM_ID
} from '@angular/core';

import {
  isPlatformBrowser
} from '@angular/common';

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

  readonly activePermissions = computed<TenantPermissions>(() => {
    const member = this.activeMember();

    if (!member) {
      return NO_PERMISSIONS;
    }

    if (!member.permissions &&
      (member.role === 'owner' || member.role === 'admin')) {
      return FULL_PERMISSIONS;
    }

    return member.permissions ?? NO_PERMISSIONS;
  });

  setActiveTenant(tenant: Tenant, member?: TenantMember): void {

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

  hasPermission(permission: keyof TenantPermissions): boolean {
    return this.activePermissions()[permission];
  }
}

