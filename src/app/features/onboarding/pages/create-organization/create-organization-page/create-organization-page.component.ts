
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import { TenantService } from '../../../../../core/tenant/services/tenant.service';

import {
  TenantContextService
} from '../../../../../core/tenant/services/tenant-context.service';

@Component({
  selector: 'app-create-organization-page',
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './create-organization-page.html',
  styleUrl: './create-organization-page.component.scss'
})
export class CreateOrganizationPage {

  private readonly fb = inject(FormBuilder);
  private readonly tenantService = inject(TenantService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({

    name: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100)
    ]],

    document: ['', [
      Validators.required,
      Validators.pattern(/^\d{14}$/)
    ]]

  });

  async create(): Promise<void> {

    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {

      const result = await this.tenantService.createTenant(
        this.form.getRawValue()
      );

      const organizations =
        await this.tenantService.getMyTenants();

      const createdOrganization = organizations.find(
        item => item.tenant.id === result.tenantId
      );

      if (!createdOrganization) {
        throw new Error(
          'Não foi possível confirmar a associação da empresa.'
        );
      }

      this.tenantContext.setActiveTenant(
        createdOrganization.tenant
      );

      await this.router.navigateByUrl('/app/dashboard');

    } catch (error) {

      console.error('Erro ao criar organização:', error);

      this.errorMessage.set(
        this.getErrorMessage(error)
      );

    } finally {

      this.loading.set(false);

    }
  }


  private getErrorMessage(error: unknown): string {

    const code = (error as { code?: string })?.code;
    const message = error instanceof Error
      ? error.message
      : '';

    if (message === 'UNAUTHENTICATED') {
      return 'Sua sessão expirou. Faça login novamente.';
    }

    if (message === 'INVALID_TENANT_NAME') {
      return 'O nome da organização deve ter entre 3 e 100 caracteres.';
    }

    if (message === 'INVALID_TENANT_DOCUMENT') {
      return 'Informe um CNPJ com 14 dígitos.';
    }

    if (message === 'TENANT_DOCUMENT_ALREADY_EXISTS') {
      return 'Já existe uma empresa cadastrada com este CNPJ.';
    }

    switch (code) {

      case 'permission-denied':
        return 'Operação não autorizada. Verifique as permissões da sua conta.';

      case 'unauthenticated':
        return 'Sua sessão expirou. Faça login novamente.';

      case 'unavailable':
        return 'Serviço temporariamente indisponível. Tente novamente.';

      case 'failed-precondition':
        return 'Não foi possível concluir a operação. Verifique a configuração do Firestore.';

      default:
        return 'Não foi possível criar a organização. Tente novamente.';
    }
  }

}
