
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Chart,
  registerables
} from 'chart.js';

import { Project } from '../../models/project.model';

import {
  ProjectStatsService
} from '../../services/project-stats.service';

Chart.register(...registerables);

@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-dashboard.html',
  styleUrl: './project-dashboard.scss'
})
export class ProjectDashboard
  implements AfterViewInit, OnDestroy {

  private readonly statsService =
    inject(ProjectStatsService);

  readonly projects = input<Project[]>([]);

  readonly statusCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('statusChart');

  readonly priorityCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('priorityChart');

  readonly stats = computed(() =>
    this.statsService.calculate(this.projects())
  );

  private statusChartInstance: Chart | null = null;
  private priorityChartInstance: Chart | null = null;

  private viewReady = false;

  constructor() {
    effect(() => {
      const projects = this.projects();

      if (this.viewReady) {
        this.updateCharts(projects);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.updateCharts(this.projects());
  }

  ngOnDestroy(): void {
    this.statusChartInstance?.destroy();
    this.priorityChartInstance?.destroy();
  }

  private updateCharts(projects: Project[]): void {
    this.renderStatusChart(projects);
    this.renderPriorityChart(projects);
  }

  private renderStatusChart(projects: Project[]): void {

    const canvas = this.statusCanvas()?.nativeElement;
    if (!canvas) return;

    const stats = this.statsService.calculate(projects);

    const values = [
      stats.planned,
      stats.inProgress,
      stats.completed,
      stats.cancelled
    ];

    if (this.statusChartInstance) {
      this.statusChartInstance.data.datasets[0].data = values;
      this.statusChartInstance.update();
      return;
    }

    this.statusChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [
          'Planejados',
          'Em andamento',
          'Concluídos',
          'Cancelados'
        ],
        datasets: [{
          data: values,
          backgroundColor: [
            '#64748b',
            '#3b82f6',
            '#22c55e',
            '#ef4444'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 18
            }
          }
        }
      }
    });
  }

  private renderPriorityChart(projects: Project[]): void {

    const canvas = this.priorityCanvas()?.nativeElement;
    if (!canvas) return;

    const priorities = [
      projects.filter(p => p.priority === 'low').length,
      projects.filter(p => p.priority === 'medium').length,
      projects.filter(p => p.priority === 'high').length,
      projects.filter(p => p.priority === 'critical').length
    ];

    if (this.priorityChartInstance) {
      this.priorityChartInstance.data.datasets[0].data = priorities;
      this.priorityChartInstance.update();
      return;
    }

    this.priorityChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Baixa', 'Média', 'Alta', 'Crítica'],
        datasets: [{
          label: 'Projetos',
          data: priorities,
          backgroundColor: [
            '#64748b',
            '#3b82f6',
            '#f59e0b',
            '#ef4444'
          ],
          borderRadius: 6
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
          x: {
            ticks: {
              color: '#94a3b8'
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8',
              precision: 0
            }
          }
        }
      }
    });
  }
}
