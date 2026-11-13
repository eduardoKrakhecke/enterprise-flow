
import { Timestamp } from '@angular/fire/firestore';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface Task {
  id: string;
  tenantId: string;
  projectId: string;

  title: string;
  description: string;

  assignedTo: string | null;

  status: TaskStatus;
  priority: TaskPriority;

  dueDate: Timestamp | null;
  completedAt: Timestamp | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  assignedTo: string | null;
  priority: TaskPriority;
  dueDate: Date | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignedTo?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
}
