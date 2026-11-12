
import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  TenantInvitationService
} from '../../../../core/tenant/services/tenant-invitation.service';

import {
  TenantService
} from '../../../../core/tenant/services/tenant.service';

import {
  TenantContextService
} from '../../../../core/tenant/services/tenant-context.service';

@Component({
  selector: 'app-accept-invitation-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './accept-invitation-page.html',
  styleUrl: './accept-invitation-page.scss'
})
export class AcceptInvitationPage implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly invitationService = inject(TenantInvitationService);
  private readonly tenantService = inject(TenantService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    code: ['', [
      Validators.required,
      Validators.minLength(10)
    ]]
  });

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const lookupError =
      this.route.snapshot.queryParamMap.get('lookupError');

    if (code) {
      this.form.controls.code.setValue(code);
    }

    if (lookupError === 'true') {
      this.errorMessage.set(
        'Não foi possível verificar o convite pendente. Tente novamente.'
      );
    }
  }

  async accept(): Promise<void> {

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      const code = this.form.controls.code.value.trim();

      const tenantId =
        await this.invitationService.acceptInvitation(code);

      const organizations =
        await this.tenantService.getMyTenants();

      const organization = organizations.find(
        item => item.tenant.id === tenantId
      );

      if (!organization) {
        throw new Error('MEMBERSHIP_NOT_FOUND');
      }

      this.tenantContext.setActiveTenant(
        organization.tenant,
        organization.member
      );

      this.successMessage.set(
        'Convite aceito! Você agora faz parte da organização.'
      );

      await this.router.navigateByUrl('/app/dashboard');

    } catch (error) {

      console.error('Erro ao aceitar convite:', error);

      const message = error instanceof Error
        ? error.message
        : '';

      const errorMessages: Record<string, string> = {
        UNAUTHENTICATED: 'Faça login para aceitar o convite.',
        INVALID_INVITATION: 'Código de convite inválido.',
        INVITATION_NOT_FOUND: 'Convite não encontrado.',
        INVITATION_USED: 'Este convite já foi utilizado.',
        INVITATION_EXPIRED: 'Este convite expirou.',
        INVITATION_EMAIL_MISMATCH:
          'Este convite foi destinado a outro e-mail.',
        ALREADY_MEMBER: 'Você já faz parte desta organização.',
        MEMBERSHIP_NOT_FOUND:
          'O convite foi aceito, mas não foi possível carregar a organização.'
      };

      this.errorMessage.set(
        errorMessages[message] ??
        'Não foi possível aceitar o convite. Verifique o código e tente novamente.'
      );

    } finally {
      this.loading.set(false);
    }
  }
}

