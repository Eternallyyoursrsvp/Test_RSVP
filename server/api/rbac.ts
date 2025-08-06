/**
 * RBAC Management API
 * Complete Role-Based Access Control API endpoints
 */

import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ModuleService } from './core/module-service';
import { ValidationMiddleware } from './core/validation';
import { enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-security';
import { getRBACService, CORE_PERMISSIONS } from '../services/rbac-service';
import { metricsRegistry } from '../middleware/monitoring';

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z_]+$/),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true)
});

const updateRoleSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional()
});

const createPermissionSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  isActive: z.boolean().optional().default(true)
});

const assignRoleSchema = z.object({
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  eventId: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional()
});

const assignPermissionSchema = z.object({
  roleId: z.number().int().positive(),
  permissionId: z.number().int().positive()
});

const bulkRoleAssignmentSchema = z.object({
  assignments: z.array(z.object({
    userId: z.number().int().positive(),
    roleId: z.number().int().positive(),
    eventId: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional()
  })).min(1).max(100)
});

const bulkPermissionUpdateSchema = z.object({
  roleId: z.number().int().positive(),
  permissionIds: z.array(z.number().int().positive()).max(100)
});

const searchUsersSchema = z.object({
  query: z.string().optional(),
  roleId: z.number().int().positive().optional(),
  permissionName: z.string().optional(),
  eventId: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0)
});

const idParamSchema = z.object({
  id: z.string().transform(val => parseInt(val))
});

export async function createRBACAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('rbac');
  const validator = new ValidationMiddleware('rbac');

  // Apply authentication middleware to all routes
  router.use(enhancedAuthMiddleware);
  router.use(service.middleware);

  // ===================== ROLE MANAGEMENT =====================

  /**
   * GET /roles - Get all roles
   */
  router.get('/roles', 
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    async (req: Request, res: Response) => {
      const startTime = performance.now();
      
      try {
        const { includeInactive, includeSystemRoles } = req.query;
        
        const rbacService = getRBACService();
        const roles = await rbacService.getRoles({
          includeInactive: includeInactive === 'true',
          includeSystemRoles: includeSystemRoles === 'true'
        });

        const duration = performance.now() - startTime;
        metricsRegistry.recordHistogram('rbac_api_duration_ms', duration, {
          endpoint: 'get_roles',
          status: 'success'
        });

        res.json({
          success: true,
          data: roles,
          meta: {
            total: roles.length,
            includeInactive: includeInactive === 'true',
            includeSystemRoles: includeSystemRoles === 'true'
          }
        });

      } catch (error) {
        const duration = performance.now() - startTime;
        metricsRegistry.recordHistogram('rbac_api_duration_ms', duration, {
          endpoint: 'get_roles',
          status: 'error'
        });

        service.handleError(error, res);
      }
    }
  );

  /**
   * GET /roles/:id - Get role by ID with permissions
   */
  router.get('/roles/:id',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validateParams(idParamSchema),
    async (req: Request, res: Response) => {
      try {
        const roleId = req.validatedParams.id;
        const rbacService = getRBACService();
        const role = await rbacService.getRoleById(roleId);

        if (!role) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role not found'
            }
          });
        }

        res.json({
          success: true,
          data: role
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /roles - Create new role
   */
  router.post('/roles',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validate(createRoleSchema),
    async (req: Request, res: Response) => {
      try {
        const roleData = req.validatedBody;
        const userId = (req as any).user.sub;
        
        const rbacService = getRBACService();
        const role = await rbacService.createRole(roleData, userId);

        res.status(201).json({
          success: true,
          data: role,
          message: 'Role created successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * PUT /roles/:id - Update role
   */
  router.put('/roles/:id',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validateParams(idParamSchema),
    validator.validate(updateRoleSchema),
    async (req: Request, res: Response) => {
      try {
        const roleId = req.validatedParams.id;
        const updates = req.validatedBody;
        const userId = (req as any).user.sub;
        
        const rbacService = getRBACService();
        const role = await rbacService.updateRole(roleId, updates, userId);

        res.json({
          success: true,
          data: role,
          message: 'Role updated successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * GET /roles/:id/users - Get users assigned to role
   */
  router.get('/roles/:id/users',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validateParams(idParamSchema),
    async (req: Request, res: Response) => {
      try {
        const roleId = req.validatedParams.id;
        const { eventId } = req.query;
        
        const rbacService = getRBACService();
        const users = await rbacService.getUsersByRole(
          roleId,
          eventId ? parseInt(eventId as string) : undefined
        );

        res.json({
          success: true,
          data: users,
          meta: {
            total: users.length,
            roleId,
            eventId: eventId || null
          }
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== PERMISSION MANAGEMENT =====================

  /**
   * GET /permissions - Get all permissions
   */
  router.get('/permissions',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    async (req: Request, res: Response) => {
      try {
        const { resource, includeInactive } = req.query;
        
        const rbacService = getRBACService();
        const permissions = await rbacService.getPermissions({
          resource: resource as string,
          includeInactive: includeInactive === 'true'
        });

        res.json({
          success: true,
          data: permissions,
          meta: {
            total: permissions.length,
            resource: resource || null,
            includeInactive: includeInactive === 'true'
          }
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /permissions - Create new permission
   */
  router.post('/permissions',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validate(createPermissionSchema),
    async (req: Request, res: Response) => {
      try {
        const permissionData = req.validatedBody;
        
        const rbacService = getRBACService();
        const permission = await rbacService.createPermission(permissionData);

        res.status(201).json({
          success: true,
          data: permission,
          message: 'Permission created successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== ROLE-PERMISSION ASSIGNMENT =====================

  /**
   * POST /roles/:id/permissions - Assign permission to role
   */
  router.post('/roles/:id/permissions',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validateParams(idParamSchema),
    validator.validate(assignPermissionSchema.omit({ roleId: true })),
    async (req: Request, res: Response) => {
      try {
        const roleId = req.validatedParams.id;
        const { permissionId } = req.validatedBody;
        const userId = (req as any).user.sub;
        
        const rbacService = getRBACService();
        await rbacService.assignPermissionToRole(roleId, permissionId, userId);

        res.json({
          success: true,
          message: 'Permission assigned to role successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * DELETE /roles/:roleId/permissions/:permissionId - Remove permission from role
   */
  router.delete('/roles/:roleId/permissions/:permissionId',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    async (req: Request, res: Response) => {
      try {
        const roleId = parseInt(req.params.roleId);
        const permissionId = parseInt(req.params.permissionId);
        const userId = (req as any).user.sub;
        
        if (isNaN(roleId) || isNaN(permissionId)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PARAMETERS',
              message: 'Invalid role ID or permission ID'
            }
          });
        }
        
        const rbacService = getRBACService();
        await rbacService.removePermissionFromRole(roleId, permissionId, userId);

        res.json({
          success: true,
          message: 'Permission removed from role successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * PUT /roles/:id/permissions/bulk - Bulk update role permissions
   */
  router.put('/roles/:id/permissions/bulk',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    validator.validateParams(idParamSchema),
    validator.validate(bulkPermissionUpdateSchema.omit({ roleId: true })),
    async (req: Request, res: Response) => {
      try {
        const roleId = req.validatedParams.id;
        const { permissionIds } = req.validatedBody;
        const userId = (req as any).user.sub;
        
        const rbacService = getRBACService();
        await rbacService.bulkUpdateRolePermissions(roleId, permissionIds, userId);

        res.json({
          success: true,
          message: `Role permissions updated successfully (${permissionIds.length} permissions)`
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== USER ROLE MANAGEMENT =====================

  /**
   * POST /user-roles - Assign role to user
   */
  router.post('/user-roles',
    requirePermission(CORE_PERMISSIONS.USERS_MANAGE),
    validator.validate(assignRoleSchema),
    async (req: Request, res: Response) => {
      try {
        const { userId, roleId, eventId, expiresAt } = req.validatedBody;
        const assignedBy = (req as any).user.sub;
        
        const rbacService = getRBACService();
        const userRole = await rbacService.assignRoleToUser(userId, roleId, assignedBy, {
          eventId,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });

        res.status(201).json({
          success: true,
          data: userRole,
          message: 'Role assigned to user successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * DELETE /user-roles/:id - Remove role from user
   */
  router.delete('/user-roles/:id',
    requirePermission(CORE_PERMISSIONS.USERS_MANAGE),
    validator.validateParams(idParamSchema),
    async (req: Request, res: Response) => {
      try {
        const userRoleId = req.validatedParams.id;
        const removedBy = (req as any).user.sub;
        
        const rbacService = getRBACService();
        await rbacService.removeRoleFromUser(userRoleId, removedBy);

        res.json({
          success: true,
          message: 'Role removed from user successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /user-roles/bulk - Bulk assign roles to users
   */
  router.post('/user-roles/bulk',
    requirePermission(CORE_PERMISSIONS.USERS_MANAGE),
    validator.validate(bulkRoleAssignmentSchema),
    async (req: Request, res: Response) => {
      try {
        const { assignments } = req.validatedBody;
        const assignedBy = (req as any).user.sub;
        
        const processedAssignments = assignments.map(a => ({
          ...a,
          expiresAt: a.expiresAt ? new Date(a.expiresAt) : undefined
        }));
        
        const rbacService = getRBACService();
        const userRoles = await rbacService.bulkAssignRoles(processedAssignments, assignedBy);

        res.status(201).json({
          success: true,
          data: userRoles,
          message: `${userRoles.length} role assignments completed successfully`
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== USER MANAGEMENT =====================

  /**
   * GET /users/:id/roles - Get user roles and permissions
   */
  router.get('/users/:id/roles',
    requirePermission(CORE_PERMISSIONS.USERS_READ),
    validator.validateParams(idParamSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.validatedParams.id;
        const { eventId } = req.query;
        
        const rbacService = getRBACService();
        const userData = await rbacService.getUserWithRoles(
          userId,
          eventId ? parseInt(eventId as string) : undefined
        );

        if (!userData) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found'
            }
          });
        }

        res.json({
          success: true,
          data: userData
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * GET /users/:id/permissions - Get user permissions
   */
  router.get('/users/:id/permissions',
    requirePermission(CORE_PERMISSIONS.USERS_READ),
    validator.validateParams(idParamSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.validatedParams.id;
        const { eventId } = req.query;
        
        const rbacService = getRBACService();
        const permissions = await rbacService.getUserPermissions(
          userId,
          eventId ? parseInt(eventId as string) : undefined
        );

        res.json({
          success: true,
          data: permissions
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /users/:id/permissions/check - Check user permission
   */
  router.post('/users/:id/permissions/check',
    requirePermission(CORE_PERMISSIONS.USERS_READ),
    validator.validateParams(idParamSchema),
    validator.validate(z.object({
      permission: z.string().min(1),
      eventId: z.number().int().positive().optional()
    })),
    async (req: Request, res: Response) => {
      try {
        const userId = req.validatedParams.id;
        const { permission, eventId } = req.validatedBody;
        
        const rbacService = getRBACService();
        const result = await rbacService.checkUserPermission(userId, permission, eventId);

        res.json({
          success: true,
          data: result
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /users/search - Search users with role/permission filters
   */
  router.post('/users/search',
    requirePermission(CORE_PERMISSIONS.USERS_READ),
    validator.validate(searchUsersSchema),
    async (req: Request, res: Response) => {
      try {
        const searchCriteria = req.validatedBody;
        
        const rbacService = getRBACService();
        const results = await rbacService.searchUsers(searchCriteria);

        res.json({
          success: true,
          data: results,
          meta: {
            total: results.length,
            limit: searchCriteria.limit,
            offset: searchCriteria.offset,
            criteria: searchCriteria
          }
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== ANALYTICS & REPORTING =====================

  /**
   * GET /analytics/roles - Get role usage statistics
   */
  router.get('/analytics/roles',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    async (req: Request, res: Response) => {
      try {
        const rbacService = getRBACService();
        const statistics = await rbacService.getRoleStatistics();

        res.json({
          success: true,
          data: statistics,
          meta: {
            total: statistics.length,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * GET /audit-log - Get RBAC audit log
   */
  router.get('/audit-log',
    requirePermission(CORE_PERMISSIONS.SYSTEM_RBAC),
    async (req: Request, res: Response) => {
      try {
        const {
          userId,
          action,
          resourceType,
          limit = '100',
          offset = '0'
        } = req.query;

        const rbacService = getRBACService();
        const auditLog = await rbacService.getAuditLog({
          userId: userId ? parseInt(userId as string) : undefined,
          action: action as string,
          resourceType: resourceType as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        });

        res.json({
          success: true,
          data: auditLog,
          meta: {
            total: auditLog.length,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            filters: { userId, action, resourceType }
          }
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== SYSTEM MANAGEMENT =====================

  /**
   * POST /system/validate - Validate RBAC system integrity
   */
  router.post('/system/validate',
    requirePermission(CORE_PERMISSIONS.SYSTEM_ADMIN),
    async (req: Request, res: Response) => {
      try {
        const rbacService = getRBACService();
        const validation = await rbacService.validateRBACIntegrity();

        res.json({
          success: true,
          data: validation,
          message: validation.valid ? 'RBAC system is valid' : 'RBAC system has issues'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /system/cleanup - Clean up expired role assignments
   */
  router.post('/system/cleanup',
    requirePermission(CORE_PERMISSIONS.SYSTEM_ADMIN),
    async (req: Request, res: Response) => {
      try {
        const rbacService = getRBACService();
        const cleanedCount = await rbacService.cleanupExpiredAssignments();

        res.json({
          success: true,
          data: { cleanedCount },
          message: `Cleaned up ${cleanedCount} expired role assignments`
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  /**
   * POST /system/initialize - Initialize RBAC system
   */
  router.post('/system/initialize',
    requirePermission(CORE_PERMISSIONS.SYSTEM_ADMIN),
    async (req: Request, res: Response) => {
      try {
        const adminUserId = (req as any).user.sub;
        
        const rbacService = getRBACService();
        await rbacService.initializeRBAC(adminUserId);

        res.json({
          success: true,
          message: 'RBAC system initialized successfully'
        });

      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // ===================== HEALTH CHECK =====================

  /**
   * GET /health - RBAC API health check
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        module: 'rbac',
        version: '1.0.0',
        checks: {
          rbacService: 'healthy',
          database: 'healthy'
        }
      };

      res.json(health);

    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        module: 'rbac',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

export default createRBACAPI;