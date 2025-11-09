import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Permission } from '../models/permission.model';
import { TaskAction } from './access-control.service';

export const ACCESS_REQUIREMENT_KEY = 'access-control:requirement';

type RequirementType = 'permission' | 'taskAction' | 'taskCreate';

export interface BaseRequirement {
  readonly type: RequirementType;
}

export interface PermissionRequirement extends BaseRequirement {
  readonly type: 'permission';
  readonly permission: Permission;
}

export interface TaskActionRequirement extends BaseRequirement {
  readonly type: 'taskAction';
  readonly action: TaskAction;
  readonly taskIdParam?: string;
}

export interface TaskCreateRequirement extends BaseRequirement {
  readonly type: 'taskCreate';
  readonly organizationField?: string;
  readonly location?: 'body' | 'params';
}

export type AccessRequirement = PermissionRequirement | TaskActionRequirement | TaskCreateRequirement;

export const RequirePermission = (permission: Permission): CustomDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, {
    type: 'permission',
    permission,
  } satisfies PermissionRequirement);

export const RequireTaskAction = (
  action: TaskAction,
  options?: { readonly taskIdParam?: string }
): CustomDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, {
    type: 'taskAction',
    action,
    taskIdParam: options?.taskIdParam ?? 'taskId',
  } satisfies TaskActionRequirement);

export const RequireTaskCreation = (
  options?: { readonly organizationField?: string; readonly location?: 'body' | 'params' }
): CustomDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_KEY, {
    type: 'taskCreate',
    organizationField: options?.organizationField ?? 'organizationId',
    location: options?.location ?? 'body',
  } satisfies TaskCreateRequirement);
