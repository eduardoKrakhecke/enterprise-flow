
import { Component, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { AuthErrorService } from '../../../../core/auth/services/auth-error.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss'
})
export class ForgotPasswordPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(AuthErrorService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [
      Validators.required,
      Validators.email
    ]]
  });

  async sendResetEmail(): Promise<void> {

    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {

      const { email } = this.form.getRawValue();

      await this.authService.sendPasswordReset(email);

      this.successMessage.set(
        'Se o endereço estiver cadastrado, você receberá as instruções de recuperação.'
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
