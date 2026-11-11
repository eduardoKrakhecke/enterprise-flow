
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { ThemeService } from '../../../theme/theme.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {

  readonly theme = inject(ThemeService);
  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly logoutLoading = signal(false);

  readonly user = this.authService.currentUser;

  toggleSidebar(): void {
    this.sidebarOpen.update(value => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async logout(): Promise<void> {

    if (this.logoutLoading()) {
      return;
    }

    this.logoutLoading.set(true);

    try {

      await this.authService.logout();

      await this.router.navigateByUrl('/auth/login');

    } finally {

      this.logoutLoading.set(false);

    }
  }
}
