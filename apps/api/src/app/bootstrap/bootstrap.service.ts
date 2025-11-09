import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AccessControlService } from '../access-control/access-control.service';
import { AuditLogger } from '../access-control/audit-logger.service';
import { DirectoryService } from '../identity/directory.service';
import { Organization } from '../models/organization.model';
import { RoleName } from '../models/role.model';
import { Task } from '../models/task.model';
import { TaskService } from '../tasks/task.service';
import { User } from '../models/user.model';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly organizations: ReadonlyArray<Organization> = [
    { id: 'org-root', name: 'Acme Global' },
    { id: 'org-eng', name: 'Acme Engineering', parentId: 'org-root' },
    { id: 'org-design', name: 'Acme Design', parentId: 'org-root' },
  ];

  private readonly users: ReadonlyArray<User> = [
    {
      id: 'user-owner',
      email: 'user@example.com',
      organizationId: 'org-root',
      roles: [RoleName.Owner],
    },
    {
      id: 'user-admin',
      email: 'admin@example.com',
      organizationId: 'org-eng',
      roles: [RoleName.Admin],
    },
    {
      id: 'user-viewer',
      email: 'viewer@example.com',
      organizationId: 'org-design',
      roles: [RoleName.Viewer],
    },
  ];

  private readonly tasks: ReadonlyArray<Task> = [
    {
      id: 'task-strategy',
      title: 'Define quarterly strategy',
      description: 'Outline company objectives for the upcoming quarter.',
      organizationId: 'org-root',
      ownerId: 'user-owner',
    },
    {
      id: 'task-release',
      title: 'Coordinate engineering release',
      description: 'Track the release checklist for the new product version.',
      organizationId: 'org-eng',
      ownerId: 'user-admin',
    },
    {
      id: 'task-mockups',
      title: 'Review design mockups',
      description: 'Provide feedback on the iterative design review.',
      organizationId: 'org-design',
      ownerId: 'user-viewer',
    },
  ];

  constructor(
    private readonly auditLogger: AuditLogger,
    private readonly accessControl: AccessControlService,
    private readonly directory: DirectoryService,
    private readonly taskService: TaskService
  ) {}

  onApplicationBootstrap(): void {
    this.reseed();
  }

  reseed(): void {
    this.auditLogger.clear();
    this.accessControl.registerOrganizations(this.organizations);
    this.directory.seed({ organizations: this.organizations, users: this.users });
    const snapshot = this.tasks.map((task) => ({ ...task }));
    this.taskService.seed(snapshot);
  }
}
