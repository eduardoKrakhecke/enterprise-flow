
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  Chart,
  registerables
} from 'chart.js';

import { TaskService } from '../../../tasks/services/task.service';
import { Task } from '../../../tasks/models/task.model';

import { ProjectService } from '../../../projects/services/project.service';
import { Project } from '../../../projects/models/project.model';

Chart.register(...registerables);

@Component({
  selector: 'app-productivity-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './productivity-page.html',
  styleUrl: './productivity-page.scss'
})
export class ProductivityPage implements OnInit {

  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);

  readonly tasks = signal<Task[]>([]);
  readonly projects = signal<Project[]>([]);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly selectedProject = signal('');

  readonly filteredTasks = computed(() => {
    const projectId = this.selectedProject();

    if (!projectId) {
      return this.tasks();
    }

    return this.tasks().filter(
      task => task.projectId === projectId
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

  private statusChart?: Chart;
  private priorityChart?: Chart;

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    this.statusChart?.destroy();
    this.priorityChart?.destroy();

    try {
      const [tasks, projects] = await Promise.all([
        this.taskService.getTasks(),
        this.projectService.getProjects()
      ]);

      this.tasks.set(tasks);
      this.projects.set(projects);

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

  private renderCharts(): void {
    this.statusChart?.destroy();
    this.priorityChart?.destroy();

    const statusCanvas = document.getElementById(
      'productivityStatusChart'
    ) as HTMLCanvasElement | null;

    const priorityCanvas = document.getElementById(
      'productivityPriorityChart'
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
  }
}
