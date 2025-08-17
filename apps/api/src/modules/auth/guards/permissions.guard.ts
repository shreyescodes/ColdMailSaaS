import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';

export interface RequiredPermission {
  resource: string;
  action: string;
}

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const contextData = {
        currentUserId: user.id,
        currentUserOrganizationId: user.organizationId,
        userId: request.params?.id || request.body?.userId,
        userOrganizationId: request.body?.organizationId,
        ownerId: request.body?.ownerId,
        assignedUserId: request.body?.assignedUserId,
        teamMembers: request.body?.teamMembers,
      };

      if (!this.permissionsService.can(user.role, permission.resource, permission.action, contextData)) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${permission.action} on ${permission.resource}`,
        );
      }
    }

    return true;
  }
}
