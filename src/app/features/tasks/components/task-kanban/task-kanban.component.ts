import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { Task, TaskStatus } from '../../models/task.model';
import { TenantMember } from '../../../../core/tenant/models/tenant-member.model';

@Component({
  selector: 'app-task-kanban',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-kanban.component.html',
  styleUrl: './task-kanban.component.scss'
})
export class TaskKanban {
  readonly tasks = input.required<Task[]>();
  readonly members = input<TenantMember[]>([]);
  readonly canUpdate = input(false);
  readonly editTask = output<Task>();
  readonly statusChange = output<{ task: Task; status: TaskStatus }>();
  readonly busyTaskId = input<string | null>(null);
  readonly draggedTaskId = signal<string | null>(null);
  readonly columns: { status: TaskStatus; label: string }[] = [
    { status: 'pending', label: 'Pendente' },
    { status: 'in_progress', label: 'Em andamento' },
    { status: 'completed', label: 'Concluída' },
    { status: 'cancelled', label: 'Cancelada' }
  ];

  readonly groupedTasks = computed(() => {
    const all = this.tasks();
    return {
      pending: all.filter(t => t.status === 'pending'),
      in_progress: all.filter(t => t.status === 'in_progress'),
      completed: all.filter(t => t.status === 'completed'),
      cancelled: all.filter(t => t.status === 'cancelled')
    };
  });

  move(task: Task, status: TaskStatus): void {
    if (!this.canUpdate() || this.busyTaskId() || task.status === status) return;
    this.statusChange.emit({ task, status });
  }

  openEdit(task: Task): void {
    if (!this.canUpdate() || this.busyTaskId()) return;
    this.editTask.emit(task);
  }

  onDragStart(event: DragEvent, task: Task): void {
    if (!this.canUpdate() || this.busyTaskId()) {
      event.preventDefault();
      return;
    }
    this.draggedTaskId.set(task.id);
    event.dataTransfer?.setData('text/plain', task.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent): void {
    if (!this.canUpdate() || this.busyTaskId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();
    const id = this.draggedTaskId();
    this.draggedTaskId.set(null);
    if (!id || !this.canUpdate() || this.busyTaskId()) return;
    const task = this.tasks().find(item => item.id === id);
    if (task) this.move(task, status);
  }

  onDragEnd(): void { this.draggedTaskId.set(null); }

  assigneeName(userId: string | null): string {
    if (!userId) return 'Sem responsável';

    const member = this.members().find(item => item.userId === userId);

    return member?.name || member?.email || 'Membro indisponível';
  }

  priorityLabel(priority: Task['priority']): string {
    return ({ low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' })[priority];
  }
}
