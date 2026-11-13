
import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp
} from '@angular/fire/firestore';

import { Auth } from '@angular/fire/auth';

import { TenantContextService } from
    '../../../core/tenant/services/tenant-context.service';

import {
  Task,
  CreateTaskInput,
  UpdateTaskInput
} from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly tenantContext = inject(TenantContextService);

  async getTasks(projectId?: string): Promise<Task[]> {
    const tenantId = this.getTenantId();

    this.requirePermission('view');

    const constraints = [
      where('tenantId', '==', tenantId)
    ];

    if (projectId) {
      constraints.push(where('projectId', '==', projectId));
    }

    const tasksQuery = query(
      collection(this.firestore, 'tasks'),
      ...constraints
    );

    const snapshot = await getDocs(tasksQuery);

    return snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    } as Task));
  }

  async createTask(input: CreateTaskInput): Promise<string> {
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    this.requirePermission('create');

    await this.validateProject(input.projectId, tenantId);

    const now = serverTimestamp();

    const result = await addDoc(
      collection(this.firestore, 'tasks'),
      {
        tenantId,
        projectId: input.projectId,
        title: input.title.trim(),
        description: input.description.trim(),
        assignedTo: input.assignedTo,
        status: 'pending',
        priority: input.priority,
        dueDate: input.dueDate
          ? Timestamp.fromDate(input.dueDate)
          : null,
        completedAt: null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      }
    );

    return result.id;
  }

  async updateTask(
    taskId: string,
    input: UpdateTaskInput
  ): Promise<void> {
    const tenantId = this.getTenantId();

    this.requirePermission('update');

    const reference = doc(this.firestore, 'tasks', taskId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists() ||
      snapshot.data()['tenantId'] !== tenantId) {
      throw new Error('Tarefa não encontrada.');
    }

    const changes: Record<string, unknown> = {
      updatedAt: serverTimestamp()
    };

    if (input.title !== undefined) {
      changes['title'] = input.title.trim();
    }

    if (input.description !== undefined) {
      changes['description'] = input.description.trim();
    }

    if (input.assignedTo !== undefined) {
      changes['assignedTo'] = input.assignedTo;
    }

    if (input.priority !== undefined) {
      changes['priority'] = input.priority;
    }

    if (input.dueDate !== undefined) {
      changes['dueDate'] = input.dueDate
        ? Timestamp.fromDate(input.dueDate)
        : null;
    }

    if (input.status !== undefined) {
      changes['status'] = input.status;

      changes['completedAt'] =
        input.status === 'completed'
          ? serverTimestamp()
          : null;
    }

    // @ts-ignore
    await updateDoc(reference, changes);
  }

  async deleteTask(taskId: string): Promise<void> {
    const tenantId = this.getTenantId();

    this.requirePermission('delete');

    const reference = doc(this.firestore, 'tasks', taskId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists() ||
      snapshot.data()['tenantId'] !== tenantId) {
      throw new Error('Tarefa não encontrada.');
    }

    await deleteDoc(reference);
  }

  private async validateProject(
    projectId: string,
    tenantId: string
  ): Promise<void> {
    const reference = doc(
      this.firestore,
      'projects',
      projectId
    );

    const snapshot = await getDoc(reference);

    if (!snapshot.exists() ||
      snapshot.data()['tenantId'] !== tenantId) {
      throw new Error(
        'O projeto não pertence à organização ativa.'
      );
    }
  }

  private getTenantId(): string {
    const tenantId = this.tenantContext.activeTenantId();

    if (!tenantId) {
      throw new Error('Nenhuma organização selecionada.');
    }

    return tenantId;
  }

  private getUserId(): string {
    const userId = this.auth.currentUser?.uid;

    if (!userId) {
      throw new Error('Usuário não autenticado.');
    }

    return userId;
  }

  private requirePermission(
    action: 'view' | 'create' | 'update' | 'delete'
  ): void {
    if (!this.tenantContext.hasPermission(action)) {
      throw new Error(
        'Você não possui permissão para esta operação.'
      );
    }
  }
}
