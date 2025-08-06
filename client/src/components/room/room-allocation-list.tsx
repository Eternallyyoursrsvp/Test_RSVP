import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, Bed, BookOpenCheck, Calendar, Trash2, Edit, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomAssignmentDialog } from "./room-assignment-dialog";
import { useToast } from "@/hooks/use-toast";
import { post, del } from "@/lib/api-utils";

// Function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

interface RoomAllocationListProps {
  accommodationId: number;
  accommodationName: string;
  maxOccupancy: number;
  bedType?: string;
  totalRooms: number;
  allocatedRooms: number;
  eventId: number;
}

export function RoomAllocationList({
  accommodationId,
  accommodationName,
  maxOccupancy,
  bedType,
  totalRooms,
  allocatedRooms,
  eventId,
}: RoomAllocationListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<any>(null);

  // Calculate room usage statistics
  const usagePercentage = Math.min(Math.round((allocatedRooms / totalRooms) * 100), 100);
  const roomsAvailable = totalRooms - allocatedRooms;
  const isOverbooked = allocatedRooms > totalRooms;

  // Fetch room allocations for this accommodation
  const {
    data: allocations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["allocations", accommodationId],
    queryFn: async () => {
      const response = await fetch(`/api/accommodations/${accommodationId}/allocations`);
      if (!response.ok) {
        throw new Error("Failed to fetch room allocations");
      }
      return response.json();
    },
    enabled: !!accommodationId,
  });

  // Fetch guests info for those with allocations
  const { data: guestsInfo = {} } = useQuery({
    queryKey: ["guestsInfo", allocations.map((a: any) => a.guestId).join("-")],
    queryFn: async () => {
      if (!allocations.length) return {};
      
      const guestIds = allocations.map((a: any) => a.guestId);
      
      // Use Promise.all to fetch all guests in parallel
      const guestPromises = guestIds.map(async (id: number) => {
        const response = await fetch(`/api/guests/${id}`);
        if (!response.ok) return null;
        const guest = await response.json();
        return { id, ...guest };
      });
      
      const guests = await Promise.all(guestPromises);
      
      // Convert to object keyed by guestId for easier access
      return guests.reduce((acc: Record<number, any>, guest: any) => {
        if (guest) acc[guest.id] = guest;
        return acc;
      }, {});
    },
    enabled: allocations.length > 0,
  });

  // Delete allocation mutation
  const deleteAllocationMutation = useMutation({
    mutationFn: async (allocationId: number) => {
      return del(`/api/allocations/${allocationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Room assignment removed",
        description: "Guest has been unassigned from the room",
      });
      queryClient.invalidateQueries({ queryKey: ["allocations", accommodationId] });
      queryClient.invalidateQueries({ queryKey: ["accommodations", eventId] });
      setShowDeleteDialog(false);
      setAllocationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler to open edit dialog
  const handleEditAllocation = (allocation: any) => {
    setSelectedAllocation(allocation);
    setShowAssignDialog(true);
  };

  // Handler to confirm deletion
  const handleDeleteClick = (allocation: any) => {
    setAllocationToDelete(allocation);
    setShowDeleteDialog(true);
  };

  // Handler to execute deletion
  const confirmDelete = () => {
    if (allocationToDelete) {
      deleteAllocationMutation.mutate(allocationToDelete.id);
    }
  };

  // Reset state when dialog is closed
  const handleAssignDialogClose = (open: boolean) => {
    setShowAssignDialog(open);
    if (!open) {
      setSelectedAllocation(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Room Assignments</h3>
          <p className="text-sm text-muted-foreground">
            {allocatedRooms} of {totalRooms} rooms assigned
          </p>
        </div>
        
        <Button 
          onClick={() => setShowAssignDialog(true)}
          disabled={isOverbooked}
        >
          <Bed className="mr-2 h-4 w-4" />
          Assign Guest
        </Button>
      </div>

      {/* Room usage stats */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Room Inventory</CardTitle>
          <CardDescription>
            Track room usage and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Usage ({usagePercentage}%)</span>
                <span>{allocatedRooms}/{totalRooms} rooms</span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={isOverbooked ? "bg-red-100" : ""}
                indicatorClassName={isOverbooked ? "bg-red-500" : undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center rounded-lg border p-3">
                <div className="mr-3 rounded-full bg-primary/10 p-2">
                  <Bed className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Available</p>
                  <p className={`text-xl font-bold ${isOverbooked ? 'text-red-500' : ''}`}>
                    {isOverbooked ? 0 : roomsAvailable}
                  </p>
                </div>
              </div>

              <div className="flex items-center rounded-lg border p-3">
                <div className="mr-3 rounded-full bg-primary/10 p-2">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Maximum Occupancy</p>
                  <p className="text-xl font-bold">
                    {maxOccupancy * totalRooms}
                  </p>
                  {bedType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {bedType.charAt(0).toUpperCase() + bedType.slice(1)} beds
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isOverbooked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Overbooking Alert</AlertTitle>
                <AlertDescription>
                  You have assigned more rooms than available. Please remove some assignments or add more rooms.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Room allocations list */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-medium">Assigned Guests</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 border rounded-md p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load allocations"}
            </AlertDescription>
          </Alert>
        ) : allocations.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <Bed className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">No rooms assigned yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start assigning guests to these rooms
            </p>
            <Button 
              onClick={() => setShowAssignDialog(true)}
            >
              Assign First Guest
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {allocations.map((allocation: any) => {
              const guest = guestsInfo[allocation.guestId];
              
              return (
                <div 
                  key={allocation.id} 
                  className="flex items-center justify-between border rounded-md p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10 bg-primary text-white">
                      <AvatarFallback>
                        {guest ? getInitials(`${guest.firstName} ${guest.lastName}`) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-medium">
                        {guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest'}
                        {allocation.includesPlusOne && (
                          <Badge variant="outline" className="ml-2">
                            +1
                          </Badge>
                        )}
                        {allocation.includesChildren && allocation.childrenCount > 0 && (
                          <Badge variant="outline" className="ml-2">
                            +{allocation.childrenCount} {allocation.childrenCount === 1 ? 'child' : 'children'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        {allocation.roomNumber && (
                          <div className="flex items-center mr-4">
                            <BookOpenCheck className="mr-1 h-3 w-3" />
                            Room {allocation.roomNumber}
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {allocation.checkInDate && allocation.checkOutDate ? (
                            <>
                              {format(new Date(allocation.checkInDate), "MMM d")} - 
                              {format(new Date(allocation.checkOutDate), "MMM d, yyyy")}
                            </>
                          ) : (
                            'No dates specified'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditAllocation(allocation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Assignment</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(allocation)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove Assignment</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room assignment dialog */}
      <RoomAssignmentDialog
        open={showAssignDialog}
        onOpenChange={handleAssignDialogClose}
        accommodationId={accommodationId}
        accommodationName={accommodationName}
        maxOccupancy={maxOccupancy}
        bedType={bedType}
        existingAllocation={selectedAllocation}
        onSuccess={() => {
          // This will be called after successful assignment or update
        }}
      />

      {/* Confirm delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Room Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this guest from the room? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}