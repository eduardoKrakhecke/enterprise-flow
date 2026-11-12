
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  serverTimestamp,
  where
} from '@angular/fire/firestore';

import { AuthService } from '../../auth/services/auth.service';

import {
  runTransaction
} from '@angular/fire/firestore';

import { TenantPermissions } from '../models/tenant-member.model';


export type InvitationRole =
  | 'admin'
  | 'manager'
  | 'employee';

export interface CreateInvitationInput {
  tenantId: string;
  email: string;
  role: InvitationRole;
  permissions: TenantPermissions;
}

@Injectable({
  providedIn: 'root'
})
export class TenantInvitationService {

  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  async getPendingInvitationForCurrentUser(): Promise<string | null> {
    const user = await this.authService.getCurrentFirebaseUser();
    const email = user?.email?.trim().toLowerCase();

    if (!email) {
      return null;
    }

    const invitationsQuery = query(
      collection(this.firestore, 'invitations'),
      where('invitedEmail', '==', email),
      where('status', '==', 'pending'),
      where(
        'expiresAt',
        '>',
        Timestamp.now()
      ),
      limit(1)
    );

    const snapshot = await getDocs(invitationsQuery);

    return snapshot.empty
      ? null
      : snapshot.docs[0].id;
  }

  async createInvitation(
    input: CreateInvitationInput
  ): Promise<string> {

    const user = await this.authService.getCurrentFirebaseUser();

    if (!user) {
      throw new Error('UNAUTHENTICATED');
    }

    const invitationRef = doc(
      collection(this.firestore, 'invitations')
    );

    const expiresAt = Timestamp.fromMillis(
      Date.now() + 48 * 60 * 60 * 1000
    );

    await setDoc(invitationRef, {
      tenantId: input.tenantId,
      invitedEmail: input.email.trim().toLowerCase(),
      role: input.role,
      permissions: input.permissions,
      status: 'pending',
      invitedBy: user.uid,
      createdAt: serverTimestamp(),
      expiresAt
    });

    return invitationRef.id;
  }


  async acceptInvitation(code: string): Promise<string> {

    const user = await this.authService.getCurrentFirebaseUser();

    if (!user) {
      throw new Error('UNAUTHENTICATED');
    }

    const invitationId = code.trim();

    if (!invitationId || invitationId.includes('/')) {
      throw new Error('INVALID_INVITATION');
    }

    const invitationRef = doc(
      this.firestore,
      'invitations',
      invitationId
    );

    return runTransaction(this.firestore, async transaction => {

      const invitationSnapshot = await transaction.get(
        invitationRef
      );

      if (!invitationSnapshot.exists()) {
        throw new Error('INVITATION_NOT_FOUND');
      }

      const invitation = invitationSnapshot.data();

      const invitedEmail = invitation['invitedEmail'] as string;

      if (!invitedEmail || invitedEmail !== user.email?.toLowerCase()) {
        throw new Error('INVITATION_EMAIL_MISMATCH');
      }

      if (invitation['status'] !== 'pending') {
        throw new Error('INVITATION_USED');
      }

      const expiresAt = invitation['expiresAt'] as Timestamp;

      if (expiresAt.toMillis() <= Date.now()) {
        throw new Error('INVITATION_EXPIRED');
      }

      const tenantId = invitation['tenantId'] as string;

      const memberRef = doc(
        this.firestore,
        'tenantMembers',
        `${tenantId}_${user.uid}`
      );

      const memberSnapshot = await transaction.get(memberRef);

      if (memberSnapshot.exists()) {
        throw new Error('ALREADY_MEMBER');
      }

      transaction.set(memberRef, {
        tenantId,
        userId: user.uid,
        email: user.email ?? invitedEmail,
        role: invitation['role'],
        permissions: invitation['permissions'],
        active: true,
        invitationId,
        createdAt: serverTimestamp()
      });

      transaction.update(invitationRef, {
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedAt: serverTimestamp()
      });

      return tenantId;
    });
  }

}
