
import { Timestamp } from '@angular/fire/firestore';

export type ProjectStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ProjectPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  clientName: string;
  responsibleUserId: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  clientName: string;
  responsibleUserId: string | null;
  priority: ProjectPriority;
  startDate: Date | null;
  dueDate: Date | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  clientName?: string;
  responsibleUserId?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
}
