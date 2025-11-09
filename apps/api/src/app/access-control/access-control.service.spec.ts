import { ForbiddenException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { AuditLogger } from './audit-logger.service';
import { Organization } from '../models/organization.model';
import { Permission } from '../models/permission.model';
import { RoleName } from '../models/role.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let auditLogger: AuditLogger;

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

  const tasks: Record<string, Task> = {
    child: {
      id: 'task-child',
      title: 'Child Task',
      organizationId: 'org-child',
      ownerId: admin.id,
    },
    root: {
      id: 'task-root',
      title: 'Root Task',
      organizationId: 'org-root',
      ownerId: owner.id,
    },
    other: {
      id: 'task-other',
      title: 'Other Task',
      organizationId: 'org-other',
      ownerId: owner.id,
    },
    viewerOwned: {
      id: 'task-viewer',
      title: 'Viewer Task',
      organizationId: 'org-child',
      ownerId: viewer.id,
    },
  };

  beforeEach(() => {
    auditLogger = new AuditLogger();
    jest.spyOn(auditLogger, 'log').mockImplementation(() => undefined);
    service = new AccessControlService(auditLogger);
    service.registerOrganizations(organizations);
  });

  it('applies role inheritance for owners', () => {
    expect(service.hasPermission(owner, Permission.TaskRead)).toBe(true);
    expect(service.hasPermission(owner, Permission.TaskUpdate)).toBe(true);
    expect(service.hasPermission(owner, Permission.TaskDelete)).toBe(true);
  });

  it('restricts task creation when permission missing', () => {
    expect(() => service.ensureCanCreateTask(viewer, 'org-child')).toThrow(ForbiddenException);
  });

  it('allows owners to update tasks across descendant organizations', () => {
    expect(() => service.ensureTaskAction(owner, tasks.child, 'update')).not.toThrow();
  });

  it('allows admins to update tasks in their scope but blocks deletions', () => {
    expect(() => service.ensureTaskAction(admin, tasks.root, 'update')).not.toThrow();
    expect(() => service.ensureTaskAction(admin, tasks.child, 'delete')).toThrow(ForbiddenException);
  });

  it('blocks viewers from reading tasks they do not own', () => {
    expect(service.canReadTask(viewer, tasks.child)).toBe(false);
    expect(() => service.ensureTaskAction(viewer, tasks.child, 'read')).toThrow(ForbiddenException);
  });

  it('permits viewers to read their own tasks', () => {
    expect(service.canReadTask(viewer, tasks.viewerOwned)).toBe(true);
    expect(() => service.ensureTaskAction(viewer, tasks.viewerOwned, 'read')).not.toThrow();
  });

  it('blocks access to tasks outside the organization scope', () => {
    expect(() => service.ensureTaskAction(owner, tasks.other, 'read')).toThrow(ForbiddenException);
  });
});
