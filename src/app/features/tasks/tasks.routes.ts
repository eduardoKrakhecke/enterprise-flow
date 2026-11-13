import { Routes } from '@angular/router';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/tasks-page/tasks-page')
        .then(m => m.TasksPage)
  }
];
