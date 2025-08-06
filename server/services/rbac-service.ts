/**
 * RBAC Service
 * Complete Role-Based Access Control management system
 */

import { z } from 'zod';
import { eq, and, desc, isNull, or, inArray } from 'drizzle-orm';
import { metricsRegistry } from '../middleware/monitoring';
import { schemaValidationService, DatabaseConnection } from '../database/schema-validation';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userPermissions,
  rbacAuditLog,
  userSessions,
  users,
  type Role,
  type Permission,
  type UserRole,
  type UserPermission,
  type RbacAuditLog,
  type UserSession,
  type InsertRole,
  type InsertPermission,
  type InsertUserRole,
  type InsertUserPermission,
  type InsertRbacAuditLog,
  type InsertUserSession
} from '@shared/schema';

// Core Permission Constants
export const CORE_PERMISSIONS = {
  // Event Management
  EVENT_CREATE: 'events:create',
  EVENT_READ: 'events:read',
  EVENT_UPDATE: 'events:update',
  EVENT_DELETE: 'events:delete',
  EVENT_MANAGE: 'events:manage',
  
  // Guest Management
  GUEST_CREATE: 'guests:create',
  GUEST_READ: 'guests:read',
  GUEST_UPDATE: 'guests:update',
  GUEST_DELETE: 'guests:delete',
  GUEST_IMPORT: 'guests:import',
  GUEST_EXPORT: 'guests:export',
  
  // Communication
  COMMUNICATIONS_SEND: 'communications:send',
  COMMUNICATIONS_READ: 'communications:read',
  COMMUNICATIONS_WRITE: 'communications:write',
  COMMUNICATIONS_MANAGE: 'communications:manage',
  
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Transportation
  TRANSPORT_READ: 'transport:read',
  TRANSPORT_WRITE: 'transport:write',
  TRANSPORT_MANAGE: 'transport:manage',
  
  // System Administration
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_RBAC: 'system:rbac',
  
  // User Management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_MANAGE: 'users:manage'
} as const;

// Core Roles Configuration
export const CORE_ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: Object.values(CORE_PERMISSIONS),
    isSystemRole: true
  },
  ADMIN: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Event administration with most permissions',
    permissions: [
      CORE_PERMISSIONS.EVENT_CREATE,
      CORE_PERMISSIONS.EVENT_READ,
      CORE_PERMISSIONS.EVENT_UPDATE,
      CORE_PERMISSIONS.EVENT_MANAGE,
      CORE_PERMISSIONS.GUEST_CREATE,
      CORE_PERMISSIONS.GUEST_READ,
      CORE_PERMISSIONS.GUEST_UPDATE,
      CORE_PERMISSIONS.GUEST_IMPORT,
      CORE_PERMISSIONS.GUEST_EXPORT,
      CORE_PERMISSIONS.COMMUNICATIONS_SEND,
      CORE_PERMISSIONS.COMMUNICATIONS_READ,
      CORE_PERMISSIONS.COMMUNICATIONS_WRITE,
      CORE_PERMISSIONS.ANALYTICS_READ,
      CORE_PERMISSIONS.ANALYTICS_EXPORT,
      CORE_PERMISSIONS.TRANSPORT_READ,
      CORE_PERMISSIONS.TRANSPORT_WRITE,
      CORE_PERMISSIONS.SYSTEM_MONITOR,
      CORE_PERMISSIONS.USERS_READ
    ],
    isSystemRole: true
  },
  EVENT_MANAGER: {
    name: 'event_manager',
    displayName: 'Event Manager',
    description: 'Manages specific events and their guests',
    permissions: [
      CORE_PERMISSIONS.EVENT_READ,
      CORE_PERMISSIONS.EVENT_UPDATE,
      CORE_PERMISSIONS.GUEST_CREATE,
      CORE_PERMISSIONS.GUEST_READ,
      CORE_PERMISSIONS.GUEST_UPDATE,
      CORE_PERMISSIONS.GUEST_IMPORT,
      CORE_PERMISSIONS.GUEST_EXPORT,
      CORE_PERMISSIONS.COMMUNICATIONS_SEND,
      CORE_PERMISSIONS.COMMUNICATIONS_READ,
      CORE_PERMISSIONS.ANALYTICS_READ,
      CORE_PERMISSIONS.TRANSPORT_READ,
      CORE_PERMISSIONS.TRANSPORT_WRITE
    ],
    isSystemRole: true
  },
  COUPLE: {
    name: 'couple',
    displayName: 'Couple',
    description: 'Event owners with full access to their events',
    permissions: [
      CORE_PERMISSIONS.EVENT_READ,
      CORE_PERMISSIONS.EVENT_UPDATE,
      CORE_PERMISSIONS.GUEST_READ,
      CORE_PERMISSIONS.GUEST_UPDATE,
      CORE_PERMISSIONS.COMMUNICATIONS_SEND,
      CORE_PERMISSIONS.COMMUNICATIONS_READ,
      CORE_PERMISSIONS.ANALYTICS_READ,
      CORE_PERMISSIONS.TRANSPORT_READ
    ],
    isSystemRole: true
  },
  GUEST: {
    name: 'guest',
    displayName: 'Guest',
    description: 'Event guests with limited read access',
    permissions: [
      CORE_PERMISSIONS.EVENT_READ,
      CORE_PERMISSIONS.GUEST_READ
    ],
    isSystemRole: true
  }
} as const;

// User context interface
interface UserContext {
  id: number;
  role?: string;
  eventId?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// Permission check result
interface PermissionCheckResult {
  hasPermission: boolean;
  source: 'role' | 'direct' | 'denied';
  reason?: string;
  rolePermissions?: string[];
  directPermissions?: { permission: string; granted: boolean }[];
}

/**
 * Complete RBAC Service Implementation
 */
export class RBACService {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  // ===================== ROLE MANAGEMENT =====================

  /**
   * Create a new role
   */
  async createRole(roleData: InsertRole, createdBy: number): Promise<Role> {
    const startTime = performance.now();
    
    try {
      const role = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO roles (name, display_name, description, is_active, is_system_role, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [
          roleData.name,
          roleData.displayName,
          roleData.description || null,
          roleData.isActive ?? true,
          roleData.isSystemRole ?? false,
          createdBy
        ],
        `rbac_create_role_${roleData.name}`
      );

      const newRole = role[0] as Role;

      // Log audit trail
      await this.logAuditEvent({
        action: 'role_created',
        resourceType: 'role',
        resourceId: newRole.id.toString(),
        newValue: newRole,
        performedBy: createdBy
      });

      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('rbac_operation_duration_ms', duration, {
        operation: 'create_role',
        status: 'success'
      });

      console.log(`✅ Role created: ${newRole.name} (${newRole.displayName})`);
      return newRole;

    } catch (error) {
      const duration = performance.now() - startTime;
      metricsRegistry.recordHistogram('rbac_operation_duration_ms', duration, {
        operation: 'create_role',
        status: 'error'
      });

      console.error('❌ Failed to create role:', error);
      throw new Error(`Role creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all roles with optional filtering
   */
  async getRoles(options: {
    includeInactive?: boolean;
    includeSystemRoles?: boolean;
    eventId?: number;
  } = {}): Promise<Role[]> {
    try {
      let query = 'SELECT * FROM roles WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (!options.includeInactive) {
        query += ` AND is_active = $${paramIndex++}`;
        queryParams.push(true);
      }

      if (!options.includeSystemRoles) {
        query += ` AND is_system_role = $${paramIndex++}`;
        queryParams.push(false);
      }

      query += ' ORDER BY display_name ASC';

      const roles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        queryParams,
        `rbac_get_roles_${JSON.stringify(options)}`
      );

      return roles as Role[];

    } catch (error) {
      console.error('❌ Failed to get roles:', error);
      throw new Error(`Failed to retrieve roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(roleId: number): Promise<(Role & { permissions: Permission[] }) | null> {
    try {
      const roleQuery = await schemaValidationService.executeOptimizedQuery(
        this.db,
        'SELECT * FROM roles WHERE id = $1',
        [roleId],
        `rbac_get_role_${roleId}`
      );

      if (roleQuery.length === 0) return null;

      const role = roleQuery[0] as Role;

      // Get role permissions
      const permissionsQuery = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1 AND p.is_active = true
         ORDER BY p.resource, p.action`,
        [roleId],
        `rbac_get_role_permissions_${roleId}`
      );

      return {
        ...role,
        permissions: permissionsQuery as Permission[]
      };

    } catch (error) {
      console.error('❌ Failed to get role by ID:', error);
      throw new Error(`Failed to retrieve role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update role
   */
  async updateRole(roleId: number, updates: Partial<InsertRole>, updatedBy: number): Promise<Role> {
    try {
      // Get current role for audit trail
      const currentRole = await this.getRoleById(roleId);
      if (!currentRole) {
        throw new Error('Role not found');
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.displayName !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(updates.displayName);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updates.description);
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updates.isActive);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date().toISOString());

      updateValues.push(roleId);

      const updatedRoles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      const updatedRole = updatedRoles[0] as Role;

      // Log audit trail
      await this.logAuditEvent({
        action: 'role_updated',
        resourceType: 'role',
        resourceId: roleId.toString(),
        oldValue: currentRole,
        newValue: updatedRole,
        performedBy: updatedBy
      });

      console.log(`✅ Role updated: ${updatedRole.name}`);
      return updatedRole;

    } catch (error) {
      console.error('❌ Failed to update role:', error);
      throw new Error(`Role update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== PERMISSION MANAGEMENT =====================

  /**
   * Create a new permission
   */
  async createPermission(permissionData: InsertPermission): Promise<Permission> {
    try {
      const permissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO permissions (name, display_name, description, resource, action, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [
          permissionData.name,
          permissionData.displayName,
          permissionData.description || null,
          permissionData.resource,
          permissionData.action,
          permissionData.isActive ?? true
        ]
      );

      const newPermission = permissions[0] as Permission;

      console.log(`✅ Permission created: ${newPermission.name}`);
      return newPermission;

    } catch (error) {
      console.error('❌ Failed to create permission:', error);
      throw new Error(`Permission creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    try {
      const permissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1 AND p.is_active = true
         ORDER BY p.resource, p.action`,
        [roleId],
        `rbac_get_role_permissions_${roleId}`
      );

      return permissions as Permission[];

    } catch (error) {
      console.error('❌ Failed to get role permissions:', error);
      throw new Error(`Failed to retrieve role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all permissions with optional filtering
   */
  async getPermissions(options: {
    resource?: string;
    includeInactive?: boolean;
  } = {}): Promise<Permission[]> {
    try {
      let query = 'SELECT * FROM permissions WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (options.resource) {
        query += ` AND resource = $${paramIndex++}`;
        queryParams.push(options.resource);
      }

      if (!options.includeInactive) {
        query += ` AND is_active = $${paramIndex++}`;
        queryParams.push(true);
      }

      query += ' ORDER BY resource, action';

      const permissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        queryParams,
        `rbac_get_permissions_${JSON.stringify(options)}`
      );

      return permissions as Permission[];

    } catch (error) {
      console.error('❌ Failed to get permissions:', error);
      throw new Error(`Failed to retrieve permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== ROLE-PERMISSION ASSIGNMENT =====================

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: number, permissionId: number, grantedBy: number): Promise<void> {
    try {
      // Check if assignment already exists
      const existing = await schemaValidationService.executeOptimizedQuery(
        this.db,
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId]
      );

      if (existing.length > 0) {
        throw new Error('Permission already assigned to role');
      }

      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
         VALUES ($1, $2, $3, NOW())`,
        [roleId, permissionId, grantedBy]
      );

      // Log audit trail
      await this.logAuditEvent({
        action: 'permission_assigned_to_role',
        resourceType: 'role_permission',
        resourceId: `${roleId}-${permissionId}`,
        newValue: { roleId, permissionId },
        performedBy: grantedBy
      });

      console.log(`✅ Permission ${permissionId} assigned to role ${roleId}`);

    } catch (error) {
      console.error('❌ Failed to assign permission to role:', error);
      throw new Error(`Permission assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: number, permissionId: number, removedBy: number): Promise<void> {
    try {
      const result = await schemaValidationService.executeOptimizedQuery(
        this.db,
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING *',
        [roleId, permissionId]
      );

      if (result.length === 0) {
        throw new Error('Permission assignment not found');
      }

      // Log audit trail
      await this.logAuditEvent({
        action: 'permission_removed_from_role',
        resourceType: 'role_permission',
        resourceId: `${roleId}-${permissionId}`,
        oldValue: { roleId, permissionId },
        performedBy: removedBy
      });

      console.log(`✅ Permission ${permissionId} removed from role ${roleId}`);

    } catch (error) {
      console.error('❌ Failed to remove permission from role:', error);
      throw new Error(`Permission removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== USER ROLE MANAGEMENT =====================

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: number, 
    roleId: number, 
    assignedBy: number, 
    options: {
      eventId?: number;
      expiresAt?: Date;
    } = {}
  ): Promise<UserRole> {
    try {
      // Check if assignment already exists
      const existingQuery = 'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2 AND is_active = true';
      const queryParams = [userId, roleId];
      
      if (options.eventId) {
        existingQuery + ' AND event_id = $3';
        queryParams.push(options.eventId);
      } else {
        existingQuery + ' AND event_id IS NULL';
      }

      const existing = await schemaValidationService.executeOptimizedQuery(
        this.db,
        existingQuery,
        queryParams
      );

      if (existing.length > 0) {
        throw new Error('Role already assigned to user');
      }

      const userRoles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO user_roles (user_id, role_id, event_id, assigned_by, assigned_at, expires_at, is_active)
         VALUES ($1, $2, $3, $4, NOW(), $5, true)
         RETURNING *`,
        [userId, roleId, options.eventId || null, assignedBy, options.expiresAt || null]
      );

      const newUserRole = userRoles[0] as UserRole;

      // Log audit trail
      await this.logAuditEvent({
        action: 'role_assigned_to_user',
        resourceType: 'user_role',
        resourceId: newUserRole.id.toString(),
        targetUserId: userId,
        newValue: newUserRole,
        performedBy: assignedBy
      });

      console.log(`✅ Role ${roleId} assigned to user ${userId}`);
      return newUserRole;

    } catch (error) {
      console.error('❌ Failed to assign role to user:', error);
      throw new Error(`Role assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userRoleId: number, removedBy: number): Promise<void> {
    try {
      const result = await schemaValidationService.executeOptimizedQuery(
        this.db,
        'UPDATE user_roles SET is_active = false WHERE id = $1 RETURNING *',
        [userRoleId]
      );

      if (result.length === 0) {
        throw new Error('User role assignment not found');
      }

      const removedUserRole = result[0] as UserRole;

      // Log audit trail
      await this.logAuditEvent({
        action: 'role_removed_from_user',
        resourceType: 'user_role',
        resourceId: userRoleId.toString(),
        targetUserId: removedUserRole.userId,
        oldValue: removedUserRole,
        performedBy: removedBy
      });

      console.log(`✅ Role removed from user: ${userRoleId}`);

    } catch (error) {
      console.error('❌ Failed to remove role from user:', error);
      throw new Error(`Role removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== PERMISSION CHECKING =====================

  /**
   * Check if user has specific permission
   */
  async checkUserPermission(
    userId: number, 
    permissionName: string, 
    eventId?: number
  ): Promise<PermissionCheckResult> {
    try {
      // Get user's roles and their permissions
      const rolePermissionsQuery = `
        SELECT DISTINCT p.name as permission_name, 'role' as source
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true 
          AND p.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND ($2::integer IS NULL OR ur.event_id IS NULL OR ur.event_id = $2)
      `;

      const rolePermissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        rolePermissionsQuery,
        [userId, eventId || null],
        `rbac_check_role_permissions_${userId}_${eventId || 'global'}`
      );

      // Get user's direct permissions
      const directPermissionsQuery = `
        SELECT p.name as permission_name, up.granted, 'direct' as source
        FROM permissions p
        JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = $1 
          AND p.is_active = true
          AND (up.expires_at IS NULL OR up.expires_at > NOW())
          AND ($2::integer IS NULL OR up.event_id IS NULL OR up.event_id = $2)
          AND p.name = $3
      `;

      const directPermissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        directPermissionsQuery,
        [userId, eventId || null, permissionName],
        `rbac_check_direct_permissions_${userId}_${permissionName}_${eventId || 'global'}`
      );

      // Check for explicit denial
      const explicitDenial = directPermissions.find((p: any) => !p.granted);
      if (explicitDenial) {
        return {
          hasPermission: false,
          source: 'denied',
          reason: 'Explicitly denied by direct permission',
          directPermissions: directPermissions.map((p: any) => ({
            permission: p.permission_name,
            granted: p.granted
          }))
        };
      }

      // Check for explicit grant
      const explicitGrant = directPermissions.find((p: any) => p.granted);
      if (explicitGrant) {
        return {
          hasPermission: true,
          source: 'direct',
          directPermissions: directPermissions.map((p: any) => ({
            permission: p.permission_name,
            granted: p.granted
          }))
        };
      }

      // Check role permissions
      const hasRolePermission = rolePermissions.some((p: any) => p.permission_name === permissionName);
      
      return {
        hasPermission: hasRolePermission,
        source: 'role',
        rolePermissions: rolePermissions.map((p: any) => p.permission_name)
      };

    } catch (error) {
      console.error('❌ Failed to check user permission:', error);
      return {
        hasPermission: false,
        source: 'denied',
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: number, eventId?: number): Promise<{
    rolePermissions: string[];
    directPermissions: { permission: string; granted: boolean }[];
    effectivePermissions: string[];
  }> {
    try {
      // Get role permissions
      const rolePermissionsQuery = `
        SELECT DISTINCT p.name as permission_name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true 
          AND p.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND ($2::integer IS NULL OR ur.event_id IS NULL OR ur.event_id = $2)
        ORDER BY p.name
      `;

      const rolePermissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        rolePermissionsQuery,
        [userId, eventId || null],
        `rbac_get_user_role_permissions_${userId}_${eventId || 'global'}`
      );

      // Get direct permissions
      const directPermissionsQuery = `
        SELECT p.name as permission_name, up.granted
        FROM permissions p
        JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = $1 
          AND p.is_active = true
          AND (up.expires_at IS NULL OR up.expires_at > NOW())
          AND ($2::integer IS NULL OR up.event_id IS NULL OR up.event_id = $2)
        ORDER BY p.name
      `;

      const directPermissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        directPermissionsQuery,
        [userId, eventId || null],
        `rbac_get_user_direct_permissions_${userId}_${eventId || 'global'}`
      );

      const rolePermissionNames = rolePermissions.map((p: any) => p.permission_name);
      const directPermissionMap = new Map(
        directPermissions.map((p: any) => [p.permission_name, p.granted])
      );

      // Calculate effective permissions
      const effectivePermissions = new Set<string>();

      // Add role permissions
      rolePermissionNames.forEach(permission => {
        if (!directPermissionMap.has(permission) || directPermissionMap.get(permission)) {
          effectivePermissions.add(permission);
        }
      });

      // Add granted direct permissions
      directPermissions.forEach((p: any) => {
        if (p.granted) {
          effectivePermissions.add(p.permission_name);
        }
      });

      return {
        rolePermissions: rolePermissionNames,
        directPermissions: directPermissions.map((p: any) => ({
          permission: p.permission_name,
          granted: p.granted
        })),
        effectivePermissions: Array.from(effectivePermissions).sort()
      };

    } catch (error) {
      console.error('❌ Failed to get user permissions:', error);
      throw new Error(`Failed to get user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== USER MANAGEMENT =====================

  /**
   * Get user with roles and permissions
   */
  async getUserWithRoles(userId: number, eventId?: number): Promise<{
    user: any;
    roles: (Role & { eventId?: number; expiresAt?: string })[];
    permissions: string[];
  } | null> {
    try {
      // Get user
      const userQuery = await schemaValidationService.executeOptimizedQuery(
        this.db,
        'SELECT id, username, name, email, role, created_at FROM users WHERE id = $1',
        [userId],
        `rbac_get_user_${userId}`
      );

      if (userQuery.length === 0) return null;

      const user = userQuery[0];

      // Get user roles
      const rolesQuery = `
        SELECT r.*, ur.event_id, ur.expires_at, ur.assigned_at
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true
          AND r.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND ($2::integer IS NULL OR ur.event_id IS NULL OR ur.event_id = $2)
        ORDER BY r.display_name
      `;

      const roles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        rolesQuery,
        [userId, eventId || null],
        `rbac_get_user_roles_${userId}_${eventId || 'global'}`
      );

      // Get effective permissions
      const { effectivePermissions } = await this.getUserPermissions(userId, eventId);

      return {
        user,
        roles: roles as (Role & { eventId?: number; expiresAt?: string })[],
        permissions: effectivePermissions
      };

    } catch (error) {
      console.error('❌ Failed to get user with roles:', error);
      throw new Error(`Failed to get user with roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== AUDIT LOGGING =====================

  /**
   * Log RBAC audit event
   */
  private async logAuditEvent(auditData: Omit<InsertRbacAuditLog, 'timestamp'>): Promise<void> {
    try {
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        `INSERT INTO rbac_audit_log (
          action, resource_type, resource_id, target_user_id, performed_by,
          old_value, new_value, ip_address, user_agent, session_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          auditData.action,
          auditData.resourceType,
          auditData.resourceId,
          auditData.targetUserId || null,
          auditData.performedBy,
          auditData.oldValue ? JSON.stringify(auditData.oldValue) : null,
          auditData.newValue ? JSON.stringify(auditData.newValue) : null,
          auditData.ipAddress || null,
          auditData.userAgent || null,
          auditData.sessionId || null
        ]
      );

    } catch (error) {
      console.error('❌ Failed to log audit event:', error);
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Get audit log with filtering
   */
  async getAuditLog(options: {
    userId?: number;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<RbacAuditLog[]> {
    try {
      let query = 'SELECT * FROM rbac_audit_log WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (options.userId) {
        query += ` AND (target_user_id = $${paramIndex} OR performed_by = $${paramIndex})`;
        queryParams.push(options.userId);
        paramIndex++;
      }

      if (options.action) {
        query += ` AND action = $${paramIndex++}`;
        queryParams.push(options.action);
      }

      if (options.resourceType) {
        query += ` AND resource_type = $${paramIndex++}`;
        queryParams.push(options.resourceType);
      }

      query += ' ORDER BY timestamp DESC';

      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex++}`;
        queryParams.push(options.offset);
      }

      const auditLogs = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        queryParams,
        `rbac_get_audit_log_${JSON.stringify(options)}`
      );

      return auditLogs as RbacAuditLog[];

    } catch (error) {
      console.error('❌ Failed to get audit log:', error);
      throw new Error(`Failed to get audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== BULK OPERATIONS =====================

  /**
   * Bulk assign roles to multiple users
   */
  async bulkAssignRoles(assignments: Array<{
    userId: number;
    roleId: number;
    eventId?: number;
    expiresAt?: Date;
  }>, assignedBy: number): Promise<UserRole[]> {
    const results: UserRole[] = [];
    
    try {
      for (const assignment of assignments) {
        const userRole = await this.assignRoleToUser(
          assignment.userId,
          assignment.roleId,
          assignedBy,
          {
            eventId: assignment.eventId,
            expiresAt: assignment.expiresAt
          }
        );
        results.push(userRole);
      }

      // Log bulk operation
      await this.logAuditEvent({
        action: 'bulk_role_assignment',
        resourceType: 'user_role',
        resourceId: `bulk_${assignments.length}`,
        newValue: { assignments, count: assignments.length },
        performedBy: assignedBy
      });

      console.log(`✅ Bulk assigned ${assignments.length} roles`);
      return results;

    } catch (error) {
      console.error('❌ Bulk role assignment failed:', error);
      throw new Error(`Bulk role assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk update role permissions
   */
  async bulkUpdateRolePermissions(roleId: number, permissionIds: number[], updatedBy: number): Promise<void> {
    try {
      // Remove all existing permissions
      await schemaValidationService.executeOptimizedQuery(
        this.db,
        'DELETE FROM role_permissions WHERE role_id = $1',
        [roleId]
      );

      // Add new permissions
      if (permissionIds.length > 0) {
        const values = permissionIds.map((_, index) => 
          `($1, $${index + 2}, $${permissionIds.length + 2}, NOW())`
        ).join(', ');

        await schemaValidationService.executeOptimizedQuery(
          this.db,
          `INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at) VALUES ${values}`,
          [roleId, ...permissionIds, updatedBy]
        );
      }

      // Log audit event
      await this.logAuditEvent({
        action: 'role_permissions_updated',
        resourceType: 'role',
        resourceId: roleId.toString(),
        newValue: { permissionIds, count: permissionIds.length },
        performedBy: updatedBy
      });

      console.log(`✅ Updated permissions for role ${roleId}: ${permissionIds.length} permissions`);

    } catch (error) {
      console.error('❌ Failed to bulk update role permissions:', error);
      throw new Error(`Bulk permission update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== ROLE INHERITANCE =====================

  /**
   * Create role hierarchy (role inheritance)
   */
  async createRoleHierarchy(parentRoleId: number, childRoleId: number, createdBy: number): Promise<void> {
    try {
      // Check if hierarchy already exists
      const existing = await schemaValidationService.executeOptimizedQuery(
        this.db,
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id IN (SELECT permission_id FROM role_permissions WHERE role_id = $2)',
        [childRoleId, parentRoleId]
      );

      // Get parent role permissions
      const parentPermissions = await this.getRolePermissions(parentRoleId);
      
      // Assign all parent permissions to child role
      for (const permission of parentPermissions) {
        try {
          await this.assignPermissionToRole(childRoleId, permission.id, createdBy);
        } catch (error) {
          // Permission might already exist, continue
        }
      }

      // Log audit event
      await this.logAuditEvent({
        action: 'role_hierarchy_created',
        resourceType: 'role_hierarchy',
        resourceId: `${parentRoleId}-${childRoleId}`,
        newValue: { parentRoleId, childRoleId, inheritedPermissions: parentPermissions.length },
        performedBy: createdBy
      });

      console.log(`✅ Role hierarchy created: ${childRoleId} inherits from ${parentRoleId}`);

    } catch (error) {
      console.error('❌ Failed to create role hierarchy:', error);
      throw new Error(`Role hierarchy creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== ADVANCED QUERIES =====================

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: number, eventId?: number): Promise<Array<{
    user: any;
    assignment: UserRole;
  }>> {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.name, u.email, u.created_at,
          ur.id as assignment_id, ur.event_id, ur.assigned_at, ur.expires_at
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.role_id = $1 
          AND ur.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND ($2::integer IS NULL OR ur.event_id IS NULL OR ur.event_id = $2)
        ORDER BY u.name
      `;

      const results = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        [roleId, eventId || null],
        `rbac_get_users_by_role_${roleId}_${eventId || 'global'}`
      );

      return results.map((row: any) => ({
        user: {
          id: row.id,
          username: row.username,
          name: row.name,
          email: row.email,
          createdAt: row.created_at
        },
        assignment: {
          id: row.assignment_id,
          userId: row.id,
          roleId: roleId,
          eventId: row.event_id,
          assignedAt: row.assigned_at,
          expiresAt: row.expires_at,
          isActive: true
        } as UserRole
      }));

    } catch (error) {
      console.error('❌ Failed to get users by role:', error);
      throw new Error(`Failed to get users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get role usage statistics
   */
  async getRoleStatistics(): Promise<Array<{
    role: Role;
    userCount: number;
    permissionCount: number;
    activeAssignments: number;
    expiredAssignments: number;
  }>> {
    try {
      const query = `
        SELECT 
          r.*,
          COALESCE(user_stats.user_count, 0) as user_count,
          COALESCE(user_stats.active_assignments, 0) as active_assignments,
          COALESCE(user_stats.expired_assignments, 0) as expired_assignments,
          COALESCE(perm_stats.permission_count, 0) as permission_count
        FROM roles r
        LEFT JOIN (
          SELECT 
            role_id,
            COUNT(DISTINCT user_id) as user_count,
            COUNT(CASE WHEN is_active = true AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 END) as active_assignments,
            COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_assignments
          FROM user_roles
          GROUP BY role_id
        ) user_stats ON r.id = user_stats.role_id
        LEFT JOIN (
          SELECT 
            role_id,
            COUNT(*) as permission_count
          FROM role_permissions
          GROUP BY role_id
        ) perm_stats ON r.id = perm_stats.role_id
        WHERE r.is_active = true
        ORDER BY r.display_name
      `;

      const results = await schemaValidationService.executeOptimizedQuery(
        this.db,
        query,
        [],
        'rbac_role_statistics'
      );

      return results.map((row: any) => ({
        role: {
          id: row.id,
          name: row.name,
          displayName: row.display_name,
          description: row.description,
          isActive: row.is_active,
          isSystemRole: row.is_system_role,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        } as Role,
        userCount: parseInt(row.user_count),
        permissionCount: parseInt(row.permission_count),
        activeAssignments: parseInt(row.active_assignments),
        expiredAssignments: parseInt(row.expired_assignments)
      }));

    } catch (error) {
      console.error('❌ Failed to get role statistics:', error);
      throw new Error(`Failed to get role statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search users with role and permission filters
   */
  async searchUsers(criteria: {
    query?: string;
    roleId?: number;
    permissionName?: string;
    eventId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    user: any;
    roles: Role[];
    permissions: string[];
  }>> {
    try {
      let baseQuery = `
        SELECT DISTINCT u.id, u.username, u.name, u.email, u.created_at
        FROM users u
      `;

      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (criteria.roleId) {
        baseQuery += ` JOIN user_roles ur ON u.id = ur.user_id`;
        conditions.push(`ur.role_id = $${paramIndex++} AND ur.is_active = true`);
        queryParams.push(criteria.roleId);
      }

      if (criteria.permissionName) {
        baseQuery += `
          JOIN user_roles ur2 ON u.id = ur2.user_id
          JOIN role_permissions rp ON ur2.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
        `;
        conditions.push(`p.name = $${paramIndex++} AND ur2.is_active = true`);
        queryParams.push(criteria.permissionName);
      }

      if (criteria.eventId) {
        conditions.push(`(ur.event_id IS NULL OR ur.event_id = $${paramIndex++})`);
        queryParams.push(criteria.eventId);
      }

      if (criteria.query) {
        conditions.push(`(u.name ILIKE $${paramIndex++} OR u.email ILIKE $${paramIndex++} OR u.username ILIKE $${paramIndex++})`);
        const searchTerm = `%${criteria.query}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        baseQuery += ` WHERE ${conditions.join(' AND ')}`;
      }

      baseQuery += ` ORDER BY u.name`;

      if (criteria.limit) {
        baseQuery += ` LIMIT $${paramIndex++}`;
        queryParams.push(criteria.limit);
      }

      if (criteria.offset) {
        baseQuery += ` OFFSET $${paramIndex++}`;
        queryParams.push(criteria.offset);
      }

      const users = await schemaValidationService.executeOptimizedQuery(
        this.db,
        baseQuery,
        queryParams,
        `rbac_search_users_${JSON.stringify(criteria)}`
      );

      // Get roles and permissions for each user
      const results = await Promise.all(
        users.map(async (user: any) => {
          const userData = await this.getUserWithRoles(user.id, criteria.eventId);
          return {
            user: user,
            roles: userData?.roles || [],
            permissions: userData?.permissions || []
          };
        })
      );

      return results;

    } catch (error) {
      console.error('❌ Failed to search users:', error);
      throw new Error(`User search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== RBAC VALIDATION =====================

  /**
   * Validate RBAC system integrity
   */
  async validateRBACIntegrity(): Promise<{
    valid: boolean;
    issues: Array<{
      type: 'error' | 'warning';
      message: string;
      details?: any;
    }>;
  }> {
    const issues: Array<{ type: 'error' | 'warning'; message: string; details?: any }> = [];

    try {
      // Check for orphaned role assignments
      const orphanedRoles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT ur.id, ur.user_id, ur.role_id 
         FROM user_roles ur 
         LEFT JOIN roles r ON ur.role_id = r.id 
         WHERE r.id IS NULL OR r.is_active = false`,
        []
      );

      if (orphanedRoles.length > 0) {
        issues.push({
          type: 'error',
          message: `Found ${orphanedRoles.length} orphaned role assignments`,
          details: orphanedRoles
        });
      }

      // Check for orphaned permission assignments
      const orphanedPermissions = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT rp.id, rp.role_id, rp.permission_id 
         FROM role_permissions rp 
         LEFT JOIN permissions p ON rp.permission_id = p.id 
         WHERE p.id IS NULL OR p.is_active = false`,
        []
      );

      if (orphanedPermissions.length > 0) {
        issues.push({
          type: 'error',
          message: `Found ${orphanedPermissions.length} orphaned permission assignments`,
          details: orphanedPermissions
        });
      }

      // Check for expired assignments that should be cleaned up
      const expiredAssignments = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT COUNT(*) as count FROM user_roles 
         WHERE expires_at < NOW() AND is_active = true`,
        []
      );

      if (parseInt(expiredAssignments[0].count) > 0) {
        issues.push({
          type: 'warning',
          message: `Found ${expiredAssignments[0].count} expired role assignments that should be cleaned up`
        });
      }

      // Check for users without any roles
      const usersWithoutRoles = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `SELECT u.id, u.username, u.email 
         FROM users u 
         LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
         WHERE ur.id IS NULL`,
        []
      );

      if (usersWithoutRoles.length > 0) {
        issues.push({
          type: 'warning',
          message: `Found ${usersWithoutRoles.length} users without any role assignments`,
          details: usersWithoutRoles.slice(0, 10) // Limit to first 10 for brevity
        });
      }

      return {
        valid: issues.filter(i => i.type === 'error').length === 0,
        issues
      };

    } catch (error) {
      console.error('❌ RBAC integrity validation failed:', error);
      return {
        valid: false,
        issues: [{
          type: 'error',
          message: 'Failed to perform integrity validation',
          details: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  /**
   * Clean up expired role assignments
   */
  async cleanupExpiredAssignments(): Promise<number> {
    try {
      const result = await schemaValidationService.executeOptimizedQuery(
        this.db,
        `UPDATE user_roles 
         SET is_active = false 
         WHERE expires_at < NOW() AND is_active = true
         RETURNING id`,
        []
      );

      const cleanedCount = result.length;

      if (cleanedCount > 0) {
        await this.logAuditEvent({
          action: 'cleanup_expired_assignments',
          resourceType: 'user_role',
          resourceId: 'bulk_cleanup',
          newValue: { cleanedCount },
          performedBy: 0 // System operation
        });

        console.log(`✅ Cleaned up ${cleanedCount} expired role assignments`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('❌ Failed to cleanup expired assignments:', error);
      throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================== INITIALIZATION =====================

  /**
   * Initialize RBAC system with core roles and permissions
   */
  async initializeRBAC(adminUserId: number): Promise<void> {
    try {
      console.log('🔒 Initializing RBAC system...');

      // Create core permissions
      const existingPermissions = await this.getPermissions();
      const existingPermissionNames = new Set(existingPermissions.map(p => p.name));

      for (const permissionName of Object.values(CORE_PERMISSIONS)) {
        if (!existingPermissionNames.has(permissionName)) {
          const [resource, action] = permissionName.split(':');
          await this.createPermission({
            name: permissionName,
            displayName: permissionName.replace(/[_:]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
            resource,
            action,
            isActive: true
          });
        }
      }

      // Create core roles
      const existingRoles = await this.getRoles({ includeSystemRoles: true });
      const existingRoleNames = new Set(existingRoles.map(r => r.name));

      for (const roleConfig of Object.values(CORE_ROLES)) {
        if (!existingRoleNames.has(roleConfig.name)) {
          const role = await this.createRole({
            name: roleConfig.name,
            displayName: roleConfig.displayName,
            description: roleConfig.description,
            isActive: true,
            isSystemRole: roleConfig.isSystemRole
          }, adminUserId);

          // Assign permissions to role
          const allPermissions = await this.getPermissions();
          const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]));

          for (const permissionName of roleConfig.permissions) {
            const permissionId = permissionMap.get(permissionName);
            if (permissionId) {
              await this.assignPermissionToRole(role.id, permissionId, adminUserId);
            }
          }
        }
      }

      console.log('✅ RBAC system initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize RBAC system:', error);
      throw new Error(`RBAC initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
let rbacService: RBACService | null = null;

export function initializeRBACService(db: DatabaseConnection): RBACService {
  if (!rbacService) {
    rbacService = new RBACService(db);
    console.log('✅ RBAC service initialized');
  }
  return rbacService;
}

export function getRBACService(): RBACService {
  if (!rbacService) {
    throw new Error('RBAC service not initialized');
  }
  return rbacService;
}

export async function cleanupRBACService(): Promise<void> {
  if (rbacService) {
    rbacService = null;
    console.log('✅ RBAC service cleaned up');
  }
}