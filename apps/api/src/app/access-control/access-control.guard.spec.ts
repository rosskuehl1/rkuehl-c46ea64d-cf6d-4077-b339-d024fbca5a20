import { BadRequestException, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AccessControlGuard } from './access-control.guard';
import { ACCESS_REQUIREMENT_KEY, AccessRequirement } from './access-control.decorator';
import { AccessControlService } from './access-control.service';
import { TaskService } from '../tasks/task.service';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { Permission } from '../models/permission.model';

describe('AccessControlGuard', () => {
  let guard: AccessControlGuard;
  let accessControl: jest.Mocked<Pick<AccessControlService, 'ensurePermission' | 'ensureTaskAction' | 'ensureCanCreateTask'>>;
  let taskService: jest.Mocked<Pick<TaskService, 'getTaskById'>>;

  const task: Task = {
    id: 'task-1',
    title: 'Example Task',
    organizationId: 'org-1',
    ownerId: 'user-1',
  };

  const user: User = {
    id: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-1',
    roles: [],
  };

  beforeEach(async () => {
    accessControl = {
      ensurePermission: jest.fn(),
      ensureTaskAction: jest.fn(),
      ensureCanCreateTask: jest.fn(),
    };

    taskService = {
      getTaskById: jest.fn().mockReturnValue(task),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessControlGuard,
        Reflector,
        { provide: AccessControlService, useValue: accessControl },
        { provide: TaskService, useValue: taskService },
      ],
    }).compile();

  guard = moduleRef.get(AccessControlGuard);
  });

  it('invokes task access checks based on metadata', async () => {
    const context = createContext({
      user,
      params: { taskId: task.id },
    });

    setRequirement({
      type: 'taskAction',
      action: 'read',
      taskIdParam: 'taskId',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(taskService.getTaskById).toHaveBeenCalledWith(task.id);
    expect(accessControl.ensureTaskAction).toHaveBeenCalledWith(user, task, 'read');
  });

  it('validates presence of task identifiers', async () => {
    const context = createContext({ user, params: {} });
  setRequirement({ type: 'taskAction', action: 'read', taskIdParam: 'taskId' });

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('enforces permission-only requirements', async () => {
  const context = createContext({ user });
  setRequirement({ type: 'permission', permission: Permission.TaskRead });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  expect(accessControl.ensurePermission).toHaveBeenCalledWith(user, Permission.TaskRead);
  });

  it('enforces task creation requirements', async () => {
    const context = createContext({ user, body: { organizationId: 'org-1' } });
  setRequirement({ type: 'taskCreate', organizationField: 'organizationId', location: 'body' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(accessControl.ensureCanCreateTask).toHaveBeenCalledWith(user, 'org-1');
  });

  it('throws when user context is missing', async () => {
  const context = createContext({});
  setRequirement({ type: 'permission', permission: Permission.TaskRead });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  function createContext(request: Record<string, unknown>): ExecutionContext {
    const httpArgumentsHost = {
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    };

    return {
      switchToHttp: () => httpArgumentsHost,
      getHandler: () => handler,
      getClass: () => clazz,
    } as unknown as ExecutionContext;
  }

  function setRequirement(requirement: AccessRequirement): void {
    Reflect.deleteMetadata(ACCESS_REQUIREMENT_KEY, handler);
    Reflect.defineMetadata(ACCESS_REQUIREMENT_KEY, requirement, handler);
  }

  const handler = () => undefined;
  class clazz {}
});
