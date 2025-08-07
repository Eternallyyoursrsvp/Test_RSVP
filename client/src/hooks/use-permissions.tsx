import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-utils';

// Core permission constants matching backend
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

export type Permission = typeof CORE_PERMISSIONS[keyof typeof CORE_PERMISSIONS];

interface UserPermissions {
  permissions: Permission[];
  roles: string[];
}

interface PermissionsContextType {
  permissions: Permission[];
  roles: string[];
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  roles: [],
  hasPermission: () => false,
  hasRole: () => false,
  isLoading: true,
  error: null,
  refetch: () => {},
});

interface PermissionsProviderProps {
  children: React.ReactNode;
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Fetch user permissions from backend
  const { 
    data: permissionsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<UserPermissions>({
    queryKey: ['/api/v1/rbac/user/permissions', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No authenticated user');
      const response = await get(`/api/v1/rbac/user/permissions`);
      return response.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fallback role-based permissions when API is unavailable
  const getFallbackPermissions = (userRole: string): Permission[] => {
    switch (userRole) {
      case 'super_admin':
        return [
          CORE_PERMISSIONS.EVENT_CREATE,
          CORE_PERMISSIONS.EVENT_READ,
          CORE_PERMISSIONS.EVENT_UPDATE,
          CORE_PERMISSIONS.EVENT_DELETE,
          CORE_PERMISSIONS.EVENT_MANAGE,
          CORE_PERMISSIONS.GUEST_CREATE,
          CORE_PERMISSIONS.GUEST_READ,
          CORE_PERMISSIONS.GUEST_UPDATE,
          CORE_PERMISSIONS.GUEST_DELETE,
          CORE_PERMISSIONS.GUEST_IMPORT,
          CORE_PERMISSIONS.GUEST_EXPORT,
          CORE_PERMISSIONS.COMMUNICATIONS_SEND,
          CORE_PERMISSIONS.COMMUNICATIONS_READ,
          CORE_PERMISSIONS.COMMUNICATIONS_WRITE,
          CORE_PERMISSIONS.COMMUNICATIONS_MANAGE,
          CORE_PERMISSIONS.ANALYTICS_READ,
          CORE_PERMISSIONS.ANALYTICS_EXPORT,
          CORE_PERMISSIONS.TRANSPORT_READ,
          CORE_PERMISSIONS.TRANSPORT_WRITE,
          CORE_PERMISSIONS.TRANSPORT_MANAGE,
          CORE_PERMISSIONS.SYSTEM_ADMIN,
          CORE_PERMISSIONS.SYSTEM_MONITOR,
          CORE_PERMISSIONS.SYSTEM_RBAC,
          CORE_PERMISSIONS.USERS_READ,
          CORE_PERMISSIONS.USERS_WRITE,
          CORE_PERMISSIONS.USERS_MANAGE,
        ];
      case 'admin':
        return [
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
          CORE_PERMISSIONS.COMMUNICATIONS_MANAGE,
          CORE_PERMISSIONS.ANALYTICS_READ,
          CORE_PERMISSIONS.ANALYTICS_EXPORT,
          CORE_PERMISSIONS.TRANSPORT_READ,
          CORE_PERMISSIONS.TRANSPORT_WRITE,
          CORE_PERMISSIONS.TRANSPORT_MANAGE,
          CORE_PERMISSIONS.SYSTEM_MONITOR,
          CORE_PERMISSIONS.USERS_READ,
        ];
      case 'staff':
        return [
          CORE_PERMISSIONS.EVENT_READ,
          CORE_PERMISSIONS.GUEST_READ,
          CORE_PERMISSIONS.GUEST_UPDATE,
          CORE_PERMISSIONS.COMMUNICATIONS_READ,
          CORE_PERMISSIONS.ANALYTICS_READ,
          CORE_PERMISSIONS.TRANSPORT_READ,
        ];
      case 'couple':
        return [
          CORE_PERMISSIONS.EVENT_READ,
          CORE_PERMISSIONS.GUEST_READ,
          CORE_PERMISSIONS.ANALYTICS_READ,
        ];
      default:
        return [];
    }
  };

  const permissions = (permissionsData as any)?.permissions || (user ? getFallbackPermissions(user.role) : []);
  const roles = (permissionsData as any)?.roles || (user ? [user.role] : []);

  const hasPermission = (permission: Permission | Permission[]): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if ((user.role as string) === 'super_admin') {
      return true;
    }
    
    if (Array.isArray(permission)) {
      return permission.some(perm => permissions.includes(perm));
    }
    
    return permissions.includes(permission);
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.some(r => roles.includes(r));
    }
    
    return roles.includes(role);
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        roles,
        hasPermission,
        hasRole,
        isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// Convenience hooks for common permission checks
export const useCanManageEvents = () => {
  const { hasPermission } = usePermissions();
  return hasPermission([CORE_PERMISSIONS.EVENT_MANAGE, CORE_PERMISSIONS.EVENT_CREATE, CORE_PERMISSIONS.EVENT_UPDATE]);
};

export const useCanManageGuests = () => {
  const { hasPermission } = usePermissions();
  return hasPermission([CORE_PERMISSIONS.GUEST_CREATE, CORE_PERMISSIONS.GUEST_UPDATE, CORE_PERMISSIONS.GUEST_IMPORT]);
};

export const useCanManageCommunications = () => {
  const { hasPermission } = usePermissions();
  return hasPermission([CORE_PERMISSIONS.COMMUNICATIONS_MANAGE, CORE_PERMISSIONS.COMMUNICATIONS_WRITE]);
};

export const useCanViewAnalytics = () => {
  const { hasPermission } = usePermissions();
  return hasPermission(CORE_PERMISSIONS.ANALYTICS_READ);
};

export const useCanManageSystem = () => {
  const { hasPermission } = usePermissions();
  return hasPermission([CORE_PERMISSIONS.SYSTEM_ADMIN, CORE_PERMISSIONS.SYSTEM_MONITOR]);
};

export const useCanManageRBAC = () => {
  const { hasPermission } = usePermissions();
  return hasPermission(CORE_PERMISSIONS.SYSTEM_RBAC);
};

export const useIsAdmin = () => {
  const { hasRole } = usePermissions();
  return hasRole(['admin', 'super_admin']);
};

export const useIsStaff = () => {
  const { hasRole } = usePermissions();
  return hasRole(['admin', 'super_admin', 'staff']);
};