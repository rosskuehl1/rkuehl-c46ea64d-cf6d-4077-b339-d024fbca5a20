import { Permission } from './permission.model';
import { RoleName } from './role.model';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly organizationId: string;
  readonly roles: ReadonlyArray<RoleName>;
  readonly directPermissions?: ReadonlyArray<Permission>;
}
