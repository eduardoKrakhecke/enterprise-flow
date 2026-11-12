
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  TenantContextService
} from '../../../../core/tenant/services/tenant-context.service';

import {
  ProjectService
} from '../../services/project.service';

import {
  Project,
  ProjectPriority,
  ProjectStatus,
  CreateProjectInput
} from '../../models/project.model';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.scss'
})
export class ProjectsPage implements OnInit {

  private readonly projectService = inject(ProjectService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly fb = inject(FormBuilder);

  readonly canView = this.tenantContext.canView;
  readonly canCreate = this.tenantContext.canCreate;
  readonly canUpdate = this.tenantContext.canUpdate;
  readonly canDelete = this.tenantContext.canDelete;

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly searchTerm = signal('');
  readonly statusFilter = signal('all');
  readonly priorityFilter = signal('all');

  readonly showForm = signal(false);
  readonly editingProjectId = signal<string | null>(null);
  readonly deletingProjectId = signal<string | null>(null);

  readonly projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(3000)],
    clientName: ['', Validators.maxLength(150)],
    responsibleUserId: [''],
    status: ['planned' as ProjectStatus, Validators.required],
    priority: ['medium' as ProjectPriority, Validators.required],
    startDate: [''],
    dueDate: ['']
  });

  readonly filteredProjects = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const priority = this.priorityFilter();

    return this.projects().filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(search) ||
        project.clientName.toLowerCase().includes(search);

      return matchesSearch &&
        (status === 'all' || project.status === status) &&
        (priority === 'all' || project.priority === priority);
    });
  });

  readonly totalProjects = computed(
    () => this.projects().length
  );

  readonly inProgressCount = computed(
    () => this.projects().filter(
      project => project.status === 'in_progress'
    ).length
  );

  readonly completedCount = computed(
    () => this.projects().filter(
      project => project.status === 'completed'
    ).length
  );

  readonly overdueCount = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this.projects().filter(project => {
      if (!project.dueDate) return false;

      const due = project.dueDate.toDate();
      due.setHours(0, 0, 0, 0);

      return due < now &&
        project.status !== 'completed' &&
        project.status !== 'cancelled';
    }).length;
  });

  async ngOnInit(): Promise<void> {
    await this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.errorMessage.set('');

    if (!this.canView()) {
      this.projects.set([]);
      return;
    }

    this.loading.set(true);

    try {
      const projects = await this.projectService.getProjects();
      this.projects.set(projects);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      this.errorMessage.set('Não foi possível carregar os projetos.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateForm(): void {
    if (!this.canCreate()) return;

    this.editingProjectId.set(null);
    this.errorMessage.set('');
    this.projectForm.reset({
      name: '',
      description: '',
      clientName: '',
      responsibleUserId: '',
      status: 'planned',
      priority: 'medium',
      startDate: '',
      dueDate: ''
    });

    this.showForm.set(true);
  }

  openEditForm(project: Project): void {
    if (!this.canUpdate()) return;

    this.editingProjectId.set(project.id);
    this.errorMessage.set('');

    this.projectForm.setValue({
      name: project.name,
      description: project.description,
      clientName: project.clientName,
      responsibleUserId: project.responsibleUserId ?? '',
      status: project.status,
      priority: project.priority,
      startDate: this.toDateInput(project.startDate),
      dueDate: this.toDateInput(project.dueDate)
    });

    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;

    this.showForm.set(false);
    this.editingProjectId.set(null);
  }

  async saveProject(): Promise<void> {
    if (this.projectForm.invalid || this.saving()) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const editingId = this.editingProjectId();

    if (editingId ? !this.canUpdate() : !this.canCreate()) {
      return;
    }

    const value = this.projectForm.getRawValue();
    const startDate = this.parseDate(value.startDate);
    const dueDate = this.parseDate(value.dueDate);

    if (startDate && dueDate && dueDate < startDate) {
      this.errorMessage.set(
        'A data de término não pode ser anterior à data de início.'
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const input: CreateProjectInput = {
        name: value.name,
        description: value.description,
        clientName: value.clientName,
        responsibleUserId: value.responsibleUserId.trim() || null,
        priority: value.priority,
        startDate,
        dueDate
      };

      if (editingId) {
        await this.projectService.updateProject(editingId, {
          ...input,
          status: value.status
        });
      } else {
        await this.projectService.createProject(input);
      }

      this.successMessage.set(
        editingId
          ? 'Projeto atualizado com sucesso.'
          : 'Projeto criado com sucesso.'
      );

      this.showForm.set(false);
      this.editingProjectId.set(null);
      await this.loadProjects();

    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      this.errorMessage.set('Não foi possível salvar o projeto.');
    } finally {
      this.saving.set(false);
    }
  }

  requestDelete(project: Project): void {
    if (!this.canDelete()) return;

    this.deletingProjectId.set(project.id);
  }

  cancelDelete(): void {
    this.deletingProjectId.set(null);
  }

  async confirmDelete(): Promise<void> {
    const projectId = this.deletingProjectId();

    if (!projectId || !this.canDelete() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.projectService.deleteProject(projectId);
      this.deletingProjectId.set(null);
      this.successMessage.set('Projeto excluído com sucesso.');
      await this.loadProjects();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      this.errorMessage.set('Não foi possível excluir o projeto.');
    } finally {
      this.saving.set(false);
    }
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  updateStatusFilter(value: string): void {
    this.statusFilter.set(value);
  }

  updatePriorityFilter(value: string): void {
    this.priorityFilter.set(value);
  }

  statusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      planned: 'Planejado',
      in_progress: 'Em andamento',
      completed: 'Concluído',
      cancelled: 'Cancelado'
    };

    return labels[status];
  }

  priorityLabel(priority: ProjectPriority): string {
    const labels: Record<ProjectPriority, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica'
    };

    return labels[priority];
  }

  private toDateInput(
    value: Project['startDate']
  ): string {
    if (!value) return '';

    const date = value.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;

    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day, 12);
  }
}
