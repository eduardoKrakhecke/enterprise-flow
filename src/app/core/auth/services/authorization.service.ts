
import { computed, Injectable, signal } from '@angular/core';

export type TenantRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'employee';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete';

export interface TenantPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface AuthorizationContext {
  tenantId: string;
  role: TenantRole;
  permissions: TenantPermissions;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  private readonly contextState =
    signal<AuthorizationContext | null>(null);

  readonly context = this.contextState.asReadonly();

  readonly isAdmin = computed(() => {
    const context = this.contextState();

    return context?.active === true &&
      (
        context.role === 'owner' ||
        context.role === 'admin'
      );
  });

  readonly canView = computed(() => this.can('view'));
  readonly canCreate = computed(() => this.can('create'));
  readonly canUpdate = computed(() => this.can('update'));
  readonly canDelete = computed(() => this.can('delete'));

  setContext(context: AuthorizationContext): void {
    this.contextState.set(context);
  }

  clearContext(): void {
    this.contextState.set(null);
  }

  can(action: PermissionAction): boolean {
    const context = this.contextState();

    if (!context || !context.active) {
      return false;
    }

    if (
      context.role === 'owner' ||
      context.role === 'admin'
    ) {
      return true;
    }

    return context.permissions[action];
  }

  canManageMembers(): boolean {
    return this.isAdmin();
  }
}
