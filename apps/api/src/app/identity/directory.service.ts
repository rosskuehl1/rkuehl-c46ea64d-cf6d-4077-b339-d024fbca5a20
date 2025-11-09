import { Injectable } from '@nestjs/common';
import { Organization } from '../models/organization.model';
import { User } from '../models/user.model';

interface SeedPayload {
  readonly organizations: ReadonlyArray<Organization>;
  readonly users: ReadonlyArray<User>;
}

@Injectable()
export class DirectoryService {
  private readonly organizations = new Map<string, Organization>();
  private readonly usersByEmail = new Map<string, User>();
  private readonly usersById = new Map<string, User>();

  seed(payload: SeedPayload): void {
    this.organizations.clear();
    this.usersByEmail.clear();
    this.usersById.clear();

    for (const organization of payload.organizations) {
      this.organizations.set(organization.id, { ...organization });
    }

    for (const user of payload.users) {
      const snapshot = this.cloneUser(user);
      this.usersByEmail.set(snapshot.email.toLowerCase(), snapshot);
      this.usersById.set(snapshot.id, snapshot);
    }
  }

  getUserByEmail(email: string): User | undefined {
    const user = this.usersByEmail.get(email.toLowerCase());
    return user ? this.cloneUser(user) : undefined;
  }

  getUserById(userId: string): User | undefined {
    const user = this.usersById.get(userId);
    return user ? this.cloneUser(user) : undefined;
  }

  getOrganizationById(organizationId: string): Organization | undefined {
    const organization = this.organizations.get(organizationId);
    return organization ? { ...organization } : undefined;
  }

  listOrganizations(): ReadonlyArray<Organization> {
    return Array.from(this.organizations.values()).map((organization) => ({ ...organization }));
  }

  listUsers(): ReadonlyArray<User> {
    return Array.from(this.usersById.values()).map((user) => this.cloneUser(user));
  }

  private cloneUser(user: User): User {
    return {
      ...user,
      roles: [...user.roles],
      directPermissions: user.directPermissions ? [...user.directPermissions] : undefined,
    };
  }
}
