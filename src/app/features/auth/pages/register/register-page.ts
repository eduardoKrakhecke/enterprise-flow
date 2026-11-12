
import { Component, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { AuthErrorService } from '../../../../core/auth/services/auth-error.service';

import {
  TenantMemberService
} from '../../../../core/tenant/services/tenant-member.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss'
})
export class RegisterPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(AuthErrorService);
  private readonly router = inject(Router);
  private readonly memberService = inject(TenantMemberService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.minLength(3)
    ]],

    email: ['', [
      Validators.required,
      Validators.email
    ]],

    password: ['', [
      Validators.required,
      Validators.minLength(6)
    ]],

    confirmPassword: ['', [
      Validators.required
    ]]
  });

  async register(): Promise<void> {

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {
      name,
      email,
      password,
      confirmPassword
    } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }

    this.loading.set(true);

    try {

      await this.authService.register(
        name,
        email,
        password
      );

      const wasAssociated =
        await this.memberService.activatePendingMemberships();

      await this.router.navigateByUrl(
        wasAssociated
          ? '/app/dashboard'
          : '/onboarding/create-organization'
      );

    } catch (error) {

      this.errorMessage.set(
        this.errorService.getMessage(error)
      );

    } finally {

      this.loading.set(false);

    }
  }
}
