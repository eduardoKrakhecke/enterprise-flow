
import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';

import { Auth } from '@angular/fire/auth';

import {
  TenantContextService
} from '../../../core/tenant/services/tenant-context.service';

import {
  CreateProjectInput,
  Project,
  UpdateProjectInput
} from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly tenantContext = inject(TenantContextService);

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

  async getProjects(): Promise<Project[]> {

    if (!this.tenantContext.hasPermission('view')) {
      throw new Error('Sem permissão para visualizar projetos.');
    }

    const tenantId = this.getTenantId();

    const projectsRef = collection(
      this.firestore,
      'projects'
    );

    const projectsQuery = query(
      projectsRef,
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(projectsQuery);

    return snapshot.docs.map(document => ({
      ...document.data(),
      id: document.id
    } as Project));
  }

  async createProject(input: CreateProjectInput): Promise<string> {

    if (!this.tenantContext.hasPermission('create')) {
      throw new Error('Sem permissão para criar projetos.');
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    const projectsRef = collection(
      this.firestore,
      'projects'
    );

    const now = serverTimestamp();

    const documentRef = await addDoc(projectsRef, {
      tenantId,
      name: input.name.trim(),
      description: input.description.trim(),
      clientName: input.clientName.trim(),
      responsibleUserId: input.responsibleUserId,
      status: 'planned',
      priority: input.priority,
      startDate: input.startDate
        ? Timestamp.fromDate(input.startDate)
        : null,
      dueDate: input.dueDate
        ? Timestamp.fromDate(input.dueDate)
        : null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    });

    return documentRef.id;
  }

  async updateProject(
    projectId: string,
    input: UpdateProjectInput
  ): Promise<void> {

    if (!this.tenantContext.hasPermission('update')) {
      throw new Error('Sem permissão para editar projetos.');
    }

    this.getTenantId();

    const projectRef = doc(
      this.firestore,
      'projects',
      projectId
    );

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp()
    };

    if (input.name !== undefined) {
      updates['name'] = input.name.trim();
    }

    if (input.description !== undefined) {
      updates['description'] = input.description.trim();
    }

    if (input.clientName !== undefined) {
      updates['clientName'] = input.clientName.trim();
    }

    if (input.responsibleUserId !== undefined) {
      updates['responsibleUserId'] = input.responsibleUserId;
    }

    if (input.status !== undefined) {
      updates['status'] = input.status;
    }

    if (input.priority !== undefined) {
      updates['priority'] = input.priority;
    }

    if (input.startDate !== undefined) {
      updates['startDate'] = input.startDate
        ? Timestamp.fromDate(input.startDate)
        : null;
    }

    if (input.dueDate !== undefined) {
      updates['dueDate'] = input.dueDate
        ? Timestamp.fromDate(input.dueDate)
        : null;
    }

    // A organização nunca pode ser alterada pela edição.
    // A regra do Firestore também verifica essa restrição.
    // @ts-ignore
    await updateDoc(projectRef, updates);
  }

  async deleteProject(projectId: string): Promise<void> {

    if (!this.tenantContext.hasPermission('delete')) {
      throw new Error('Sem permissão para excluir projetos.');
    }

    this.getTenantId();

    const projectRef = doc(
      this.firestore,
      'projects',
      projectId
    );

    await deleteDoc(projectRef);
  }
}
