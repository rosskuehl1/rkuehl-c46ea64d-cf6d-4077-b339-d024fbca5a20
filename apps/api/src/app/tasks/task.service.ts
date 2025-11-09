import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessControlService } from '../access-control/access-control.service';
import { Task, TaskCollection } from '../models/task.model';
import { User } from '../models/user.model';

@Injectable()
export class TaskService {
  private readonly tasks = new Map<string, Task>();

  constructor(private readonly accessControl: AccessControlService) {}

  seed(tasks: TaskCollection): void {
    this.tasks.clear();
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
  }

  getTaskById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  listVisibleTasks(user: User): ReadonlyArray<Task> {
    return [...this.tasks.values()].filter((task) => this.accessControl.canReadTask(user, task));
  }

  createTask(
    user: User,
    input: { readonly id: string; readonly title: string; readonly description?: string; readonly organizationId: string; readonly ownerId?: string }
  ): Task {
    this.accessControl.ensureCanCreateTask(user, input.organizationId);

    const task: Task = {
      id: input.id,
      title: input.title,
      description: input.description,
      organizationId: input.organizationId,
      ownerId: input.ownerId ?? user.id,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(
    user: User,
    taskId: string,
    updates: { readonly title?: string; readonly description?: string }
  ): Task {
    const existing = this.tasks.get(taskId);
    if (!existing) {
      throw new NotFoundException(`Task "${taskId}" not found.`);
    }

    this.accessControl.ensureTaskAction(user, existing, 'update');

    const updated: Task = {
      ...existing,
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
    };

    this.tasks.set(updated.id, updated);
    return updated;
  }

  deleteTask(user: User, taskId: string): void {
    const existing = this.tasks.get(taskId);
    if (!existing) {
      throw new NotFoundException(`Task "${taskId}" not found.`);
    }

    this.accessControl.ensureTaskAction(user, existing, 'delete');

    this.tasks.delete(taskId);
  }
}
