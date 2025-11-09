import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessControlService } from '../access-control/access-control.service';
import { AuditLogger } from '../access-control/audit-logger.service';
import { Organization } from '../models/organization.model';
import { RoleName } from '../models/role.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let accessControl: AccessControlService;
  let auditLogger: AuditLogger;
  let taskService: TaskService;

  const organizations: Organization[] = [
    { id: 'org-root', name: 'Root Org' },
    { id: 'org-child', name: 'Child Org', parentId: 'org-root' },
    { id: 'org-other', name: 'Other Org' },
  ];

  const owner: User = {
    id: 'user-owner',
    email: 'owner@example.com',
    organizationId: 'org-root',
    roles: [RoleName.Owner],
  };

  const admin: User = {
    id: 'user-admin',
    email: 'admin@example.com',
    organizationId: 'org-child',
    roles: [RoleName.Admin],
  };

  const viewer: User = {
    id: 'user-viewer',
    email: 'viewer@example.com',
    organizationId: 'org-child',
    roles: [RoleName.Viewer],
  };

  const seededTasks: Task[] = [
    {
      id: 'task-root',
      title: 'Root Task',
      organizationId: 'org-root',
      ownerId: owner.id,
    },
    {
      id: 'task-child',
      title: 'Child Task',
      organizationId: 'org-child',
      ownerId: admin.id,
    },
    {
      id: 'task-viewer',
      title: 'Viewer Task',
      organizationId: 'org-child',
      ownerId: viewer.id,
    },
    {
      id: 'task-other',
      title: 'Other Task',
      organizationId: 'org-other',
      ownerId: owner.id,
    },
  ];

  beforeEach(() => {
    auditLogger = new AuditLogger();
    jest.spyOn(auditLogger, 'log').mockImplementation(() => undefined);
    accessControl = new AccessControlService(auditLogger);
    accessControl.registerOrganizations(organizations);
    taskService = new TaskService(accessControl);
    taskService.seed(seededTasks);
  });

  it('scopes task visibility by role and organization hierarchy', () => {
    const ownerVisible = taskService.listVisibleTasks(owner).map((task) => task.id).sort();
    const adminVisible = taskService.listVisibleTasks(admin).map((task) => task.id).sort();
    const viewerVisible = taskService.listVisibleTasks(viewer).map((task) => task.id).sort();

  expect(ownerVisible).toEqual(['task-child', 'task-root', 'task-viewer']);
  expect(adminVisible).toEqual(['task-child', 'task-root', 'task-viewer']);
    expect(viewerVisible).toEqual(['task-viewer']);
  });

  it('allows admins to update tasks within their scope', () => {
    expect(() => taskService.updateTask(admin, 'task-root', { title: 'Updated Root Task' })).not.toThrow();
    expect(taskService.getTaskById('task-root')?.title).toBe('Updated Root Task');
  });

  it('prevents viewers from updating tasks they do not own', () => {
    expect(() => taskService.updateTask(viewer, 'task-child', { title: 'Disallowed Update' })).toThrow(ForbiddenException);
  });

  it('allows owners to delete tasks in descendant organizations', () => {
    expect(() => taskService.deleteTask(owner, 'task-child')).not.toThrow();
    expect(taskService.getTaskById('task-child')).toBeUndefined();
  });

  it('throws for updates on unknown tasks', () => {
    expect(() => taskService.updateTask(admin, 'unknown', { title: 'Missing' })).toThrow(NotFoundException);
  });
});
