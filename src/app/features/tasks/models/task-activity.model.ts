import { Timestamp } from '@angular/fire/firestore';

export type TaskActivityType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'comment';

export interface TaskActivity {
  id: string;
  tenantId: string;
  taskId: string;
  projectId: string;
  type: TaskActivityType;
  userId: string;
  message: string;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: Timestamp;
}
