import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from './access-control.decorator';
import { Permission } from '../models/permission.model';
import { AuditEvent, AuditLogger } from './audit-logger.service';
import { AccessControlService } from './access-control.service';
import { TaskService } from '../tasks/task.service';
import { User } from '../models/user.model';

interface RequestWithUser extends Request {
  user?: User;
}

@Controller('audit-log')
export class AuditLogController {
  constructor(
    private readonly auditLogger: AuditLogger,
    private readonly accessControl: AccessControlService,
    private readonly taskService: TaskService
  ) {}

  @Get()
  @RequirePermission(Permission.AuditLogRead)
  listAuditEvents(@Req() req: RequestWithUser): ReadonlyArray<AuditEvent> {
    const user = this.getUser(req);
    const scope = this.accessControl.getAccessibleOrganizationIds(user);

    return this.auditLogger
      .getEvents()
      .filter((event) => this.isEventVisible(user, scope, event))
      .map((event) => ({ ...event }));
  }

  private isEventVisible(user: User, scope: ReadonlySet<string>, event: AuditEvent): boolean {
    if (event.userId === user.id) {
      return true;
    }

    if (event.organizationId) {
      return scope.has(event.organizationId);
    }

    if (event.resource === 'task' && event.resourceId) {
      const task = this.taskService.getTaskById(event.resourceId);
      return task ? scope.has(task.organizationId) : false;
    }

    if (event.resource === 'organization' && event.resourceId) {
      return scope.has(event.resourceId);
    }

    return true;
  }

  private getUser(req: RequestWithUser): User {
    if (!req.user) {
      throw new UnauthorizedException('Authenticated user not available.');
    }

    return req.user;
  }
}
