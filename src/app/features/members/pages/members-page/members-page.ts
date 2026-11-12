import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  TenantMember,
  TenantPermissions,
  TenantRole
} from '../../../../core/tenant/models/tenant-member.model';

import {
  TenantContextService
} from '../../../../core/tenant/services/tenant-context.service';

import {
  TenantMemberService
} from '../../../../core/tenant/services/tenant-member.service';

import {
  TenantService
} from '../../../../core/tenant/services/tenant.service';

type MemberRole = TenantMember['role'];
type PermissionKey = keyof TenantPermissions;

@Component({
  selector: 'app-members-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './members-page.html',
  styleUrl: './members-page.scss'
})
export class MembersPage implements OnInit, OnDestroy {
  private readonly memberService = inject(TenantMemberService);
  private readonly tenantService = inject(TenantService);
  private readonly tenantContext = inject(TenantContextService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly members = signal<TenantMember[]>([]);
  readonly searchTerm = signal('');
  readonly roleFilter = signal('all');
  readonly currentRole = signal<MemberRole | null>(null);

  readonly showMemberForm = signal(false);
  readonly memberFormLoading = signal(false);
  readonly editingMember = signal<TenantMember | null>(null);
  readonly memberName = signal('');
  readonly memberEmail = signal('');
  readonly memberRole = signal<Exclude<TenantRole, 'owner'>>('employee');
  readonly memberPermissions = signal<TenantPermissions>({
    view: true,
    create: false,
    update: false,
    delete: false
  });
  readonly memberFormError = signal('');

  private stopMembersWatch: (() => void) | null = null;

  readonly canManage = computed(() =>
    this.currentRole() === 'owner' ||
    this.currentRole() === 'admin'
  );

  readonly filteredMembers = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();

    return this.members().filter(member => {
      const matchesSearch =
        (member.name ?? member.email ?? member.userId)
          .toLowerCase()
          .includes(search);
      const matchesRole = role === 'all' || member.role === role;

      return matchesSearch && matchesRole;
    });
  });

  readonly activeCount = computed(() =>
    this.members().filter(member => member.active).length
  );

  readonly adminCount = computed(() =>
    this.members().filter(member =>
      member.active &&
      (member.role === 'owner' || member.role === 'admin')
    ).length
  );

  openMemberForm(member?: TenantMember): void {
    this.memberFormError.set('');
    this.editingMember.set(member ?? null);

    if (member) {
      this.memberName.set(member.name ?? '');
      this.memberEmail.set(member.email ?? '');
      this.memberRole.set(
        member.role === 'owner' ? 'employee' : member.role
      );
      this.memberPermissions.set(member.permissions ?? {
        view: true,
        create: false,
        update: false,
        delete: false
      });
    } else {
      this.memberName.set('');
      this.memberEmail.set('');
      this.memberRole.set('employee');
      this.memberPermissions.set({
        view: true,
        create: false,
        update: false,
        delete: false
      });
    }

    this.showMemberForm.set(true);
  }

  closeMemberForm(): void {
    this.showMemberForm.set(false);
    this.editingMember.set(null);
  }

  updateMemberEmail(email: string): void {
    this.memberEmail.set(email);
  }

  updateMemberName(name: string): void {
    this.memberName.set(name);
  }

  updateMemberPermission(
    permission: PermissionKey,
    enabled: boolean
  ): void {
    this.memberPermissions.update(current => ({
      ...current,
      [permission]: enabled
    }));
  }

  async addMember(): Promise<void> {
    const tenantId = this.tenantContext.activeTenantId();
    const email = this.memberEmail().trim().toLowerCase();

    if (!tenantId || !this.canManage()) {
      return;
    }

    if (this.memberName().trim().length < 2) {
      this.memberFormError.set('Informe o nome do usuÃ¡rio.');
      return;
    }

    if (!email || !email.includes('@')) {
      this.memberFormError.set('Informe um e-mail válido.');
      return;
    }

    this.memberFormLoading.set(true);
    this.memberFormError.set('');
    this.successMessage.set('');

    try {
      const editingMember = this.editingMember();

      if (editingMember) {
        await this.memberService.updateMember({
          memberId: editingMember.id,
          pendingRegistrationId: editingMember.userId
            ? undefined
            : editingMember.pendingRegistrationId,
          name: this.memberName(),
          email,
          role: this.memberRole(),
          permissions: this.memberPermissions()
        });

        this.closeMemberForm();
        this.successMessage.set('Usuário atualizado com sucesso.');
        await this.loadMembers();
        return;
      }

      const result = await this.memberService.addMemberByEmail({
        tenantId,
        name: this.memberName(),
        email,
        role: this.memberRole(),
        permissions: this.memberPermissions()
      });

      this.closeMemberForm();
      this.successMessage.set(result === 'pending'
        ? 'Pré-cadastro realizado. O usuário será associado ao criar a conta.'
        : 'Usuário associado à organização com sucesso.');
      await this.loadMembers();
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      this.memberFormError.set(this.getMemberErrorMessage(error));
    } finally {
      this.memberFormLoading.set(false);
    }
  }

  canModifyMember(member: TenantMember): boolean {
    const currentUserId = this.tenantContext.activeMember()?.userId;

    return this.canManage() &&
      member.role !== 'owner' &&
      member.userId !== currentUserId;
  }

  async deleteMember(member: TenantMember): Promise<void> {
    if (!this.canModifyMember(member)) {
      return;
    }

    const name = member.name ?? member.email ?? 'este usuário';

    if (!window.confirm(`Deseja excluir ${name} da organização?`)) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.memberService.deleteMember(member);
      this.successMessage.set('Usuário excluído da organização.');
      await this.loadMembers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      this.errorMessage.set(
        'Não foi possível excluir o usuário. Verifique suas permissões.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadMembers();
    this.startMembersWatch();
  }

  ngOnDestroy(): void {
    this.stopMembersWatch?.();
  }

  isPendingMember(member: TenantMember): boolean {
    return !member.userId && !!member.pendingRegistrationId;
  }

  private startMembersWatch(): void {
    const tenantId = this.tenantContext.activeTenantId();

    if (!tenantId || !this.canManage()) {
      return;
    }

    this.stopMembersWatch = this.memberService.watchPendingMembers(
      tenantId,
      members => this.members.set(members),
      error => console.error(
        'Erro ao atualizar membros em tempo real:',
        error
      )
    );
  }

  async loadMembers(): Promise<void> {
    this.errorMessage.set('');
    this.loading.set(true);

    try {
      const tenantId = this.tenantContext.activeTenantId();

      if (!tenantId) {
        throw new Error('Nenhuma organização selecionada.');
      }

      const organizations = await this.tenantService.getMyTenants();
      const organization = organizations.find(
        item => item.tenant.id === tenantId
      );

      if (!organization) {
        throw new Error('Você não possui acesso à organização.');
      }

      this.currentRole.set(organization.member.role);

      if (!['owner', 'admin'].includes(organization.member.role)) {
        this.members.set([]);
        return;
      }

      this.members.set(await this.memberService.getMembers(tenantId));
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      this.errorMessage.set(
        'Não foi possível carregar os membros da organização.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  updateRole(value: string): void {
    this.roleFilter.set(value);
  }

  roleLabel(role: MemberRole): string {
    const labels: Record<MemberRole, string> = {
      owner: 'Proprietário',
      admin: 'Administrador',
      manager: 'Gerente',
      employee: 'Funcionário'
    };

    return labels[role];
  }

  private getMemberErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code;

    const messages: Record<string, string> = {
      'functions/not-found':
        'Não existe um usuário cadastrado com este e-mail.',
      USER_NOT_FOUND:
        'Não existe um usuário cadastrado com este e-mail.',
      'functions/already-exists':
        'Este usuário já pertence à organização.',
      'functions/permission-denied':
        'Somente proprietários e administradores podem cadastrar usuários.',
      'permission-denied':
        'Somente proprietários e administradores podem cadastrar usuários.',
      'functions/invalid-argument':
        'Verifique o e-mail, perfil e permissões informados.'
    };

    return messages[code ?? ''] ??
      'Não foi possível cadastrar o usuário. Tente novamente.';
  }
}
