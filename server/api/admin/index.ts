import express, { Router } from 'express';
import { ModuleService } from '../core/module-service';
import { ValidationMiddleware } from '../core/validation';
import { isAuthenticated, isAdmin } from '../../middleware';
import { storage } from '../../storage';
// Legacy demo credentials removed for security
import { z } from 'zod';

const userIdSchema = z.object({
  id: z.string().transform(val => parseInt(val))
});

const userUpdateSchema = z.object({
  username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'couple', 'planner', 'staff']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
});

export async function createAdminAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('admin');
  const validator = new ValidationMiddleware('admin');

  // Apply admin middleware to all routes
  router.use(isAuthenticated, isAdmin);
  router.use(service.middleware);

  // System information endpoint
  router.get('/system/info', async (req, res) => {
    try {
      const [allUsers, allEvents] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllEvents()
      ]);

      res.json({
        users: allUsers.map(u => ({ 
          id: u.id, 
          username: u.username, 
          name: u.name, 
          role: u.role,
          status: u.status || 'active',
          createdAt: u.createdAt
        })),
        events: allEvents.map(e => ({ 
          id: e.id, 
          title: e.title, 
          createdBy: e.createdBy,
          createdAt: e.createdAt
        })),
        authentication: {
          isAuthenticated: req.isAuthenticated(),
          user: req.user ? {
            id: (req.user as Record<string, unknown>).id,
            username: (req.user as Record<string, unknown>).username,
            role: (req.user as Record<string, unknown>).role
          } : null
        },
        system: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        }
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // User management endpoints
  router.get('/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      service.handleError(error, res);
    }
  });

  router.get('/users/:id', validator.validateParams(userIdSchema), async (req, res) => {
    try {
      const userId = req.validatedParams.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      service.handleError(error, res);
    }
  });

  router.put('/users/:id', 
    validator.validateParams(userIdSchema),
    validator.validate(userUpdateSchema),
    async (req, res) => {
      try {
        const userId = req.validatedParams.id;
        const updateData = req.validatedBody;

        const updatedUser = await storage.updateUser(userId, updateData);
        
        if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        const { password, ...safeUser } = updatedUser;
        res.json(safeUser);
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  router.delete('/users/:id', validator.validateParams(userIdSchema), async (req, res) => {
    try {
      const userId = req.validatedParams.id;
      const currentUserId = (req.user as any).id;

      if (userId === currentUserId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Password reset endpoint
  router.post('/users/:id/reset-password', validator.validateParams(userIdSchema), async (req, res) => {
    try {
      const userId = req.validatedParams.id;
      
      // Set password change required flag
      await storage.updateUser(userId, { password_change_required: true });
      
      res.json({ 
        message: 'Password reset initiated. User will be required to change password on next login.',
        passwordChangeRequired: true
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Analytics endpoints
  router.get('/analytics/dashboard', async (req, res) => {
    try {
      const [users, events] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllEvents()
      ]);

      const analytics = {
        users: {
          total: users.length,
          active: users.filter(u => u.status !== 'inactive').length,
          pending: users.filter(u => u.status === 'pending').length,
          byRole: users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        events: {
          total: events.length,
          recentlyCreated: events.filter(e => {
            const created = new Date(e.createdAt || Date.now());
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return created > weekAgo;
          }).length
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          moduleMetrics: service.getMetrics()
        }
      };

      res.json(analytics);
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // System health check
  router.get('/health', async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        module: 'admin',
        checks: {
          database: await checkDatabaseHealth(),
          memory: checkMemoryHealth(),
          moduleMetrics: service.getMetrics()
        }
      };

      const isHealthy = Object.values(health.checks).every(check => 
        typeof check === 'object' ? check.status === 'healthy' : check
      );
      
      res.status(isHealthy ? 200 : 503).json(health);
    } catch (error) {
      service.handleError(error, res);
    }
  });

  return router;
}

async function checkDatabaseHealth() {
  try {
    await storage.getAllUsers();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: (error as Error).message };
  }
}

function checkMemoryHealth() {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  
  return {
    status: heapUsedMB < 512 ? 'healthy' : 'warning',
    heapUsed: Math.round(heapUsedMB),
    heapTotal: Math.round(heapTotalMB),
    utilization: Math.round((heapUsedMB / heapTotalMB) * 100)
  };
}
