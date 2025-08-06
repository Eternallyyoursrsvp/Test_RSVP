/**
 * Transport Group Management Interface
 * Main interface for managing transport groups with drag-and-drop functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Car,
  Users,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Settings,
  Navigation,
  UserPlus,
  Shuffle,
  BarChart3,
  Download,
  RefreshCw,
  Route,
  Calendar
} from 'lucide-react';

// Types
interface TransportGroup {
  id: string;
  eventId: string;
  name: string;
  vehicleId: string;
  driverId?: string;
  passengers: {
    guestId: string;
    guestName: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    specialRequirements: string[];
  }[];
  capacity: number;
  currentOccupancy: number;
  route: {
    location: string;
    type: 'pickup' | 'dropoff' | 'waypoint';
    timestamp?: string;
    coordinates?: { lat: number; lng: number };
  }[];
  status: 'planning' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  estimatedDuration?: number;
  notes?: string;
  vehicleName?: string;
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
}

interface Vehicle {
  id: string;
  name: string;
  type: 'bus' | 'van' | 'car' | 'limousine' | 'shuttle';
  capacity: number;
  status: 'available' | 'assigned' | 'in_use' | 'maintenance' | 'unavailable';
  features: string[];
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  isActive: boolean;
}

interface UnassignedPassenger {
  guestId: string;
  guestName: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  specialRequirements: string[];
  priority: number;
}

interface OptimizationResult {
  groups: TransportGroup[];
  unassignedPassengers: UnassignedPassenger[];
  metrics: {
    totalVehiclesUsed: number;
    averageCapacityUtilization: number;
    totalEstimatedDuration: number;
    optimizationScore: number;
  };
  warnings: string[];
}

// Form Schemas
const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().optional(),
  notes: z.string().optional()
});

const optimizationOptionsSchema = z.object({
  prioritizeCapacity: z.boolean().default(true),
  minimizeVehicles: z.boolean().default(true),
  respectSpecialRequirements: z.boolean().default(true),
  optimizeRoutes: z.boolean().default(false),
  maxTravelTime: z.number().min(15).max(240).default(60)
});

// Component Props
interface GroupManagementProps {
  eventId: string;
  guests: Array<{ id: string; name: string; pickupLocation?: string; dropoffLocation?: string }>;
  onGroupCreated?: (group: TransportGroup) => void;
  onGroupUpdated?: (group: TransportGroup) => void;
}

export const GroupManagement: React.FC<GroupManagementProps> = ({
  eventId,
  guests,
  onGroupCreated,
  onGroupUpdated
}) => {
  // State management
  const [groups, setGroups] = useState<TransportGroup[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unassignedPassengers, setUnassignedPassengers] = useState<UnassignedPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransportGroup['status'] | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TransportGroup | null>(null);

  // Forms
  const createGroupForm = useForm<z.infer<typeof createGroupSchema>>({
    resolver: zodResolver(createGroupSchema)
  });

  const optimizationForm = useForm<z.infer<typeof optimizationOptionsSchema>>({
    resolver: zodResolver(optimizationOptionsSchema),
    defaultValues: {
      prioritizeCapacity: true,
      minimizeVehicles: true,
      respectSpecialRequirements: true,
      optimizeRoutes: false,
      maxTravelTime: 60
    }
  });

  // API calls
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, vehiclesRes, driversRes] = await Promise.all([
        fetch(`/api/transport/groups/event/${eventId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/transport/vehicles/event/${eventId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/transport/drivers/event/${eventId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        if (groupsData.success) {
          setGroups(groupsData.data);
        }
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        if (vehiclesData.success) {
          setVehicles(vehiclesData.data);
        }
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        if (driversData.success) {
          setDrivers(driversData.data);
        }
      }

      // Calculate unassigned passengers
      const assignedGuestIds = new Set(
        groups.flatMap(group => group.passengers.map(p => p.guestId))
      );
      
      const unassigned = guests
        .filter(guest => !assignedGuestIds.has(guest.id))
        .map(guest => ({
          guestId: guest.id,
          guestName: guest.name,
          pickupLocation: guest.pickupLocation,
          dropoffLocation: guest.dropoffLocation,
          specialRequirements: [],
          priority: 1
        }));
      
      setUnassignedPassengers(unassigned);

    } catch (error) {
      console.error('Failed to fetch transport data:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, guests, groups]);

  const createGroup = async (groupData: z.infer<typeof createGroupSchema>) => {
    try {
      const response = await fetch('/api/transport/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...groupData,
          eventId,
          capacity: vehicles.find(v => v.id === groupData.vehicleId)?.capacity || 0,
          currentOccupancy: 0,
          passengers: [],
          route: [],
          status: 'planning'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const newGroup = result.data;
          setGroups(prev => [...prev, newGroup]);
          setShowCreateDialog(false);
          createGroupForm.reset();
          onGroupCreated?.(newGroup);
        }
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const optimizeGroups = async (options: z.infer<typeof optimizationOptionsSchema>) => {
    try {
      setOptimizing(true);
      const response = await fetch('/api/transport/optimize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          passengers: unassignedPassengers,
          options
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const optimizationResult: OptimizationResult = result.data;
          setGroups(prev => [...prev, ...optimizationResult.groups]);
          setUnassignedPassengers(optimizationResult.unassignedPassengers);
          setShowOptimizationDialog(false);
          
          // Show comprehensive optimization results
          const metrics = optimizationResult.metrics;
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-md shadow-lg z-50 max-w-sm';
          notification.innerHTML = `
            <div class="font-semibold mb-2">🎯 Optimization Complete!</div>
            <div class="text-sm space-y-1">
              <div>• ${metrics.totalVehiclesUsed} vehicles used</div>
              <div>• ${Math.round(metrics.averageCapacityUtilization)}% average capacity</div>
              <div>• ${metrics.optimizationScore}% optimization score</div>
              ${optimizationResult.warnings.length > 0 ? 
                `<div class="text-yellow-200 mt-2">⚠️ ${optimizationResult.warnings.length} warnings</div>` : ''}
            </div>
          `;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 8000);
          
          console.log('Optimization completed:', optimizationResult.metrics);
        }
      }
    } catch (error) {
      console.error('Failed to optimize groups:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Handle passenger movement between groups or from unassigned
    if (source.droppableId !== destination.droppableId) {
      const sourceIsUnassigned = source.droppableId === 'unassigned';
      const destIsUnassigned = destination.droppableId === 'unassigned';

      if (sourceIsUnassigned && !destIsUnassigned) {
        // Move from unassigned to group
        const passenger = unassignedPassengers.find(p => p.guestId === draggableId);
        if (passenger) {
          try {
            const response = await fetch(`/api/transport/groups/${destination.droppableId}/passengers`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                guestId: passenger.guestId,
                guestName: passenger.guestName,
                pickupLocation: passenger.pickupLocation,
                dropoffLocation: passenger.dropoffLocation,
                specialRequirements: passenger.specialRequirements
              })
            });

            if (response.ok) {
              setUnassignedPassengers(prev => prev.filter(p => p.guestId !== draggableId));
              await fetchData(); // Refresh groups
              
              // Show assignment success feedback
              const notification = document.createElement('div');
              notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
              notification.textContent = 'Passenger assigned successfully!';
              document.body.appendChild(notification);
              setTimeout(() => notification.remove(), 3000);
            }
          } catch (error) {
            console.error('Failed to assign passenger:', error);
          }
        }
      } else if (!sourceIsUnassigned && destIsUnassigned) {
        // Move from group to unassigned
        try {
          const response = await fetch(`/api/transport/groups/${source.droppableId}/passengers/${draggableId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (response.ok) {
            await fetchData(); // Refresh data
          }
        } catch (error) {
          console.error('Failed to remove passenger:', error);
        }
      } else if (!sourceIsUnassigned && !destIsUnassigned) {
        // Move between groups
        try {
          const response = await fetch(`/api/transport/groups/move-passenger`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fromGroupId: source.droppableId,
              toGroupId: destination.droppableId,
              guestId: draggableId
            })
          });

          if (response.ok) {
            await fetchData(); // Refresh data
            
            // Show real-time success feedback
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
            notification.textContent = 'Passenger moved successfully!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
          }
        } catch (error) {
          console.error('Failed to move passenger:', error);
        }
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter groups
  const filteredGroups = groups.filter(group => {
    const matchesSearch = !searchTerm || 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.vehicleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.passengers.some(p => p.guestName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const statistics = {
    totalGroups: groups.length,
    totalPassengers: groups.reduce((sum, group) => sum + group.passengers.length, 0),
    averageOccupancy: groups.length > 0 
      ? Math.round(groups.reduce((sum, group) => sum + (group.currentOccupancy / group.capacity * 100), 0) / groups.length)
      : 0,
    unassignedCount: unassignedPassengers.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading transport groups...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transport Group Management</h2>
          <p className="text-muted-foreground">Organize passengers and manage transport logistics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchData()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showOptimizationDialog} onOpenChange={setShowOptimizationDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={unassignedPassengers.length === 0}>
                <Shuffle className="w-4 h-4 mr-2" />
                Auto-Optimize
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Optimize Transport Groups</DialogTitle>
              </DialogHeader>
              <Form {...optimizationForm}>
                <form onSubmit={optimizationForm.handleSubmit(optimizeGroups)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={optimizationForm.control}
                      name="prioritizeCapacity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Prioritize Capacity</FormLabel>
                            <div className="text-xs text-muted-foreground">Fill vehicles efficiently</div>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={optimizationForm.control}
                      name="minimizeVehicles"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Minimize Vehicles</FormLabel>
                            <div className="text-xs text-muted-foreground">Use fewer vehicles</div>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={optimizationForm.control}
                    name="maxTravelTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Travel Time (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="15" max="240" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowOptimizationDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={optimizing}>
                      {optimizing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                      Optimize Groups
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Transport Group</DialogTitle>
              </DialogHeader>
              <Form {...createGroupForm}>
                <form onSubmit={createGroupForm.handleSubmit(createGroup)} className="space-y-4">
                  <FormField
                    control={createGroupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Wedding Party" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createGroupForm.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicles.filter(v => v.status === 'available').map(vehicle => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.name} ({vehicle.type}, {vehicle.capacity} seats)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createGroupForm.control}
                    name="driverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {drivers.filter(d => d.isActive).map(driver => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name} (Rating: {driver.rating}/5)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createGroupForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes for this group..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Group</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Groups</p>
                <p className="text-2xl font-bold">{statistics.totalGroups}</p>
              </div>
              <Car className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned Passengers</p>
                <p className="text-2xl font-bold text-green-600">{statistics.totalPassengers}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Occupancy</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.averageOccupancy}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.unassignedCount}</p>
              </div>
              <UserPlus className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search groups, vehicles, or passengers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drag and Drop Interface */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unassigned Passengers */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Unassigned Passengers ({unassignedPassengers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] p-2 rounded-md border-2 border-dashed ${
                      snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    {unassignedPassengers.map((passenger, index) => (
                      <Draggable
                        key={passenger.guestId}
                        draggableId={passenger.guestId}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 bg-white border rounded-md shadow-sm cursor-move ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="font-medium text-sm">{passenger.guestName}</div>
                            {passenger.pickupLocation && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {passenger.pickupLocation}
                              </div>
                            )}
                            {passenger.specialRequirements.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {passenger.specialRequirements.map((req, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {req}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {unassignedPassengers.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No unassigned passengers
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Transport Groups */}
          <div className="lg:col-span-3 space-y-4">
            {filteredGroups.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Transport Groups</h3>
                  <p className="text-muted-foreground mb-4">
                    Create transport groups to organize passenger transportation
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <Badge variant={
                          group.status === 'completed' ? 'default' :
                          group.status === 'in_transit' ? 'secondary' :
                          group.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {group.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {group.currentOccupancy}/{group.capacity}
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((group.currentOccupancy / group.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        {group.vehicleName || 'Vehicle'}
                      </div>
                      {group.driverName && (
                        <div className="flex items-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          {group.driverName}
                        </div>
                      )}
                      {group.estimatedDuration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {group.estimatedDuration}min
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId={group.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-2 min-h-[100px] p-3 rounded-md border-2 border-dashed ${
                            snapshot.isDraggingOver ? 'border-green-500 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          {group.passengers.map((passenger, index) => (
                            <Draggable
                              key={passenger.guestId}
                              draggableId={passenger.guestId}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-2 bg-gray-50 border rounded cursor-move ${
                                    snapshot.isDragging ? 'shadow-lg bg-white' : ''
                                  }`}
                                >
                                  <div className="font-medium text-sm">{passenger.guestName}</div>
                                  {(passenger.pickupLocation || passenger.dropoffLocation) && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {passenger.pickupLocation && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {passenger.pickupLocation}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {passenger.specialRequirements.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {passenger.specialRequirements.map((req, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {req}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {group.passengers.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-4">
                              Drop passengers here
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                    
                    {group.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                        <strong>Notes:</strong> {group.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default GroupManagement;