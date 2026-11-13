
import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';

import { Auth } from '@angular/fire/auth';

import {
  TenantContextService
} from '../../../core/tenant/services/tenant-context.service';

import {
  Client,
  CreateClientInput,
  UpdateClientInput
} from '../models/client.model';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

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

  async getClients(): Promise<Client[]> {

    if (!this.tenantContext.hasPermission('view')) {
      throw new Error('Sem permissão para visualizar clientes.');
    }

    const tenantId = this.getTenantId();

    const clientsRef = collection(
      this.firestore,
      'clients'
    );

    const clientsQuery = query(
      clientsRef,
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(clientsQuery);

    return snapshot.docs.map(document => ({
      ...document.data(),
      id: document.id
    } as Client));
  }

  async createClient(input: CreateClientInput): Promise<string> {

    if (!this.tenantContext.hasPermission('create')) {
      throw new Error('Sem permissão para cadastrar clientes.');
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    const clientsRef = collection(
      this.firestore,
      'clients'
    );

    const now = serverTimestamp();

    const documentRef = await addDoc(clientsRef, {
      ...input,
      tenantId,
      status: 'active',
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    });

    return documentRef.id;
  }

  async updateClient(
    clientId: string,
    input: UpdateClientInput
  ): Promise<void> {

    if (!this.tenantContext.hasPermission('update')) {
      throw new Error('Sem permissão para editar clientes.');
    }

    const clientRef = doc(
      this.firestore,
      'clients',
      clientId
    );

    await updateDoc(clientRef, {
      ...input,
      updatedAt: serverTimestamp()
    });
  }

  async deleteClient(clientId: string): Promise<void> {

    if (!this.tenantContext.hasPermission('delete')) {
      throw new Error('Sem permissão para excluir clientes.');
    }

    const clientRef = doc(
      this.firestore,
      'clients',
      clientId
    );

    await deleteDoc(clientRef);
  }
}
