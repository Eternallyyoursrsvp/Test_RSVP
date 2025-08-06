/**
 * Role Management Component
 * Complete role management interface with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  isSystemRole: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
}

interface Permission {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  isActive: boolean;
}

interface RoleStatistics {
  role: Role;
  userCount: number;
  permissionCount: number;
  activeAssignments: number;
  expiredAssignments: number;
}

interface RoleManagementProps {
  eventId?: number;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({ eventId }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleStatistics, setRoleStatistics] = useState<RoleStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [filterSystemRoles, setFilterSystemRoles] = useState('all');

  // Form states
  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    isActive: true
  });

  const [editRole, setEditRole] = useState({
    displayName: '',
    description: '',
    isActive: true
  });

  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // Fetch data
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/rbac/roles?includeInactive=true&includeSystemRoles=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const result = await response.json();
      setRoles(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/v1/rbac/permissions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const result = await response.json();
      setPermissions(result.data);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const fetchRoleStatistics = async () => {
    try {
      const response = await fetch('/api/v1/rbac/analytics/roles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch role statistics');
      }

      const result = await response.json();
      setRoleStatistics(result.data);
    } catch (err) {
      console.error('Failed to fetch role statistics:', err);
    }
  };

  const fetchRoleDetails = async (roleId: number) => {
    try {
      const response = await fetch(`/api/v1/rbac/roles/${roleId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch role details');
      }

      const result = await response.json();
      setSelectedRole(result.data);
      setSelectedPermissions(result.data.permissions?.map((p: Permission) => p.id) || []);
    } catch (err) {
      console.error('Failed to fetch role details:', err);
    }
  };

  // CRUD operations
  const createRole = async () => {
    try {
      const response = await fetch('/api/v1/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRole),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create role');
      }

      await fetchRoles();
      await fetchRoleStatistics();
      setShowCreateDialog(false);
      setNewRole({ name: '', displayName: '', description: '', isActive: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    }
  };

  const updateRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/v1/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editRole),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update role');
      }

      await fetchRoles();
      await fetchRoleStatistics();
      setShowEditDialog(false);
      setSelectedRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const updateRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/v1/rbac/roles/${selectedRole.id}/permissions/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionIds: selectedPermissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update role permissions');
      }

      await fetchRoles();
      await fetchRoleStatistics();
      setShowPermissionsDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role permissions');
    }
  };

  // Event handlers
  const handleCreateRole = () => {
    setNewRole({ name: '', displayName: '', description: '', isActive: true });
    setShowCreateDialog(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditRole({
      displayName: role.displayName,
      description: role.description || '',
      isActive: role.isActive
    });
    setShowEditDialog(true);
  };

  const handleManagePermissions = async (role: Role) => {
    setSelectedRole(role);
    await fetchRoleDetails(role.id);
    setShowPermissionsDialog(true);
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Filter roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActiveFilter = filterActive === 'all' || 
                               (filterActive === 'active' && role.isActive) ||
                               (filterActive === 'inactive' && !role.isActive);
    
    const matchesSystemFilter = filterSystemRoles === 'all' ||
                               (filterSystemRoles === 'system' && role.isSystemRole) ||
                               (filterSystemRoles === 'custom' && !role.isSystemRole);

    return matchesSearch && matchesActiveFilter && matchesSystemFilter;
  });

  // Get statistics for a role
  const getRoleStats = (roleId: number) => {
    return roleStatistics.find(stat => stat.role.id === roleId);
  };

  // Initial load
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchRoleStatistics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-gray-600">Manage system roles and permissions</p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-gray-600">
              {roles.filter(r => r.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Roles</CardTitle>
            <Settings className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter(r => r.isSystemRole).length}
            </div>
            <p className="text-xs text-gray-600">Built-in roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
            <Plus className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter(r => !r.isSystemRole).length}
            </div>
            <p className="text-xs text-gray-600">User-defined roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <CheckCircle className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
            <p className="text-xs text-gray-600">Available permissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search Roles</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search by name or display name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type-filter">Type</Label>
              <Select value={filterSystemRoles} onValueChange={setFilterSystemRoles}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Showing {filteredRoles.length} of {roles.length} roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => {
                  const stats = getRoleStats(role.id);
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{role.displayName}</div>
                          <div className="text-sm text-gray-500">{role.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={role.description}>
                          {role.description || 'No description'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isSystemRole ? "default" : "secondary"}>
                          {role.isSystemRole ? 'System' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isActive ? "default" : "secondary"}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{stats?.activeAssignments || 0}</span>
                          {stats?.expiredAssignments && stats.expiredAssignments > 0 && (
                            <span className="text-xs text-red-500">
                              (+{stats.expiredAssignments} expired)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Shield className="w-4 h-4 text-gray-400" />
                          <span>{stats?.permissionCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRole(role)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManagePermissions(role)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Manage Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a new role with specific permissions and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., event_coordinator"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase letters and underscores only
              </p>
            </div>
            
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="e.g., Event Coordinator"
                value={newRole.displayName}
                onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role's purpose and responsibilities..."
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-active"
                checked={newRole.isActive}
                onCheckedChange={(checked) => 
                  setNewRole({ ...newRole, isActive: checked as boolean })
                }
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createRole} disabled={!newRole.name || !newRole.displayName}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={editRole.displayName}
                onChange={(e) => setEditRole({ ...editRole, displayName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editRole.description}
                onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is-active"
                checked={editRole.isActive}
                onCheckedChange={(checked) => 
                  setEditRole({ ...editRole, isActive: checked as boolean })
                }
              />
              <Label htmlFor="edit-is-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateRole} disabled={!editRole.displayName}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage Role Permissions</DialogTitle>
            <DialogDescription>
              Select permissions for {selectedRole?.displayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[400px] space-y-4">
            {Object.entries(
              permissions.reduce((acc, perm) => {
                if (!acc[perm.resource]) acc[perm.resource] = [];
                acc[perm.resource].push(perm);
                return acc;
              }, {} as Record<string, Permission[]>)
            ).map(([resource, resourcePermissions]) => (
              <div key={resource} className="space-y-2">
                <h4 className="font-medium capitalize text-sm text-gray-700">
                  {resource.replace(/_/g, ' ')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                  {resourcePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${permission.id}`}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() => handlePermissionToggle(permission.id)}
                      />
                      <Label 
                        htmlFor={`perm-${permission.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {permission.displayName}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateRolePermissions}>
              Update Permissions ({selectedPermissions.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;