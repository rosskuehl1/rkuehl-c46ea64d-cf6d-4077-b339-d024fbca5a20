import { Injectable, computed, signal } from '@angular/core';
import {
  TASK_STATUSES,
  TaskDetailsUpdate,
  TaskDraft,
  TaskRecord,
  TaskStatus,
} from './task.model';

interface StatusColumn {
  status: TaskStatus;
  tasks: TaskRecord[];
}

function createIdentifier(): string {
  return `task-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly tasksState = signal<TaskRecord[]>(this.createSeedTasks());

  readonly tasks = computed(() =>
    this.tasksState().map((task) => ({ ...task }))
  );

  createTask(draft: TaskDraft): void {
    const timestamp = this.timestamp();
    const columns = this.toColumns();
    const targetColumn = columns.find((column) => column.status === draft.status);

    if (!targetColumn) {
      throw new Error(`Unknown task status: ${draft.status}`);
    }

    const task: TaskRecord = {
      id: createIdentifier(),
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      category: draft.category.trim(),
      status: draft.status,
      dueDate: draft.dueDate ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      position: targetColumn.tasks.length,
    };

    targetColumn.tasks.push(task);

    this.replaceFromColumns(columns);
  }

  updateTaskDetails(id: string, update: TaskDetailsUpdate): void {
    const columns = this.toColumns();
    const column = columns.find((entry) => entry.tasks.some((task) => task.id === id));

    if (!column) {
      return;
    }

    const timestamp = this.timestamp();
    column.tasks = column.tasks.map((task) => {
      if (task.id !== id) {
        return task;
      }

      return {
        ...task,
        title: update.title?.trim() ?? task.title,
        description:
          update.description !== undefined
            ? update.description?.trim() || null
            : task.description ?? null,
        category: update.category?.trim() ?? task.category,
        dueDate: update.dueDate ?? task.dueDate ?? null,
        updatedAt: timestamp,
      } satisfies TaskRecord;
    });

    this.replaceFromColumns(columns);
  }

  deleteTask(id: string): void {
    const columns = this.toColumns();
    const column = columns.find((entry) => entry.tasks.some((task) => task.id === id));

    if (!column) {
      return;
    }

    column.tasks = column.tasks.filter((task) => task.id !== id);
    column.tasks = this.reindex(column.tasks);

    this.replaceFromColumns(columns);
  }

  reorderWithinStatus(status: TaskStatus, fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) {
      return;
    }

    const columns = this.toColumns();
    const column = columns.find((entry) => entry.status === status);

    if (!column) {
      return;
    }

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= column.tasks.length ||
      toIndex > column.tasks.length
    ) {
      return;
    }

    const [task] = column.tasks.splice(fromIndex, 1);
    column.tasks.splice(toIndex, 0, {
      ...task,
      updatedAt: this.timestamp(),
    });

    column.tasks = this.reindex(column.tasks);

    this.replaceFromColumns(columns);
  }

  moveToStatus(taskId: string, targetStatus: TaskStatus, targetIndex?: number): void {
    const columns = this.toColumns();
    const sourceColumn = columns.find((entry) =>
      entry.tasks.some((task) => task.id === taskId)
    );

    if (!sourceColumn) {
      return;
    }

    const targetColumn = columns.find((entry) => entry.status === targetStatus);

    if (!targetColumn) {
      return;
    }

    const taskIndex = sourceColumn.tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      return;
    }

    const [task] = sourceColumn.tasks.splice(taskIndex, 1);
    sourceColumn.tasks = this.reindex(sourceColumn.tasks);

    const insertionIndex = this.coerceIndex(targetColumn.tasks, targetIndex);
    targetColumn.tasks.splice(insertionIndex, 0, {
      ...task,
      status: targetStatus,
      updatedAt: this.timestamp(),
    });
    targetColumn.tasks = this.reindex(targetColumn.tasks);

    this.replaceFromColumns(columns);
  }

  private toColumns(): StatusColumn[] {
    return TASK_STATUSES.map((status) => ({
      status,
      tasks: this.tasksState()
        .filter((task) => task.status === status)
        .sort((a, b) => a.position - b.position)
        .map((task) => ({ ...task })),
    }));
  }

  private replaceFromColumns(columns: StatusColumn[]): void {
    const nextState: TaskRecord[] = [];

    for (const column of columns) {
      for (const task of column.tasks) {
        nextState.push(task);
      }
    }

    this.tasksState.set(nextState);
  }

  private reindex(tasks: TaskRecord[]): TaskRecord[] {
    return tasks.map((task, index) => ({
      ...task,
      position: index,
    }));
  }

  private coerceIndex(tasks: TaskRecord[], index: number | undefined): number {
    if (index === undefined || Number.isNaN(index)) {
      return tasks.length;
    }

    if (index < 0) {
      return 0;
    }

    if (index > tasks.length) {
      return tasks.length;
    }

    return index;
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  private createSeedTasks(): TaskRecord[] {
    const now = this.timestamp();

    const seeds: TaskRecord[] = [
      {
        id: createIdentifier(),
        title: 'Review open sprint goals',
        description: 'Walk through deliverables for the current sprint before stand-up.',
        category: 'Work',
        status: 'Backlog',
        dueDate: null,
        createdAt: now,
        updatedAt: now,
        position: 0,
      },
      {
        id: createIdentifier(),
        title: 'Plan weekend hike',
        description: 'Pick a trail and check weather for Saturday morning.',
        category: 'Personal',
        status: 'In Progress',
        dueDate: null,
        createdAt: now,
        updatedAt: now,
        position: 0,
      },
      {
        id: createIdentifier(),
        title: 'Close quarterly report',
        description: 'Finalize metrics and send recap to leadership.',
        category: 'Work',
        status: 'Completed',
        dueDate: null,
        createdAt: now,
        updatedAt: now,
        position: 0,
      },
    ];

    return seeds;
  }
}
