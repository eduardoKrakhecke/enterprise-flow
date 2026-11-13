
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';

import { TenantContextService } from
    '../../../core/tenant/services/tenant-context.service';

import { TaskActivity } from
    '../models/task-activity.model';

@Injectable({
  providedIn: 'root'
})
export class TaskActivityService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly tenantContext = inject(TenantContextService);

  async getActivities(taskId: string): Promise<TaskActivity[]> {
    const tenantId = this.tenantContext.activeTenantId();

    if (!tenantId || !this.tenantContext.hasPermission('view')) {
      throw new Error('Sem permissão para visualizar atividades.');
    }

    const activitiesQuery = query(
      collection(this.firestore, 'taskActivities'),
      where('tenantId', '==', tenantId),
      where('taskId', '==', taskId)
    );

    const snapshot = await getDocs(activitiesQuery);

    return snapshot.docs
      .map(document => ({
        ...document.data(),
        id: document.id
      } as TaskActivity))
      .sort((a, b) =>
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );
  }

  async addComment(
    taskId: string,
    projectId: string,
    message: string
  ): Promise<void> {
    const tenantId = this.tenantContext.activeTenantId();
    const userId = this.auth.currentUser?.uid;
    const content = message.trim();

    if (!tenantId || !userId) {
      throw new Error('Usuário ou organização não identificados.');
    }

    if (!this.tenantContext.hasPermission('create')) {
      throw new Error('Sem permissão para comentar.');
    }

    if (!content || content.length > 2000) {
      throw new Error('O comentário deve ter entre 1 e 2000 caracteres.');
    }

    await addDoc(
      collection(this.firestore, 'taskActivities'),
      {
        tenantId,
        taskId,
        projectId,
        type: 'comment',
        userId,
        message: content,
        previousStatus: null,
        newStatus: null,
        createdAt: serverTimestamp()
      }
    );
  }
}
