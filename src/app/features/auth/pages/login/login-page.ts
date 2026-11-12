
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

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { AuthErrorService } from '../../../../core/auth/services/auth-error.service';
import {
  TenantService
} from '../../../../core/tenant/services/tenant.service';

import {
  TenantContextService
} from '../../../../core/tenant/services/tenant-context.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss'
})
export class LoginPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(AuthErrorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tenantService = inject(TenantService);

  private readonly tenantContext = inject(TenantContextService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [
      Validators.required,
      Validators.email
    ]],

    password: ['', [
      Validators.required,
      Validators.minLength(6)
    ]]
  });

  async login(): Promise<void> {

    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {

      const { email, password } = this.form.getRawValue();

      await this.authService.loginWithEmail(
        email,
        password
      );

      await this.navigateAfterLogin();

    } catch (error) {

      this.errorMessage.set(
        this.errorService.getMessage(error)
      );

    } finally {

      this.loading.set(false);

    }
  }

  async loginGoogle(): Promise<void> {

    this.errorMessage.set('');
    this.loading.set(true);

    try {

      await this.authService.loginWithGoogle();

      await this.navigateAfterLogin();

    } catch (error) {

      this.errorMessage.set(
        this.errorService.getMessage(error)
      );

    } finally {

      this.loading.set(false);

    }
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  private async navigateAfterLogin(): Promise<void> {

    const organizations =
      await this.tenantService.getMyTenants();

    if (organizations.length === 0) {

      await this.router.navigateByUrl(
        '/onboarding/create-organization'
      );

      return;
    }

    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl');

    if (organizations.length === 1) {

      this.tenantContext.setActiveTenant(
        organizations[0].tenant
      );

      const destination =
        returnUrl?.startsWith('/app')
          ? returnUrl
          : '/app/dashboard';

      await this.router.navigateByUrl(destination);

      return;
    }

    await this.router.navigateByUrl(
      '/organizations/select'
    );
  }
}
