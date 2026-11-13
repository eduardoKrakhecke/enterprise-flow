
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { Project } from
    '../../../projects/models/project.model';

import { ProjectService } from
    '../../../projects/services/project.service';

import { ProjectDashboard } from
    '../../../projects/components/project-dashboard/project-dashboard';

import { TenantContextService } from
    '../../../../core/tenant/services/tenant-context.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    ProjectDashboard
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent implements OnInit {

  private readonly projectService = inject(ProjectService);

  readonly tenantContext = inject(TenantContextService);

  readonly canViewProjects = computed(() =>
    this.tenantContext.hasPermission('view')
  );

  readonly dashboardProjects = signal<Project[]>([]);
  readonly projectsLoading = signal(false);
  readonly projectsError = signal('');

  async ngOnInit(): Promise<void> {
    await this.loadDashboardProjects();
  }

  async loadDashboardProjects(): Promise<void> {

    if (!this.canViewProjects()) {
      this.dashboardProjects.set([]);
      return;
    }

    this.projectsLoading.set(true);
    this.projectsError.set('');

    try {
      const projects = await this.projectService.getProjects();

      this.dashboardProjects.set(projects);

    } catch (error) {

      console.error('Erro ao carregar projetos:', error);

      this.dashboardProjects.set([]);

      this.projectsError.set(
        'Não foi possível carregar os indicadores de projetos.'
      );

    } finally {
      this.projectsLoading.set(false);
    }
  }
}
