
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ClientService } from '../../services/client.service';

import {
  Client,
  ClientType,
  ClientStatus,
  CreateClientInput
} from '../../models/client.model';

import {
  TenantContextService
} from '../../../../core/tenant/services/tenant-context.service';

import { CepService } from
    '../../../../shared/services/cep.service';

import {
  documentValidator,
  onlyDigits
} from '../../../../shared/validators/document.validator';
import {ClientDetails} from "../../components/client-details/client-details";

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClientDetails],
  templateUrl: './clients-page.html',
  styleUrl: './clients-page.scss'
})
export class ClientsPage implements OnInit {

  private readonly clientService = inject(ClientService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly fb = inject(FormBuilder);
  private readonly cepService = inject(CepService);

  readonly selectedClient = signal<Client | null>(null);


  readonly canView = computed(() =>
    this.tenantContext.hasPermission('view')
  );

  readonly canCreate = computed(() =>
    this.tenantContext.hasPermission('create')
  );

  readonly canUpdate = computed(() =>
    this.tenantContext.hasPermission('update')
  );

  readonly canDelete = computed(() =>
    this.tenantContext.hasPermission('delete')
  );

  readonly clients = signal<Client[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly searchTerm = signal('');
  readonly statusFilter = signal('all');
  readonly typeFilter = signal('all');

  readonly showForm = signal(false);
  readonly editingClientId = signal<string | null>(null);
  readonly deletingClientId = signal<string | null>(null);

  readonly searchingCep = signal(false);
  readonly cepError = signal('');

  readonly clientForm = this.fb.nonNullable.group({
    type: ['company' as ClientType, Validators.required],
    name: ['', Validators.required],
    document: ['', documentValidator('company')],
    email: ['', Validators.email],
    phone: [''],
    status: ['active' as ClientStatus],
    notes: [''],
    zipCode: [''],
    street: [''],
    number: [''],
    complement: [''],
    neighborhood: [''],
    city: [''],
    state: ['']
  });

  readonly filteredClients = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();

    return this.clients().filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(search) ||
        client.document.includes(search) ||
        client.email.toLowerCase().includes(search);

      return matchesSearch &&
        (this.statusFilter() === 'all' ||
          client.status === this.statusFilter()) &&
        (this.typeFilter() === 'all' ||
          client.type === this.typeFilter());
    });
  });

  readonly totalClients = computed(() => this.clients().length);

  readonly activeClients = computed(() =>
    this.clients().filter(c => c.status === 'active').length
  );

  readonly inactiveClients = computed(() =>
    this.clients().filter(c => c.status === 'inactive').length
  );

  async ngOnInit(): Promise<void> {
    await this.loadClients();
  }

  async loadClients(): Promise<void> {
    if (!this.canView()) {
      this.clients.set([]);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const clients = await this.clientService.getClients();
      this.clients.set(clients);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Não foi possível carregar os clientes.');
    } finally {
      this.loading.set(false);
    }
  }

  openClientDetails(client: Client): void {
    this.selectedClient.set(client);
  }

  closeClientDetails(): void {
    this.selectedClient.set(null);
  }

  openCreateForm(): void {
    if (!this.canCreate()) return;

    this.editingClientId.set(null);
    this.clientForm.reset({
      type: 'company',
      name: '',
      document: '',
      email: '',
      phone: '',
      status: 'active',
      notes: '',
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    });

    this.showForm.set(true);
  }

  openEditForm(client: Client): void {
    if (!this.canUpdate()) return;

    this.editingClientId.set(client.id);

    this.clientForm.setValue({
      type: client.type,
      name: client.name,
      document: client.document,
      email: client.email,
      phone: client.phone,
      status: client.status,
      notes: client.notes,
      zipCode: client.address.zipCode,
      street: client.address.street,
      number: client.address.number,
      complement: client.address.complement,
      neighborhood: client.address.neighborhood,
      city: client.address.city,
      state: client.address.state
    });

    const documentControl = this.clientForm.controls.document;

    documentControl.setValidators(
      documentValidator(client.type)
    );

    documentControl.updateValueAndValidity();

    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;

    this.showForm.set(false);
    this.editingClientId.set(null);
  }

  async saveClient(): Promise<void> {
    if (this.clientForm.invalid || this.saving()) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const editingId = this.editingClientId();

    if (editingId ? !this.canUpdate() : !this.canCreate()) {
      return;
    }

    const value = this.clientForm.getRawValue();

    const input: CreateClientInput = {
      type: value.type,
      name: value.name.trim(),
      document: value.document.replace(/\D/g, ''),
      email: value.email.trim(),
      phone: value.phone.trim(),
      notes: value.notes.trim(),
      address: {
        zipCode: value.zipCode.trim(),
        street: value.street.trim(),
        number: value.number.trim(),
        complement: value.complement.trim(),
        neighborhood: value.neighborhood.trim(),
        city: value.city.trim(),
        state: value.state.trim()
      }
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      if (editingId) {
        await this.clientService.updateClient(editingId, {
          ...input,
          status: value.status
        });
      } else {
        await this.clientService.createClient(input);
      }

      this.showForm.set(false);
      this.editingClientId.set(null);

      this.successMessage.set(
        editingId
          ? 'Cliente atualizado com sucesso.'
          : 'Cliente cadastrado com sucesso.'
      );

      await this.loadClients();

    } catch (error) {
      console.error(error);
      this.errorMessage.set('Não foi possível salvar o cliente.');
    } finally {
      this.saving.set(false);
    }
  }

  requestDelete(client: Client): void {
    if (!this.canDelete()) return;
    this.deletingClientId.set(client.id);
  }

  cancelDelete(): void {
    this.deletingClientId.set(null);
  }

  async confirmDelete(): Promise<void> {
    const id = this.deletingClientId();

    if (!id || !this.canDelete() || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      await this.clientService.deleteClient(id);
      this.deletingClientId.set(null);
      this.successMessage.set('Cliente excluído com sucesso.');
      await this.loadClients();
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Não foi possível excluir o cliente.');
    } finally {
      this.saving.set(false);
    }
  }

  typeLabel(type: ClientType): string {
    return type === 'company'
      ? 'Pessoa jurídica'
      : 'Pessoa física';
  }


  onDocumentTypeChange(): void {
    const type = this.clientForm.controls.type.value;
    const documentControl = this.clientForm.controls.document;

    documentControl.setValidators(documentValidator(type));
    documentControl.updateValueAndValidity();

    // Limpa o documento ao alternar entre CPF e CNPJ.
    documentControl.setValue('');
  }

  formatDocument(): void {
    const type = this.clientForm.controls.type.value;
    const control = this.clientForm.controls.document;

    const digits = onlyDigits(control.value);

    let formatted = '';

    if (type === 'individual') {
      const value = digits.slice(0, 11);

      formatted = value
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
    } else {
      const value = digits.slice(0, 14);

      formatted = value
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }

    control.setValue(formatted, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  formatPhone(): void {
    const control = this.clientForm.controls.phone;
    const digits = onlyDigits(control.value).slice(0, 11);

    let formatted = digits;

    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length > 6) {
      const split = digits.length === 11 ? 7 : 6;

      formatted =
        `(${digits.slice(0, 2)}) ` +
        `${digits.slice(2, split)}-${digits.slice(split)}`;
    }

    control.setValue(formatted, { emitEvent: false });
  }

  formatCep(): void {
    const control = this.clientForm.controls.zipCode;
    const digits = onlyDigits(control.value).slice(0, 8);

    const formatted = digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;

    control.setValue(formatted, { emitEvent: false });
  }

  async searchCep(): Promise<void> {
    const cep = this.clientForm.controls.zipCode.value;

    this.cepError.set('');

    if (onlyDigits(cep).length !== 8) {
      this.cepError.set('Informe um CEP com 8 dígitos.');
      return;
    }

    this.searchingCep.set(true);

    try {
      const address = await this.cepService.search(cep);

      if (!address) {
        this.cepError.set('CEP não encontrado.');
        return;
      }

      this.clientForm.patchValue({
        zipCode: address.cep,
        street: address.logradouro,
        neighborhood: address.bairro,
        city: address.localidade,
        state: address.uf
      });

    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      this.cepError.set('Não foi possível consultar o CEP.');
    } finally {
      this.searchingCep.set(false);
    }
  }

}
