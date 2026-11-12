
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

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {

  private readonly platformId = inject(PLATFORM_ID);

  readonly activeTenant = signal<Tenant | null>(null);

  readonly activeTenantId = computed(
    () => this.activeTenant()?.id ?? null
  );

  setActiveTenant(tenant: Tenant): void {

    this.activeTenant.set(tenant);

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

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(
        'enterprise-flow-active-tenant'
      );
    }
  }
}

