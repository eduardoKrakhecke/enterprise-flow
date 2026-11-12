

import { Injectable, inject } from '@angular/core';

import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from '@angular/fire/firestore';

import {
  TenantMember,
  TenantPermissions,
  TenantRole
} from '../models/tenant-member.model';

import { AuthService } from '../../auth/services/auth.service';

export interface AddTenantMemberInput {
  tenantId: string;
  name: string;
  email: string;
  role: Exclude<TenantRole, 'owner'>;
  permissions: TenantPermissions;
}

export interface UpdateTenantMemberInput {
  memberId: string;
  name: string;
  email: string;
  role: Exclude<TenantRole, 'owner'>;
  permissions: TenantPermissions;
  pendingRegistrationId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantMemberService {

  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  async addMemberByEmail(
    input: AddTenantMemberInput
  ): Promise<'added' | 'pending'> {
    const usersSnapshot = await getDocs(
      query(
        collection(this.firestore, 'users'),
        where('email', '==', input.email.trim().toLowerCase()),
        limit(1)
      )
    );

    if (usersSnapshot.empty) {
      const user = await this.authService.getCurrentFirebaseUser();

      if (!user) {
        throw new Error('UNAUTHENTICATED');
      }

      const pendingRef = doc(
        collection(this.firestore, 'pendingTenantMembers')
      );

      await setDoc(pendingRef, {
        tenantId: input.tenantId,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        permissions: input.permissions,
        status: 'pending',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      return 'pending';
    }

    const userDocument = usersSnapshot.docs[0];
    const userData = userDocument.data();
    const memberRef = doc(
      this.firestore,
      'tenantMembers',
      `${input.tenantId}_${userDocument.id}`
    );

    await setDoc(memberRef, {
      tenantId: input.tenantId,
      userId: userDocument.id,
      name: userData['name'] ?? input.name.trim(),
      email: userData['email'],
      role: input.role,
      permissions: input.permissions,
      active: true,
      createdAt: serverTimestamp()
    });

    return 'added';
  }

  async activatePendingMemberships(): Promise<boolean> {
    const user = await this.authService.getCurrentFirebaseUser();
    const email = user?.email?.trim().toLowerCase();

    if (!user || !email) {
      return false;
    }

    let activated = false;

    const pendingSnapshot = await getDocs(
      query(
        collection(this.firestore, 'pendingTenantMembers'),
        where('email', '==', email),
        where('status', '==', 'pending')
      )
    );

    for (const pendingDocument of pendingSnapshot.docs) {
      const pending = pendingDocument.data();
      const tenantId = pending['tenantId'] as string;
      const memberRef = doc(
        this.firestore,
        'tenantMembers',
        `${tenantId}_${user.uid}`
      );

      await setDoc(memberRef, {
        tenantId,
        userId: user.uid,
        name: pending['name'],
        email,
        role: pending['role'],
        permissions: pending['permissions'],
        active: true,
        pendingRegistrationId: pendingDocument.id,
        createdAt: serverTimestamp()
      });

      await updateDoc(pendingDocument.ref, {
        status: 'accepted',
        userId: user.uid,
        acceptedAt: serverTimestamp()
      });

      activated = true;
    }

    return activated;
  }

  async updateMember(input: UpdateTenantMemberInput): Promise<void> {
    if (input.pendingRegistrationId) {
      await updateDoc(
        doc(
          this.firestore,
          'pendingTenantMembers',
          input.pendingRegistrationId
        ),
        {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          role: input.role,
          permissions: input.permissions
        }
      );

      return;
    }

    await updateDoc(
      doc(this.firestore, 'tenantMembers', input.memberId),
      {
        name: input.name.trim(),
        role: input.role,
        permissions: input.permissions,
        active: true
      }
    );
  }

  async deleteMember(member: TenantMember): Promise<void> {
    const isPendingMember = !member.userId &&
      !!member.pendingRegistrationId;

    if (isPendingMember) {
      await deleteDoc(
        doc(
          this.firestore,
          'pendingTenantMembers',
          member.pendingRegistrationId as string
        )
      );

      return;
    }

    await deleteDoc(
      doc(this.firestore, 'tenantMembers', member.id)
    );
  }

  async getMembers(tenantId: string): Promise<TenantMember[]> {

    if (!tenantId) {
      return [];
    }

    const membersRef = collection(
      this.firestore,
      'tenantMembers'
    );

    const membersQuery = query(
      membersRef,
      where('tenantId', '==', tenantId)
    );

    const [snapshot, pendingSnapshot] = await Promise.all([
      getDocs(membersQuery),
      getDocs(query(
        collection(this.firestore, 'pendingTenantMembers'),
        where('tenantId', '==', tenantId),
        where('status', '==', 'pending')
      ))
    ]);
    const currentUser = await this.authService.getCurrentFirebaseUser();

    const members = snapshot.docs.map(document => ({
      ...document.data(),
      id: document.id,
      name: document.data()['name'] ??
        (document.data()['userId'] === currentUser?.uid
          ? currentUser?.displayName
          : undefined)
    } as TenantMember));

    const pendingMembers = pendingSnapshot.docs.map(document => ({
      ...document.data(),
      id: `pending_${document.id}`,
      userId: '',
      active: false,
      pendingRegistrationId: document.id
    } as TenantMember));

    return [...members, ...pendingMembers];
  }

  watchPendingMembers(
    tenantId: string,
    onChange: (members: TenantMember[]) => void,
    onError: (error: unknown) => void
  ): () => void {
    const pendingQuery = query(
      collection(this.firestore, 'pendingTenantMembers'),
      where('tenantId', '==', tenantId),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      pendingQuery,
      async () => {
        try {
          onChange(await this.getMembers(tenantId));
        } catch (error) {
          onError(error);
        }
      },
      onError
    );
  }
}
