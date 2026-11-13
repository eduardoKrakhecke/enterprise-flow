import { Routes } from '@angular/router';

export const PRODUCTIVITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/productivity-page/productivity-page')
        .then(m => m.ProductivityPage)
  }
];
