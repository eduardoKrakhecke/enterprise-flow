
import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where
} from '@angular/fire/firestore';

import { AuthService } from '../../auth/services/auth.service';

import { Tenant } from '../models/tenant.model';
import { TenantMember } from '../models/tenant-member.model';

export interface CreateTenantInput {
  name: string;
  document: string;
}

export interface CreateTenantResult {
  tenantId: string;
  name: string;
  role: 'owner';
}

export interface UserTenant {
  tenant: Tenant;
  member: TenantMember;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {

  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  async createTenant(
    input: CreateTenantInput
  ): Promise<CreateTenantResult> {

    const user = await this.authService.getCurrentFirebaseUser();

    if (!user) {
      throw new Error('UNAUTHENTICATED');
    }

    const name = input.name.trim();
    const document = input.document.replace(/\D/g, '');

    if (name.length < 3 || name.length > 100) {
      throw new Error('INVALID_TENANT_NAME');
    }

    if (!/^\d{14}$/.test(document)) {
      throw new Error('INVALID_TENANT_DOCUMENT');
    }

    // Gera um ID exclusivo para a organização.
    const tenantCollection = collection(
      this.firestore,
      'tenants'
    );

    const tenantRef = doc(tenantCollection);
    const tenantId = tenantRef.id;

    // Associação do proprietário à organização.
    const memberId = `${tenantId}_${user.uid}`;

    const memberRef = doc(
      this.firestore,
      'tenantMembers',
      memberId
    );

    // Documento utilizado para impedir CNPJs duplicados.
    const documentRef = doc(
      this.firestore,
      'tenantDocuments',
      document
    );

    const slug = this.generateSlug(name);

    await runTransaction(
      this.firestore,
      async transaction => {

        const createdAt = Timestamp.now();

        transaction.set(tenantRef, {
          name,
          document,
          slug,
          ownerId: user.uid,
          status: 'active',
          createdAt
        });

        transaction.set(memberRef, {
          tenantId,
          userId: user.uid,
          role: 'owner',
          active: true,
          createdAt
        });

        transaction.set(documentRef, {
          tenantId,
          ownerId: user.uid,
          createdAt
        });

      }
    );

    return {
      tenantId,
      name,
      role: 'owner'
    };
  }

  async getMyTenants(): Promise<UserTenant[]> {

    const user = await this.authService.getCurrentFirebaseUser();

    if (!user) {
      return [];
    }

    const membersRef = collection(
      this.firestore,
      'tenantMembers'
    );

    const membersQuery = query(
      membersRef,
      where('userId', '==', user.uid),
      where('active', '==', true)
    );

    const membersSnapshot = await getDocs(membersQuery);

    const results = await Promise.all(
      membersSnapshot.docs.map(async memberDocument => {

        const member = {
          id: memberDocument.id,
          ...memberDocument.data()
        } as TenantMember;

        const tenantRef = doc(
          this.firestore,
          'tenants',
          member.tenantId
        );

        const tenantSnapshot = await getDoc(tenantRef);

        if (!tenantSnapshot.exists()) {
          return null;
        }

        const tenant = {
          id: tenantSnapshot.id,
          ...tenantSnapshot.data()
        } as Tenant;

        if (tenant.status !== 'active') {
          return null;
        }

        return {
          tenant,
          member
        };

      })
    );

    return results.filter(
      (item): item is UserTenant => item !== null
    );
  }

  private generateSlug(value: string): string {

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
