import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, post, put, del, patch } from '@/lib/api-utils';
import { queryClient } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Car, 
  Bus, 
  Plane, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  MapPin, 
  Clock,
  Route,
  Settings,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  RefreshCw
} from "lucide-react";
import { useCurrentEvent } from '@/hooks/use-current-event';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Vehicle {
  id: number;
  eventId: number;
  vehicleType: string;
  capacity: number;
  plateNumber?: string;
  driverName?: string;
  driverPhone?: string;
  vendorId?: number;
  status: 'available' | 'assigned' | 'in_transit' | 'maintenance';
  currentLocation?: string;
  route?: string;
  notes?: string;
  vendor?: {
    id: number;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
}

interface TransportGroup {
  id: number;
  name: string;
  vehicleId?: number;
  guestCount: number;
  status: string;
  pickupTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  vehicle?: Vehicle;
}

// Vehicle Fleet Management Component
export default function VehicleFleetManagement() {
  const { toast } = useToast();
  const { currentEvent } = useCurrentEvent();
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    vehicleType: '',
    capacity: '',
    plateNumber: '',
    driverName: '',
    driverPhone: '',
    vendorId: '',
    notes: ''
  });
  
  const eventId = currentEvent?.id;

  // Get vehicles for the event
  const { 
    data: vehicles = [], 
    isLoading: isLoadingVehicles,
    refetch: refetchVehicles
  } = useQuery({
    queryKey: ['/api/events', eventId, 'vehicles'],
    queryFn: async () => {
      if (!eventId) return [];
      const res = await get(`/api/events/${eventId}/vehicles`);
      return res.data;
    },
    enabled: !!eventId
  });

  // Get transport groups
  const { 
    data: transportGroups = [], 
    isLoading: isLoadingGroups 
  } = useQuery({
    queryKey: ['/api/events', eventId, 'transport-groups'],
    queryFn: async () => {
      if (!eventId) return [];
      const res = await get(`/api/events/${eventId}/transport-groups`);
      return res.data;
    },
    enabled: !!eventId
  });

  // Get transport vendors
  const { 
    data: vendors = [], 
    isLoading: isLoadingVendors 
  } = useQuery({
    queryKey: ['/api/transport/vendors'],
    queryFn: async () => {
      const res = await get('/api/transport/vendors');
      return res.data;
    }
  });

  // Create/Update vehicle mutation
  const saveVehicleMutation = useMutation({
    mutationFn: async (vehicleData: any) => {
      const url = selectedVehicle 
        ? `/api/events/${eventId}/vehicles/${selectedVehicle.id}`
        : `/api/events/${eventId}/vehicles`;
      const method = selectedVehicle ? 'PUT' : 'POST';
      
      const data = {
        ...vehicleData,
        eventId,
        capacity: parseInt(vehicleData.capacity),
        vendorId: vehicleData.vendorId ? parseInt(vehicleData.vendorId) : null
      };
      
      const res = selectedVehicle 
        ? await put(`/api/events/${eventId}/vehicles/${selectedVehicle.id}`, data)
        : await post(`/api/events/${eventId}/vehicles`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'transport-groups'] });
      
      toast({
        title: selectedVehicle ? "Vehicle Updated" : "Vehicle Added",
        description: `Vehicle ${selectedVehicle ? 'updated' : 'added'} successfully`,
      });
      
      setIsVehicleDialogOpen(false);
      setSelectedVehicle(null);
      setVehicleFormData({
        vehicleType: '',
        capacity: '',
        plateNumber: '',
        driverName: '',
        driverPhone: '',
        vendorId: '',
        notes: ''
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save vehicle. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete vehicle mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      const res = await del(`/api/events/${eventId}/vehicles/${vehicleId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'vehicles'] });
      
      toast({
        title: "Vehicle Deleted",
        description: "Vehicle removed from fleet successfully",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update vehicle status mutation
  const updateVehicleStatusMutation = useMutation({
    mutationFn: async ({ vehicleId, status }: { vehicleId: number, status: string }) => {
      const res = await patch(`/api/events/${eventId}/vehicles/${vehicleId}/status`, {
        status
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'vehicles'] });
      
      toast({
        title: "Status Updated",
        description: "Vehicle status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update vehicle status. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate fleet statistics
  const fleetStats = React.useMemo(() => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v: Vehicle) => v.status === 'available').length;
    const assignedVehicles = vehicles.filter((v: Vehicle) => v.status === 'assigned').length;
    const inTransitVehicles = vehicles.filter((v: Vehicle) => v.status === 'in_transit').length;
    const totalCapacity = vehicles.reduce((sum: number, v: Vehicle) => sum + v.capacity, 0);
    const assignedCapacity = vehicles
      .filter((v: Vehicle) => v.status === 'assigned')
      .reduce((sum: number, v: Vehicle) => sum + v.capacity, 0);
    
    return {
      totalVehicles,
      availableVehicles,
      assignedVehicles,
      inTransitVehicles,
      totalCapacity,
      assignedCapacity,
      utilizationRate: totalCapacity > 0 ? Math.round((assignedCapacity / totalCapacity) * 100) : 0
    };
  }, [vehicles]);

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'bus': return Bus;
      case 'car': return Car;
      case 'van': return Car;
      default: return Car;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      'available': { variant: 'default' as const, color: 'text-green-600' },
      'assigned': { variant: 'secondary' as const, color: 'text-blue-600' },
      'in_transit': { variant: 'default' as const, color: 'text-orange-600' },
      'maintenance': { variant: 'destructive' as const, color: 'text-red-600' }
    };
    
    return config[status as keyof typeof config] || config.available;
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleFormData({
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity.toString(),
      plateNumber: vehicle.plateNumber || '',
      driverName: vehicle.driverName || '',
      driverPhone: vehicle.driverPhone || '',
      vendorId: vehicle.vendorId?.toString() || '',
      notes: vehicle.notes || ''
    });
    setIsVehicleDialogOpen(true);
  };

  if (!eventId) {
    return (
      <Card className="glass">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Event Selected</h3>
          <p className="text-muted-foreground">Please select an event to manage vehicle fleet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fleet Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-bold">{fleetStats.totalVehicles}</p>
                <p className="text-xs text-muted-foreground">
                  {fleetStats.totalCapacity} total capacity
                </p>
              </div>
              <Car className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{fleetStats.availableVehicles}</p>
                <p className="text-xs text-green-600">ready for assignment</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-orange-600">{fleetStats.inTransitVehicles}</p>
                <p className="text-xs text-orange-600">currently active</p>
              </div>
              <Route className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilization</p>
                <p className="text-2xl font-bold text-purple-600">{fleetStats.utilizationRate}%</p>
                <p className="text-xs text-purple-600">capacity utilization</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Management Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Vehicle Fleet Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage vehicles, drivers, and real-time fleet operations
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchVehicles()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsVehicleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Vehicle Fleet Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>
            Real-time status and management of all vehicles in your fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle: Vehicle) => {
                  const VehicleIcon = getVehicleIcon(vehicle.vehicleType);
                  const statusConfig = getStatusBadge(vehicle.status);
                  const assignedGroup = transportGroups.find((g: TransportGroup) => g.vehicleId === vehicle.id);
                  
                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <VehicleIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {vehicle.vehicleType} {vehicle.plateNumber && `(${vehicle.plateNumber})`}
                            </p>
                            <p className="text-xs text-muted-foreground">ID: {vehicle.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{vehicle.capacity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicle.driverName ? (
                          <div>
                            <p className="font-medium">{vehicle.driverName}</p>
                            {vehicle.driverPhone && (
                              <p className="text-xs text-muted-foreground">{vehicle.driverPhone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No driver assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.vendor ? (
                          <div>
                            <p className="font-medium">{vehicle.vendor.name}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.vendor.contactPerson}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Internal</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignedGroup ? (
                          <div>
                            <p className="font-medium">{assignedGroup.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {assignedGroup.guestCount} guests
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVehicle(vehicle)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVehicle(vehicle)}
                          >
                            <Route className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteVehicleMutation.mutate(vehicle.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {vehicles.length === 0 && (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Vehicles</h3>
              <p className="text-muted-foreground mb-4">Add vehicles to your fleet to get started</p>
              <Button onClick={() => setIsVehicleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Vehicle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </DialogTitle>
            <DialogDescription>
              Configure vehicle details and driver information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select 
                  value={vehicleFormData.vehicleType} 
                  onValueChange={(value) => setVehicleFormData(prev => ({ ...prev, vehicleType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="luxury_car">Luxury Car</SelectItem>
                    <SelectItem value="minibus">Minibus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={vehicleFormData.capacity}
                  onChange={(e) => setVehicleFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="e.g. 8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="plateNumber">Plate Number (Optional)</Label>
              <Input
                id="plateNumber"
                value={vehicleFormData.plateNumber}
                onChange={(e) => setVehicleFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                placeholder="e.g. ABC 123"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={vehicleFormData.driverName}
                  onChange={(e) => setVehicleFormData(prev => ({ ...prev, driverName: e.target.value }))}
                  placeholder="Driver name"
                />
              </div>
              
              <div>
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input
                  id="driverPhone"
                  value={vehicleFormData.driverPhone}
                  onChange={(e) => setVehicleFormData(prev => ({ ...prev, driverPhone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="vendorId">Transport Vendor (Optional)</Label>
              <Select 
                value={vehicleFormData.vendorId} 
                onValueChange={(value) => setVehicleFormData(prev => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor or leave blank for internal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Internal Vehicle</SelectItem>
                  {vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={vehicleFormData.notes}
                onChange={(e) => setVehicleFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the vehicle..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsVehicleDialogOpen(false);
              setSelectedVehicle(null);
              setVehicleFormData({
                vehicleType: '',
                capacity: '',
                plateNumber: '',
                driverName: '',
                driverPhone: '',
                vendorId: '',
                notes: ''
              });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveVehicleMutation.mutate(vehicleFormData)}
              disabled={!vehicleFormData.vehicleType || !vehicleFormData.capacity || saveVehicleMutation.isPending}
            >
              {selectedVehicle ? 'Update' : 'Add'} Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}