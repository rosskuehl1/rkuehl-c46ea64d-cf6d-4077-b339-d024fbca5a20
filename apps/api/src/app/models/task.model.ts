export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly organizationId: string;
  readonly ownerId: string;
}

export type TaskCollection = ReadonlyArray<Task>;
