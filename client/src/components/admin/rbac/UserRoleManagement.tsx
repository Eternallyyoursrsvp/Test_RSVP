/**
 * User Role Management Component
 * Complete user-role assignment interface with bulk operations and management
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Users,
  Shield,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  isSystemRole: boolean;
}

interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  eventId?: number;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

interface UserWithRoles {
  user: User;
  roles: (Role & { eventId?: number; expiresAt?: string })[];
  permissions: string[];
}

interface UserRoleManagementProps {
  eventId?: number;
}

interface RoleAssignment {
  userId: number;
  roleId: number;
  eventId?: number;
  expiresAt?: string;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({ eventId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterExpiry, setFilterExpiry] = useState('all');
  
  // Form states
  const [roleAssignment, setRoleAssignment] = useState({
    userId: 0,
    roleId: 0,
    eventId: eventId || undefined,
    expiresAt: ''
  });

  const [bulkAssignments, setBulkAssignments] = useState<RoleAssignment[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bulkRole, setBulkRole] = useState<number>(0);
  const [bulkEventId, setBulkEventId] = useState<number | undefined>(eventId);
  const [bulkExpiresAt, setBulkExpiresAt] = useState('');

  // Fetch data
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/v1/rbac/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          limit: 100
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setUsers(result.data.map((item: any) => item.user));
      setUserRoles(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/v1/rbac/roles?includeSystemRoles=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const result = await response.json();
      setRoles(result.data.filter((role: Role) => role.isActive));
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchUserRoles = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const assignRole = async () => {
    try {
      const payload = {
        ...roleAssignment,
        expiresAt: roleAssignment.expiresAt || undefined
      };

      const response = await fetch('/api/v1/rbac/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to assign role');
      }

      await fetchUserRoles();
      setShowAssignDialog(false);
      setRoleAssignment({
        userId: 0,
        roleId: 0,
        eventId: eventId || undefined,
        expiresAt: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    }
  };

  const bulkAssignRoles = async () => {
    try {
      const assignments = selectedUsers.map(userId => ({
        userId,
        roleId: bulkRole,
        eventId: bulkEventId,
        expiresAt: bulkExpiresAt || undefined
      }));

      const response = await fetch('/api/v1/rbac/user-roles/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to bulk assign roles');
      }

      await fetchUserRoles();
      setShowBulkAssignDialog(false);
      setSelectedUsers([]);
      setBulkRole(0);
      setBulkExpiresAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk assign roles');
    }
  };

  const removeUserRole = async (userRoleId: number) => {
    try {
      const response = await fetch(`/api/v1/rbac/user-roles/${userRoleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to remove role');
      }

      await fetchUserRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    }
  };

  // Event handlers
  const handleAssignRole = (user?: User) => {
    if (user) {
      setRoleAssignment({
        userId: user.id,
        roleId: 0,
        eventId: eventId || undefined,
        expiresAt: ''
      });
    } else {
      setRoleAssignment({
        userId: 0,
        roleId: 0,
        eventId: eventId || undefined,
        expiresAt: ''
      });
    }
    setShowAssignDialog(true);
  };

  const handleBulkAssign = () => {
    setSelectedUsers([]);
    setBulkRole(0);
    setBulkExpiresAt('');
    setShowBulkAssignDialog(true);
  };

  const handleUserSelection = (userId: number, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(filteredUserRoles.map(ur => ur.user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Helper functions
  const getRoleName = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    return role?.displayName || 'Unknown Role';
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
  };

  const isRoleExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isRoleExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry <= threeDaysFromNow;
  };

  // Filter user roles
  const filteredUserRoles = userRoles.filter(userRole => {
    const matchesSearch = userRole.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userRole.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userRole.user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || 
                       userRole.roles.some(role => role.id.toString() === filterRole);
    
    const matchesExpiry = filterExpiry === 'all' ||
                         (filterExpiry === 'expired' && userRole.roles.some(role => isRoleExpired(role.expiresAt))) ||
                         (filterExpiry === 'expiring' && userRole.roles.some(role => isRoleExpiringSoon(role.expiresAt))) ||
                         (filterExpiry === 'permanent' && userRole.roles.some(role => !role.expiresAt));

    return matchesSearch && matchesRole && matchesExpiry;
  });

  // Initial load
  useEffect(() => {
    fetchUserRoles();
  }, [eventId]);

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
          <h2 className="text-2xl font-bold">User Role Management</h2>
          <p className="text-gray-600">Assign and manage user roles and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkAssign}>
            <UserPlus className="w-4 h-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => handleAssignRole()}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Role
          </Button>
        </div>
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
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRoles.length}</div>
            <p className="text-xs text-gray-600">With role assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Shield className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRoles.reduce((acc, ur) => acc + ur.roles.length, 0)}
            </div>
            <p className="text-xs text-gray-600">Active role assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRoles.reduce((acc, ur) => 
                acc + ur.roles.filter(role => isRoleExpiringSoon(role.expiresAt)).length, 0
              )}
            </div>
            <p className="text-xs text-gray-600">Within 3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRoles.reduce((acc, ur) => 
                acc + ur.roles.filter(role => isRoleExpired(role.expiresAt)).length, 0
              )}
            </div>
            <p className="text-xs text-gray-600">Need attention</p>
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
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expiry-filter">Expiry Status</Label>
              <Select value={filterExpiry} onValueChange={setFilterExpiry}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Roles Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Showing {filteredUserRoles.length} of {userRoles.length} users
              </CardDescription>
            </div>
            {selectedUsers.length > 0 && (
              <Badge variant="secondary">
                {selectedUsers.length} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredUserRoles.length && filteredUserRoles.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Expiry Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUserRoles.map((userRole) => (
                  <TableRow key={userRole.user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(userRole.user.id)}
                        onCheckedChange={(checked) => 
                          handleUserSelection(userRole.user.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{userRole.user.name}</div>
                        <div className="text-sm text-gray-500">{userRole.user.email}</div>
                        <div className="text-xs text-gray-400">@{userRole.user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRole.roles.map((role, index) => (
                          <Badge 
                            key={index} 
                            variant={isRoleExpired(role.expiresAt) ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {role.displayName}
                            {role.eventId && ` (Event ${role.eventId})`}
                          </Badge>
                        ))}
                        {userRole.roles.length === 0 && (
                          <span className="text-sm text-gray-500">No roles assigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {userRole.permissions.length} permissions
                        {userRole.permissions.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {userRole.permissions.slice(0, 3).join(', ')}
                            {userRole.permissions.length > 3 && ` +${userRole.permissions.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {userRole.roles.map((role, index) => {
                          if (!role.expiresAt) {
                            return (
                              <Badge key={index} variant="secondary" className="text-xs">
                                Permanent
                              </Badge>
                            );
                          }
                          
                          const expired = isRoleExpired(role.expiresAt);
                          const expiringSoon = isRoleExpiringSoon(role.expiresAt);
                          
                          return (
                            <div key={index} className="text-xs">
                              <Badge 
                                variant={expired ? "destructive" : expiringSoon ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {expired ? 'Expired' : expiringSoon ? 'Expiring Soon' : 'Active'}
                              </Badge>
                              <div className="text-gray-500 mt-1">
                                {new Date(role.expiresAt).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        })}
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
                          <DropdownMenuItem onClick={() => handleAssignRole(userRole.user)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {userRole.roles.map((role, index) => (
                            <DropdownMenuItem 
                              key={index}
                              className="text-red-600"
                              onClick={() => removeUserRole(role.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove {role.displayName}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
            <DialogDescription>
              Assign a role to a user with optional expiry date.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">User</Label>
              <Select 
                value={roleAssignment.userId.toString()} 
                onValueChange={(value) => 
                  setRoleAssignment({ ...roleAssignment, userId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="role-select">Role</Label>
              <Select 
                value={roleAssignment.roleId.toString()} 
                onValueChange={(value) => 
                  setRoleAssignment({ ...roleAssignment, roleId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="expires-at">Expiry Date (Optional)</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={roleAssignment.expiresAt}
                onChange={(e) => 
                  setRoleAssignment({ ...roleAssignment, expiresAt: e.target.value })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for permanent assignment
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={assignRole} 
              disabled={!roleAssignment.userId || !roleAssignment.roleId}
            >
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Assign Roles</DialogTitle>
            <DialogDescription>
              Assign the same role to multiple users at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-role-select">Role to Assign</Label>
              <Select 
                value={bulkRole.toString()} 
                onValueChange={(value) => setBulkRole(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="bulk-expires-at">Expiry Date (Optional)</Label>
              <Input
                id="bulk-expires-at"
                type="datetime-local"
                value={bulkExpiresAt}
                onChange={(e) => setBulkExpiresAt(e.target.value)}
              />
            </div>

            <div>
              <Label>Selected Users ({selectedUsers.length})</Label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                {selectedUsers.map(userId => {
                  const user = users.find(u => u.id === userId);
                  return user ? (
                    <div key={userId} className="text-sm">
                      {user.name} ({user.email})
                    </div>
                  ) : null;
                })}
                {selectedUsers.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No users selected. Select users from the table above.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={bulkAssignRoles} 
              disabled={!bulkRole || selectedUsers.length === 0}
            >
              Assign to {selectedUsers.length} Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoleManagement;