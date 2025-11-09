import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../models/user.model';
import { ACCESS_REQUIREMENT_KEY, AccessRequirement } from './access-control.decorator';
import { AccessControlService, TaskAction } from './access-control.service';
import { TaskService } from '../tasks/task.service';

interface RequestWithUser {
  readonly user?: User;
  readonly params?: Record<string, string>;
  readonly body?: Record<string, unknown>;
}

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
    private readonly taskService: TaskService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(ACCESS_REQUIREMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authenticated user.');
    }

    switch (requirement.type) {
      case 'permission':
        this.accessControl.ensurePermission(user, requirement.permission);
        return true;
      case 'taskAction':
        await this.guardTaskAction(user, requirement.action, requirement.taskIdParam, request);
        return true;
      case 'taskCreate':
        this.guardTaskCreation(user, requirement.organizationField, requirement.location, request);
        return true;
      default:
        return true;
    }
  }

  private async guardTaskAction(
    user: User,
    action: TaskAction,
    taskIdParam: string | undefined,
    request: RequestWithUser
  ): Promise<void> {
    const key = taskIdParam ?? 'taskId';
    const taskId = request.params?.[key];
    if (!taskId) {
      throw new BadRequestException(`Task identifier "${key}" is required for access enforcement.`);
    }

    const task = this.taskService.getTaskById(taskId);
    if (!task) {
      throw new NotFoundException(`Task "${taskId}" not found.`);
    }

    this.accessControl.ensureTaskAction(user, task, action);
  }

  private guardTaskCreation(
    user: User,
    organizationField: string | undefined,
    location: 'body' | 'params' | undefined,
    request: RequestWithUser
  ): void {
    const container = (location ?? 'body') === 'body' ? request.body : request.params;
    const key = organizationField ?? 'organizationId';
    const organizationId = typeof container?.[key] === 'string' ? (container?.[key] as string) : undefined;

    if (!organizationId) {
      throw new BadRequestException(`Organization identifier "${key}" is required for task creation.`);
    }

    this.accessControl.ensureCanCreateTask(user, organizationId);
  }
}
