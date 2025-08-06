import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, CheckIcon, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { post } from "@/lib/api-utils";

// Form schema for room assignment
const roomAssignmentSchema = z.object({
  guestId: z.number({
    required_error: "Please select a guest",
  }),
  roomNumber: z.string().optional(),
  checkInDate: z.date({
    required_error: "Please select a check-in date",
  }),
  checkOutDate: z.date({
    required_error: "Please select a check-out date",
  }),
  specialRequests: z.string().optional(),
  includesPlusOne: z.boolean().default(false),
  includesChildren: z.boolean().default(false),
  childrenCount: z.number().min(0).default(0),
  additionalGuestsInfo: z.string().optional(),
});

type RoomAssignmentForm = z.infer<typeof roomAssignmentSchema>;

// Function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

interface RoomAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accommodationId: number | null;
  accommodationName: string;
  maxOccupancy?: number;
  bedType?: string;
  onSuccess?: () => void;
  existingAllocation?: any;
}

export function RoomAssignmentDialog({
  open,
  onOpenChange,
  accommodationId,
  accommodationName,
  maxOccupancy,
  bedType,
  onSuccess,
  existingAllocation,
}: RoomAssignmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commandOpen, setCommandOpen] = useState(false);

  // Get the current event ID from cached data
  const currentEvent = queryClient.getQueryData<any>(["/api/auth/current-event"]);
  const currentEventId = currentEvent?.id;

  // Fetch guests for the current event
  const { data: guests = [], isLoading: isGuestsLoading } = useQuery({
    queryKey: [`/api/events/${currentEventId}/guests`],
    queryFn: async () => {
      if (!currentEventId) return [];
      const response = await fetch(`/api/events/${currentEventId}/guests`);
      if (!response.ok) {
        throw new Error("Failed to fetch guests");
      }
      return response.json();
    },
    enabled: !!currentEventId && open,
  });

  // Set up form with default values
  const form = useForm<RoomAssignmentForm>({
    resolver: zodResolver(roomAssignmentSchema),
    defaultValues: {
      guestId: existingAllocation?.guestId || 0,
      roomNumber: existingAllocation?.roomNumber || "",
      checkInDate: existingAllocation?.checkInDate ? new Date(existingAllocation.checkInDate) : new Date(),
      checkOutDate: existingAllocation?.checkOutDate ? new Date(existingAllocation.checkOutDate) : new Date(),
      specialRequests: existingAllocation?.specialRequests || "",
      includesPlusOne: existingAllocation?.includesPlusOne || false,
      includesChildren: existingAllocation?.includesChildren || false,
      childrenCount: existingAllocation?.childrenCount || 0,
      additionalGuestsInfo: existingAllocation?.additionalGuestsInfo || "",
    },
  });

  // Update form when existing allocation changes
  useEffect(() => {
    if (existingAllocation) {
      form.reset({
        guestId: existingAllocation.guestId,
        roomNumber: existingAllocation.roomNumber || "",
        checkInDate: existingAllocation.checkInDate ? new Date(existingAllocation.checkInDate) : new Date(),
        checkOutDate: existingAllocation.checkOutDate ? new Date(existingAllocation.checkOutDate) : new Date(),
        specialRequests: existingAllocation.specialRequests || "",
        includesPlusOne: existingAllocation.includesPlusOne || false,
        includesChildren: existingAllocation.includesChildren || false,
        childrenCount: existingAllocation.childrenCount || 0,
        additionalGuestsInfo: existingAllocation.additionalGuestsInfo || "",
      });
    } else {
      form.reset({
        guestId: 0,
        roomNumber: "",
        checkInDate: new Date(),
        checkOutDate: new Date(),
        specialRequests: "",
        includesPlusOne: false,
        includesChildren: false,
        childrenCount: 0,
        additionalGuestsInfo: "",
      });
    }
  }, [existingAllocation, form]);

  // Create room allocation mutation
  const createAllocationMutation = useMutation({
    mutationFn: async (data: RoomAssignmentForm) => {
      return post("/api/allocations", {
        ...data,
        accommodationId,
        checkInDate: data.checkInDate.toISOString(),
        checkOutDate: data.checkOutDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Room assigned",
        description: "Guest has been assigned to the room successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["accommodations", currentEventId] });
      queryClient.invalidateQueries({ queryKey: ["allocations", accommodationId] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update room allocation mutation
  const updateAllocationMutation = useMutation({
    mutationFn: async (data: RoomAssignmentForm) => {
      return post(`/api/allocations/${existingAllocation.id}`, {
        ...data,
        accommodationId,
        checkInDate: data.checkInDate.toISOString(),
        checkOutDate: data.checkOutDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Room assignment updated",
        description: "Room assignment has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["accommodations", currentEventId] });
      queryClient.invalidateQueries({ queryKey: ["allocations", accommodationId] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update room assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Find the selected guest
  const selectedGuest = guests.find((guest: any) => guest.id === form.watch("guestId"));

  // Check if guest has a plus one
  const hasPlusOne = selectedGuest?.plusOneAllowed && 
                     selectedGuest?.plusOneConfirmed && 
                     selectedGuest?.plusOneName;

  // Form submission handler
  function onSubmit(data: RoomAssignmentForm) {
    if (!accommodationId) {
      toast({
        title: "Error",
        description: "No accommodation selected",
        variant: "destructive",
      });
      return;
    }

    if (existingAllocation) {
      updateAllocationMutation.mutate(data);
    } else {
      createAllocationMutation.mutate(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingAllocation ? "Update Room Assignment" : "Assign Guest to Room"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Room Type: <span className="font-bold">{accommodationName}</span>
                </div>
                {bedType && (
                  <div className="text-xs text-muted-foreground">
                    Bed Type: {bedType.charAt(0).toUpperCase() + bedType.slice(1)}
                    {maxOccupancy && <> · Max Occupancy: {maxOccupancy} {maxOccupancy === 1 ? 'guest' : 'guests'}</>}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="guestId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Guest</FormLabel>
                    <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={!!existingAllocation}
                          >
                            {field.value && guests.length > 0
                              ? guests.find((guest: any) => guest.id === field.value)
                                  ? `${guests.find((guest: any) => guest.id === field.value).firstName} ${
                                      guests.find((guest: any) => guest.id === field.value).lastName
                                    }`
                                  : "Select guest"
                              : "Select guest"}
                            <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search guest..." />
                          <CommandEmpty>No guest found.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="h-72">
                              {guests.map((guest: any) => (
                                <CommandItem
                                  key={guest.id}
                                  value={`${guest.firstName} ${guest.lastName}`}
                                  onSelect={() => {
                                    form.setValue("guestId", guest.id);
                                    setCommandOpen(false);
                                  }}
                                >
                                  <div className="flex items-center">
                                    <Avatar className="h-8 w-8 mr-2 bg-primary text-white">
                                      <AvatarFallback>
                                        {getInitials(`${guest.firstName} ${guest.lastName}`)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">
                                        {guest.firstName} {guest.lastName}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {guest.email || guest.phone || "No contact info"}
                                      </div>
                                    </div>
                                    <CheckIcon
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        guest.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input placeholder="101" {...field} />
                    </FormControl>
                    <FormDescription>
                      Specify the room number if known
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-in Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-out Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requirements for the room"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional guests section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-medium">Additional Guests</h3>

                {/* Plus One option */}
                {hasPlusOne && (
                  <FormField
                    control={form.control}
                    name="includesPlusOne"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Plus One: {selectedGuest?.plusOneName}
                          </FormLabel>
                          <FormDescription>
                            Add guest's plus one to this room
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {/* Children option */}
                <FormField
                  control={form.control}
                  name="includesChildren"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              form.setValue("childrenCount", 0);
                            }
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include Children</FormLabel>
                        <FormDescription>
                          Add children to this room
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Children count */}
                {form.watch("includesChildren") && (
                  <FormField
                    control={form.control}
                    name="childrenCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Children</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Additional guests info */}
                {(form.watch("includesPlusOne") || form.watch("includesChildren")) && (
                  <FormField
                    control={form.control}
                    name="additionalGuestsInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Guests Info</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional information about accompanying guests"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createAllocationMutation.isPending || updateAllocationMutation.isPending
                }
              >
                {existingAllocation ? "Update Assignment" : "Assign Room"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}