
import {
  Injectable,
  signal,
  inject,
  DOCUMENT,
  PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isDark = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {

      const savedTheme =
        localStorage.getItem('enterpriseflow-theme');

      const isDark = savedTheme
        ? savedTheme === 'dark'
        : true;

      this.setTheme(isDark);
    }
  }

  toggle(): void {
    this.setTheme(!this.isDark());
  }

  setTheme(dark: boolean): void {

    this.isDark.set(dark);

    this.document.documentElement.classList.toggle(
      'app-dark',
      dark
    );

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(
        'enterpriseflow-theme',
        dark ? 'dark' : 'light'
      );
    }
  }
}
