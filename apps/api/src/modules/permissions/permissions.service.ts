import { Injectable } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

@Injectable()
export class PermissionsService {
  private readonly rolePermissions: RolePermissions[] = [
    {
      role: UserRole.OWNER,
      permissions: [
        { resource: '*', action: '*' }, // Full access to everything
      ],
    },
    {
      role: UserRole.ADMIN,
      permissions: [
        { resource: 'users', action: '*' },
        { resource: 'organizations', action: 'read' },
        { resource: 'organizations', action: 'update' },
        { resource: 'teams', action: '*' },
        { resource: 'campaigns', action: '*' },
        { resource: 'mailboxes', action: '*' },
        { resource: 'domains', action: '*' },
        { resource: 'analytics', action: '*' },
        { resource: 'invitations', action: '*' },
        { resource: 'settings', action: '*' },
      ],
    },
    {
      role: UserRole.MANAGER,
      permissions: [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update', conditions: { scope: 'team' } },
        { resource: 'teams', action: 'read' },
        { resource: 'teams', action: 'update', conditions: { scope: 'owned' } },
        { resource: 'campaigns', action: '*' },
        { resource: 'mailboxes', action: 'read' },
        { resource: 'mailboxes', action: 'update', conditions: { scope: 'team' } },
        { resource: 'domains', action: 'read' },
        { resource: 'analytics', action: 'read' },
        { resource: 'invitations', action: 'create', conditions: { scope: 'team' } },
        { resource: 'invitations', action: 'read', conditions: { scope: 'team' } },
        { resource: 'settings', action: 'read' },
      ],
    },
    {
      role: UserRole.MEMBER,
      permissions: [
        { resource: 'users', action: 'read', conditions: { scope: 'team' } },
        { resource: 'users', action: 'update', conditions: { scope: 'self' } },
        { resource: 'teams', action: 'read', conditions: { scope: 'member' } },
        { resource: 'campaigns', action: 'read' },
        { resource: 'campaigns', action: 'create' },
        { resource: 'campaigns', action: 'update', conditions: { scope: 'owned' } },
        { resource: 'mailboxes', action: 'read', conditions: { scope: 'assigned' } },
        { resource: 'domains', action: 'read' },
        { resource: 'analytics', action: 'read', conditions: { scope: 'owned' } },
        { resource: 'settings', action: 'read', conditions: { scope: 'personal' } },
      ],
    },
    {
      role: UserRole.VIEWER,
      permissions: [
        { resource: 'users', action: 'read', conditions: { scope: 'team' } },
        { resource: 'teams', action: 'read', conditions: { scope: 'member' } },
        { resource: 'campaigns', action: 'read' },
        { resource: 'analytics', action: 'read', conditions: { scope: 'assigned' } },
        { resource: 'settings', action: 'read', conditions: { scope: 'personal' } },
      ],
    },
  ];

  can(userRole: UserRole, resource: string, action: string, context?: Record<string, any>): boolean {
    const rolePerms = this.rolePermissions.find(rp => rp.role === userRole);
    if (!rolePerms) {
      return false;
    }

    // Check for wildcard permissions first
    const wildcardPermission = rolePerms.permissions.find(
      p => p.resource === '*' && p.action === '*'
    );
    if (wildcardPermission) {
      return true;
    }

    // Check for specific resource wildcard
    const resourceWildcard = rolePerms.permissions.find(
      p => p.resource === resource && p.action === '*'
    );
    if (resourceWildcard) {
      return this.checkConditions(resourceWildcard.conditions, context);
    }

    // Check for specific permission
    const permission = rolePerms.permissions.find(
      p => p.resource === resource && p.action === action
    );
    if (!permission) {
      return false;
    }

    return this.checkConditions(permission.conditions, context);
  }

  private checkConditions(conditions: Record<string, any> | undefined, context: Record<string, any> | undefined): boolean {
    if (!conditions) {
      return true;
    }

    if (!context) {
      return false;
    }

    // Check scope conditions
    if (conditions.scope) {
      switch (conditions.scope) {
        case 'self':
          return context.userId === context.currentUserId;
        case 'team':
          return context.userOrganizationId === context.currentUserOrganizationId;
        case 'owned':
          return context.ownerId === context.currentUserId;
        case 'assigned':
          return context.assignedUserId === context.currentUserId;
        case 'member':
          return context.teamMembers?.includes(context.currentUserId);
        case 'personal':
          return true; // Personal settings are always accessible
        default:
          return false;
      }
    }

    // Check other conditions
    for (const [key, value] of Object.entries(conditions)) {
      if (key !== 'scope' && context[key] !== value) {
        return false;
      }
    }

    return true;
  }

  getRolePermissions(role: UserRole): Permission[] {
    const rolePerms = this.rolePermissions.find(rp => rp.role === role);
    return rolePerms ? rolePerms.permissions : [];
  }

  getAllRolePermissions(): RolePermissions[] {
    return this.rolePermissions;
  }

  // Helper methods for common permission checks
  canManageUsers(userRole: UserRole): boolean {
    return this.can(userRole, 'users', 'create') || this.can(userRole, 'users', 'delete');
  }

  canManageTeams(userRole: UserRole): boolean {
    return this.can(userRole, 'teams', 'create') || this.can(userRole, 'teams', 'delete');
  }

  canManageCampaigns(userRole: UserRole): boolean {
    return this.can(userRole, 'campaigns', 'create') || this.can(userRole, 'campaigns', 'delete');
  }

  canViewAnalytics(userRole: UserRole): boolean {
    return this.can(userRole, 'analytics', 'read');
  }

  canManageOrganization(userRole: UserRole): boolean {
    return this.can(userRole, 'organizations', 'update') || this.can(userRole, 'organizations', 'delete');
  }
}
