
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Chart,
  registerables
} from 'chart.js';

import { TaskService } from '../../../tasks/services/task.service';
import { Task } from '../../../tasks/models/task.model';

import { ProjectService } from '../../../projects/services/project.service';
import { Project } from '../../../projects/models/project.model';
import { TenantMemberService } from '../../../../core/tenant/services/tenant-member.service';
import { TenantMember } from '../../../../core/tenant/models/tenant-member.model';
import { TenantContextService } from '../../../../core/tenant/services/tenant-context.service';

Chart.register(...registerables);

@Component({
  selector: 'app-productivity-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productivity-page.html',
  styleUrl: './productivity-page.scss'
})
export class ProductivityPage implements OnInit {

  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);
  private readonly memberService = inject(TenantMemberService);
  private readonly tenantContext = inject(TenantContextService);

  readonly tasks = signal<Task[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly members = signal<TenantMember[]>([]);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly selectedProject = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly dateError = signal('');

  readonly filteredTasks = computed(() => {
    const projectId = this.selectedProject();

    if (!projectId) {
      return this.tasks();
    }

    return this.tasks().filter(
      task =>
        (!projectId || task.projectId === projectId) &&
        this.isWithinSelectedPeriod(task)
    );
  });

  readonly totalTasks = computed(
    () => this.filteredTasks().length
  );

  readonly completedTasks = computed(
    () => this.filteredTasks().filter(
      task => task.status === 'completed'
    ).length
  );

  readonly inProgressTasks = computed(
    () => this.filteredTasks().filter(
      task => task.status === 'in_progress'
    ).length
  );

  readonly pendingTasks = computed(
    () => this.filteredTasks().filter(
      task => task.status === 'pending'
    ).length
  );

  readonly overdueTasks = computed(() => {
    const now = new Date();

    return this.filteredTasks().filter(task => {
      if (!task.dueDate) return false;

      if (
        task.status === 'completed' ||
        task.status === 'cancelled'
      ) {
        return false;
      }

      return task.dueDate.toDate() < now;
    }).length;
  });

  readonly completionRate = computed(() => {
    const total = this.totalTasks();

    if (!total) return 0;

    return Math.round(
      (this.completedTasks() / total) * 100
    );
  });

  readonly statusData = computed(() => {
    const tasks = this.filteredTasks();

    return [
      tasks.filter(t => t.status === 'pending').length,
      tasks.filter(t => t.status === 'in_progress').length,
      tasks.filter(t => t.status === 'completed').length,
      tasks.filter(t => t.status === 'cancelled').length
    ];
  });

  readonly priorityData = computed(() => {
    const tasks = this.filteredTasks();

    return [
      tasks.filter(t => t.priority === 'low').length,
      tasks.filter(t => t.priority === 'medium').length,
      tasks.filter(t => t.priority === 'high').length,
      tasks.filter(t => t.priority === 'critical').length
    ];
  });

  readonly responsibleData = computed(() => {
    const grouped = new Map<string, {
      name: string;
      assigned: number;
      completed: number;
      overdue: number;
    }>();

    for (const task of this.filteredTasks()) {
      if (!task.assignedTo) continue;

      const member = this.members().find(
        item => item.userId === task.assignedTo
      );
      const current = grouped.get(task.assignedTo) ?? {
        name: member?.name || member?.email || 'Responsável não identificado',
        assigned: 0,
        completed: 0,
        overdue: 0
      };

      current.assigned++;

      if (task.status === 'completed') {
        current.completed++;
      }

      if (this.isTaskOverdue(task)) {
        current.overdue++;
      }

      grouped.set(task.assignedTo, current);
    }

    return Array.from(grouped.values());
  });

  readonly projectTaskData = computed(() =>
    this.projects()
      .map(project => ({
        name: project.name,
        total: this.filteredTasks().filter(
          task => task.projectId === project.id
        ).length
      }))
      .filter(project => project.total > 0)
  );

  private statusChart?: Chart;
  private priorityChart?: Chart;
  private responsibleChart?: Chart;
  private projectChart?: Chart;

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    this.statusChart?.destroy();
    this.priorityChart?.destroy();

    try {
      const tenantId = this.tenantContext.activeTenantId();
      const [tasks, projects, members] = await Promise.all([
        this.taskService.getTasks(),
        this.projectService.getProjects(),
        tenantId
          ? this.memberService.getMembers(tenantId)
          : Promise.resolve([] as TenantMember[])
      ]);

      this.tasks.set(tasks);
      this.projects.set(projects);
      this.members.set(members);

    } catch (error) {
      console.error(error);
      this.errorMessage.set(
        'Não foi possível carregar os dados de produtividade.'
      );
    } finally {
      this.loading.set(false);

      setTimeout(() => {
        this.renderCharts();
      });
    }
  }

  changeProject(projectId: string): void {
    this.selectedProject.set(projectId);

    setTimeout(() => {
      this.renderCharts();
    });
  }

  changePeriod(start: string, end: string): void {
    this.startDate.set(start);
    this.endDate.set(end);

    if (start && end && start > end) {
      this.dateError.set('A data inicial não pode ser posterior à data final.');
      return;
    }

    this.dateError.set('');

    setTimeout(() => {
      this.renderCharts();
    });
  }

  private renderCharts(): void {
    this.statusChart?.destroy();
    this.priorityChart?.destroy();
    this.responsibleChart?.destroy();
    this.projectChart?.destroy();

    const statusCanvas = document.getElementById(
      'productivityStatusChart'
    ) as HTMLCanvasElement | null;

    const priorityCanvas = document.getElementById(
      'productivityPriorityChart'
    ) as HTMLCanvasElement | null;

    const responsibleCanvas = document.getElementById(
      'productivityResponsibleChart'
    ) as HTMLCanvasElement | null;

    const projectCanvas = document.getElementById(
      'productivityProjectChart'
    ) as HTMLCanvasElement | null;

    if (statusCanvas) {
      this.statusChart = new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
          labels: [
            'Pendentes',
            'Em andamento',
            'Concluídas',
            'Canceladas'
          ],
          datasets: [{
            data: this.statusData(),
            backgroundColor: [
              '#f59e0b',
              '#3b82f6',
              '#10b981',
              '#64748b'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    if (priorityCanvas) {
      this.priorityChart = new Chart(priorityCanvas, {
        type: 'bar',
        data: {
          labels: [
            'Baixa',
            'Média',
            'Alta',
            'Crítica'
          ],
          datasets: [{
            label: 'Tarefas',
            data: this.priorityData(),
            backgroundColor: [
              '#10b981',
              '#3b82f6',
              '#f59e0b',
              '#ef4444'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    }

    if (responsibleCanvas) {
      const data = this.responsibleData();

      this.responsibleChart = new Chart(responsibleCanvas, {
        type: 'bar',
        data: {
          labels: data.map(item => item.name),
          datasets: [
            {
              label: 'Atribuídas',
              data: data.map(item => item.assigned),
              backgroundColor: '#60a5fa'
            },
            {
              label: 'Concluídas',
              data: data.map(item => item.completed),
              backgroundColor: '#34d399'
            },
            {
              label: 'Atrasadas',
              data: data.map(item => item.overdue),
              backgroundColor: '#f87171'
            }
          ]
        },
        options: this.barChartOptions()
      });
    }

    if (projectCanvas) {
      const data = this.projectTaskData();

      this.projectChart = new Chart(projectCanvas, {
        type: 'bar',
        data: {
          labels: data.map(item => item.name),
          datasets: [{
            label: 'Tarefas',
            data: data.map(item => item.total),
            backgroundColor: '#818cf8'
          }]
        },
        options: {
          ...this.barChartOptions(),
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  private barChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    };
  }

  private isWithinSelectedPeriod(task: Task): boolean {
    const start = this.startDate();
    const end = this.endDate();

    if (!start && !end) return true;
    if (!task.dueDate) return false;

    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);

    if (start) {
      const startDate = new Date(`${start}T00:00:00`);
      if (dueDate < startDate) return false;
    }

    if (end) {
      const endDate = new Date(`${end}T23:59:59`);
      if (dueDate > endDate) return false;
    }

    return true;
  }

  private isTaskOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return task.dueDate.toDate() < today;
  }
}
