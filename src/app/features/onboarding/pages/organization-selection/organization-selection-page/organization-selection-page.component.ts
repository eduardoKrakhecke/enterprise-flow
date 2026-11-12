
import {
  Component,
  inject,
  signal,
  OnInit
} from '@angular/core';

import { Router } from '@angular/router';

import {
  TenantService,
  UserTenant
} from '../../../../../core/tenant/services/tenant.service';

import {
  TenantContextService
} from '../../../../../core/tenant/services/tenant-context.service';

@Component({
  selector: 'app-organization-selection-page',
  standalone: true,
  templateUrl: './organization-selection-page.html',
  styleUrl: './organization-selection-page.component.scss'
})
export class OrganizationSelectionPage implements OnInit {

  private readonly tenantService = inject(TenantService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly router = inject(Router);

  readonly organizations = signal<UserTenant[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    await this.loadOrganizations();
  }

  async loadOrganizations(): Promise<void> {

    this.loading.set(true);
    this.errorMessage.set('');

    try {

      const organizations =
        await this.tenantService.getMyTenants();

      this.organizations.set(organizations);

      if (organizations.length === 0) {
        await this.router.navigateByUrl(
          '/onboarding/create-organization'
        );
      }

      if (organizations.length === 1) {
        await this.selectOrganization(organizations[0]);
      }

    } catch (error) {

      console.error(error);

      this.errorMessage.set(
        'Não foi possível carregar suas organizações.'
      );

    } finally {

      this.loading.set(false);

    }
  }

  async selectOrganization(
    item: UserTenant
  ): Promise<void> {

    this.tenantContext.setActiveTenant(
      item.tenant
    );

    await this.router.navigateByUrl(
      '/app/dashboard'
    );
  }
}
