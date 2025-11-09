import { Permission } from './permission.model';

export enum RoleName {
  Owner = 'OWNER',
  Admin = 'ADMIN',
  Viewer = 'VIEWER',
}

export interface RoleDefinition {
  readonly name: RoleName;
  readonly description: string;
  readonly permissions: ReadonlyArray<Permission>;
  readonly inherits?: ReadonlyArray<RoleName>;
}

export const ROLE_DEFINITIONS: Readonly<Record<RoleName, RoleDefinition>> = {
  [RoleName.Owner]: {
    name: RoleName.Owner,
    description: 'Full access to organization resources.',
    permissions: [
      Permission.TaskDelete,
      Permission.AuditLogRead,
    ],
    inherits: [RoleName.Admin],
  },
  [RoleName.Admin]: {
    name: RoleName.Admin,
    description: 'Manage tasks within the organization.',
    permissions: [
      Permission.TaskCreate,
      Permission.TaskUpdate,
      Permission.AuditLogRead,
    ],
    inherits: [RoleName.Viewer],
  },
  [RoleName.Viewer]: {
    name: RoleName.Viewer,
    description: 'View tasks within the organization.',
    permissions: [
      Permission.TaskRead,
    ],
  },
} as const;
