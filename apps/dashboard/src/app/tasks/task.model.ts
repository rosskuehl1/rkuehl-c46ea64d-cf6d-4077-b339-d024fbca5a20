export const TASK_STATUSES = [
  'Backlog',
  'In Progress',
  'Completed',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskRecord {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: TaskStatus;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  position: number;
}

export interface TaskDraft {
  title: string;
  description?: string | null;
  category: string;
  status: TaskStatus;
  dueDate?: string | null;
}

export interface TaskDetailsUpdate {
  title?: string;
  description?: string | null;
  category?: string;
  dueDate?: string | null;
}
