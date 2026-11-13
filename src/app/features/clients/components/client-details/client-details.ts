
import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { Client } from '../../models/client.model';
import { Project } from '../../../projects/models/project.model';
import { ProjectService } from '../../../projects/services/project.service';

@Component({
  selector: 'app-client-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-details.html',
  styleUrl: './client-details.scss'
})
export class ClientDetails implements OnInit {

  private readonly projectService = inject(ProjectService);

  readonly client = input.required<Client>();

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly totalProjects = computed(
    () => this.projects().length
  );

  readonly inProgressProjects = computed(
    () => this.projects().filter(
      project => project.status === 'in_progress'
    ).length
  );

  readonly completedProjects = computed(
    () => this.projects().filter(
      project => project.status === 'completed'
    ).length
  );

  async ngOnInit(): Promise<void> {
    await this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const projects =
        await this.projectService.getProjectsByClient(
          this.client().id
        );

      this.projects.set(projects);

    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      this.errorMessage.set(
        'Não foi possível carregar os projetos do cliente.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
