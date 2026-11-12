
import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/projects-page/projects-page')
        .then(m => m.ProjectsPage)
  }
];
