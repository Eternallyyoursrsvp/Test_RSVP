import { useQuery, useMutation } from '@tanstack/react-query';
import { Guest, TransportGroup } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { get } from '@/lib/api-utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Car, Loader2, Plus, RefreshCw, AlertTriangle, 
  Users, Calendar, Map, Clock, Check, UserPlus, 
  MinusCircle, PlusCircle, Edit, Filter, Download 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Vehicle type schema
type Vehicle = {
  id: string;
  type: string;
  capacity: number;
  count: number;
  availableCount: number;
  imageUrl?: string;
};

// Family group type
type FamilyGroup = {
  id: string;
  primaryGuestId: number;
  primaryGuest: Guest;
  members: Guest[];
  size: number;
  arrivalDate?: string;
  arrivalTime?: string;
  arrivalLocation?: string;
  assigned: boolean;
  assignedVehicleId?: string;
};

// Transport assignment type
type TransportAssignment = {
  id: string;
  vehicleId: string;
  familyGroupIds: string[];
  passengerCount: number;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  notes?: string;
};

// Add/edit vehicle form schema
const vehicleSchema = z.object({
  type: z.string().min(1, "Vehicle type is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  count: z.coerce.number().min(1, "Count must be at least 1"),
  imageUrl: z.string().optional(),
});

// Assignment form schema
const assignmentSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  familyGroupIds: z.array(z.string()).min(1, "At least one family group must be selected"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  pickupTime: z.string().min(1, "Pickup time is required"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  dropoffLocation: z.string().min(1, "Dropoff location is required"),
  notes: z.string().optional(),
});

// Main Transport Assignments Component
export default function TransportAssignmentsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('assignments');
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<TransportAssignment | null>(null);
  const [filterArrivalDate, setFilterArrivalDate] = useState<string>('');
  
  // Get current event ID from session
  const { data: currentEvent } = useQuery({
    queryKey: ['/api/current-event'],
    queryFn: async () => {
      const res = await get('/api/current-event');
      return res.data;
    }
  });
  
  const eventId = currentEvent?.id;
  
  // Mock data for vehicles (would come from API)
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 'v1', type: 'Sedan', capacity: 4, count: 5, availableCount: 3, imageUrl: '/vehicles/sedan.png' },
    { id: 'v2', type: 'SUV', capacity: 6, count: 3, availableCount: 2, imageUrl: '/vehicles/suv.png' },
    { id: 'v3', type: 'Minivan', capacity: 8, count: 2, availableCount: 1, imageUrl: '/vehicles/minivan.png' },
    { id: 'v4', type: 'Shuttle', capacity: 16, count: 1, availableCount: 1, imageUrl: '/vehicles/shuttle.png' },
  ]);
  
  // Mock data for family groups (would come from API)
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([
    { 
      id: 'fg1', 
      primaryGuestId: 1, 
      primaryGuest: { 
        id: 1, 
        firstName: 'Raj', 
        lastName: 'Sharma', 
        email: 'raj@example.com',
        eventId: 1,
        invitationSent: true,
        rsvpStatus: 'confirmed',
        side: 'groom'
      } as Guest, 
      members: [], 
      size: 4, 
      arrivalDate: '2025-06-15', 
      arrivalTime: '10:30', 
      arrivalLocation: 'Airport Terminal 1',
      assigned: false
    },
    { 
      id: 'fg2', 
      primaryGuestId: 5, 
      primaryGuest: { 
        id: 5, 
        firstName: 'Priya', 
        lastName: 'Patel', 
        email: 'priya@example.com',
        eventId: 1,
        invitationSent: true,
        rsvpStatus: 'confirmed',
        side: 'bride'
      } as Guest, 
      members: [], 
      size: 2, 
      arrivalDate: '2025-06-15', 
      arrivalTime: '12:45', 
      arrivalLocation: 'Airport Terminal 2',
      assigned: false
    },
    { 
      id: 'fg3', 
      primaryGuestId: 10, 
      primaryGuest: { 
        id: 10, 
        firstName: 'Vikram', 
        lastName: 'Malhotra', 
        email: 'vikram@example.com',
        eventId: 1,
        invitationSent: true,
        rsvpStatus: 'confirmed',
        side: 'groom'
      } as Guest, 
      members: [], 
      size: 3, 
      arrivalDate: '2025-06-16', 
      arrivalTime: '09:15', 
      arrivalLocation: 'Train Station',
      assigned: false
    },
    { 
      id: 'fg4', 
      primaryGuestId: 15, 
      primaryGuest: { 
        id: 15, 
        firstName: 'Anita', 
        lastName: 'Singh', 
        email: 'anita@example.com',
        eventId: 1,
        invitationSent: true,
        rsvpStatus: 'confirmed',
        side: 'bride'
      } as Guest, 
      members: [], 
      size: 6, 
      arrivalDate: '2025-06-16', 
      arrivalTime: '14:30', 
      arrivalLocation: 'Airport Terminal 3',
      assigned: false
    },
  ]);
  
  // Mock data for assignments (would come from API)
  const [assignments, setAssignments] = useState<TransportAssignment[]>([
    {
      id: 'a1',
      vehicleId: 'v1',
      familyGroupIds: ['fg1'],
      passengerCount: 4,
      pickupDate: '2025-06-15',
      pickupTime: '11:00',
      pickupLocation: 'Airport Terminal 1',
      dropoffLocation: 'Taj Hotel'
    },
    {
      id: 'a2',
      vehicleId: 'v2',
      familyGroupIds: ['fg2', 'fg3'],
      passengerCount: 5,
      pickupDate: '2025-06-16',
      pickupTime: '10:00',
      pickupLocation: 'Train Station',
      dropoffLocation: 'Taj Hotel'
    }
  ]);

  // Update family groups as assigned based on assignments
  useEffect(() => {
    const updatedFamilyGroups = familyGroups.map(group => {
      const assignment = assignments.find(a => a.familyGroupIds.includes(group.id));
      return {
        ...group,
        assigned: !!assignment,
        assignedVehicleId: assignment?.vehicleId
      };
    });
    setFamilyGroups(updatedFamilyGroups);
  }, [assignments]);
  
  // Vehicle form
  const vehicleForm = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      type: '',
      capacity: 4,
      count: 1,
      imageUrl: '',
    }
  });
  
  // Assignment form
  const assignmentForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      vehicleId: '',
      familyGroupIds: [],
      pickupDate: '',
      pickupTime: '',
      pickupLocation: '',
      dropoffLocation: '',
      notes: ''
    }
  });
  
  // Add/Edit vehicle
  const handleVehicleSubmit = (data: z.infer<typeof vehicleSchema>) => {
    if (selectedVehicle) {
      // Edit existing vehicle
      const updatedVehicles = vehicles.map(v => 
        v.id === selectedVehicle.id ? { ...v, ...data, availableCount: data.count } : v
      );
      setVehicles(updatedVehicles);
      toast({
        title: "Vehicle updated",
        description: `${data.type} has been updated in your fleet.`
      });
    } else {
      // Add new vehicle
      const newVehicle: Vehicle = {
        id: `v${vehicles.length + 1}`,
        ...data,
        availableCount: data.count
      };
      setVehicles([...vehicles, newVehicle]);
      toast({
        title: "Vehicle added",
        description: `${data.type} has been added to your fleet.`
      });
    }
    setIsVehicleDialogOpen(false);
    vehicleForm.reset();
    setSelectedVehicle(null);
  };
  
  // Edit vehicle
  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    vehicleForm.reset({
      type: vehicle.type,
      capacity: vehicle.capacity,
      count: vehicle.count,
      imageUrl: vehicle.imageUrl
    });
    setIsVehicleDialogOpen(true);
  };
  
  // Add/Edit assignment
  const handleAssignmentSubmit = (data: z.infer<typeof assignmentSchema>) => {
    const selectedGroups = familyGroups.filter(g => data.familyGroupIds.includes(g.id));
    const passengerCount = selectedGroups.reduce((total, group) => total + group.size, 0);
    
    if (selectedAssignment) {
      // Edit existing assignment
      const updatedAssignments = assignments.map(a => 
        a.id === selectedAssignment.id ? { ...a, ...data, passengerCount } : a
      );
      setAssignments(updatedAssignments);
      toast({
        title: "Assignment updated",
        description: `Transport assignment has been updated.`
      });
    } else {
      // Add new assignment
      const newAssignment: TransportAssignment = {
        id: `a${assignments.length + 1}`,
        ...data,
        passengerCount
      };
      setAssignments([...assignments, newAssignment]);
      toast({
        title: "Assignment created",
        description: `New transport assignment has been created.`
      });
    }
    setIsAssignmentDialogOpen(false);
    assignmentForm.reset();
    setSelectedAssignment(null);
  };
  
  // Edit assignment
  const handleEditAssignment = (assignment: TransportAssignment) => {
    setSelectedAssignment(assignment);
    assignmentForm.reset({
      vehicleId: assignment.vehicleId,
      familyGroupIds: assignment.familyGroupIds,
      pickupDate: assignment.pickupDate,
      pickupTime: assignment.pickupTime,
      pickupLocation: assignment.pickupLocation,
      dropoffLocation: assignment.dropoffLocation,
      notes: assignment.notes
    });
    setIsAssignmentDialogOpen(true);
  };
  
  // Remove assignment
  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(assignments.filter(a => a.id !== assignmentId));
    toast({
      title: "Assignment removed",
      description: "Transport assignment has been removed."
    });
  };
  
  // Auto-generate assignments
  const handleAutoAssign = () => {
    // Would be implemented via API in real version
    toast({
      title: "Auto-assignment started",
      description: "Generating optimal transport assignments..."
    });
    
    // Mock auto-assignment
    setTimeout(() => {
      // In real implementation, this would be a server-side calculation
      const unassignedGroups = familyGroups.filter(g => !g.assigned);
      
      // Group by arrival date and time (within hour windows)
      const groupedByDateTime: Record<string, FamilyGroup[]> = {};
      unassignedGroups.forEach(group => {
        if (!group.arrivalDate || !group.arrivalTime) return;
        const hour = group.arrivalTime.split(':')[0];
        const key = `${group.arrivalDate}-${hour}-${group.arrivalLocation}`;
        if (!groupedByDateTime[key]) groupedByDateTime[key] = [];
        groupedByDateTime[key].push(group);
      });
      
      // For each time slot, create optimal vehicle assignments
      const newAssignments: TransportAssignment[] = [];
      
      Object.entries(groupedByDateTime).forEach(([timeKey, groups]) => {
        const [date, hour, location] = timeKey.split('-');
        const formattedTime = `${hour}:00`;
        
        // Sort groups by size (descending)
        groups.sort((a, b) => b.size - a.size);
        
        // First, try to keep families together
        const remainingGroups = [...groups];
        let assignmentId = assignments.length + newAssignments.length + 1;
        
        while (remainingGroups.length > 0) {
          // Get the largest available vehicle
          const availableVehicles = vehicles.filter(v => v.availableCount > 0);
          availableVehicles.sort((a, b) => b.capacity - a.capacity);
          
          if (availableVehicles.length === 0) break;
          
          const vehicle = availableVehicles[0];
          let capacity = vehicle.capacity;
          const groupsInVehicle: FamilyGroup[] = [];
          
          // Try to fit as many groups as possible
          for (let i = 0; i < remainingGroups.length; i++) {
            const group = remainingGroups[i];
            if (group.size <= capacity) {
              groupsInVehicle.push(group);
              capacity -= group.size;
              remainingGroups.splice(i, 1);
              i--; // Adjust index after removal
            }
            
            // If we can't fit any more families, or capacity is very low, stop
            if (capacity < 2) break;
          }
          
          if (groupsInVehicle.length > 0) {
            newAssignments.push({
              id: `a${assignmentId++}`,
              vehicleId: vehicle.id,
              familyGroupIds: groupsInVehicle.map(g => g.id),
              passengerCount: groupsInVehicle.reduce((sum, g) => sum + g.size, 0),
              pickupDate: date,
              pickupTime: formattedTime,
              pickupLocation: location || 'Airport',
              dropoffLocation: 'Venue'
            });
          }
        }
      });
      
      setAssignments([...assignments, ...newAssignments]);
      toast({
        title: "Auto-assignment complete",
        description: `${newAssignments.length} new transport assignments created.`
      });
    }, 2000);
  };
  
  // Export transport schedule
  const handleExportSchedule = () => {
    // Would generate a CSV or PDF in real implementation
    toast({
      title: "Export started",
      description: "Generating transport schedule document..."
    });
    
    // Mock download
    setTimeout(() => {
      toast({
        title: "Export complete",
        description: "Transport schedule has been generated and downloaded."
      });
    }, 1500);
  };
  
  // Filtered family groups
  const filteredFamilyGroups = filterArrivalDate 
    ? familyGroups.filter(g => g.arrivalDate === filterArrivalDate)
    : familyGroups;
  
  // Filtered assignments
  const filteredAssignments = filterArrivalDate 
    ? assignments.filter(a => a.pickupDate === filterArrivalDate)
    : assignments;
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Transport Assignments</h1>
          <p className="text-muted-foreground mt-1">Manage transportation logistics for all guests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSchedule}>
            <Download className="mr-2 h-4 w-4" />
            Export Schedule
          </Button>
          <Button onClick={handleAutoAssign}>
            <Car className="mr-2 h-4 w-4" />
            Auto-Assign
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">{familyGroups.length}</div>
              <Users className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-muted-foreground">Family Groups</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">
                {familyGroups.filter(g => g.assigned).length} / {familyGroups.length}
              </div>
              <Check className="h-8 w-8 text-green-600 opacity-80" />
            </div>
            <p className="text-muted-foreground">Groups Assigned</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">{vehicles.length}</div>
              <Car className="h-8 w-8 text-blue-600 opacity-80" />
            </div>
            <p className="text-muted-foreground">Vehicle Types</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-2xl font-bold">{assignments.length}</div>
              <Calendar className="h-8 w-8 text-amber-600 opacity-80" />
            </div>
            <p className="text-muted-foreground">Scheduled Trips</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Date Filter */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="arrival-date" className="font-medium">Filter by Date:</Label>
          <Select value={filterArrivalDate} onValueChange={setFilterArrivalDate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Dates</SelectItem>
              <SelectItem value="2025-06-15">June 15, 2025</SelectItem>
              <SelectItem value="2025-06-16">June 16, 2025</SelectItem>
              <SelectItem value="2025-06-17">June 17, 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Management</TabsTrigger>
          <TabsTrigger value="groups">Family Groups</TabsTrigger>
        </TabsList>
        
        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Transport Assignments</CardTitle>
                <CardDescription>
                  Assignment of family groups to vehicles for transportation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAssignments.length === 0 ? (
                  <div className="text-center p-6">
                    <p className="text-muted-foreground">No transport assignments found.</p>
                    <Button onClick={() => setIsAssignmentDialogOpen(true)} className="mt-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Assignment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button onClick={() => {
                      setSelectedAssignment(null);
                      assignmentForm.reset({
                        vehicleId: '',
                        familyGroupIds: [],
                        pickupDate: '',
                        pickupTime: '',
                        pickupLocation: '',
                        dropoffLocation: '',
                        notes: ''
                      });
                      setIsAssignmentDialogOpen(true);
                    }} className="mb-4">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Assignment
                    </Button>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Passengers</TableHead>
                          <TableHead>Pickup</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((assignment) => {
                          const vehicle = vehicles.find(v => v.id === assignment.vehicleId);
                          const groups = familyGroups.filter(g => assignment.familyGroupIds.includes(g.id));
                          
                          return (
                            <TableRow key={assignment.id}>
                              <TableCell>
                                <div className="font-medium">{vehicle?.type || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">
                                  Capacity: {vehicle?.capacity || 0} | ID: {assignment.vehicleId}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1 text-primary" />
                                  <span>{assignment.passengerCount} passengers</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {groups.map(g => g.primaryGuest.lastName).join(', ')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Map className="h-4 w-4 mr-1 text-blue-500" />
                                  {assignment.pickupLocation}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  To: {assignment.dropoffLocation}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1 text-amber-500" />
                                  {format(new Date(assignment.pickupDate), 'MMM d, yyyy')}
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {assignment.pickupTime}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEditAssignment(assignment)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                  >
                                    <MinusCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Fleet Management Tab */}
        <TabsContent value="fleet">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Fleet</CardTitle>
                <CardDescription>
                  Manage your available vehicles for transportation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => {
                  setSelectedVehicle(null);
                  vehicleForm.reset({
                    type: '',
                    capacity: 4,
                    count: 1,
                    imageUrl: ''
                  });
                  setIsVehicleDialogOpen(true);
                }} className="mb-4">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vehicle Type
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="overflow-hidden">
                      <div className="bg-muted h-28 flex items-center justify-center">
                        <Car className="h-16 w-16 text-primary opacity-60" />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{vehicle.type}</h3>
                            <p className="text-muted-foreground text-sm">
                              Capacity: {vehicle.capacity} passengers
                            </p>
                          </div>
                          <Badge variant={vehicle.availableCount > 0 ? "outline" : "secondary"}>
                            {vehicle.availableCount} / {vehicle.count} available
                          </Badge>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleEditVehicle(vehicle)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Family Groups Tab */}
        <TabsContent value="groups">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Family Groups</CardTitle>
                <CardDescription>
                  Families traveling together that need transportation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFamilyGroups.length === 0 ? (
                  <div className="text-center p-6">
                    <p className="text-muted-foreground">No family groups found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Family Group</TableHead>
                        <TableHead>Group Size</TableHead>
                        <TableHead>Arrival Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFamilyGroups.map((group) => {
                        const vehicle = group.assignedVehicleId 
                          ? vehicles.find(v => v.id === group.assignedVehicleId) 
                          : null;
                          
                        return (
                          <TableRow key={group.id}>
                            <TableCell>
                              <div className="font-medium">
                                {group.primaryGuest.firstName} {group.primaryGuest.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Family Group ID: {group.id}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1 text-primary" />
                                <span>{group.size} {group.size === 1 ? 'person' : 'people'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {group.arrivalDate && group.arrivalTime ? (
                                <>
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1 text-amber-500" />
                                    {format(new Date(group.arrivalDate), 'MMM d, yyyy')}
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {group.arrivalTime} • {group.arrivalLocation}
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">No arrival details</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {group.assigned ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Check className="h-3 w-3 mr-1" />
                                  Assigned to {vehicle?.type || 'vehicle'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  Unassigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedAssignment(null);
                                  assignmentForm.reset({
                                    vehicleId: '',
                                    familyGroupIds: [group.id],
                                    pickupDate: group.arrivalDate || '',
                                    pickupTime: group.arrivalTime || '',
                                    pickupLocation: group.arrivalLocation || '',
                                    dropoffLocation: 'Venue',
                                    notes: ''
                                  });
                                  setIsAssignmentDialogOpen(true);
                                }}
                                disabled={group.assigned}
                              >
                                <Car className="h-4 w-4 mr-1" />
                                {group.assigned ? 'View Assignment' : 'Assign'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
            <DialogDescription>
              {selectedVehicle 
                ? 'Update the details of this vehicle type in your transport fleet.'
                : 'Add a new vehicle type to your transport fleet.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...vehicleForm}>
            <form onSubmit={vehicleForm.handleSubmit(handleVehicleSubmit)} className="space-y-4">
              <FormField
                control={vehicleForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Sedan, SUV, Minivan" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={vehicleForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min={1} 
                        placeholder="Number of passengers" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={vehicleForm.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number Available</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min={1} 
                        placeholder="How many vehicles of this type" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={vehicleForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="URL to vehicle image" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsVehicleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Assignment Dialog */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
            <DialogDescription>
              {selectedAssignment 
                ? 'Update the transport assignment details.'
                : 'Create a new transport assignment for family groups.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(handleAssignmentSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value || ''} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Select vehicle</SelectItem>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.type} ({vehicle.capacity} passengers)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={assignmentForm.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Date</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date" 
                            placeholder="Pickup date" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assignmentForm.control}
                    name="pickupTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Time</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="time" 
                            placeholder="Pickup time" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Where to pick up guests" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="dropoffLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dropoff Location</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Where to drop off guests" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <FormField
                control={assignmentForm.control}
                name="familyGroupIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Family Groups</FormLabel>
                    <Card>
                      <CardContent className="p-4">
                        <ScrollArea className="h-48 px-1">
                          <div className="space-y-2">
                            {familyGroups
                              .filter(g => !g.assigned || (selectedAssignment && selectedAssignment.familyGroupIds.includes(g.id)))
                              .map((group) => (
                                <div 
                                  key={group.id} 
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"
                                >
                                  <Checkbox 
                                    id={`group-${group.id}`}
                                    checked={field.value.includes(group.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, group.id]);
                                      } else {
                                        field.onChange(
                                          field.value.filter((id) => id !== group.id)
                                        );
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                                    <div className="font-medium">
                                      {group.primaryGuest.firstName} {group.primaryGuest.lastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center">
                                      <Users className="h-3 w-3 mr-1" />
                                      {group.size} {group.size === 1 ? 'person' : 'people'}
                                      
                                      {group.arrivalDate && (
                                        <>
                                          <span className="mx-1">•</span>
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {format(new Date(group.arrivalDate), 'MMM d')}
                                        </>
                                      )}
                                      
                                      {group.arrivalTime && (
                                        <>
                                          <span className="mx-1">•</span>
                                          <Clock className="h-3 w-3 mr-1" />
                                          {group.arrivalTime}
                                        </>
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={assignmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Any special instructions or notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAssignmentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedAssignment ? 'Update Assignment' : 'Create Assignment'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}