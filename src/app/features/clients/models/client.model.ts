
import { Timestamp } from '@angular/fire/firestore';

export type ClientType = 'individual' | 'company';

export type ClientStatus = 'active' | 'inactive';

export interface ClientAddress {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Client {
  id: string;
  tenantId: string;

  type: ClientType;
  name: string;
  document: string;

  email: string;
  phone: string;

  address: ClientAddress;

  status: ClientStatus;

  notes: string;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateClientInput {
  type: ClientType;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: ClientAddress;
  notes: string;
}

export interface UpdateClientInput
  extends Partial<CreateClientInput> {
  status?: ClientStatus;
}
