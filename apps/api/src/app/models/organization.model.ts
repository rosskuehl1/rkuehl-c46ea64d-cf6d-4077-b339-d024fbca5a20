export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
}

export type OrganizationGraph = ReadonlyArray<Organization>;
