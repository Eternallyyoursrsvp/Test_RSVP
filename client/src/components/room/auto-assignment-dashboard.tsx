import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Clock, Calendar, RefreshCw, AlertTriangle } from "lucide-react";
import { RoomAssignmentDialog } from "./room-assignment-dialog";
import { format, parseISO } from "date-fns";

// Type definitions for auto-assigned rooms
interface AutoAssignment {
  id: number;
  guestId: number;
  guest: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    arrivalDate?: string;
    arrivalTime?: string;
    numberOfChildren?: number;
    plusOneAttending?: boolean;
    plusOneName?: string;
  };
  accommodationId: number;
  accommodation: {
    id: number;
    name: string;
    hotelId: number;
    roomType: string;
    bedType?: string;
    maxOccupancy: number;
  };
  hotel: {
    id: number;
    name: string;
    address: string;
  };
  checkInDate: string;
  checkOutDate: string;
  earlyCheckIn: boolean;
  reviewStatus: "pending" | "approved" | "reassigned";
  specialRequests?: string;
  includesPlusOne: boolean;
  includesChildren: boolean;
  childrenCount: number;
}

interface AutoAssignmentDashboardProps {
  eventId: number;
}

export function AutoAssignmentDashboard({ eventId }: AutoAssignmentDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEvent } = useCurrentEvent();
  const [selectedAssignment, setSelectedAssignment] = useState<AutoAssignment | null>(null);
  const [isChangingRoom, setIsChangingRoom] = useState(false);
  
  // Fetch all auto-assigned rooms that need review
  const {
    data: autoAssignments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["auto-assignments", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/auto-assignments`);
      if (!response.ok) {
        throw new Error("Failed to fetch auto-assigned rooms");
      }
      return response.json();
    },
    enabled: !!eventId,
  });
  
  // Mutation to approve an auto-assigned room
  const approveMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await fetch(`/api/room-allocations/${assignmentId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to approve assignment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Approved",
        description: "The room assignment has been approved",
      });
      queryClient.invalidateQueries({ queryKey: ["auto-assignments", eventId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve assignment",
        variant: "destructive",
      });
    }
  });
  
  // Handle approving an assignment
  const handleApprove = (assignmentId: number) => {
    approveMutation.mutate(assignmentId);
  };
  
  // Handle opening the room change dialog
  const handleChangeRoom = (assignment: AutoAssignment) => {
    setSelectedAssignment(assignment);
    setIsChangingRoom(true);
  };
  
  // Format time for display
  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return timeString;
  };
  
  // Determine if a guest needs early check-in
  const needsEarlyCheckin = (assignment: AutoAssignment) => {
    return assignment.earlyCheckIn;
  };
  
  // Calculate total guests in room
  const calculateTotalGuests = (assignment: AutoAssignment) => {
    let count = 1; // Primary guest
    if (assignment.includesPlusOne) count += 1;
    if (assignment.includesChildren) count += assignment.childrenCount || 0;
    return count;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Auto-Assigned Rooms</CardTitle>
            <CardDescription>
              Review and manage automatically assigned rooms for guests
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p>{error instanceof Error ? error.message : "Failed to load auto-assigned rooms"}</p>
          </div>
        ) : autoAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No auto-assigned rooms requiring review</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>Auto-assigned rooms requiring planner review</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead className="text-center">Dates</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoAssignments.map((assignment: AutoAssignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      <div>
                        {assignment.guest.firstName} {assignment.guest.lastName}
                        <p className="text-xs text-muted-foreground">{assignment.guest.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{assignment.accommodation.name}</span>
                        <div className="text-xs text-muted-foreground">
                          <span>{assignment.accommodation.roomType}</span>
                          {assignment.accommodation.bedType && (
                            <span> · {assignment.accommodation.bedType.charAt(0).toUpperCase() + assignment.accommodation.bedType.slice(1)} bed</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">Max occupancy: {assignment.accommodation.maxOccupancy}</span>
                      </div>
                    </TableCell>
                    <TableCell>{assignment.hotel.name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span className="text-xs">
                            {assignment.checkInDate ? format(parseISO(assignment.checkInDate), 'MMM d') : 'TBD'} - {assignment.checkOutDate ? format(parseISO(assignment.checkOutDate), 'MMM d') : 'TBD'}
                          </span>
                        </div>
                        {needsEarlyCheckin(assignment) && (
                          <Badge variant="outline" className="text-xs mt-1 bg-amber-100">
                            <Clock className="h-3 w-3 mr-1" /> Early Check-in
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{calculateTotalGuests(assignment)}</span>
                        <div className="text-xs text-muted-foreground mt-1">
                          {assignment.includesPlusOne && <span>+1</span>}
                          {assignment.includesChildren && <span>, {assignment.childrenCount} children</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        assignment.reviewStatus === "approved" ? "default" : 
                        assignment.reviewStatus === "reassigned" ? "secondary" : 
                        "outline"
                      } className={assignment.reviewStatus === "approved" ? "bg-green-500" : ""}>
                        {assignment.reviewStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {assignment.reviewStatus === "approved" && <Check className="h-3 w-3 mr-1" />}
                        {assignment.reviewStatus === "reassigned" && <RefreshCw className="h-3 w-3 mr-1" />}
                        {assignment.reviewStatus.charAt(0).toUpperCase() + assignment.reviewStatus.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeRoom(assignment)}
                          disabled={approveMutation.isPending}
                        >
                          Change
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(assignment.id)}
                          disabled={approveMutation.isPending || assignment.reviewStatus === "approved"}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Room change dialog */}
      {selectedAssignment && (
        <Dialog open={isChangingRoom} onOpenChange={(open) => {
          if (!open) {
            setIsChangingRoom(false);
            setSelectedAssignment(null);
          }
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Change Room Assignment</DialogTitle>
              <DialogDescription>
                Reassign {selectedAssignment.guest.firstName} {selectedAssignment.guest.lastName} to a different room
              </DialogDescription>
            </DialogHeader>
            
            <RoomAssignmentDialog
              open={true}
              onOpenChange={() => {}}
              accommodationId={selectedAssignment.accommodationId}
              accommodationName={selectedAssignment.accommodation.name}
              maxOccupancy={selectedAssignment.accommodation.maxOccupancy}
              bedType={selectedAssignment.accommodation.bedType}
              existingAllocation={{
                guestId: selectedAssignment.guestId,
                id: selectedAssignment.id,
                checkInDate: selectedAssignment.checkInDate,
                checkOutDate: selectedAssignment.checkOutDate,
                specialRequests: selectedAssignment.specialRequests,
                includesPlusOne: selectedAssignment.includesPlusOne,
                includesChildren: selectedAssignment.includesChildren,
                childrenCount: selectedAssignment.childrenCount
              }}
              onSuccess={() => {
                setIsChangingRoom(false);
                setSelectedAssignment(null);
                queryClient.invalidateQueries({ queryKey: ["auto-assignments", eventId] });
                toast({
                  title: "Room Changed",
                  description: "The room assignment has been updated",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}