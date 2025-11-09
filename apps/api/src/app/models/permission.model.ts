export enum Permission {
  TaskRead = 'task:read',
  TaskCreate = 'task:create',
  TaskUpdate = 'task:update',
  TaskDelete = 'task:delete',
  AuditLogRead = 'audit-log:read',
}

export type PermissionSet = ReadonlySet<Permission>;
