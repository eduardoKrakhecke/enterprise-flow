
import { Injectable } from '@angular/core';

import { Project } from '../models/project.model';

export interface ProjectStats {
  total: number;
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectStatsService {

  calculate(projects: Project[]): ProjectStats {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: projects.length,

      planned: projects.filter(
        project => project.status === 'planned'
      ).length,

      inProgress: projects.filter(
        project => project.status === 'in_progress'
      ).length,

      completed: projects.filter(
        project => project.status === 'completed'
      ).length,

      cancelled: projects.filter(
        project => project.status === 'cancelled'
      ).length,

      overdue: projects.filter(project => {
        if (!project.dueDate) {
          return false;
        }

        const dueDate = project.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today
          && project.status !== 'completed'
          && project.status !== 'cancelled';
      }).length
    };
  }
}
