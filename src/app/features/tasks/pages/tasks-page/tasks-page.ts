import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TenantContextService } from '../../../../core/tenant/services/tenant-context.service';
import { TenantMemberService } from '../../../../core/tenant/services/tenant-member.service';
import { TenantMember } from '../../../../core/tenant/models/tenant-member.model';
import { ProjectService } from '../../../projects/services/project.service';
import { Project } from '../../../projects/models/project.model';
import { TaskService } from '../../services/task.service';
import { Task, TaskPriority, TaskStatus, CreateTaskInput } from '../../models/task.model';
import { TaskActivity } from '../../models/task-activity.model';
import { TaskActivityService } from '../../services/task-activity.service';
import { TaskKanban } from '../../components/task-kanban/task-kanban.component';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TaskKanban],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss'
})
export class TasksPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly taskActivityService = inject(TaskActivityService);
  private readonly projectService = inject(ProjectService);
  private readonly memberService = inject(TenantMemberService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly canView = this.tenantContext.canView;
  readonly canCreate = this.tenantContext.canCreate;
  readonly canUpdate = this.tenantContext.canUpdate;
  readonly canDelete = this.tenantContext.canDelete;

  readonly tasks = signal<Task[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly members = signal<TenantMember[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingOptions = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly searchTerm = signal('');
  readonly projectFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly showForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);
  readonly deletingTaskId = signal<string | null>(null);
  readonly selectedActivityTask = signal<Task | null>(null);
  readonly activities = signal<TaskActivity[]>([]);
  readonly loadingActivities = signal(false);
  readonly savingComment = signal(false);
  readonly commentText = signal('');
  readonly activityError = signal('');

  readonly viewMode = signal<'list' | 'kanban'>('list');
  readonly movingTaskId = signal<string | null>(null);

  readonly activeMembers = computed(() => this.members().filter(member => member.active));
  readonly filteredTasks = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    return this.tasks().filter(task =>
      (this.projectFilter() === 'all' || task.projectId === this.projectFilter()) &&
      (this.statusFilter() === 'all' || task.status === this.statusFilter()) &&
      (task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search))
    );
  });
  readonly totalTasks = computed(() => this.tasks().length);
  readonly pendingCount = computed(() => this.tasks().filter(task => task.status === 'pending').length);
  readonly inProgressCount = computed(() => this.tasks().filter(task => task.status === 'in_progress').length);
  readonly completedCount = computed(() => this.tasks().filter(task => task.status === 'completed').length);
  readonly overdueCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.tasks().filter(task => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
      const due = task.dueDate.toDate();
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).length;
  });

  readonly taskForm = this.fb.nonNullable.group({
    projectId: ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(3000)],
    assignedTo: [''],
    status: ['pending' as TaskStatus, Validators.required],
    priority: ['medium' as TaskPriority, Validators.required],
    dueDate: ['']
  });

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.queryParamMap.get('projectId');
    if (projectId) this.projectFilter.set(projectId);
    await this.loadOptions();
    await this.loadTasks();
  }

  async changeTaskStatus(
    event: { task: Task; status: TaskStatus }
  ): Promise<void> {
    if (!this.canUpdate() || this.movingTaskId()) return;

    this.movingTaskId.set(event.task.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.taskService.updateTaskStatusWithHistory(
        event.task.id,
        event.status
      );

      await this.loadTasks();
      this.successMessage.set('Status atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      this.errorMessage.set('Não foi possível atualizar o status.');
    } finally {
      this.movingTaskId.set(null);
    }
  }

  async openTaskActivities(task: Task): Promise<void> {
    this.selectedActivityTask.set(task);
    this.activities.set([]);
    this.commentText.set('');
    this.activityError.set('');
    this.loadingActivities.set(true);

    try {
      this.activities.set(
        await this.taskActivityService.getActivities(task.id)
      );
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      this.activityError.set('Não foi possível carregar as atividades.');
    } finally {
      this.loadingActivities.set(false);
    }
  }

  private async loadTaskActivities(task: Task): Promise<void> {
    this.activities.set([]);
    this.activityError.set('');
    this.loadingActivities.set(true);

    try {
      this.activities.set(
        await this.taskActivityService.getActivities(task.id)
      );
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      this.activityError.set('Não foi possível carregar as atividades.');
    } finally {
      this.loadingActivities.set(false);
    }
  }

  closeTaskActivities(): void {
    this.selectedActivityTask.set(null);
    this.activities.set([]);
    this.commentText.set('');
    this.activityError.set('');
  }

  async submitComment(): Promise<void> {
    const task = this.selectedActivityTask() ?? this.tasks().find(
      item => item.id === this.editingTaskId()
    ) ?? null;
    const message = this.commentText().trim();

    if (!task || !message || this.savingComment() || !this.canCreate()) {
      return;
    }

    this.savingComment.set(true);
    this.activityError.set('');

    try {
      await this.taskActivityService.addComment(
        task.id,
        task.projectId,
        message
      );

      this.commentText.set('');
      await this.loadTaskActivities(task);
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      this.activityError.set('Não foi possível enviar o comentário.');
    } finally {
      this.savingComment.set(false);
    }
  }

  activityUserName(userId: string): string {
    const member = this.members().find(item => item.userId === userId);
    return member?.name || member?.email || userId;
  }

  async loadOptions(): Promise<void> {
    if (!this.canView()) return;
    this.loadingOptions.set(true);
    try {
      const tenantId = this.tenantContext.activeTenantId();
      if (!tenantId) throw new Error('Nenhuma organização selecionada.');
      const [projects, members] = await Promise.all([
        this.projectService.getProjects(),
        this.memberService.getMembers(tenantId)
      ]);
      this.projects.set(projects);
      this.members.set(members);
    } catch (error) {
      console.error('Erro ao carregar projetos ou membros:', error);
      this.errorMessage.set('Não foi possível carregar os projetos ou responsáveis.');
    } finally {
      this.loadingOptions.set(false);
    }
  }

  async loadTasks(): Promise<void> {
    if (!this.canView()) { this.tasks.set([]); return; }
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      this.tasks.set(await this.taskService.getTasks());
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      this.errorMessage.set('Não foi possível carregar as tarefas.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateForm(): void {
    if (!this.canCreate()) return;
    this.editingTaskId.set(null);
    this.errorMessage.set('');
    this.taskForm.reset({
      projectId: this.projectFilter() === 'all' ? '' : this.projectFilter(),
      title: '', description: '', assignedTo: '', status: 'pending',
      priority: 'medium', dueDate: ''
    });
    this.taskForm.controls.projectId.enable({ emitEvent: false });
    this.activities.set([]);
    this.commentText.set('');
    this.activityError.set('');
    this.showForm.set(true);
  }

  openEditForm(task: Task): void {
    if (!this.canUpdate()) return;
    this.editingTaskId.set(task.id);
    this.errorMessage.set('');
    this.taskForm.setValue({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo ?? '',
      status: task.status,
      priority: task.priority,
      dueDate: this.toDateInput(task.dueDate)
    });
    this.taskForm.controls.projectId.disable({ emitEvent: false });
    this.showForm.set(true);
    void this.loadTaskActivities(task);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
    this.editingTaskId.set(null);
    this.activities.set([]);
    this.commentText.set('');
    this.activityError.set('');
  }

  async saveTask(): Promise<void> {
    if (this.saving() || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const editingId = this.editingTaskId();
    if (editingId ? !this.canUpdate() : !this.canCreate()) return;
    const value = this.taskForm.getRawValue();
    const project = this.projects().find(item => item.id === value.projectId);
    if (!project) {
      this.errorMessage.set('Selecione um projeto válido.');
      return;
    }
    if (value.assignedTo && !this.activeMembers().some(member => member.userId === value.assignedTo)) {
      this.errorMessage.set('Selecione um responsável ativo.');
      return;
    }
    const dueDate = this.parseDate(value.dueDate);
    if (value.dueDate && !dueDate) {
      this.errorMessage.set('Informe uma data válida.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      if (editingId) {
        await this.taskService.updateTask(editingId, {
          title: value.title,
          description: value.description,
          assignedTo: value.assignedTo || null,
          status: value.status,
          priority: value.priority,
          dueDate
        });
      } else {
        const input: CreateTaskInput = {
          projectId: value.projectId,
          title: value.title,
          description: value.description,
          assignedTo: value.assignedTo || null,
          priority: value.priority,
          dueDate
        };
        await this.taskService.createTask(input);
      }
      this.showForm.set(false);
      this.editingTaskId.set(null);
      await this.loadTasks();
      this.successMessage.set(editingId ? 'Tarefa atualizada com sucesso.' : 'Tarefa criada com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      this.errorMessage.set('Não foi possível salvar a tarefa. Verifique as permissões e regras do Firestore.');
    } finally {
      this.saving.set(false);
    }
  }

  requestDelete(task: Task): void {
    if (this.canDelete()) this.deletingTaskId.set(task.id);
  }
  cancelDelete(): void { this.deletingTaskId.set(null); }
  async confirmDelete(): Promise<void> {
    const id = this.deletingTaskId();
    if (!id || !this.canDelete() || this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      await this.taskService.deleteTask(id);
      this.deletingTaskId.set(null);
      await this.loadTasks();
      this.successMessage.set('Tarefa excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      this.errorMessage.set('Não foi possível excluir a tarefa.');
    } finally {
      this.saving.set(false);
    }
  }

  projectName(projectId: string): string {
    return this.projects().find(project => project.id === projectId)?.name ?? 'Projeto indisponível';
  }
  assigneeName(userId: string | null): string {
    if (!userId) return 'Sem responsável';
    const member = this.members().find(item => item.userId === userId);
    return member?.name || member?.email || 'Membro indisponível';
  }
  statusLabel(status: TaskStatus): string {
    return ({ pending: 'Pendente', in_progress: 'Em andamento', completed: 'Concluída', cancelled: 'Cancelada' })[status];
  }
  priorityLabel(priority: TaskPriority): string {
    return ({ low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' })[priority];
  }
  private toDateInput(value: Task['dueDate']): string {
    if (!value) return '';
    const date = value.toDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private parseDate(value: string): Date | null {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) return null;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }
}
