import { ForbiddenException, Injectable } from '@nestjs/common';
import { Organization } from '../models/organization.model';
import { Permission } from '../models/permission.model';
import { RoleName, ROLE_DEFINITIONS } from '../models/role.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { AuditLogger } from './audit-logger.service';

export type TaskAction = 'read' | 'update' | 'delete';

const ACTION_PERMISSION_MAP: Record<TaskAction, Permission> = {
  read: Permission.TaskRead,
  update: Permission.TaskUpdate,
  delete: Permission.TaskDelete,
};

@Injectable()
export class AccessControlService {
  private readonly organizations = new Map<string, Organization>();
  private readonly childrenByParent = new Map<string, Set<string>>();
  private readonly parentByChild = new Map<string, string>();

  constructor(private readonly auditLogger: AuditLogger) {}

  registerOrganizations(input: ReadonlyArray<Organization>): void {
    this.organizations.clear();
    this.childrenByParent.clear();
    this.parentByChild.clear();

    for (const org of input) {
      this.organizations.set(org.id, org);
    }

    for (const org of input) {
      if (!org.parentId) {
        continue;
      }

      if (!this.organizations.has(org.parentId)) {
        throw new Error(`Parent organization ${org.parentId} not found for organization ${org.id}`);
      }

      const parent = this.organizations.get(org.parentId);
      if (parent?.parentId) {
        throw new Error(`Organization depth exceeds two levels for ${org.id}`);
      }

      this.parentByChild.set(org.id, org.parentId);
      if (!this.childrenByParent.has(org.parentId)) {
        this.childrenByParent.set(org.parentId, new Set());
      }
      this.childrenByParent.get(org.parentId)?.add(org.id);
    }
  }

  ensureCanCreateTask(user: User, organizationId: string): void {
    const permission = Permission.TaskCreate;
    const scope = this.getAccessibleOrganizationIds(user);
    const allowed = this.hasPermission(user, permission) && scope.has(organizationId);

    this.auditLogger.log({
      userId: user.id,
      action: 'task:create',
      resource: 'organization',
      resourceId: organizationId,
      organizationId,
      allowed,
      reason: allowed ? undefined : 'Insufficient permission or organization scope.',
      timestamp: new Date().toISOString(),
    });

    if (!allowed) {
      throw new ForbiddenException('Task creation not allowed in target organization.');
    }
  }

  ensureTaskAction(user: User, task: Task, action: TaskAction): void {
    const permission = ACTION_PERMISSION_MAP[action];
    const effectivePermissions = this.getEffectivePermissions(user);
    const hasPermission = effectivePermissions.has(permission);
    const inScope = this.getAccessibleOrgIdsWithCache(user, effectivePermissions, permission).has(
      task.organizationId
    );
    const ownershipSatisfied = this.isOwnershipSatisfied(user, task, action);

    const allowed = hasPermission && inScope && ownershipSatisfied;

    this.auditLogger.log({
      userId: user.id,
      action: `task:${action}`,
      resource: 'task',
      resourceId: task.id,
      organizationId: task.organizationId,
      allowed,
      reason: allowed ? undefined : this.buildDenialReason({ hasPermission, inScope, ownershipSatisfied }),
      timestamp: new Date().toISOString(),
    });

    if (!allowed) {
      throw new ForbiddenException(`Task ${action} is not permitted.`);
    }
  }

  ensurePermission(
    user: User,
    permission: Permission,
    context?: {
      readonly action?: string;
      readonly resource?: string;
      readonly resourceId?: string;
      readonly organizationId?: string;
    }
  ): void {
    const allowed = this.hasPermission(user, permission);

    this.auditLogger.log({
      userId: user.id,
      action: context?.action ?? `permission:${permission}`,
      resource: context?.resource ?? 'permission',
      resourceId: context?.resourceId,
      organizationId: context?.organizationId,
      allowed,
      reason: allowed ? undefined : 'Missing required permission.',
      timestamp: new Date().toISOString(),
    });

    if (!allowed) {
      throw new ForbiddenException('Operation not permitted.');
    }
  }

  canReadTask(user: User, task: Task): boolean {
    const permission = Permission.TaskRead;
    const effectivePermissions = this.getEffectivePermissions(user);
    const hasPermission = effectivePermissions.has(permission);
    if (!hasPermission) {
      return false;
    }

    const inScope = this.getAccessibleOrgIdsWithCache(user, effectivePermissions, permission).has(task.organizationId);
    if (!inScope) {
      return false;
    }

    if (this.hasRole(user, RoleName.Viewer) && !this.hasElevatedRole(user) && task.ownerId !== user.id) {
      return false;
    }

    return true;
  }

  hasPermission(user: User, permission: Permission): boolean {
    return this.getEffectivePermissions(user).has(permission);
  }

  getAccessibleOrganizationIds(user: User): ReadonlySet<string> {
    return this.computeAccessibleOrgIds(user);
  }

  private getEffectivePermissions(user: User): ReadonlySet<Permission> {
    const permissions = new Set<Permission>();
    const visited = new Set<RoleName>();

    for (const role of user.roles) {
      this.collectPermissionsForRole(role, visited, permissions);
    }

    for (const direct of user.directPermissions ?? []) {
      permissions.add(direct);
    }

    return permissions;
  }

  private collectPermissionsForRole(role: RoleName, visited: Set<RoleName>, permissions: Set<Permission>): void {
    if (visited.has(role)) {
      return;
    }

    visited.add(role);
    const definition = ROLE_DEFINITIONS[role];
    if (!definition) {
      return;
    }

    for (const permission of definition.permissions) {
      permissions.add(permission);
    }

    for (const inherited of definition.inherits ?? []) {
      this.collectPermissionsForRole(inherited, visited, permissions);
    }
  }

  private computeAccessibleOrgIds(user: User): ReadonlySet<string> {
    const baseOrgId = user.organizationId;
    const scope = new Set<string>([baseOrgId]);

    const hasElevatedRole = this.hasElevatedRole(user);
    if (!hasElevatedRole) {
      return scope;
    }

    const parentId = this.parentByChild.get(baseOrgId);
    if (parentId) {
      scope.add(parentId);
      for (const siblingId of this.childrenByParent.get(parentId) ?? []) {
        scope.add(siblingId);
      }
      return scope;
    }

    for (const childId of this.childrenByParent.get(baseOrgId) ?? []) {
      scope.add(childId);
    }

    return scope;
  }

  private getAccessibleOrgIdsWithCache(
    user: User,
    effectivePermissions: ReadonlySet<Permission>,
    permission: Permission
  ): ReadonlySet<string> {
    if (!effectivePermissions.has(permission)) {
      return new Set();
    }

    return this.computeAccessibleOrgIds(user);
  }

  private isOwnershipSatisfied(user: User, task: Task, action: TaskAction): boolean {
    if (task.ownerId === user.id) {
      return true;
    }

    if (action === 'read') {
      return this.hasElevatedRole(user);
    }

    if (action === 'update') {
      return this.hasElevatedRole(user);
    }

    if (action === 'delete') {
      return this.hasRole(user, RoleName.Owner);
    }

    return true;
  }

  private hasElevatedRole(user: User): boolean {
    return this.hasRole(user, RoleName.Owner) || this.hasRole(user, RoleName.Admin);
  }

  private hasRole(user: User, role: RoleName): boolean {
    return user.roles.includes(role);
  }

  private buildDenialReason(params: { hasPermission: boolean; inScope: boolean; ownershipSatisfied: boolean }): string {
    if (!params.hasPermission) {
      return 'Missing required permission.';
    }

    if (!params.inScope) {
      return 'Target organization outside allowed scope.';
    }

    if (!params.ownershipSatisfied) {
      return 'Ownership requirements not met.';
    }

    return 'Denied by policy.';
  }
}
