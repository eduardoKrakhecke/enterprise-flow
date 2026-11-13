import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore, Timestamp, collection, deleteDoc, doc, getDoc,
  getDocs, query, serverTimestamp, where, writeBatch
} from '@angular/fire/firestore';
import { TenantContextService } from '../../../core/tenant/services/tenant-context.service';
import { Task, TaskStatus, CreateTaskInput, UpdateTaskInput } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly tenantContext = inject(TenantContextService);

  async getTasks(projectId?: string): Promise<Task[]> {
    const tenantId = this.getTenantId();
    this.requirePermission('view');
    const constraints = [where('tenantId', '==', tenantId)];
    if (projectId) constraints.push(where('projectId', '==', projectId));
    const snapshot = await getDocs(query(collection(this.firestore, 'tasks'), ...constraints));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Task));
  }

  async createTask(input: CreateTaskInput): Promise<string> {
    const tenantId = this.getTenantId();
    const userId = this.getUserId();
    this.requirePermission('create');
    await this.validateProject(input.projectId, tenantId);

    const taskRef = doc(collection(this.firestore, 'tasks'));
    const batch = writeBatch(this.firestore);
    const now = serverTimestamp();
    batch.set(taskRef, {
      tenantId, projectId: input.projectId,
      title: input.title.trim(), description: input.description.trim(),
      assignedTo: input.assignedTo, status: 'pending', priority: input.priority,
      dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
      completedAt: null, createdBy: userId, createdAt: now, updatedAt: now
    });
    await batch.commit();
    return taskRef.id;
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
    const tenantId = this.getTenantId();
    const userId = this.getUserId();
    this.requirePermission('update');

    const taskRef = doc(this.firestore, 'tasks', taskId);
    const snapshot = await getDoc(taskRef);
    if (!snapshot.exists() || snapshot.data()['tenantId'] !== tenantId) {
      throw new Error('Tarefa não encontrada.');
    }
    const task = snapshot.data() as Task;
    const changes: Record<string, unknown> = {};
    if (input.title !== undefined) changes['title'] = input.title.trim();
    if (input.description !== undefined) changes['description'] = input.description.trim();
    if (input.assignedTo !== undefined) changes['assignedTo'] = input.assignedTo;
    if (input.priority !== undefined) changes['priority'] = input.priority;
    if (input.dueDate !== undefined) {
      changes['dueDate'] = input.dueDate ? Timestamp.fromDate(input.dueDate) : null;
    }
    if (input.status !== undefined && input.status !== task.status) {
      changes['status'] = input.status;
      changes['completedAt'] = input.status === 'completed' ? serverTimestamp() : null;
    }
    if (Object.keys(changes).length === 0) return;

    const statusChanged = input.status !== undefined && input.status !== task.status;
    const activityRef = doc(collection(this.firestore, 'taskActivities'));
    const now = serverTimestamp();
    const batch = writeBatch(this.firestore);
    batch.update(taskRef, {
      ...changes,
      updatedAt: now,
      updatedBy: userId,
      lastActivityId: activityRef.id
    });
    batch.set(activityRef, {
      tenantId, taskId, projectId: task.projectId,
      type: statusChanged ? 'status_changed' : 'updated',
      userId,
      message: statusChanged ? 'Status da tarefa alterado' : 'Tarefa atualizada',
      previousStatus: statusChanged ? task.status : null,
      newStatus: statusChanged ? input.status : null,
      createdAt: now
    });
    await batch.commit();
  }

  async updateTaskStatusWithHistory(taskId: string, newStatus: TaskStatus): Promise<void> {
    await this.updateTask(taskId, { status: newStatus });
  }

  async deleteTask(taskId: string): Promise<void> {
    const tenantId = this.getTenantId();
    this.requirePermission('delete');
    const reference = doc(this.firestore, 'tasks', taskId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists() || snapshot.data()['tenantId'] !== tenantId) {
      throw new Error('Tarefa não encontrada.');
    }
    await deleteDoc(reference);
  }

  private async validateProject(projectId: string, tenantId: string): Promise<void> {
    const snapshot = await getDoc(doc(this.firestore, 'projects', projectId));
    if (!snapshot.exists() || snapshot.data()['tenantId'] !== tenantId) {
      throw new Error('O projeto não pertence à organização ativa.');
    }
  }
  private getTenantId(): string {
    const tenantId = this.tenantContext.activeTenantId();
    if (!tenantId) throw new Error('Nenhuma organização selecionada.');
    return tenantId;
  }
  private getUserId(): string {
    const userId = this.auth.currentUser?.uid;
    if (!userId) throw new Error('Usuário não autenticado.');
    return userId;
  }
  private requirePermission(action: 'view' | 'create' | 'update' | 'delete'): void {
    if (!this.tenantContext.hasPermission(action)) {
      throw new Error('Você não possui permissão para esta operação.');
    }
  }
}
